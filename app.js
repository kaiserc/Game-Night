/* =============================================
   GAME NIGHT — app.js
   APIs: OpenTDB, Deck of Cards, RPS 101, jService
   ============================================= */

'use strict';

// =============================================
// STATE
// =============================================

const state = {
  players: 4,
  duration: 'medium',
  vibe: 'party',
  deckId: null,

  // Trivia
  triviaQuestions: [],
  currentQuestion: 0,
  triviaScore: 0,
  triviaTotal: 10,
  answered: false,
  lastTriviaScore: 0,

  // RPS
  rpsObjects: [],

  // Scoreboard
  scoreboard: {},   // { name: { trivia: 0, jeopardy: 0 } }

  // Jeopardy
  jeopardyAnswer: '',
  jeopardyActivePlayer: null,
};

// =============================================
// BOOT
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadRPSObjects();
  loadScoreboard();
});

// =============================================
// TAB NAVIGATION
// =============================================

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${target}`).classList.add('active');
    });
  });
}

// =============================================
// PLANNER TAB
// =============================================

function adjustPlayers(delta) {
  state.players = Math.min(Math.max(state.players + delta, 2), 12);
  document.getElementById('playerDisplay').textContent = state.players;
}

function selectDuration(el) {
  document.querySelectorAll('.duration-pills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  state.duration = el.dataset.value;
}

async function generatePlan() {
  state.vibe = document.getElementById('vibeSelect').value;
  const resultsSection = document.getElementById('resultsSection');
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Reset content
  document.getElementById('gameLoading').style.display = 'flex';
  document.getElementById('gameContent').style.display = 'none';

  const [, scheduleItems] = await Promise.all([
    loadBoardGame(),
    buildSchedule(),
  ]);

  loadWarmup();
  renderSchedule(scheduleItems);
}

async function loadBoardGame() {
  // BGG top games — we pick a random one from a curated pool depending on vibe/player count
  const gamePools = {
    party:       ['13823','1406','163696','316554','31481'],    // Codenames etc IDs
    chill:       ['230802','68448','226884','172818','822'],
    competitive: ['84876','12333','167355','72125','199792'],
    family:      ['13823','9209','70323','822','171262'],
    nerdy:       ['167791','161936','220308','224517','236457'],
  };

  // Pick a random ID from the vibe pool
  const pool = gamePools[state.vibe] || gamePools['party'];
  const gameId = pool[Math.floor(Math.random() * pool.length)];

  try {
    const url = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
    const res = await fetch(url);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');

    const item = doc.querySelector('item');
    if (!item) throw new Error('No item');

    const name = item.querySelector('name[type="primary"]')?.getAttribute('value') || 'Mystery Game';
    const desc = (item.querySelector('description')?.textContent || '')
      .replace(/&#10;/g, ' ').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim().slice(0, 300) + '…';
    const minPlayers = item.querySelector('minplayers')?.getAttribute('value') || '2';
    const maxPlayers = item.querySelector('maxplayers')?.getAttribute('value') || '8';
    const minTime    = item.querySelector('minplaytime')?.getAttribute('value') || '30';
    const maxTime    = item.querySelector('maxplaytime')?.getAttribute('value') || '90';
    const rating     = parseFloat(item.querySelector('statistics ratings average')?.getAttribute('value') || '0').toFixed(1);
    const complexity = parseFloat(item.querySelector('averageweight')?.getAttribute('value') || '0').toFixed(1);

    document.getElementById('gameName').textContent = name;
    document.getElementById('gameDesc').textContent = desc;
    document.getElementById('gameMeta').innerHTML = `
      <span class="meta-tag">👥 ${minPlayers}–${maxPlayers} Players</span>
      <span class="meta-tag">⏱️ ${minTime}–${maxTime} min</span>
    `;
    document.getElementById('gameStats').innerHTML = `
      <div class="stat-item">
        <span class="stat-value">⭐ ${rating}</span>
        <span class="stat-label">BGG Rating</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">🧠 ${complexity}/5</span>
        <span class="stat-label">Complexity</span>
      </div>
    `;
  } catch (e) {
    // Fallback if BGG is slow/blocked
    const fallbacks = {
      party:       { name: 'Codenames', desc: 'Two rival spymasters know the secret identities of 25 agents. Their teammates know the agents only by their codenames. Compete to see which team can contact all of their agents first.', players:'2–8', time:'15–30', rating:'7.6', complexity:'1.9' },
      chill:       { name: 'Ticket to Ride', desc: 'Players collect cards of various types of train cars they then use to claim railway routes connecting cities throughout North America.', players:'2–5', time:'30–60', rating:'7.4', complexity:'1.9' },
      competitive: { name: 'Catan', desc: 'Players try to be the dominant force on the island of Catan by building settlements, cities, and roads. On each turn dice are rolled to determine what resources the island produces.', players:'3–4', time:'60–120', rating:'7.2', complexity:'2.3' },
      family:      { name: 'Azul', desc: 'Artisans have been commissioned to embellish the walls of the Royal Palace of Evora with magnificent azulejo tiles. Players draft colourful tiles to score points.', players:'2–4', time:'30–45', rating:'7.8', complexity:'1.8' },
      nerdy:       { name: 'Terraforming Mars', desc: 'Corporations are competing to terraform Mars. Each player controls a corporation and buys and plays cards describing different projects to develop the planet.', players:'1–5', time:'120–180', rating:'8.4', complexity:'3.2' },
    };
    const fb = fallbacks[state.vibe] || fallbacks.party;
    document.getElementById('gameName').textContent = fb.name;
    document.getElementById('gameDesc').textContent = fb.desc;
    document.getElementById('gameMeta').innerHTML = `
      <span class="meta-tag">👥 ${fb.players} Players</span>
      <span class="meta-tag">⏱️ ${fb.time} min</span>
    `;
    document.getElementById('gameStats').innerHTML = `
      <div class="stat-item">
        <span class="stat-value">⭐ ${fb.rating}</span>
        <span class="stat-label">BGG Rating</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">🧠 ${fb.complexity}/5</span>
        <span class="stat-label">Complexity</span>
      </div>
    `;
  }

  document.getElementById('gameLoading').style.display = 'none';
  document.getElementById('gameContent').style.display = 'block';
}

function loadWarmup() {
  const warmups = {
    party:       { icon: '🎯', title: 'Trivia Blitz!', desc: 'Kick off with a fast-paced 5-question trivia round. First to shout the answer scores a point!' },
    chill:       { icon: '🃏', title: 'High Card Icebreaker', desc: 'Everyone draws a card — highest card picks the seating arrangement and goes first tonight.' },
    competitive: { icon: '⚔️', title: 'RPS Seeding Round', desc: 'Determine player order with Rock Paper Scissors 101 — winner picks their starting position.' },
    family:      { icon: '🧠', title: 'Easy Trivia Warm-Up', desc: 'Start with 5 easy General Knowledge questions. Kids go first, making it fair for everyone!' },
    nerdy:       { icon: '📺', title: 'Jeopardy Opener', desc: 'Pull 3 Jeopardy clues — whoever gets the most right picks the first game tonight.' },
  };
  const w = warmups[state.vibe] || warmups.party;
  document.getElementById('warmupActivity').innerHTML = `
    <span class="warmup-icon">${w.icon}</span>
    <div>
      <h3 class="warmup-title">${w.title}</h3>
      <p class="warmup-desc">${w.desc}</p>
    </div>
  `;
}

function buildSchedule() {
  const durations = {
    short:  { warmup: 10, game1: 30, break1: 5,  game2: 0,  wrap: 5  },
    medium: { warmup: 15, game1: 50, break1: 10, game2: 40, wrap: 10 },
    long:   { warmup: 20, game1: 60, break1: 15, game2: 60, wrap: 15 },
  };

  const d = durations[state.duration] || durations.medium;
  const vibeGames = {
    party:       ['🎲 Main Board Game', '🎉 Bonus Party Round'],
    chill:       ['🎲 Main Board Game', '☕ Chill Card Game'],
    competitive: ['⚔️ Main Tournament Game', '🏆 Tiebreaker Round'],
    family:      ['🎲 Family Game', '🎮 Mini-Game Bonus'],
    nerdy:       ['🧠 Strategy Game', '📚 Trivia Championship'],
  };

  const games = vibeGames[state.vibe] || vibeGames.party;
  let clock = 0;
  const fmt = m => `${m}m`;

  const items = [
    { time: `0m`,           emoji: '🔥', text: 'Warm-Up Round',     duration: fmt(d.warmup) },
    { time: fmt(d.warmup),  emoji: '🎲', text: games[0],            duration: fmt(d.game1) },
    { time: fmt(d.warmup + d.game1), emoji: '☕', text: 'Break — snacks & scores!', duration: fmt(d.break1) },
  ];

  if (d.game2 > 0) {
    const breakStart = d.warmup + d.game1 + d.break1;
    items.push({ time: fmt(breakStart), emoji: '🎮', text: games[1], duration: fmt(d.game2) });
    items.push({ time: fmt(breakStart + d.game2), emoji: '🏆', text: 'Final Score & Crown your Champion!', duration: fmt(d.wrap) });
  } else {
    items.push({ time: fmt(d.warmup + d.game1 + d.break1), emoji: '🏆', text: 'Final Score & Crown your Champion!', duration: fmt(d.wrap) });
  }

  return items;
}

function renderSchedule(items) {
  const list = document.getElementById('scheduleList');
  list.innerHTML = items.map(item => `
    <div class="schedule-item">
      <span class="schedule-time">${item.time}</span>
      <span class="schedule-emoji">${item.emoji}</span>
      <span class="schedule-text">${item.text}</span>
      <span class="schedule-duration">${item.duration}</span>
    </div>
  `).join('');
}

function switchToTrivia() {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tabTrivia').classList.add('active');
  document.getElementById('panel-trivia').classList.add('active');
  document.getElementById('panel-trivia').scrollIntoView({ behavior: 'smooth' });
}

// =============================================
// TRIVIA TAB
// =============================================

async function startTrivia() {
  const catEl  = document.getElementById('triviaCategory');
  const diffEl = document.getElementById('triviaDifficulty');
  const cntEl  = document.getElementById('triviaCount');

  const cat    = catEl.value;
  const diff   = diffEl.value;
  const amount = parseInt(cntEl.value) || 10;

  state.triviaTotal   = amount;
  state.currentQuestion = 0;
  state.triviaScore   = 0;
  state.triviaQuestions = [];

  // Hide/show areas
  document.getElementById('triviaResults').style.display = 'none';
  document.getElementById('triviaGame').style.display    = 'block';
  document.getElementById('startTriviaBtn').disabled     = true;

  let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
  if (cat  !== 'any') url += `&category=${cat}`;
  if (diff !== 'any') url += `&difficulty=${diff}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.response_code !== 0 || !data.results.length) {
      throw new Error('No questions returned');
    }

    state.triviaQuestions = data.results;
    renderQuestion();
  } catch (e) {
    showToast('⚠️ Failed to load trivia — check your connection!');
    document.getElementById('triviaGame').style.display = 'none';
    document.getElementById('startTriviaBtn').disabled  = false;
  }
}

