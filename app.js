// Firebase Configuration & Imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getDatabase, ref, push, set, onValue, remove, update, onChildAdded, onChildChanged, onChildRemoved } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyAEZ4F6kd_ABom-iYJFehV4GjRzRC5atOQ",
    authDomain: "quadro-de-perguntas.firebaseapp.com",
    projectId: "quadro-de-perguntas",
    storageBucket: "quadro-de-perguntas.firebasestorage.app",
    messagingSenderId: "590722839219",
    appId: "1:590722839219:web:0c598502ccebb57bd076c6",
    databaseURL: "https://quadro-de-perguntas-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Estado Global
let isProfessorMode = false;
let currentDoubtId = null;
let deferredPrompt = null;
let currentRoomCode = localStorage.getItem('currentRoom') || null;
let doubts = {};
let unsubscribeListeners = [];

// Elementos DOM
const installBtn = document.getElementById('installBtn');
const modeToggle = document.getElementById('modeToggle');
const professorPanel = document.getElementById('professorPanel');
const doubtInput = document.getElementById('doubtInput');
const submitBtn = document.getElementById('submitBtn');
const charCount = document.getElementById('charCount');
const doubtsContainer = document.getElementById('doubtsContainer');
const emptyState = document.getElementById('emptyState');
const filterSelect = document.getElementById('filterSelect');
const totalDoubts = document.getElementById('totalDoubts');
const unansweredCount = document.getElementById('unansweredCount');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const answerModal = document.getElementById('answerModal');
const modalQuestion = document.getElementById('modalQuestion');
const answerInput = document.getElementById('answerInput');
const cancelBtn = document.getElementById('cancelBtn');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const toast = document.getElementById('toast');
const roomModal = document.getElementById('roomModal');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const changeRoomBtn = document.getElementById('changeRoomBtn');
const headerRoomCode = document.getElementById('headerRoomCode');
const roomInfo = document.getElementById('roomInfo');
const currentRoomCodeDisplay = document.getElementById('currentRoomCode');
const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
installBtn.addEventListener('click', installPWA);
modeToggle.addEventListener('click', toggleProfessorMode);
doubtInput.addEventListener('input', updateCharCount);
submitBtn.addEventListener('click', submitDoubt);
filterSelect.addEventListener('change', renderDoubts);
clearAllBtn.addEventListener('click', clearAllDoubts);
exportBtn.addEventListener('click', exportDoubts);
cancelBtn.addEventListener('click', closeModal);
submitAnswerBtn.addEventListener('click', submitAnswer);
joinRoomBtn.addEventListener('click', joinRoom);
createRoomBtn.addEventListener('click', createRoom);
changeRoomBtn.addEventListener('click', () => {
    roomModal.classList.add('visible');
    roomInfo.classList.add('hidden');
});
copyRoomCodeBtn.addEventListener('click', copyRoomCode);

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
});

// Inicialização
function initApp() {
    checkServiceWorker();
    if (currentRoomCode) {
        joinExistingRoom(currentRoomCode);
    } else {
        roomModal.classList.add('visible');
    }
}

// Service Worker
async function checkServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('✅ Service Worker registrado');
        } catch (error) {
            console.error('❌ Falha no Service Worker:', error);
        }
    }
}

// Gerenciamento de Salas
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function createRoom() {
    const newRoomCode = generateRoomCode();
    currentRoomCode = newRoomCode;
    localStorage.setItem('currentRoom', newRoomCode);

    // Cria a sala no Firebase
    set(ref(database, `rooms/${newRoomCode}/info`), {
        createdAt: Date.now(),
        createdBy: 'professor'
    });

    currentRoomCodeDisplay.textContent = newRoomCode;
    roomInfo.classList.remove('hidden');
    showToast('🎉 Sala criada com sucesso!');

    setTimeout(() => {
        joinExistingRoom(newRoomCode);
    }, 2000);
}

function joinRoom() {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) {
        showToast('❌ Digite um código de sala');
        return;
    }

    currentRoomCode = code;
    localStorage.setItem('currentRoom', code);
    joinExistingRoom(code);
}

function joinExistingRoom(code) {
    roomModal.classList.remove('visible');
    headerRoomCode.textContent = code;

    // Limpa listeners anteriores
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];

    // Configura listeners do Firebase
    setupFirebaseListeners(code);
    showToast(`✅ Conectado à sala ${code}`);
}

