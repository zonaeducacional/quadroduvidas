// Configuração inicial
let isProfessorMode = false;
let currentDoubtId = null;
let deferredPrompt = null;
let doubts = JSON.parse(localStorage.getItem('doubts')) || [];

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

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});

// Inicialização
function initApp() {
    renderDoubts();
    updateStats();
    checkServiceWorker();
}

// Service Worker
async function checkServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registrado');
        } catch (error) {
            console.error('Falha no Service Worker:', error);
        }
    }
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
    // Atualiza o texto e ícone do botão com estilo premium
    modeToggle.innerHTML = isProfessorMode ? '<span>👤</span> Modo Aluno' : '<span>👨‍🏫</span> Modo Professor';
    renderDoubts();
}

// Gerenciamento de Dúvidas
function submitDoubt() {
    const text = doubtInput.value.trim();
    if (!text) {
        showToast('❌ Digite uma dúvida antes de enviar');
        return;
    }

    // Pequeno feedback visual no card ao enviar
    const card = document.querySelector('.new-doubt-card');
    card.style.transform = 'scale(0.98)';
    setTimeout(() => card.style.transform = 'scale(1)', 100);

    const doubt = {
        id: Date.now().toString(),
        text: text,
        votes: 0,
        hasVoted: false,
        answer: '',
        timestamp: new Date().toISOString(),
        isAnonymous: true
    };

    doubts.unshift(doubt);
    saveDoubts();
    renderDoubts();
    updateStats();

    doubtInput.value = '';
    updateCharCount();
    showToast('✨ Pergunta enviada com sucesso!');
}

function voteDoubt(doubtId) {
    const doubt = doubts.find(d => d.id === doubtId);
    if (!doubt) return;

    if (doubt.hasVoted) {
        doubt.votes--;
        doubt.hasVoted = false;
    } else {
        doubt.votes++;
        doubt.hasVoted = true;
    }

    saveDoubts();
    renderDoubts();
}

function openAnswerModal(doubtId) {
    if (!isProfessorMode) return;

    const doubt = doubts.find(d => d.id === doubtId);
    if (!doubt) return;

    currentDoubtId = doubtId;
    modalQuestion.textContent = doubt.text;
    answerInput.value = doubt.answer || '';
    answerModal.classList.add('visible');
    answerInput.focus();
}

function submitAnswer() {
    if (!currentDoubtId) return;

    const answer = answerInput.value.trim();
    if (!answer) {
        showToast('❌ Digite uma resposta');
        return;
    }

    const doubt = doubts.find(d => d.id === currentDoubtId);
    if (doubt) {
        doubt.answer = answer;
        doubt.answeredAt = new Date().toISOString();
        saveDoubts();
        renderDoubts();
        updateStats();
        closeModal();
        showToast('✅ Resposta publicada!');
    }
}

function closeModal() {
    answerModal.classList.add('hidden');
    currentDoubtId = null;
    answerInput.value = '';
}

function deleteDoubt(doubtId) {
    if (!isProfessorMode) return;

    if (confirm('Tem certeza que deseja excluir esta dúvida?')) {
        doubts = doubts.filter(d => d.id !== doubtId);
        saveDoubts();
        renderDoubts();
        updateStats();
        showToast('🗑️ Dúvida excluída');
    }
}

function clearAllDoubts() {
    if (!isProfessorMode) return;

    if (confirm('Tem certeza que deseja apagar TODAS as dúvidas? Esta ação não pode ser desfeita.')) {
        doubts = [];
        saveDoubts();
        renderDoubts();
        updateStats();
        showToast('🧹 Todas as dúvidas foram removidas');
    }
}

function exportDoubts() {
    const dataStr = JSON.stringify(doubts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `duvidas-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Renderização
function renderDoubts() {
    const filter = filterSelect.value;
    let filteredDoubts = [...doubts];

    // Aplicar filtro
    switch (filter) {
        case 'unanswered':
            filteredDoubts = filteredDoubts.filter(d => !d.answer);
            break;
        case 'answered':
            filteredDoubts = filteredDoubts.filter(d => d.answer);
            break;
        case 'mostVoted':
            filteredDoubts.sort((a, b) => b.votes - a.votes);
            break;
    }

    // Renderizar
    if (filteredDoubts.length === 0) {
        emptyState.classList.remove('hidden');
        doubtsContainer.innerHTML = '';
    } else {
        emptyState.classList.add('hidden');
        doubtsContainer.innerHTML = filteredDoubts.map(doubt => `
            <div class="doubt-card" data-id="${doubt.id}">
                <div class="doubt-header">
                    <div class="doubt-text">${escapeHtml(doubt.text)}</div>
                    <div class="doubt-actions">
                        <button class="vote-btn ${doubt.hasVoted ? 'active' : ''}" 
                                onclick="voteDoubt('${doubt.id}')"
                                ${!isProfessorMode ? '' : 'disabled'}>
                            👍 <span class="vote-count">${doubt.votes}</span>
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
        `).join('');
    }
}

// Utilidades
function updateCharCount() {
    const count = doubtInput.value.length;
    charCount.textContent = count;
    charCount.style.color = count > 450 ? '#ef4444' : '#64748b';
}

function updateStats() {
    totalDoubts.textContent = doubts.length;
    const unanswered = doubts.filter(d => !d.answer).length;
    unansweredCount.textContent = unanswered;
}

function saveDoubts() {
    localStorage.setItem('doubts', JSON.stringify(doubts));
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function formatDate(isoString) {
    const date = new Date(isoString);
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

// Offline support
window.addEventListener('online', () => {
    showToast('✅ Conexão restaurada');
});

window.addEventListener('offline', () => {
    showToast('⚠️ Você está offline - suas dúvidas serão salvas localmente');
});