function renderQuestion() {
  const q = state.triviaQuestions[state.currentQuestion];
  if (!q) return;

  state.answered = false;
  const idx    = state.currentQuestion;
  const total  = state.triviaTotal;
  const pct    = ((idx) / total) * 100;

  document.getElementById('questionCounter').textContent = `Question ${idx + 1} of ${total}`;
  document.getElementById('triviaScore').textContent     = state.triviaScore;
  document.getElementById('triviaProgressBar').style.width = `${pct}%`;
  document.getElementById('qCategory').textContent       = decodeHTML(q.category);
  document.getElementById('questionText').textContent    = decodeHTML(q.question);
  document.getElementById('qFeedback').style.display     = 'none';
  document.getElementById('nextBtn').style.display       = 'none';

  const diffColors = { easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard' };
  document.getElementById('qDifficulty').textContent = diffColors[q.difficulty] || q.difficulty;

  // Shuffle answers
  const answers = [...q.incorrect_answers, q.correct_answer]
    .map(a => decodeHTML(a))
    .sort(() => Math.random() - 0.5);

  const grid = document.getElementById('answersGrid');
  grid.innerHTML = answers.map((ans, i) => `
    <button class="answer-btn" id="ans-${i}" onclick="checkAnswer(this, '${escapeAttr(ans)}', '${escapeAttr(decodeHTML(q.correct_answer))}')">${ans}</button>
  `).join('');
}

function checkAnswer(btn, selected, correct) {
  if (state.answered) return;
  state.answered = true;

  const isCorrect = selected === correct;
  if (isCorrect) state.triviaScore++;

  // Highlight all buttons
  document.querySelectorAll('.answer-btn').forEach(b => {
    b.disabled = true;
    if (b.textContent === correct)  b.classList.add('correct');
    if (b === btn && !isCorrect)    b.classList.add('wrong');
  });

  const fb = document.getElementById('qFeedback');
  fb.style.display = 'block';
  if (isCorrect) {
    fb.className = 'q-feedback correct-fb';
    fb.textContent = randomFrom(['🎉 Correct! Nice one!', '✅ Spot on!', '🔥 You got it!', '⭐ Brilliant!']);
  } else {
    fb.className = 'q-feedback wrong-fb';
    fb.textContent = `❌ Not quite — the answer was: "${correct}"`;
  }

  document.getElementById('triviaScore').textContent = state.triviaScore;

  if (state.currentQuestion < state.triviaTotal - 1) {
    document.getElementById('nextBtn').style.display = 'block';
  } else {
    setTimeout(endTrivia, 1200);
  }
}

function nextQuestion() {
  state.currentQuestion++;
  renderQuestion();
}

function endTrivia() {
  document.getElementById('triviaGame').style.display    = 'none';
  document.getElementById('triviaResults').style.display = 'block';
  document.getElementById('startTriviaBtn').disabled     = false;

  const score = state.triviaScore;
  const total = state.triviaTotal;
  state.lastTriviaScore = score;

  document.getElementById('finalScore').textContent = `${score} / ${total}`;

  const pct = score / total;
  let emoji, headline, flavour;

  if (pct === 1)         { emoji = '🏆'; headline = 'PERFECT SCORE!';          flavour = 'Absolutely flawless. Are you sure you haven\'t seen these before? 👀'; }
  else if (pct >= 0.8)   { emoji = '🥇'; headline = 'Knowledge Champion!';     flavour = 'Outstanding performance! You clearly know your stuff.'; }
  else if (pct >= 0.6)   { emoji = '🥈'; headline = 'Solid Showing!';          flavour = 'Above average — you\'re no slouch in the trivia department!'; }
  else if (pct >= 0.4)   { emoji = '🥉'; headline = 'Room to Improve!';        flavour = 'Not bad, but there\'s a rematch with your name on it...'; }
  else if (pct >= 0.2)   { emoji = '😅'; headline = 'Better Luck Next Time!';  flavour = 'The questions were clearly rigged. Definitely rigged.'; }
  else                   { emoji = '💀'; headline = 'Oof...';                   flavour = 'That was... a performance. Never speak of this again.'; }

  document.getElementById('resultEmoji').textContent   = emoji;
  document.getElementById('resultHeadline').textContent = headline;
  document.getElementById('resultFlavour').textContent  = flavour;
}

function addTriviaScore() {
  if (!Object.keys(state.scoreboard).length) {
    showToast('⚠️ Add players in the Scores tab first!');
    return;
  }

  const name = prompt('Which player completed this trivia round?\n' + Object.keys(state.scoreboard).join(', '));
  if (!name || !state.scoreboard[name]) {
    showToast('Player not found in scoreboard.');
    return;
  }

  state.scoreboard[name].trivia += state.lastTriviaScore;
  saveScoreboard();
  renderScoreboard();
  showToast(`✅ Added ${state.lastTriviaScore} trivia points to ${name}!`);
}

// =============================================
// MINI-GAMES TAB
// =============================================

function selectMinigame(btn, id) {
  document.querySelectorAll('.mg-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.minigame-panel').forEach(p => { p.style.display = 'none'; });
  document.getElementById(`mg-${id}`).style.display = 'block';
}

// Show first panel on load
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mg-rps').style.display = 'block';
});

