import { showToast, escapeAttr } from './utils.js';

let state;
let app;

export function initScoreboard(_state, _app) {
  state = _state;
  app = _app; // To access functions like switchToScoresTab

  // Add player event listeners
  document.querySelector('#newPlayerName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addPlayer();
  });
  document.querySelector('.add-player-row .cta-btn').addEventListener('click', addPlayer);

  // Scoreboard actions event listeners

  document.querySelector('.scoreboard-actions .ghost-btn').addEventListener('click', resetScores);
  document.querySelector('.scoreboard-actions .danger').addEventListener('click', clearPlayers);
  
  // Initial render
  loadScoreboard();
}

function loadScoreboard() {
  try {
    const saved = JSON.parse(localStorage.getItem('gamenight_scores') || '{}');
    state.scoreboard = saved;
    renderPlayerTags();
    renderScoreboard();
  } catch (e) {
    state.scoreboard = {};
  }
  checkOnboarding();
}

export function saveScoreboard() {
  localStorage.setItem('gamenight_scores', JSON.stringify(state.scoreboard));
}

function addPlayer() {
  const input = document.getElementById('newPlayerName');
  const name = input.value.trim();
  if (!name) { showToast('Enter a player name!'); return; }
  if (state.scoreboard[name] !== undefined) { showToast(`${name} is already in the game!`); return; }
  state.scoreboard[name] = { trivia: 0, jeopardy: 0 };
  input.value = '';
  saveScoreboard();
  renderPlayerTags();
  renderScoreboard();
  checkOnboarding();
}

function removePlayer(name) {
  delete state.scoreboard[name];
  saveScoreboard();
  renderPlayerTags();
  renderScoreboard();
  checkOnboarding();
}

function renderPlayerTags() {
  const el = document.getElementById('playerTags');
  const names = Object.keys(state.scoreboard);
  el.innerHTML = names.map(name => `
    <div class="player-tag">
      ${name}
      <button class="tag-remove" data-name="${escapeAttr(name)}" title="Remove">×</button>
    </div>
  `).join('');

  // Add event listeners to new remove buttons
  el.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => removePlayer(e.target.dataset.name));
  });
}

function renderScoreboard() {
  renderScoreboardAnimated(null);
}

export function renderScoreboardAnimated(highlightPlayer) {
  const names = Object.keys(state.scoreboard);
  const wrap = document.getElementById('scoreboardWrap');
  const fame = document.getElementById('hallOfFame');

  if (!names.length) {
    wrap.style.display = 'none';
    fame.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  const sorted = names
    .map(name => ({
      name,
      trivia: state.scoreboard[name].trivia,
      jeopardy: state.scoreboard[name].jeopardy,
      total: state.scoreboard[name].trivia + state.scoreboard[name].jeopardy,
    }))
    .sort((a, b) => b.total - a.total);

  const body = document.getElementById('scoreboardBody');
  body.innerHTML = sorted.map((p, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
    const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
    const isUpdating = p.name === highlightPlayer;
    return `
      <tr class="${isUpdating ? 'new-score' : ''}">
        <td><span class="rank-badge ${rankClass}">${rankEmoji}</span></td>
        <td><strong>${p.name}</strong></td>
        <td class="score-cell">${p.trivia}</td>
        <td class="score-cell">${p.jeopardy >= 0 ? '+' : ''}${p.jeopardy}</td>
        <td class="total-cell">${p.total}</td>
      </tr>
    `;
  }).join('');

  if (sorted.length > 0) {
    const leader = sorted[0];
    fame.style.display = 'block';
    document.getElementById('leaderDisplay').innerHTML = `
      🥇 ${leader.name} — <span>${leader.total} pts</span>
    `;
  }
}

function resetScores() {
  if (!confirm('Reset all scores to zero?')) return;
  Object.keys(state.scoreboard).forEach(name => {
    state.scoreboard[name] = { trivia: 0, jeopardy: 0 };
  });
  saveScoreboard();
  renderScoreboard();
  showToast('🔄 All scores reset!');
}

function clearPlayers() {
  if (!confirm('Remove all players and scores?')) return;
  state.scoreboard = {};
  saveScoreboard();
  renderPlayerTags();
  renderScoreboard();
  checkOnboarding();
  showToast('🗑️ Players cleared.');
}

function checkOnboarding() {
  const hasPlayers = Object.keys(state.scoreboard).length > 0;
  const overlay = document.getElementById('noPlayersOverlay');
  if (overlay) {
    overlay.style.display = hasPlayers ? 'none' : 'flex';
  }
}

// --- Player Modal ---

export function openPlayerScoreModal(title, description) {
    return new Promise((resolve) => {
        const modal = document.getElementById('playerModal');
        const list = document.getElementById('modalPlayerList');
        const empty = document.getElementById('modalEmptyState');
        const names = Object.keys(state.scoreboard);

        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalDesc').textContent = description;

        const closeModal = () => {
            modal.classList.remove('active');
            resolve(null); // Resolve with null if closed without selection
        };

        const selectPlayer = (name) => {
            modal.classList.remove('active');
            resolve(name);
        };
        
        // Clean up old listeners before adding new ones
        const oldModal = modal.cloneNode(true);
        modal.parentNode.replaceChild(oldModal, modal);
        
        const newModal = document.getElementById('playerModal');
        newModal.querySelector('.modal-close').onclick = closeModal;
        newModal.querySelector('.modal-backdrop').onclick = (e) => {
            if (e.target === newModal) closeModal();
        };

        if (!names.length) {
            list.style.display = 'none';
            empty.style.display = 'block';
            empty.querySelector('button').onclick = () => {
                closeModal();
                app.switchToScoresTab();
            };
        } else {
            list.style.display = 'flex';
            empty.style.display = 'none';
            list.innerHTML = names.map(name => `
                <button class="modal-player-btn" data-name="${escapeAttr(name)}">
                    <span>${name}</span>
                    <span class="player-rank">Score: ${state.scoreboard[name].trivia + state.scoreboard[name].jeopardy}</span>
                </button>
            `).join('');
            list.querySelectorAll('.modal-player-btn').forEach(btn => {
                btn.onclick = () => selectPlayer(btn.dataset.name);
            });
        }
        
        newModal.classList.add('active');
    });
}
