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

  // Game Night Engine Tracking
  sessionActive: false,
  currentStepIndex: 0,
  schedule: [],

  // Jeopardy
  jeopardyAnswer: '',
  jeopardyActivePlayer: null,

  // Hangman
  hangmanWord: '',
  hangmanGuessed: [],
  hangmanMisses: 0,
  hangmanMaxMisses: 6,
  hangmanStatus: 'waiting', // waiting, playing, won, lost
  hangmanDefinition: '',
  hangmanHintUsed: 0,
  hangmanFreeHints: false,

  // Blackjack
  bjPlayerHand: [],
  bjDealerHand: [],
  bjStatus: 'waiting', // waiting, playing, resolved

  // Solitaire
  solStock: [],
  solWaste: [],
  solFoundations: [[], [], [], []],
  solTableau: [[], [], [], [], [], [], []],
  solSelected: null, // { type: 'waste'|'tableau'|'foundation', pIdx, cIdx }
};

// =============================================
// BOOT
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadRPSObjects();
  loadScoreboard();
  checkOnboarding();
});

function checkOnboarding() {
  const hasPlayers = Object.keys(state.scoreboard).length > 0;
  const overlay = document.getElementById('noPlayersOverlay');
  if (overlay) {
    overlay.style.display = hasPlayers ? 'none' : 'flex';
  }
}

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

function switchToPlannerTab() {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tabPlanner').classList.add('active');
  document.getElementById('panel-planner').classList.add('active');
  document.getElementById('panel-planner').scrollIntoView({ behavior: 'smooth' });
}

async function generatePlan() {
  state.vibe = document.getElementById('vibeSelect').value;
  state.sessionActive = true;
  state.currentStepIndex = 0;
  
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

  state.schedule = scheduleItems;
  loadWarmup();
  renderSchedule(scheduleItems);
}