// ----------- RPS 101 -----------

async function loadRPSObjects() {
  try {
    const res  = await fetch('https://rps101.pythonanywhere.com/api/v1/objects/all');
    const data = await res.json();
    state.rpsObjects = data;

    const p1 = document.getElementById('rpsP1');
    const p2 = document.getElementById('rpsP2');

    data.forEach(obj => {
      p1.innerHTML += `<option value="${escapeAttr(obj)}">${obj}</option>`;
      p2.innerHTML += `<option value="${escapeAttr(obj)}">${obj}</option>`;
    });

    // Random defaults
    const idx1 = Math.floor(Math.random() * data.length);
    let   idx2 = Math.floor(Math.random() * data.length);
    while (idx2 === idx1) idx2 = Math.floor(Math.random() * data.length);
    p1.value = data[idx1];
    p2.value = data[idx2];

  } catch (e) {
    // Fallback with standard objects
    const fallback = ['rock', 'paper', 'scissors', 'lizard', 'spock', 'fire', 'water', 'lightning', 'tornado', 'dragon'];
    state.rpsObjects = fallback;
    const p1 = document.getElementById('rpsP1');
    const p2 = document.getElementById('rpsP2');
    fallback.forEach(obj => {
      p1.innerHTML += `<option value="${obj}">${obj}</option>`;
      p2.innerHTML += `<option value="${obj}">${obj}</option>`;
    });
    p1.value = 'rock'; p2.value = 'scissors';
    showToast('🎮 Using classic RPS (API unavailable)');
  }
}

