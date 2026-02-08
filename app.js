// Firebase Configuration & Imports (Firestore)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAEZ4F6kd_ABom-iYJFehV4GjRzRC5atOQ",
    authDomain: "quadro-de-perguntas.firebaseapp.com",
    projectId: "quadro-de-perguntas",
    storageBucket: "quadro-de-perguntas.firebasestorage.app",
    messagingSenderId: "590722839219",
    appId: "1:590722839219:web:0c598502ccebb57bd076c6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Estado Global
let isProfessorMode = false;
let currentDoubtId = null;
let deferredPrompt = null;
let currentRoomCode = localStorage.getItem('currentRoom') || null;
let doubts = {};
let unsubscribeListener = null;

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

async function createRoom() {
    const newRoomCode = generateRoomCode();
    currentRoomCode = newRoomCode;
    localStorage.setItem('currentRoom', newRoomCode);

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

    // Limpa listener anterior
    if (unsubscribeListener) {
        unsubscribeListener();
    }

    // Configura listener do Firestore
    setupFirestoreListener(code);
    showToast(`✅ Conectado à sala ${code}`);
}

function copyRoomCode() {
    navigator.clipboard.writeText(currentRoomCode);
    showToast('📋 Código copiado!');
}

// Firestore Listener
function setupFirestoreListener(roomCode) {
    const doubtsRef = collection(db, 'rooms', roomCode, 'doubts');
    const q = query(doubtsRef, orderBy('timestamp', 'desc'));

    unsubscribeListener = onSnapshot(q, (snapshot) => {
        doubts = {};
        snapshot.forEach((doc) => {
            doubts[doc.id] = { ...doc.data(), id: doc.id };
        });
        renderDoubts();
        updateStats();
    }, (error) => {
        console.error('Erro ao escutar mudanças:', error);
        showToast('⚠️ Erro de conexão com o Firebase');
    });
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
async function submitDoubt() {
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

    try {
        const doubtsRef = collection(db, 'rooms', currentRoomCode, 'doubts');
        await addDoc(doubtsRef, doubt);

        doubtInput.value = '';
        updateCharCount();
        showToast('✨ Pergunta enviada com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar dúvida:', error);
        showToast('❌ Erro ao enviar. Tente novamente.');
    }
}

async function voteDoubt(doubtId) {
    if (!currentRoomCode) return;

    const doubt = doubts[doubtId];
    if (!doubt) return;

    const userId = getOrCreateUserId();
    const hasVoted = doubt.voters && doubt.voters[userId];

    const doubtRef = doc(db, 'rooms', currentRoomCode, 'doubts', doubtId);

    try {
        if (hasVoted) {
            const newVoters = { ...doubt.voters };
            delete newVoters[userId];
            await updateDoc(doubtRef, {
                votes: Math.max(0, (doubt.votes || 0) - 1),
                voters: newVoters
            });
        } else {
            await updateDoc(doubtRef, {
                votes: (doubt.votes || 0) + 1,
                [`voters.${userId}`]: true
            });
        }
    } catch (error) {
        console.error('Erro ao votar:', error);
        showToast('❌ Erro ao votar');
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

async function submitAnswer() {
    if (!currentDoubtId || !currentRoomCode) return;

    const answer = answerInput.value.trim();
    if (!answer) {
        showToast('❌ Digite uma resposta');
        return;
    }

    const doubtRef = doc(db, 'rooms', currentRoomCode, 'doubts', currentDoubtId);

    try {
        await updateDoc(doubtRef, {
            answer: answer,
            answeredAt: Date.now()
        });

        closeModal();
        showToast('✅ Resposta publicada!');
    } catch (error) {
        console.error('Erro ao responder:', error);
        showToast('❌ Erro ao publicar resposta');
    }
}

function closeModal() {
    answerModal.classList.remove('visible');
    currentDoubtId = null;
    answerInput.value = '';
}

async function deleteDoubt(doubtId) {
    if (!isProfessorMode || !currentRoomCode) return;

    if (confirm('Tem certeza que deseja excluir esta dúvida?')) {
        const doubtRef = doc(db, 'rooms', currentRoomCode, 'doubts', doubtId);
        try {
            await deleteDoc(doubtRef);
            showToast('🗑️ Dúvida excluída');
        } catch (error) {
            console.error('Erro ao excluir:', error);
            showToast('❌ Erro ao excluir');
        }
    }
}

async function clearAllDoubts() {
    if (!isProfessorMode || !currentRoomCode) return;

    if (confirm('Tem certeza que deseja apagar TODAS as dúvidas? Esta ação não pode ser desfeita.')) {
        try {
            const deletePromises = Object.keys(doubts).map(doubtId => {
                const doubtRef = doc(db, 'rooms', currentRoomCode, 'doubts', doubtId);
                return deleteDoc(doubtRef);
            });

            await Promise.all(deletePromises);
            showToast('🧹 Todas as dúvidas foram removidas');
        } catch (error) {
            console.error('Erro ao limpar:', error);
            showToast('❌ Erro ao limpar dúvidas');
        }
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