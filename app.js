const LOCAL_STORAGE_KEY = 'domino_placar_data';
const DEFAULT_PLAYERS = [
    'Waldemar',
    'Tiago',
    'Trans',
    'Pedro',
    'Marco',
    'Marcelo',
    'Borracha',
    'Gabriel',
    'Fabio',
    'Alex',
    'Henrique',
    'Joice',
    'Douglas',
    'Paulo'
];

let state = {
    players: [],
    matches: [],
    sortField: 'date',
    sortAsc: false
};

function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function loadState() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
            if (!state.players || state.players.length === 0) state.players = [...DEFAULT_PLAYERS];
            if (!state.matches) state.matches = [];
            if (!state.sortField) state.sortField = 'date';
            if (state.sortAsc === undefined) state.sortAsc = false;
        } catch (error) {
            console.error('Erro ao ler dados do armazenamento. Resetando.', error);
            state = { players: [], matches: [], sortField: 'date', sortAsc: false };
            saveState();
        }
    } else {
        state = {
            players: [...DEFAULT_PLAYERS],
            matches: [],
            sortField: 'date',
            sortAsc: false
        };
        saveState();
    }
}

function saveState() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function calculateTotals() {
    const totals = {};
    state.players.forEach(name => {
        totals[name] = { score: 0, victories: 0, defeats: 0, draws: 0, matches: 0 };
    });

    state.matches.forEach(match => {
        if (!totals[match.playerA] || !totals[match.playerB]) return;

        totals[match.playerA].score += match.scoreA;
        totals[match.playerB].score += match.scoreB;
        totals[match.playerA].matches += 1;
        totals[match.playerB].matches += 1;

        if (match.scoreA > match.scoreB) {
            totals[match.playerA].victories += 1;
            totals[match.playerB].defeats += 1;
        } else if (match.scoreB > match.scoreA) {
            totals[match.playerB].victories += 1;
            totals[match.playerA].defeats += 1;
        } else {
            totals[match.playerA].draws += 1;
            totals[match.playerB].draws += 1;
        }
    });

    return totals;
}

function getWinnerText(match) {
    if (match.scoreA > match.scoreB) return match.playerA;
    if (match.scoreB > match.scoreA) return match.playerB;
    return 'Empate';
}

function renderScores() {
    const grid = document.getElementById('scoresGrid');
    const totals = calculateTotals();
    grid.innerHTML = '';

    if (state.players.length === 0) {
        grid.innerHTML = '<div class="score-card"><strong>Nenhuma dupla</strong><span>Adicione uma dupla para começar.</span></div>';
        return;
    }

    const rankedPlayers = state.players.filter(player => totals[player].matches > 0);
    if (rankedPlayers.length === 0) {
        grid.innerHTML = '<div class="score-card"><strong>Ranking vazio</strong><span>Registre partidas para ver as duplas aqui.</span></div>';
        return;
    }

    const sortedPlayers = [...rankedPlayers].sort((a, b) => totals[b].score - totals[a].score);

    sortedPlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'score-card';
        card.innerHTML = `
            <div>
                <span>Dupla</span>
                <strong>${player}</strong>
            </div>
            <div>
                <span>Total de pontos</span>
                <strong>${totals[player].score}</strong>
            </div>
            <div style="display: flex; gap: 0.85rem; flex-wrap: wrap; margin-top: 0.75rem; color: var(--muted); font-size: 0.95rem;">
                <span>Vitórias: ${totals[player].victories}</span>
                <span>Derrotas: ${totals[player].defeats}</span>
                <span>Empates: ${totals[player].draws}</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderMatches() {
    const tbody = document.getElementById('matchesTable');
    tbody.innerHTML = '';

    const matches = [...state.matches];
    matches.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA < dateB) return state.sortAsc ? -1 : 1;
        if (dateA > dateB) return state.sortAsc ? 1 : -1;
        return 0;
    });

    if (matches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:2rem 1rem;">Nenhuma partida registrada ainda.</td></tr>';
        return;
    }

    matches.forEach(match => {
        const tr = document.createElement('tr');
        const winner = getWinnerText(match);
        tr.innerHTML = `
            <td>${formatDate(match.date)}</td>
            <td>${match.playerA}</td>
            <td>${match.scoreA}</td>
            <td>${match.playerB}</td>
            <td>${match.scoreB}</td>
            <td><span class="badge ${winner === 'Empate' ? 'draw' : 'win'}">${winner}</span></td>
            <td><button class="action-btn" data-id="${match.id}">Excluir</button></td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (confirm('Excluir esta partida?')) {
                state.matches = state.matches.filter(item => item.id !== id);
                saveState();
                renderMatches();
                renderScores();
                renderMeta();
            }
        });
    });
}

function renderMeta() {
    document.getElementById('matchesCount').innerText = `${state.matches.length} partida${state.matches.length === 1 ? '' : 's'}`;
    document.getElementById('playersCount').innerText = `${state.players.length} dupla${state.players.length === 1 ? '' : 's'}`;
}