async function playRPS() {
  const p1Choice = document.getElementById('rpsP1').value;
  const p2Choice = document.getElementById('rpsP2').value;

  if (!p1Choice || !p2Choice) {
    showToast('Both players must pick something!');
    return;
  }

  document.getElementById('rpsBtn').disabled = true;
  const resultEl = document.getElementById('rpsResult');
  resultEl.style.display = 'block';
  resultEl.innerHTML = '<div class="spinner" style="margin:auto"></div>';

  try {
    if (p1Choice.toLowerCase() === p2Choice.toLowerCase()) {
      resultEl.innerHTML = `
        <div class="rps-winner">🤝 It's a Draw!</div>
        <div class="rps-detail"><strong>${p1Choice}</strong> vs <strong>${p2Choice}</strong> — too evenly matched!</div>
      `;
      document.getElementById('rpsBtn').disabled = false;
      return;
    }

    const res  = await fetch(`https://rps101.pythonanywhere.com/api/v1/outcome?object1=${encodeURIComponent(p1Choice)}&object2=${encodeURIComponent(p2Choice)}`);
    const data = await res.json();

    const winner  = data.winner === p1Choice ? 'Player 1' : 'Player 2';
    const loser   = data.winner === p1Choice ? 'Player 2' : 'Player 1';
    const outcome = data.outcome || `${data.winner} beats ${data.winner === p1Choice ? p2Choice : p1Choice}`;

    resultEl.innerHTML = `
      <div class="rps-winner">🏆 ${winner} Wins!</div>
      <div style="font-size:2rem;margin:8px 0">${p1Choice} ⚔️ ${p2Choice}</div>
      <div class="rps-detail">"<em>${outcome}</em>"</div>
    `;
  } catch (e) {
    // Simple fallback
    const classics = { rock: { beats: ['scissors'] }, scissors: { beats: ['paper'] }, paper: { beats: ['rock'] } };
    const p1Low = p1Choice.toLowerCase();
    const p2Low = p2Choice.toLowerCase();

    let winner;
    if ((classics[p1Low]?.beats || []).includes(p2Low))      winner = 'Player 1';
    else if ((classics[p2Low]?.beats || []).includes(p1Low)) winner = 'Player 2';
    else winner = 'Draw';

    resultEl.innerHTML = winner === 'Draw'
      ? `<div class="rps-winner">🤝 It's a Draw!</div>`
      : `<div class="rps-winner">🏆 ${winner} Wins!</div><div class="rps-detail">${p1Choice} vs ${p2Choice}</div>`;
  }

  document.getElementById('rpsBtn').disabled = false;
}