function copyRoomCode() {
    navigator.clipboard.writeText(currentRoomCode);
    showToast('📋 Código copiado!');
}

// Firebase Listeners
function setupFirebaseListeners(roomCode) {
    const doubtsRef = ref(database, `rooms/${roomCode}/doubts`);

    // Listener para novos itens
    const addedListener = onChildAdded(doubtsRef, (snapshot) => {
        const doubt = snapshot.val();
        doubts[snapshot.key] = { ...doubt, id: snapshot.key };
        renderDoubts();
        updateStats();
    });

    // Listener para itens modificados
    const changedListener = onChildChanged(doubtsRef, (snapshot) => {
        const doubt = snapshot.val();
        doubts[snapshot.key] = { ...doubt, id: snapshot.key };
        renderDoubts();
        updateStats();
    });

    // Listener para itens removidos
    const removedListener = onChildRemoved(doubtsRef, (snapshot) => {
        delete doubts[snapshot.key];
        renderDoubts();
        updateStats();
    });

    unsubscribeListeners.push(addedListener, changedListener, removedListener);
}

// Instalar PWA
async function installPWA() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        installBtn.style.display = 'none';
        showToast('📲 App instalado com sucesso!');
    }

    deferredPrompt = null;
}

// Modo Professor
function toggleProfessorMode() {
    isProfessorMode = !isProfessorMode;
    professorPanel.classList.toggle('hidden', !isProfessorMode);
    modeToggle.innerHTML = isProfessorMode ? '<span>👤</span> Modo Aluno' : '<span>👨‍🏫</span> Modo Professor';
    renderDoubts();
}

// Gerenciamento de Dúvidas
function submitDoubt() {
    if (!currentRoomCode) {
        showToast('❌ Entre em uma sala primeiro');
        return;
    }

    const text = doubtInput.value.trim();
    if (!text) {
        showToast('❌ Digite uma dúvida antes de enviar');
        return;
    }

    const card = document.querySelector('.new-doubt-card');
    card.style.transform = 'scale(0.98)';
    setTimeout(() => card.style.transform = 'scale(1)', 100);

    const doubt = {
        text: text,
        votes: 0,
        voters: {},
        answer: '',
        timestamp: Date.now(),
        isAnonymous: true
    };

    const doubtsRef = ref(database, `rooms/${currentRoomCode}/doubts`);
    push(doubtsRef, doubt);

    doubtInput.value = '';
    updateCharCount();
    showToast('✨ Pergunta enviada com sucesso!');
}

function voteDoubt(doubtId) {
    if (!currentRoomCode) return;

    const doubt = doubts[doubtId];
    if (!doubt) return;

    const userId = getOrCreateUserId();
    const hasVoted = doubt.voters && doubt.voters[userId];

    const doubtRef = ref(database, `rooms/${currentRoomCode}/doubts/${doubtId}`);

    if (hasVoted) {
        update(doubtRef, {
            votes: (doubt.votes || 0) - 1,
            [`voters/${userId}`]: null
        });
    } else {
        update(doubtRef, {
            votes: (doubt.votes || 0) + 1,
            [`voters/${userId}`]: true
        });
    }
}

function getOrCreateUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

function openAnswerModal(doubtId) {
    if (!isProfessorMode) return;

    const doubt = doubts[doubtId];
    if (!doubt) return;

    currentDoubtId = doubtId;
    modalQuestion.textContent = doubt.text;
    answerInput.value = doubt.answer || '';
    answerModal.classList.add('visible');
    answerInput.focus();
}

function submitAnswer() {
    if (!currentDoubtId || !currentRoomCode) return;

    const answer = answerInput.value.trim();
    if (!answer) {
        showToast('❌ Digite uma resposta');
        return;
    }

    const doubtRef = ref(database, `rooms/${currentRoomCode}/doubts/${currentDoubtId}`);
    update(doubtRef, {
        answer: answer,
        answeredAt: Date.now()
    });

    closeModal();
    showToast('✅ Resposta publicada!');
}

function closeModal() {
    answerModal.classList.remove('visible');
    currentDoubtId = null;
    answerInput.value = '';
}