function populatePlayerSelects() {
    const selectA = document.getElementById('playerA');
    const selectB = document.getElementById('playerB');
    selectA.innerHTML = '';
    selectB.innerHTML = '';

    state.players.forEach(player => {
        const optA = document.createElement('option');
        optA.value = player;
        optA.textContent = player;
        selectA.appendChild(optA);

        const optB = document.createElement('option');
        optB.value = player;
        optB.textContent = player;
        selectB.appendChild(optB);
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => modal.classList.remove('active'));
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportBackup() {
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: state
    };
    downloadFile(JSON.stringify(payload, null, 2), `domino-placar-backup-${getTodayString()}.json`, 'application/json;charset=utf-8');
}

function resetState() {
    if (confirm('Limpar todos os dados e restaurar as duplas padrão?')) {
        state = {
            players: [...DEFAULT_PLAYERS],
            matches: [],
            sortField: 'date',
            sortAsc: false
        };
        saveState();
        renderAll();
    }
}

function importBackup(file) {
    const reader = new FileReader();
    reader.onload = event => {
        try {
            const parsed = JSON.parse(event.target.result);
            if (parsed && parsed.data && Array.isArray(parsed.data.players) && Array.isArray(parsed.data.matches)) {
                if (confirm('Importar backup e substituir os dados atuais?')) {
                    state = parsed.data;
                    saveState();
                    renderAll();
                    alert('Backup importado com sucesso!');
                }
            } else {
                throw new Error('Arquivo inválido');
            }
        } catch (error) {
            alert('Não foi possível importar o arquivo. Verifique se é um backup válido.');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

function checkUrlImport() {
    const hash = window.location.hash;
    if (!hash.startsWith('#data=')) return;

    try {
        const compressedData = hash.replace('#data=', '');
        const jsonString = LZString.decompressFromEncodedURIComponent(compressedData);
        const imported = JSON.parse(jsonString);
        if (imported && Array.isArray(imported.players) && Array.isArray(imported.matches)) {
            if (confirm('Dados compartilhados encontrados. Deseja importar e substituir os dados atuais?')) {
                state = imported;
                saveState();
                renderAll();
                alert('Dados importados com sucesso!');
            }
        }
    } catch (error) {
        console.error(error);
        alert('Não foi possível importar o link compartilhado.');
    } finally {
        window.history.replaceState(null, null, ' ');
    }
}

function generateShareLink() {
    const jsonString = JSON.stringify(state);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    const baseUrl = window.location.href.split('#')[0];
    const shareUrl = `${baseUrl}#data=${compressed}`;

    document.getElementById('shareLinkInput').value = shareUrl;
    const canvas = document.getElementById('qrCodeCanvas');
    new QRious({ element: canvas, value: shareUrl, size: 220, background: 'white', foreground: '#0f172a', level: 'L' });
    openModal('modalShare');
}

function renderAll() {
    renderScores();
    renderMatches();
    populatePlayerSelects();
    renderMeta();
}

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    checkUrlImport();
    renderAll();
    document.getElementById('matchDate').value = getTodayString();

    document.getElementById('btnExportJson').addEventListener('click', exportBackup);
    document.getElementById('btnImportJson').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', event => {
        const file = event.target.files[0];
        if (file) importBackup(file);
        event.target.value = '';
    });
    document.getElementById('btnShareLink').addEventListener('click', generateShareLink);
    document.getElementById('btnResetData').addEventListener('click', resetState);

    document.getElementById('btnCopyLink').addEventListener('click', () => {
        const link = document.getElementById('shareLinkInput');
        navigator.clipboard.writeText(link.value).then(() => {
            alert('Link copiado para a área de transferência!');
        });
    });

    document.querySelectorAll('.closeModal').forEach(btn => btn.addEventListener('click', closeModals));

    document.getElementById('formPlayer').addEventListener('submit', event => {
        event.preventDefault();
        const name = document.getElementById('playerName').value.trim();
        if (!name) return;
        if (state.players.includes(name)) {
            alert('Esta dupla já existe.');
            return;
        }
        state.players.push(name);
        saveState();
        renderAll();
        closeModals();
    });

    document.getElementById('formMatch').addEventListener('submit', event => {
        event.preventDefault();
        if (state.players.length < 2) {
            alert('Adicione pelo menos duas duplas antes de registrar partidas.');
            return;
        }

        const matchData = {
            id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            date: document.getElementById('matchDate').value,
            playerA: document.getElementById('playerA').value,
            scoreA: parseInt(document.getElementById('scoreA').value, 10) || 0,
            playerB: document.getElementById('playerB').value,
            scoreB: parseInt(document.getElementById('scoreB').value, 10) || 0,
            notes: ''
        };

        if (matchData.playerA === matchData.playerB) {
            alert('Escolha duas duplas diferentes.');
            return;
        }

        state.matches.unshift(matchData);
        saveState();
        renderAll();
        document.getElementById('matchDate').value = getTodayString();
    });
});