async function loadBoardGame() {
  // BGG top games — we pick a random one from a curated pool depending on vibe/player count
  const gamePools = {
    party:       ['13823','1406','163696','316554','31481','171623','129623','324145'],
    chill:       ['230802','68448','226884','172818','822','266192','233867','148228'],
    competitive: ['84876','12333','167355','72125','199792','169786','161936','220308'],
    family:      ['13823','9209','70323','822','171262','31481','235375','25292'],
    nerdy:       ['167791','161936','220308','224517','236457','31260','50','193738'],
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
    // Fallback if BGG is slow/blocked/CORS
    const fallbacks = {
      party: [
        { name: 'Codenames', desc: 'Two rival spymasters know the secret identities of 25 agents. Teammates try to contact all of their agents first.', players:'2–8', time:'15–30', rating:'7.6', complexity:'1.9' },
        { name: 'Dixit', desc: 'A multi-award-winning game of storytelling and intuition where players use beautiful artwork to bluff their opponents.', players:'3–6', time:'30', rating:'7.2', complexity:'1.2' }
      ],
      chill: [
        { name: 'Ticket to Ride', desc: 'Collect cards of various types of train cars to claim railway routes connecting cities.', players:'2–5', time:'30–60', rating:'7.4', complexity:'1.9' },
        { name: 'Wingspan', desc: 'Bird enthusiasts—researchers, bird watchers, ornithologists—seeking to discover and attract the best birds to your sanctuary.', players:'1–5', time:'40–70', rating:'8.1', complexity:'2.4' }
      ],
      competitive: [
        { name: 'Catan', desc: 'Build settlements, cities, and roads on the island of Catan. Roll dice to determine what resources the island produces.', players:'3–4', time:'60–120', rating:'7.2', complexity:'2.3' },
        { name: '7 Wonders', desc: 'You are the leader of one of the 7 great cities of the Ancient World. Gather resources, develop commercial routes, and affirm your military supremacy.', players:'2–7', time:'30', rating:'7.7', complexity:'2.3' }
      ],
      family: [
        { name: 'Azul', desc: 'Artisans commission magnificent azulejo tiles. Draft colourful tiles to score points while decorated palace walls.', players:'2–4', time:'30–45', rating:'7.8', complexity:'1.8' },
        { name: 'Splendor', desc: 'The Renaissance was a time of beauty and wealth. Players compete to collect gem tokens and purchase development cards.', players:'2–4', time:'30', rating:'7.4', complexity:'1.8' }
      ],
      nerdy: [
        { name: 'Terraforming Mars', desc: 'Corporations compete to terraform Mars. Use projects to develop the planet and increase the oxygen level.', players:'1–5', time:'120–180', rating:'8.4', complexity:'3.2' },
        { name: 'Gloomhaven', desc: 'A game of Euro-inspired tactical combat in a persistent world of shifting motives.', players:'1–4', time:'60–120', rating:'8.7', complexity:'3.9' }
      ],
    };
    const vibeList = fallbacks[state.vibe] || fallbacks.party;
    const fb = randomFrom(vibeList);
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
  document.getElementById('gameActions').style.display = 'block';
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
    '10m':  { warmup: 3,  game1: 7,  break1: 0,  game2: 0,  wrap: 0  },
    '20m':  { warmup: 5,  game1: 10, break1: 0,  game2: 0,  wrap: 5  },
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
  const fmt = m => `${m}m`;

  const items = [
    { time: `0m`,           emoji: '🔥', text: 'Warm-Up Round',     value: d.warmup },
    { time: fmt(d.warmup),  emoji: '🎲', text: games[0],            value: d.game1 },
    { time: fmt(d.warmup + d.game1), emoji: '☕', text: 'Break — snacks & scores!', value: d.break1 },
  ];

  if (d.game2 > 0) {
    const breakStart = d.warmup + d.game1 + d.break1;
    items.push({ time: fmt(breakStart), emoji: '🎮', text: games[1], value: d.game2 });
    items.push({ time: fmt(breakStart + d.game2), emoji: '🏆', text: 'Final Score & Winner!', value: d.wrap });
  } else {
    items.push({ time: fmt(d.warmup + d.game1 + d.break1), emoji: '🏆', text: 'Final Score & Winner!', value: d.wrap });
  }

  // Map values to strings and filter out anything with 0 duration
  return items
    .filter(item => item.value > 0)
    .map(item => ({
      time: item.time,
      emoji: item.emoji,
      text: item.text,
      duration: fmt(item.value)
    }));
}

function renderSchedule(items) {
  const list = document.getElementById('scheduleList');
  list.innerHTML = items.map((item, i) => `
    <div class="schedule-item ${state.currentStepIndex > i ? 'completed' : ''}" id="sched-item-${i}" onclick="jumpToActivity(${i})">
      <span class="schedule-time">${item.time}</span>
      <span class="schedule-emoji">${item.emoji}</span>
      <span class="schedule-text">${item.text}</span>
      <span class="schedule-duration">${item.duration}</span>
    </div>
  `).join('');
}

function jumpToActivity(idx) {
  state.currentStepIndex = idx;
  renderSchedule(state.schedule);
  const item = state.schedule[idx];
  
  if (item.text.toLowerCase().includes('warm-up')) {
    switchToTrivia(true);
  } else if (item.text.toLowerCase().includes('main board') || item.text.toLowerCase().includes('strategy')) {
    switchToPlannerTab();
    document.getElementById('boardGameCard').scrollIntoView({ behavior: 'smooth' });
  } else if (item.text.toLowerCase().includes('trivia')) {
    switchToTrivia(false);
  } else if (item.text.toLowerCase().includes('mini-game')) {
    switchToMinigames();
  } else {
    switchToPlannerTab();
    showToast(`Current Activity: ${item.text}`);
  }
}

function switchToTrivia(isWarmup = false) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tabTrivia').classList.add('active');
  document.getElementById('panel-trivia').classList.add('active');
  document.getElementById('panel-trivia').scrollIntoView({ behavior: 'smooth' });
  
  const nextBtn = document.getElementById('triviaToNext');
  nextBtn.style.display = 'inline-flex';

  if (isWarmup) {
    document.getElementById('triviaCount').value = '5';
    document.getElementById('triviaDifficulty').value = 'easy';
    nextBtn.textContent = 'Next: Main Game →';
  } else {
    // Look ahead in schedule
    const nextItem = state.schedule[state.currentStepIndex + 1];
    nextBtn.textContent = nextItem ? `Next: ${nextItem.text} →` : 'Back to Plan →';
  }
}

