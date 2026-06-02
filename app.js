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
    'Paulo',
    'Johnson´s Baby'
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
            if (!state.players || state.players.length === 0) {
                state.players = [...DEFAULT_PLAYERS];
                saveState();
            } else {
                const mergedPlayers = [...new Set([...state.players, ...DEFAULT_PLAYERS])];
                if (mergedPlayers.length !== state.players.length) {
                    state.players = mergedPlayers;
                    saveState();
                }
            }
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

function getMatchTeamPlayers(match, side) {
    const legacyKey = `player${side}`;
    const teamKey = `team${side}`;
    if (Array.isArray(match[teamKey]) && match[teamKey].length > 0) {
        return match[teamKey];
    }
    return match[legacyKey] ? [match[legacyKey]] : [];
}

function getMatchTeamLabel(match, side) {
    const team = getMatchTeamPlayers(match, side);
    return team.length ? team.join(' + ') : '-';
}

function calculateTotals() {
    const totals = {};
    state.players.forEach(name => {
        totals[name] = { score: 0, victories: 0, defeats: 0, draws: 0, matches: 0 };
    });

    state.matches.forEach(match => {
        const teamA = getMatchTeamPlayers(match, 'A');
        const teamB = getMatchTeamPlayers(match, 'B');
        if (teamA.length === 0 || teamB.length === 0) return;
        if (teamA.some(name => !totals[name]) || teamB.some(name => !totals[name])) return;

        teamA.forEach(name => {
            totals[name].score += match.scoreA;
            totals[name].matches += 1;
        });
        teamB.forEach(name => {
            totals[name].score += match.scoreB;
            totals[name].matches += 1;
        });

        if (match.scoreA > match.scoreB) {
            teamA.forEach(name => totals[name].victories += 1);
            teamB.forEach(name => totals[name].defeats += 1);
        } else if (match.scoreB > match.scoreA) {
            teamB.forEach(name => totals[name].victories += 1);
            teamA.forEach(name => totals[name].defeats += 1);
        } else {
            teamA.forEach(name => totals[name].draws += 1);
            teamB.forEach(name => totals[name].draws += 1);
        }
    });

    return totals;
}

function getWinnerText(match) {
    if (match.scoreA > match.scoreB) return getMatchTeamLabel(match, 'A');
    if (match.scoreB > match.scoreA) return getMatchTeamLabel(match, 'B');
    return 'Empate';
}

function isFourZeroWin(match) {
    return (match.scoreA === 4 && match.scoreB === 0) || (match.scoreB === 4 && match.scoreA === 0);
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
                <span>Jogador</span>
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
        const teamALabel = getMatchTeamLabel(match, 'A');
        const teamBLabel = getMatchTeamLabel(match, 'B');
        const awardHtml = isFourZeroWin(match)
            ? `<img src="trophy.svg" alt="Troféu" class="trophy-icon" title="4 a 0 - Lambreta" />`
            : '';
        tr.innerHTML = `
            <td>${formatDate(match.date)}</td>
            <td>${teamALabel}</td>
            <td>${match.scoreA}</td>
            <td>${teamBLabel}</td>
            <td>${match.scoreB}</td>
            <td><span class="badge ${winner === 'Empate' ? 'draw' : 'win'}">${winner}</span>${winner !== 'Empate' ? awardHtml : ''}</td>
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
    document.getElementById('playersCount').innerText = `${state.players.length} jogador${state.players.length === 1 ? '' : 'es'}`;
}

function populatePlayerSelects() {
    const selectIds = ['playerA1', 'playerA2', 'playerB1', 'playerB2'];
    selectIds.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        state.players.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            select.appendChild(option);
        });
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

function buildCompactSharePayload() {
    const players = state.players || [];
    const matches = (state.matches || []).map(match => {
        const teamA = getMatchTeamPlayers(match, 'A');
        const teamB = getMatchTeamPlayers(match, 'B');
        return [
            match.date,
            players.indexOf(teamA[0]),
            players.indexOf(teamA[1]),
            match.scoreA,
            players.indexOf(teamB[0]),
            players.indexOf(teamB[1]),
            match.scoreB
        ];
    });
    return { v: 1, p: players, m: matches };
}

function restoreSharedState(payload) {
    if (!payload || payload.v !== 1 || !Array.isArray(payload.p) || !Array.isArray(payload.m)) return null;
    const players = payload.p;
    const matches = payload.m.map((item, index) => {
        const [date, aIndex1, aIndex2, scoreA, bIndex1, bIndex2, scoreB] = item;
        const teamA = [players[aIndex1], players[aIndex2]].filter(Boolean);
        const teamB = [players[bIndex1], players[bIndex2]].filter(Boolean);
        return {
            id: `m-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
            date: date || getTodayString(),
            teamA,
            scoreA: Number(scoreA) || 0,
            teamB,
            scoreB: Number(scoreB) || 0,
            notes: ''
        };
    }).filter(match => match.teamA.length > 0 && match.teamB.length > 0);
    return {
        players,
        matches,
        sortField: 'date',
        sortAsc: false
    };
}