// ----------- High Card -----------

async function shuffleDeck() {
  const btn = document.getElementById('shuffleBtn');
  btn.textContent = '⏳ Shuffling…';
  btn.disabled = true;

  try {
    const res  = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
    const data = await res.json();
    state.deckId = data.deck_id;

    document.getElementById('dealBtn').style.display  = 'inline-flex';
    document.getElementById('cardResult').style.display = 'none';
    document.getElementById('cardPlayers').innerHTML = '';
    btn.textContent = '✅ Deck Ready! Shuffle Again';
    btn.disabled = false;
    showToast('🃏 New deck shuffled! Ready to deal.');
  } catch (e) {
    btn.textContent = '🔀 Shuffle New Deck';
    btn.disabled = false;
    showToast('⚠️ Deck API unavailable — using local shuffle!');
    state.deckId = 'local';
    document.getElementById('dealBtn').style.display = 'inline-flex';
  }
}

async function dealCards() {
  const count = state.players;
  document.getElementById('cardResult').style.display = 'none';
  document.getElementById('cardPlayers').innerHTML    = '';

  if (!state.deckId) {
    showToast('Shuffle a deck first!');
    return;
  }

  let cards = [];

  if (state.deckId === 'local') {
    cards = generateLocalCards(count);
  } else {
    try {
      const res  = await fetch(`https://deckofcardsapi.com/api/deck/${state.deckId}/draw/?count=${count}`);
      const data = await res.json();

      if (!data.success || data.cards.length < count) {
        // Re-shuffle
        await fetch(`https://deckofcardsapi.com/api/deck/${state.deckId}/shuffle/`);
        const res2  = await fetch(`https://deckofcardsapi.com/api/deck/${state.deckId}/draw/?count=${count}`);
        const data2 = await res2.json();
        cards = data2.cards;
      } else {
        cards = data.cards;
      }
    } catch (e) {
      cards = generateLocalCards(count);
    }
  }

  const cardValues = { 'ACE':14,'KING':13,'QUEEN':12,'JACK':11,'10':10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2 };
  const suitSymbols = { 'HEARTS':'♥','DIAMONDS':'♦','CLUBS':'♣','SPADES':'♠' };
  const redSuits = ['HEARTS','DIAMONDS'];

  // Find winner
  const withValues = cards.map((c, i) => ({
    ...c,
    numVal: cardValues[c.value?.toUpperCase()] || parseInt(c.value) || 0,
    player: i + 1,
  }));
  const maxVal = Math.max(...withValues.map(c => c.numVal));

  const playerSlots = document.getElementById('cardPlayers');
  const playerNames = Object.keys(state.scoreboard);

  withValues.forEach((card, i) => {
    const isWinner = card.numVal === maxVal;
    const suit   = (card.suit || 'SPADES').toUpperCase();
    const value  = (card.value || '?').toUpperCase();
    const symbol = suitSymbols[suit] || '♠';
    const isRed  = redSuits.includes(suit);
    const pName  = playerNames[i] || `Player ${i + 1}`;

    playerSlots.innerHTML += `
      <div class="player-card-slot">
        <div class="playing-card ${isRed ? 'red-card' : 'black-card'} ${isWinner ? 'winner-card' : ''}">
          <div class="card-value">${value}</div>
          <div class="card-suit">${symbol}</div>
        </div>
        <div class="card-player-name">${pName}</div>
      </div>
    `;
  });

  const winners = withValues.filter(c => c.numVal === maxVal);
  const resultEl = document.getElementById('cardResult');
  resultEl.style.display = 'block';
  if (winners.length > 1) {
    const names = winners.map(w => playerNames[w.player - 1] || `Player ${w.player}`).join(' & ');
    resultEl.innerHTML = `<div class="rps-winner">🤝 Tie! — ${names}</div>`;
  } else {
    const w = winners[0];
    const wName = playerNames[w.player - 1] || `Player ${w.player}`;
    resultEl.innerHTML = `<div class="rps-winner">🏆 ${wName} Wins!</div><div class="rps-detail">High card: ${w.value} of ${w.suit?.toLowerCase()}</div>`;
  }
}