function switchToMinigames() {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tabMinigames').classList.add('active');
  document.getElementById('panel-minigames').classList.add('active');
}

function goToNextScheduleItem() {
  state.currentStepIndex++;
  renderSchedule(state.schedule);
  switchToPlannerTab();
  
  // Flash the next card
  const nextCard = state.currentStepIndex === 1 ? 'boardGameCard' : 'scheduleCard';
  const el = document.getElementById(nextCard);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.boxShadow = '0 0 40px rgba(139, 92, 246, 0.8)';
  setTimeout(() => el.style.boxShadow = '', 2000);
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

  // Reset "add to scoreboard" button if it was disabled
  const addBtn = document.getElementById('addTriviaScoreBtn');
  if (addBtn) {
    addBtn.disabled = false;
    addBtn.textContent = 'Add to Scoreboard 🏆';
  }

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

function addTriviaScore(playerName) {
  if (!state.scoreboard[playerName]) {
    showToast('Player not found!');
    return;
  }

  state.scoreboard[playerName].trivia += state.lastTriviaScore;
  saveScoreboard();
  renderScoreboardAnimated(playerName);
  showToast(`✅ Added ${state.lastTriviaScore} trivia points to ${playerName}!`);
  
  // Disable button so they don't add twice
  const addBtn = document.getElementById('addTriviaScoreBtn');
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.textContent = 'Points Added! ✅';
  }
}

// =============================================
// MINI-GAMES TAB
// =============================================

