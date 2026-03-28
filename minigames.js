import { escapeAttr, showToast, randomFrom, decodeHTML } from './utils.js';

let state;
let app;

export function initMinigames(_state, _app) {
    state = _state;
    app = _app;

    document.querySelectorAll('.mg-tab').forEach(tab => {
        tab.addEventListener('click', () => selectMinigame(tab, tab.dataset.mg));
    });
    
    document.getElementById('rpsBtn').addEventListener('click', playRPS);
    document.querySelector('#bjInitialControls .cta-btn').addEventListener('click', startBlackjack);
    document.querySelector('#bjActiveControls .cta-btn').addEventListener('click', blackjackHit);
    document.querySelector('#bjActiveControls .ghost-btn').addEventListener('click', blackjackStand);
    document.querySelector('#mg-solitaire .cta-btn').addEventListener('click', initSolitaire);
    document.getElementById('solStock').addEventListener('click', drawFromStock);
    document.querySelectorAll('#solitaire-foundations .card-slot').forEach((f, i) => {
        f.addEventListener('click', () => moveSelectedToFoundation(i));
    });
    document.getElementById('newHangmanBtn').addEventListener('click', initHangman);
    document.getElementById('hangmanFreeHints').addEventListener('change', (e) => toggleHangmanHints(e.target));
    document.getElementById('hangmanHintBtn').addEventListener('click', useHangmanHint);
    document.querySelector('#mg-jeopardy .cta-btn').addEventListener('click', loadJeopardyClue);
    document.getElementById('revealBtn').addEventListener('click', revealAnswer);

    // Initial state
    document.getElementById('mg-rps').style.display = 'block';
    loadRPSObjects();
}

export function switchToMinigames() {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tabMinigames').classList.add('active');
    document.getElementById('panel-minigames').classList.add('active');
}

function selectMinigame(btn, id) {
    document.querySelectorAll('.mg-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.minigame-panel').forEach(p => { p.style.display = 'none'; });
    document.getElementById(`mg-${id}`).style.display = 'block';

    if (id === 'cards' && !state.deckId) shuffleBlackjackDeck();
    if (id === 'hangman' && state.hangmanStatus === 'waiting') initHangman();
    if (id === 'solitaire' && state.solStock.length === 0) initSolitaire();
}

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

    const idx1 = Math.floor(Math.random() * data.length);
    let   idx2 = Math.floor(Math.random() * data.length);
    while (idx2 === idx1) idx2 = Math.floor(Math.random() * data.length);
    p1.value = data[idx1];
    p2.value = data[idx2];

  } catch (e) {
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
    const outcome = data.outcome || `${data.winner} beats ${data.winner === p1Choice ? p2Choice : p1Choice}`;

    resultEl.innerHTML = `
      <div class="rps-winner">🏆 ${winner} Wins!</div>
      <div style="font-size:2rem;margin:8px 0">${p1Choice} ⚔️ ${p2Choice}</div>
      <div class="rps-detail">"<em>${outcome}</em>"</div>
    `;
  } catch (e) {
    const classics = { rock: { beats: ['scissors'] }, scissors: { beats: ['paper'] }, paper: { beats: ['rock'] } };
    const p1Low = p1Choice.toLowerCase();
    const p2Low = p2Choice.toLowerCase();
    let winner = (classics[p1Low]?.beats || []).includes(p2Low) ? 'Player 1' : ((classics[p2Low]?.beats || []).includes(p1Low) ? 'Player 2' : 'Draw');
    resultEl.innerHTML = winner === 'Draw'
      ? `<div class="rps-winner">🤝 It's a Draw!</div>`
      : `<div class="rps-winner">🏆 ${winner} Wins!</div><div class="rps-detail">${p1Choice} vs ${p2Choice}</div>`;
  }

  document.getElementById('rpsBtn').disabled = false;
}