function generateLocalCards(count) {
  const values = ['2','3','4','5','6','7','8','9','10','JACK','QUEEN','KING','ACE'];
  const suits  = ['HEARTS','DIAMONDS','CLUBS','SPADES'];
  const deck   = [];
  suits.forEach(s => values.forEach(v => deck.push({ value: v, suit: s })));
  deck.sort(() => Math.random() - 0.5);
  return deck.slice(0, count);
}

// ----------- Jeopardy -----------

async function loadJeopardyClue() {
  const catInput = document.getElementById('jeopardyCat').value;
  const card = document.getElementById('jeopardyCard');
  card.style.display = 'block';
  document.getElementById('jClue').textContent = '⏳ Loading clue…';
  document.getElementById('jAnswer').style.display = 'none';
  document.getElementById('jActions').style.display = 'none';

  let url = 'https://jservice.io/api/random';

  try {
    const res  = await fetch(url);
    const data = await res.json();
    const clue = data[0];

    state.jeopardyAnswer = clue.answer || '';

    document.getElementById('jCategory').textContent = (clue.category?.title || 'MYSTERY').toUpperCase();
    document.getElementById('jValue').textContent    = clue.value ? `$${clue.value}` : '$200';
    document.getElementById('jClue').innerHTML       = decodeHTML(clue.question || 'No clue found.');

    document.getElementById('revealBtn').style.display = 'block';
    document.getElementById('jAnswer').style.display   = 'none';
    document.getElementById('jActions').style.display  = 'none';
  } catch (e) {
    // Offline fallback clues
    const fallbacks = [
      { cat: 'SCIENCE', val: '$400', clue: 'This is the powerhouse of the cell.', answer: 'the mitochondria' },
      { cat: 'HISTORY', val: '$200', clue: 'He was the first President of the United States.', answer: 'George Washington' },
      { cat: 'POP CULTURE', val: '$600', clue: 'This fictional wizard school is located in Scotland.', answer: 'Hogwarts' },
      { cat: 'GEOGRAPHY', val: '$800', clue: 'This country claims to be both the world\'s largest democracy and the most populous nation.', answer: 'India' },
      { cat: 'SPORTS', val: '$1000', clue: 'He holds the record for most career NBA points.', answer: 'LeBron James' },
    ];
    const fb = randomFrom(fallbacks);
    state.jeopardyAnswer = fb.answer;
    document.getElementById('jCategory').textContent = fb.cat;
    document.getElementById('jValue').textContent    = fb.val;
    document.getElementById('jClue').textContent     = fb.clue;
  }
}