function selectMinigame(btn, id) {
  document.querySelectorAll('.mg-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.minigame-panel').forEach(p => { p.style.display = 'none'; });
  document.getElementById(`mg-${id}`).style.display = 'block';

  if (id === 'cards' && !state.deckId) shuffleBlackjackDeck();
  if (id === 'hangman' && state.hangmanStatus === 'waiting') initHangman();
  if (id === 'solitaire' && state.solStock.length === 0) initSolitaire();
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

// ----------- Blackjack 21 -----------

async function startBlackjack() {
  const resultEl = document.getElementById('bjResult');
  const pHandEl = document.getElementById('playerHand');
  const dHandEl = document.getElementById('dealerHand');
  
  resultEl.style.display = 'none';
  pHandEl.innerHTML = '<div class="spinner"></div>';
  dHandEl.innerHTML = '<div class="spinner"></div>';
  
  document.getElementById('bjInitialControls').style.display = 'none';
  document.getElementById('bjActiveControls').style.display = 'none';

  state.bjPlayerHand = [];
  state.bjDealerHand = [];
  state.bjStatus = 'playing';

  // Ensure we have a deck
  if (!state.deckId || state.deckId === 'local') {
    await shuffleBlackjackDeck();
  }

  // Draw 2 for player, 2 for dealer
  try {
    const res = await fetch(`https://deckofcardsapi.com/api/deck/${state.deckId}/draw/?count=4`);
    const data = await res.json();
    
    if (!data.success) {
      await shuffleBlackjackDeck();
      return startBlackjack();
    }

    state.bjPlayerHand = [data.cards[0], data.cards[1]];
    state.bjDealerHand = [data.cards[2], data.cards[3]];

    renderBlackjack();
    document.getElementById('bjActiveControls').style.display = 'block';
    
    // Check for natural 21
    if (calculateHand(state.bjPlayerHand) === 21) {
      blackjackStand();
    }
  } catch (e) {
    showToast('⚠️ Card API error — using local deck');
    state.bjPlayerHand = [generateLocalCard(), generateLocalCard()];
    state.bjDealerHand = [generateLocalCard(), generateLocalCard()];
    renderBlackjack();
    document.getElementById('bjActiveControls').style.display = 'block';
  }
}

async function shuffleBlackjackDeck() {
  try {
    const res = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
    const data = await res.json();
    state.deckId = data.deck_id;
  } catch(e) {
    state.deckId = 'local';
  }
}

function renderBlackjack() {
  const pHand = document.getElementById('playerHand');
  const dHand = document.getElementById('dealerHand');
  const pScore = document.getElementById('playerScore');
  const dScore = document.getElementById('dealerScore');

  pHand.innerHTML = state.bjPlayerHand.map(card => `
    <div class="playing-card"><img src="${card.image}" alt="${card.value}"></div>
  `).join('');

  if (state.bjStatus === 'playing') {
    // Hide dealer's second card
    dHand.innerHTML = `
      <div class="playing-card"><img src="${state.bjDealerHand[0].image}" alt="${state.bjDealerHand[0].value}"></div>
      <div class="playing-card" style="background: var(--gradient-alt); display: flex; align-items: center; justify-content: center; font-size: 2rem;">❓</div>
    `;
    dScore.textContent = calculateHand([state.bjDealerHand[0]]);
  } else {
    dHand.innerHTML = state.bjDealerHand.map(card => `
      <div class="playing-card"><img src="${card.image}" alt="${card.value}"></div>
    `).join('');
    dScore.textContent = calculateHand(state.bjDealerHand);
  }

  pScore.textContent = calculateHand(state.bjPlayerHand);
}

function calculateHand(hand) {
  let total = 0;
  let aces = 0;

  hand.forEach(card => {
    if (card.value === 'ACE') {
      aces++;
      total += 11;
    } else if (['KING', 'QUEEN', 'JACK'].includes(card.value.toUpperCase()) || parseInt(card.value) >= 10) {
      total += 10;
    } else {
      total += parseInt(card.value) || 0;
    }
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

async function blackjackHit() {
  if (state.bjStatus !== 'playing') return;

  try {
    const res = await fetch(`https://deckofcardsapi.com/api/deck/${state.deckId}/draw/?count=1`);
    const data = await res.json();
    state.bjPlayerHand.push(data.cards[0]);
    
    renderBlackjack();

    if (calculateHand(state.bjPlayerHand) > 21) {
      resolveBlackjack('Bust! Dealer Wins 💀');
    }
  } catch (e) {
    state.bjPlayerHand.push(generateLocalCard());
    renderBlackjack();
    if (calculateHand(state.bjPlayerHand) > 21) resolveBlackjack('Bust! Dealer Wins 💀');
  }
}

async function blackjackStand() {
  if (state.bjStatus !== 'playing') return;
  state.bjStatus = 'resolved';

  // Dealer plays
  let dVal = calculateHand(state.bjDealerHand);
  while (dVal < 17) {
    if (state.deckId === 'local') {
      state.bjDealerHand.push(generateLocalCard());
    } else {
      try {
        const res = await fetch(`https://deckofcardsapi.com/api/deck/${state.deckId}/draw/?count=1`);
        const data = await res.json();
        state.bjDealerHand.push(data.cards[0]);
      } catch(e) {
        state.bjDealerHand.push(generateLocalCard());
      }
    }
    dVal = calculateHand(state.bjDealerHand);
  }

  renderBlackjack();

  const pVal = calculateHand(state.bjPlayerHand);
  if (dVal > 21) {
    resolveBlackjack('Dealer Busts! You Win! 🏆');
  } else if (dVal > pVal) {
    resolveBlackjack('Dealer Wins 💀');
  } else if (pVal > dVal) {
    resolveBlackjack('You Win! 🏆');
  } else {
    resolveBlackjack('Push (Draw) 🤝');
  }
}

function resolveBlackjack(msg) {
  state.bjStatus = 'resolved';
  const resultEl = document.getElementById('bjResult');
  resultEl.style.display = 'block';
  resultEl.textContent = msg;
  
  if (msg.includes('Win')) resultEl.className = 'bj-result glass-card result-win';
  else if (msg.includes('Draw') || msg.includes('Push')) resultEl.className = 'bj-result glass-card result-push';
  else resultEl.className = 'bj-result glass-card result-loss';

  document.getElementById('bjInitialControls').style.display = 'block';
  document.getElementById('bjActiveControls').style.display = 'none';
  
  renderBlackjack();
}

function generateLocalCard() {
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'JACK', 'QUEEN', 'KING', 'ACE'];
  const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
  const v = randomFrom(values);
  const s = randomFrom(suits);
  return {
    value: v,
    suit: s,
    image: `https://deckofcardsapi.com/static/img/${v === '10' ? '0' : v[0]}${s[0]}.png`
  };
}

// ----------- Solitaire -----------

function initSolitaire() {
  const values = ['ACE', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'JACK', 'QUEEN', 'KING'];
  const suits = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'];
  const fullDeck = [];
  
  // Build and shuffle
  suits.forEach(s => values.forEach(v => {
    fullDeck.push({
      value: v,
      suit: s,
      image: `https://deckofcardsapi.com/static/img/${v === '10' ? '0' : v[0]}${s[0]}.png`,
      color: (s === 'HEARTS' || s === 'DIAMONDS') ? 'red' : 'black',
      val: values.indexOf(v) + 1,
      hidden: true
    });
  }));
  fullDeck.sort(() => Math.random() - 0.5);

  // Clear state
  state.solFoundations = [[], [], [], []];
  state.solWaste = [];
  state.solSelected = null;
  state.solTableau = [[], [], [], [], [], [], []];

  // Deal Tableau
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j <= i; j++) {
      const card = fullDeck.pop();
      if (j === i) card.hidden = false;
      state.solTableau[i].push(card);
    }
  }

  // Rest to Stock
  state.solStock = fullDeck.map(c => ({ ...c, hidden: true }));
  
  renderSolitaire();
  showToast('🃏 Solitaire: Good luck!');
}

function renderSolitaire() {
  const stock = document.getElementById('solStock');
  const waste = document.getElementById('solWaste');
  
  // Render Stock
  stock.innerHTML = state.solStock.length > 0 ? `<div class="sol-card back"></div>` : '';
  
  // Render Waste
  waste.innerHTML = state.solWaste.map((c, i) => `
    <div class="sol-card ${state.solSelected?.type==='waste' ? 'selected':''}" 
         draggable="true"
         ondragstart="handleSolDragStart(event, 'waste', 0, ${i})"
         onclick="selectSolCard('waste', 0, ${i})">
      <img src="${c.image}">
    </div>
  `).slice(-1).join(''); // Only show top card

  // Render Foundations
  for (let i = 0; i < 4; i++) {
    const f = document.getElementById(`f-${i}`);
    const cards = state.solFoundations[i];
    f.innerHTML = cards.length > 0 
      ? `<div class="sol-card" draggable="true" ondragstart="handleSolDragStart(event, 'foundation', ${i}, ${cards.length-1})" onclick="selectSolCard('foundation', ${i}, ${cards.length-1})"><img src="${cards[cards.length-1].image}"></div>`
      : '';
    // Allow dropping on foundation
    f.setAttribute('ondragover', 'event.preventDefault()');
    f.setAttribute('ondrop', `handleSolDrop(event, 'foundation', ${i})`);
  }

  // Render Tableau
  for (let i = 0; i < 7; i++) {
    const t = document.getElementById(`t-${i}`);
    const cards = state.solTableau[i];
    
    t.innerHTML = cards.map((c, j) => {
      const isSelected = state.solSelected?.type === 'tableau' && 
                        state.solSelected.pIdx === i && 
                        state.solSelected.cIdx === j;
      const offset = j * 20;
      const isDraggable = !c.hidden;
      
      return `
        <div class="sol-card ${c.hidden ? 'back' : ''} ${isSelected ? 'selected' : ''}" 
             style="top: ${offset}px; z-index: ${j}"
             ${isDraggable ? `draggable="true" ondragstart="handleSolDragStart(event, 'tableau', ${i}, ${j})"` : ''}
             onclick="handleTableauClick(${i}, ${j}, event)">
          ${c.hidden ? '' : `<img src="${c.image}">`}
        </div>
      `;
    }).join('');

    // If empty, add a click zone
    if (cards.length === 0) {
      t.innerHTML = `<div class="card-slot t-empty" style="position: absolute; top:0; left:0; width:100%; border:none" onclick="handleTableauClick(${i}, -1, event)"></div>`;
    }
    
    // Allow dropping on tableau column
    t.setAttribute('ondragover', 'event.preventDefault()');
    t.setAttribute('ondrop', `handleSolDrop(event, 'tableau', ${i})`);
  }
}

function handleSolDragStart(e, type, pIdx, cIdx) {
  state.solSelected = { type, pIdx, cIdx };
  e.dataTransfer.setData('text/plain', JSON.stringify({ type, pIdx, cIdx }));
  // Optional: Add a class for styling while dragging
  setTimeout(() => e.target.classList.add('dragging'), 0);
}

function handleSolDrop(e, toType, toIdx) {
  e.preventDefault();
  if (!state.solSelected) return;

  const movingCards = getSelectedCards();
  if (toType === 'tableau') {
    const targetPile = state.solTableau[toIdx];
    if (canMoveToTableau(movingCards[0], targetPile[targetPile.length - 1])) {
      executeMove('tableau', toIdx);
    }
  } else if (toType === 'foundation') {
    const targetF = state.solFoundations[toIdx];
    const topF = targetF[targetF.length - 1];
    const card = movingCards[0];
    if (movingCards.length === 1 && ((!topF && card.val === 1) || (topF && topF.suit === card.suit && card.val === topF.val + 1))) {
      executeMove('foundation', toIdx);
    }
  }
  state.solSelected = null;
  renderSolitaire();
}

function drawFromStock() {
  if (state.solStock.length === 0) {
    // Recycle waste
    state.solStock = state.solWaste.reverse().map(c => ({ ...c, hidden: true }));
    state.solWaste = [];
  } else {
    const card = state.solStock.pop();
    card.hidden = false;
    state.solWaste.push(card);
  }
  state.solSelected = null;
  renderSolitaire();
}

function selectSolCard(type, pIdx, cIdx) {
  state.solSelected = { type, pIdx, cIdx };
  renderSolitaire();
}

function handleTableauClick(pIdx, cIdx, e) {
  e.stopPropagation();
  const targetPile = state.solTableau[pIdx];
  const targetCard = targetPile[cIdx];

  // If we have a selection, try to move
  if (state.solSelected) {
    const movingCards = getSelectedCards();
    if (canMoveToTableau(movingCards[0], targetPile[targetPile.length - 1])) {
      executeMove('tableau', pIdx);
      return;
    }
  }

  // Otherwise, select
  if (cIdx !== -1 && !targetCard.hidden) {
    selectSolCard('tableau', pIdx, cIdx);
  }
}

function getSelectedCards() {
  const s = state.solSelected;
  if (s.type === 'waste') return [state.solWaste[state.solWaste.length - 1]];
  if (s.type === 'foundation') return [state.solFoundations[s.pIdx][s.cIdx]];
  if (s.type === 'tableau') return state.solTableau[s.pIdx].slice(s.cIdx);
  return [];
}

function canMoveToTableau(card, targetCard) {
  if (!targetCard) return card.val === 13; // King to empty
  return card.color !== targetCard.color && card.val === targetCard.val - 1;
}

function moveSelectedToFoundation(pIdx) {
  if (!state.solSelected) return;
  const cards = getSelectedCards();
  if (cards.length !== 1) return;
  
  const card = cards[0];
  const targetF = state.solFoundations[pIdx];
  const topF = targetF[targetF.length - 1];

  const canMove = (!topF && card.val === 1) || (topF && topF.suit === card.suit && card.val === topF.val + 1);

  if (canMove) {
    executeMove('foundation', pIdx);
  }
}

function executeMove(toType, toIdx) {
  const s = state.solSelected;
  let cards;

  // Remove from source
  if (s.type === 'waste') cards = [state.solWaste.pop()];
  if (s.type === 'foundation') cards = [state.solFoundations[s.pIdx].pop()];
  if (s.type === 'tableau') {
    cards = state.solTableau[s.pIdx].splice(s.cIdx);
    // Flip new top card
    if (state.solTableau[s.pIdx].length > 0) {
      state.solTableau[s.pIdx][state.solTableau[s.pIdx].length - 1].hidden = false;
    }
  }

  // Add to target
  if (toType === 'tableau') state.solTableau[toIdx].push(...cards);
  if (toType === 'foundation') state.solFoundations[toIdx].push(...cards);

  state.solSelected = null;
  renderSolitaire();
  checkSolitaireWin();
}

function checkSolitaireWin() {
  const total = state.solFoundations.reduce((acc, f) => acc + f.length, 0);
  if (total === 52) {
    document.getElementById('solHint').innerHTML = '🎊 CONGRATULATIONS! You won Solitaire!';
    document.getElementById('solHint').style.color = 'var(--green)';
  }
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

function jeopardyScore(playerName, correct) {
  if (!state.scoreboard[playerName]) {
    showToast('Player not found!');
    return;
  }

  const val = parseInt((document.getElementById('jValue').textContent || '$200').replace('$','')) || 200;

  if (correct) {
    state.scoreboard[playerName].jeopardy += val;
    showToast(`✅ +$${val} Jeopardy points for ${playerName}!`);
  } else {
    state.scoreboard[playerName].jeopardy -= val;
    showToast(`❌ -$${val} Jeopardy penalty for ${playerName}!`);
  }

  saveScoreboard();
  renderScoreboardAnimated(playerName);

  // Clear current clue and wait a beat before loading next
  document.getElementById('jeopardyCard').style.display = 'none';
  setTimeout(loadJeopardyClue, 1000);
}

// ----------- Hangman -----------

async function initHangman() {
  const btn = document.getElementById('newHangmanBtn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '⏳ Loading...';
  
  state.hangmanStatus = 'playing';
  state.hangmanMisses = 0;
  state.hangmanGuessed = [];
  state.hangmanHintUsed = 0;
  state.hangmanDefinition = '';
  
  const hintBtn = document.getElementById('hangmanHintBtn');
  if (hintBtn) {
    hintBtn.disabled = false;
    hintBtn.textContent = '💡 Get a Hint (Costs 1 Life)';
  }
  
  try {
    const res = await fetch('https://random-word-api.herokuapp.com/word?number=1');
    const data = await res.json();
    state.hangmanWord = data[0].toUpperCase();
  } catch (e) {
    const fallbacks = ['GALAXY', 'ASTRONAUT', 'PLANET', 'STARS', 'ROCKET', 'COMET', 'METEOR', 'NEBULA'];
    state.hangmanWord = randomFrom(fallbacks);
    showToast('Using local word list (Offline)');
  }

  btn.disabled = false;
  btn.textContent = 'New Game 🔄';
  
  renderHangman();
  buildHangmanKeyboard();
}

function renderHangman() {
  const display = document.getElementById('hangmanWordDisplay');
  const hint = document.getElementById('hangmanHint');
  if (!display || !hint) return;
  
  // Show underscores or letters
  display.innerHTML = state.hangmanWord.split('').map(char => 
    state.hangmanGuessed.includes(char) ? char : '_'
  ).join(' ');

  // Update SVG parts
  const parts = ['h-head', 'h-body', 'h-arm-l', 'h-arm-r', 'h-leg-l', 'h-leg-r'];
  parts.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = (i < state.hangmanMisses) ? '1' : '0';
  });

  // Check Win/Loss
  const isWon = state.hangmanWord.split('').every(char => state.hangmanGuessed.includes(char));
  const isLost = state.hangmanMisses >= state.hangmanMaxMisses;

  if (isWon) {
    state.hangmanStatus = 'won';
    hint.textContent = '🎉 Mission Success! You saved the astronaut!';
    hint.style.color = 'var(--green)';
    disableHangmanKeyboard();
    if (document.getElementById('hangmanHintBtn')) document.getElementById('hangmanHintBtn').disabled = true;
  } else if (isLost) {
    state.hangmanStatus = 'lost';
    hint.textContent = `💀 Mission Failed. The word was: ${state.hangmanWord}`;
    hint.style.color = 'var(--red)';
    display.textContent = state.hangmanWord.split('').join(' '); // Reveal word
    disableHangmanKeyboard();
    if (document.getElementById('hangmanHintBtn')) document.getElementById('hangmanHintBtn').disabled = true;
  } else {
    hint.textContent = `Misses: ${state.hangmanMisses} / ${state.hangmanMaxMisses}`;
    hint.style.color = 'var(--text-muted)';
  }
}

function buildHangmanKeyboard() {
  const kb = document.getElementById('hangmanKeyboard');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  if (!kb) return;
  kb.innerHTML = letters.map(l => `
    <button class="kb-key" onclick="guessHangmanLetter('${l}', this)">${l}</button>
  `).join('');
}

function guessHangmanLetter(letter, btn) {
  if (state.hangmanStatus !== 'playing') return;
  if (state.hangmanGuessed.includes(letter)) return;

  btn.disabled = true;
  state.hangmanGuessed.push(letter);

  if (state.hangmanWord.includes(letter)) {
    btn.classList.add('correct');
  } else {
    btn.classList.add('wrong');
    state.hangmanMisses++;
  }

  renderHangman();
}

function disableHangmanKeyboard() {
  document.querySelectorAll('.kb-key').forEach(btn => btn.disabled = true);
}

function toggleHangmanHints(el) {
  state.hangmanFreeHints = el.checked;
  const btn = document.getElementById('hangmanHintBtn');
  if (btn) {
    btn.textContent = state.hangmanFreeHints ? '💡 Get a Hint (FREE!)' : '💡 Get a Hint (Costs 1 Life)';
  }
}

function useHangmanHint() {
  if (state.hangmanStatus !== 'playing') return;
  
  if (!state.hangmanFreeHints && state.hangmanMisses >= state.hangmanMaxMisses - 1) {
    showToast('Too dangerous! Only 1 life left!');
    return;
  }

  // Find letters not yet guessed
  const unhidden = state.hangmanWord.split('').filter(l => !state.hangmanGuessed.includes(l));
  
  if (unhidden.length === 0) return;

  // Pick a random unhidden letter
  const reveal = randomFrom(unhidden);
  state.hangmanGuessed.push(reveal);
  
  if (!state.hangmanFreeHints) {
    state.hangmanMisses++;
  }
  
  state.hangmanHintUsed++;

  // Update UI
  const keyBtn = Array.from(document.querySelectorAll('.kb-key')).find(b => b.textContent === reveal);
  if (keyBtn) {
    keyBtn.disabled = true;
    keyBtn.classList.add('correct');
  }

  showToast(`💡 Hint: The word contains "${reveal}"`);
  renderHangman();
}

// =============================================
// PLAYER MODAL HELPERS
// =============================================

function openPlayerScoreModal(type, isCorrect = true) {
  const names = Object.keys(state.scoreboard);
  const modal = document.getElementById('playerModal');
  const list  = document.getElementById('modalPlayerList');
  const empty = document.getElementById('modalEmptyState');
  
  if (!names.length) {
    list.style.display = 'none';
    empty.style.display = 'block';
  } else {
    list.style.display = 'flex';
    empty.style.display = 'none';
    
    list.innerHTML = names.map(name => `
      <button class="modal-player-btn" onclick="selectPlayerForScore('${escapeAttr(name)}', '${type}', ${isCorrect})">
        <span>${name}</span>
        <span class="player-rank">Score: ${state.scoreboard[name].trivia + state.scoreboard[name].jeopardy}</span>
      </button>
    `).join('');
  }
  
  const titles = {
    trivia: 'Award Trivia Points',
    jeopardy: isCorrect ? 'Jeopardy: Correct!' : 'Jeopardy: Penalty'
  };
  document.getElementById('modalTitle').textContent = titles[type] || 'Select Player';
  document.getElementById('modalDesc').textContent = type === 'trivia' 
    ? `Who gets the ${state.lastTriviaScore} points?`
    : `Which player answered this clue?`;

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('playerModal').classList.remove('active');
}

function selectPlayerForScore(name, type, isCorrect) {
  closeModal();
  if (type === 'trivia') {
    addTriviaScore(name);
  } else if (type === 'jeopardy') {
    jeopardyScore(name, isCorrect);
  }
}

function switchToScoresTab() {
  closeModal();
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tabScores').classList.add('active');
  document.getElementById('panel-scores').classList.add('active');
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
  checkOnboarding();
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
  renderScoreboardAnimated(null);
}

function renderScoreboardAnimated(highlightPlayer) {
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