// ... (Rest of the minigame functions)
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

  if (!state.deckId || state.deckId === 'local') {
    await shuffleBlackjackDeck();
  }

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
  if (dVal > 21) resolveBlackjack('Dealer Busts! You Win! 🏆');
  else if (dVal > pVal) resolveBlackjack('Dealer Wins 💀');
  else if (pVal > dVal) resolveBlackjack('You Win! 🏆');
  else resolveBlackjack('Push (Draw) 🤝');
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

function initSolitaire() {
  const values = ['ACE', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'JACK', 'QUEEN', 'KING'];
  const suits = ['CLUBS', 'DIAMONDS', 'HEARTS', 'SPADES'];
  const fullDeck = [];
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
  state.solFoundations = [[], [], [], []];
  state.solWaste = [];
  state.solSelected = null;
  state.solTableau = [[], [], [], [], [], [], []];
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j <= i; j++) {
      const card = fullDeck.pop();
      if (j === i) card.hidden = false;
      state.solTableau[i].push(card);
    }
  }
  state.solStock = fullDeck.map(c => ({ ...c, hidden: true }));
  renderSolitaire();
  showToast('🃏 Solitaire: Good luck!');
}
function renderSolitaire() {
  const stock = document.getElementById('solStock');
  const waste = document.getElementById('solWaste');
  stock.innerHTML = state.solStock.length > 0 ? `<div class="sol-card back"></div>` : '';
  waste.innerHTML = state.solWaste.map((c, i) => `
    <div class="sol-card ${state.solSelected?.type==='waste' ? 'selected':''}" 
         draggable="true"
         ondragstart="handleSolDragStart(event, 'waste', 0, ${i})"
         onclick="selectSolCard('waste', 0, ${i})">
      <img src="${c.image}">
    </div>
  `).slice(-1).join('');
  for (let i = 0; i < 4; i++) {
    const f = document.getElementById(`f-${i}`);
    const cards = state.solFoundations[i];
    f.innerHTML = cards.length > 0 
      ? `<div class="sol-card" draggable="true" ondragstart="handleSolDragStart(event, 'foundation', ${i}, ${cards.length-1})" onclick="selectSolCard('foundation', ${i}, ${cards.length-1})"><img src="${cards[cards.length-1].image}"></div>`
      : '';
    f.setAttribute('ondragover', 'event.preventDefault()');
    f.setAttribute('ondrop', `handleSolDrop(event, 'foundation', ${i})`);
  }
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
    if (cards.length === 0) {
      t.innerHTML = `<div class="card-slot t-empty" style="position: absolute; top:0; left:0; width:100%; border:none" onclick="handleTableauClick(${i}, -1, event)"></div>`;
    }
    t.setAttribute('ondragover', 'event.preventDefault()');
    t.setAttribute('ondrop', `handleSolDrop(event, 'tableau', ${i})`);
  }
}
function handleSolDragStart(e, type, pIdx, cIdx) {
  state.solSelected = { type, pIdx, cIdx };
  e.dataTransfer.setData('text/plain', JSON.stringify({ type, pIdx, cIdx }));
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
  if (state.solSelected) {
    const movingCards = getSelectedCards();
    if (canMoveToTableau(movingCards[0], targetPile[targetPile.length - 1])) {
      executeMove('tableau', pIdx);
      return;
    }
  }
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
  if (!targetCard) return card.val === 13;
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
  if (s.type === 'waste') cards = [state.solWaste.pop()];
  if (s.type === 'foundation') cards = [state.solFoundations[s.pIdx].pop()];
  if (s.type === 'tableau') {
    cards = state.solTableau[s.pIdx].splice(s.cIdx);
    if (state.solTableau[s.pIdx].length > 0) {
      state.solTableau[s.pIdx][state.solTableau[s.pIdx].length - 1].hidden = false;
    }
  }
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
  const fallbacks = ['GALAXY', 'ASTRONAUT', 'PLANET', 'STARS', 'ROCKET', 'COMET', 'METEOR', 'NEBULA'];
  try {
    const res = await fetch('https://random-word-api.herokuapp.com/word?number=1');
    const data = await res.json();
    let word = data[0].toUpperCase();
    if (!/^[A-Z]+$/.test(word)) {
      showToast('⚠️ Invalid word from API, using fallback.');
      word = randomFrom(fallbacks);
    }
    state.hangmanWord = word;
  } catch (e) {
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
  display.innerHTML = state.hangmanWord.split('').map(char => 
    state.hangmanGuessed.includes(char) ? char : '_'
  ).join(' ');
  const parts = ['h-head', 'h-body', 'h-arm-l', 'h-arm-r', 'h-leg-l', 'h-leg-r'];
  parts.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = (i < state.hangmanMisses) ? '1' : '0';
  });
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
    display.textContent = state.hangmanWord.split('').join(' ');
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
    <button class="kb-key" data-letter="${l}">${l}</button>
  `).join('');

  kb.querySelectorAll('.kb-key').forEach(btn => {
    btn.addEventListener('click', () => guessHangmanLetter(btn.dataset.letter, btn));
  });
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
  const unhidden = state.hangmanWord.split('').filter(l => !state.hangmanGuessed.includes(l));
  if (unhidden.length === 0) return;
  const reveal = randomFrom(unhidden);
  state.hangmanGuessed.push(reveal);
  if (!state.hangmanFreeHints) {
    state.hangmanMisses++;
  }
  state.hangmanHintUsed++;
  const keyBtn = Array.from(document.querySelectorAll('.kb-key')).find(b => b.textContent === reveal);
  if (keyBtn) {
    keyBtn.disabled = true;
    keyBtn.classList.add('correct');
  }
  showToast(`💡 Hint: The word contains "${reveal}"`);
  renderHangman();
}

async function loadJeopardyClue() {
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
    state.jeopardyValue = clue.value || 200;
    document.getElementById('jCategory').textContent = (clue.category?.title || 'MYSTERY').toUpperCase();
    document.getElementById('jValue').textContent    = clue.value ? `$${clue.value}` : '$200';
    document.getElementById('jClue').innerHTML       = decodeHTML(clue.question || 'No clue found.');
    document.getElementById('revealBtn').style.display = 'block';
    document.getElementById('jAnswer').style.display   = 'none';
    document.getElementById('jActions').style.display  = 'none';
  } catch (e) {
    const fallbacks = [
      { cat: 'SCIENCE', val: '$400', clue: 'This is the powerhouse of the cell.', answer: 'the mitochondria' },
      { cat: 'HISTORY', val: '$200', clue: 'He was the first President of the United States.', answer: 'George Washington' },
      { cat: 'POP CULTURE', val: '$600', clue: 'This fictional wizard school is located in Scotland.', answer: 'Hogwarts' },
    ];
    const fb = randomFrom(fallbacks);
    state.jeopardyAnswer = fb.answer;
    state.jeopardyValue = parseInt(fb.val.replace('$', '')) || 200;
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
  document.querySelector('.correct-btn').onclick = () => jeopardyScore(true);
  document.querySelector('.wrong-btn').onclick = () => jeopardyScore(false);
}
async function jeopardyScore(correct) {
  const playerName = await app.openPlayerScoreModal(
    correct ? 'Jeopardy: Correct!' : 'Jeopardy: Penalty',
    'Which player answered this clue?'
  );
  if (!playerName) return;
  if (!state.scoreboard[playerName]) {
    showToast('Player not found!');
    return;
  }
  const val = state.jeopardyValue;
  if (correct) {
    state.scoreboard[playerName].jeopardy += val;
    showToast(`✅ +$${val} Jeopardy points for ${playerName}!`);
  } else {
    state.scoreboard[playerName].jeopardy -= val;
    showToast(`❌ -$${val} Jeopardy penalty for ${playerName}!`);
  }
  app.saveScoreboard();
  app.renderScoreboardAnimated(playerName);
  document.getElementById('jeopardyCard').style.display = 'none';
  setTimeout(loadJeopardyClue, 1000);
}