function revealAnswer() {
  document.getElementById('jAnswer').textContent = state.jeopardyAnswer;
  document.getElementById('jAnswer').style.display  = 'block';
  document.getElementById('jActions').style.display = 'flex';
  document.getElementById('revealBtn').style.display = 'none';
}

function jeopardyScore(correct) {
  if (!Object.keys(state.scoreboard).length) {
    showToast('⚠️ Add players in the Scores tab first!');
    return;
  }

  const names = Object.keys(state.scoreboard);
  const name  = prompt(`Who answered? (${names.join(', ')})`);
  if (!name || !state.scoreboard[name]) { showToast('Player not found!'); return; }

  const val = parseInt((document.getElementById('jValue').textContent || '$200').replace('$','')) || 200;

  if (correct) {
    state.scoreboard[name].jeopardy += val;
    showToast(`✅ +$${val} Jeopardy points for ${name}!`);
  } else {
    state.scoreboard[name].jeopardy -= val;
    showToast(`❌ -$${val} Jeopardy penalty for ${name}!`);
  }

  saveScoreboard();
  renderScoreboard();

  // Load a fresh clue after scoring
  setTimeout(loadJeopardyClue, 800);
}

// =============================================
// SCOREBOARD
// =============================================

function loadScoreboard() {
  try {
    const saved = JSON.parse(localStorage.getItem('gamenight_scores') || '{}');
    state.scoreboard = saved;
    renderPlayerTags();
    renderScoreboard();
  } catch (e) {
    state.scoreboard = {};
  }
}