function checkUrlImport() {
    const params = new URLSearchParams(window.location.search);
    let compressedData = params.get('d') || '';
    if (!compressedData && window.location.hash.startsWith('#data=')) {
        compressedData = window.location.hash.replace('#data=', '');
    }
    if (!compressedData) return;

    try {
        const jsonString = LZString.decompressFromEncodedURIComponent(compressedData);
        const imported = JSON.parse(jsonString);
        const restored = restoreSharedState(imported);
        if (restored) {
            if (confirm('Dados compartilhados encontrados. Deseja importar e substituir os dados atuais?')) {
                state = restored;
                saveState();
                renderAll();
                alert('Dados importados com sucesso!');
            }
        }
    } catch (error) {
        console.error(error);
        alert('Não foi possível importar o link compartilhado.');
    } finally {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, null, cleanUrl);
    }
}

const PUBLISHED_BASE_URL = 'https://psrehder.github.io/rancho8seconds/domino-placar/index.html';

function getShareBaseUrl() {
    const currentUrl = window.location.href.split(/[?#]/)[0];
    if (currentUrl.startsWith('file:') || currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
        return PUBLISHED_BASE_URL;
    }
    return currentUrl;
}

function createShareUrl() {
    const payload = buildCompactSharePayload();
    const jsonString = JSON.stringify(payload);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    const baseUrl = getShareBaseUrl();
    return `${baseUrl}?d=${compressed}`;
}

function generateShareLink() {
    const shareUrl = createShareUrl();
    document.getElementById('shareLinkInput').value = shareUrl;
    const canvas = document.getElementById('qrCodeCanvas');
    new QRious({ element: canvas, value: shareUrl, size: 220, background: 'white', foreground: '#0f172a', level: 'L' });
    openModal('modalShare');
}

function copyShareLink() {
    const link = document.getElementById('shareLinkInput').value || createShareUrl();
    navigator.clipboard.writeText(link).then(() => {
        alert('Link de compartilhamento copiado!');
    });
}

function shareDataLink() {
    generateShareLink();
    const link = createShareUrl();
    if (navigator.share) {
        navigator.share({
            title: 'Placar Rancho 8 Segundos',
            text: 'Veja os dados do placar:',
            url: link
        }).catch(() => {
            openModal('modalShare');
        });
    } else {
        openModal('modalShare');
    }
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
    document.getElementById('btnShareLink').addEventListener('click', shareDataLink);
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
            alert('Este jogador já existe.');
            return;
        }
        state.players.push(name);
        saveState();
        renderAll();
        closeModals();
    });

    document.getElementById('formMatch').addEventListener('submit', event => {
        event.preventDefault();
        if (state.players.length < 4) {
            alert('Adicione pelo menos quatro jogadores antes de registrar partidas.');
            return;
        }

        const teamA1 = document.getElementById('playerA1').value;
        const teamA2 = document.getElementById('playerA2').value;
        const teamB1 = document.getElementById('playerB1').value;
        const teamB2 = document.getElementById('playerB2').value;
        const scoreA = parseInt(document.getElementById('scoreA').value, 10) || 0;
        const scoreB = parseInt(document.getElementById('scoreB').value, 10) || 0;

        const selectedPlayers = [teamA1, teamA2, teamB1, teamB2];
        const uniquePlayers = [...new Set(selectedPlayers)];
        if (uniquePlayers.length !== 4) {
            alert('Escolha quatro jogadores diferentes para formar as duas duplas.');
            return;
        }

        const matchData = {
            id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            date: document.getElementById('matchDate').value,
            teamA: [teamA1, teamA2],
            scoreA,
            teamB: [teamB1, teamB2],
            scoreB,
            notes: ''
        };

        state.matches.unshift(matchData);
        saveState();
        renderAll();
        document.getElementById('matchDate').value = getTodayString();
    });
});