function deleteDoubt(doubtId) {
    if (!isProfessorMode || !currentRoomCode) return;

    if (confirm('Tem certeza que deseja excluir esta dúvida?')) {
        const doubtRef = ref(database, `rooms/${currentRoomCode}/doubts/${doubtId}`);
        remove(doubtRef);
        showToast('🗑️ Dúvida excluída');
    }
}

function clearAllDoubts() {
    if (!isProfessorMode || !currentRoomCode) return;

    if (confirm('Tem certeza que deseja apagar TODAS as dúvidas? Esta ação não pode ser desfeita.')) {
        const doubtsRef = ref(database, `rooms/${currentRoomCode}/doubts`);
        remove(doubtsRef);
        showToast('🧹 Todas as dúvidas foram removidas');
    }
}

function exportDoubts() {
    const doubtsArray = Object.values(doubts);
    const dataStr = JSON.stringify(doubtsArray, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `duvidas-${currentRoomCode}-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showToast('📥 Dúvidas exportadas!');
}

// Renderização
function renderDoubts() {
    const filter = filterSelect.value;
    let filteredDoubts = Object.values(doubts);

    switch (filter) {
        case 'unanswered':
            filteredDoubts = filteredDoubts.filter(d => !d.answer);
            break;
        case 'answered':
            filteredDoubts = filteredDoubts.filter(d => d.answer);
            break;
        case 'mostVoted':
            filteredDoubts.sort((a, b) => (b.votes || 0) - (a.votes || 0));
            break;
        default:
            filteredDoubts.sort((a, b) => b.timestamp - a.timestamp);
    }

    if (filteredDoubts.length === 0) {
        emptyState.classList.remove('hidden');
        doubtsContainer.innerHTML = '';
    } else {
        emptyState.classList.add('hidden');
        const userId = getOrCreateUserId();

        doubtsContainer.innerHTML = filteredDoubts.map(doubt => {
            const hasVoted = doubt.voters && doubt.voters[userId];
            return `
            <div class="doubt-card" data-id="${doubt.id}">
                <div class="doubt-header">
                    <div class="doubt-text">${escapeHtml(doubt.text)}</div>
                    <div class="doubt-actions">
                        <button class="vote-btn ${hasVoted ? 'active' : ''}" 
                                onclick="voteDoubt('${doubt.id}')"
                                ${isProfessorMode ? 'disabled' : ''}>
                            👍 <span class="vote-count">${doubt.votes || 0}</span>
                        </button>
                        ${isProfessorMode ? `
                            <button class="answer-btn" onclick="openAnswerModal('${doubt.id}')">
                                ${doubt.answer ? 'Editar Resposta' : 'Responder'}
                            </button>
                            <button class="btn-secondary" onclick="deleteDoubt('${doubt.id}')">Excluir</button>
                        ` : ''}
                    </div>
                </div>
                
                ${doubt.answer ? `
                    <div class="doubt-answer">
                        <span class="answer-label">📝 Resposta do Professor:</span>
                        ${escapeHtml(doubt.answer)}
                        <div class="doubt-meta">
                            Respondido em ${formatDate(doubt.answeredAt)}
                        </div>
                    </div>
                ` : ''}
                
                <div class="doubt-meta">
                    <span>⏰ ${formatDate(doubt.timestamp)}</span>
                    ${doubt.isAnonymous ? '<span>👤 Anônimo</span>' : ''}
                </div>
            </div>
        `}).join('');
    }
}

// Utilidades
function updateCharCount() {
    const count = doubtInput.value.length;
    charCount.textContent = count;
    charCount.style.color = count > 450 ? '#ef4444' : '#64748b';
}

function updateStats() {
    const doubtsArray = Object.values(doubts);
    totalDoubts.textContent = doubtsArray.length;
    const unanswered = doubtsArray.filter(d => !d.answer).length;
    unansweredCount.textContent = unanswered;
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Tornar funções globais para onclick
window.voteDoubt = voteDoubt;
window.openAnswerModal = openAnswerModal;
window.deleteDoubt = deleteDoubt;

// Offline support
window.addEventListener('online', () => {
    showToast('✅ Conexão restaurada');
});

window.addEventListener('offline', () => {
    showToast('⚠️ Você está offline');
});