function saveScoreboard() {
  localStorage.setItem('gamenight_scores', JSON.stringify(state.scoreboard));
}

function addPlayer() {
  const input = document.getElementById('newPlayerName');
  const name  = input.value.trim();
  if (!name) { showToast('Enter a player name!'); return; }
  if (state.scoreboard[name] !== undefined) { showToast(`${name} is already in the game!`); return; }
  state.scoreboard[name] = { trivia: 0, jeopardy: 0 };
  input.value = '';
  saveScoreboard();
  renderPlayerTags();
  renderScoreboard();
}

function removePlayer(name) {
  delete state.scoreboard[name];
  saveScoreboard();
  renderPlayerTags();
  renderScoreboard();
}

function renderPlayerTags() {
  const el = document.getElementById('playerTags');
  const names = Object.keys(state.scoreboard);
  el.innerHTML = names.map(name => `
    <div class="player-tag">
      ${name}
      <button class="tag-remove" onclick="removePlayer('${escapeAttr(name)}')" title="Remove">×</button>
    </div>
  `).join('');
}

function renderScoreboard() {
  const names = Object.keys(state.scoreboard);
  const wrap  = document.getElementById('scoreboardWrap');
  const fame  = document.getElementById('hallOfFame');

  if (!names.length) {
    wrap.style.display = 'none';
    fame.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  const sorted = names
    .map(name => ({
      name,
      trivia:    state.scoreboard[name].trivia,
      jeopardy:  state.scoreboard[name].jeopardy,
      total:     state.scoreboard[name].trivia + state.scoreboard[name].jeopardy,
    }))
    .sort((a, b) => b.total - a.total);

  const body = document.getElementById('scoreboardBody');
  body.innerHTML = sorted.map((p, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
    const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
    return `
      <tr>
        <td><span class="rank-badge ${rankClass}">${rankEmoji}</span></td>
        <td><strong>${p.name}</strong></td>
        <td class="score-cell">${p.trivia}</td>
        <td class="score-cell">${p.jeopardy > 0 ? '+' : ''}${p.jeopardy}</td>
        <td class="total-cell">${p.total}</td>
      </tr>
    `;
  }).join('');

  // Hall of fame
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
  showToast('🗑️ Players cleared.');
}

// =============================================
// UTILITIES
// =============================================

function decodeHTML(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

function escapeAttr(str) {
  return String(str).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}
