import { decodeHTML, escapeAttr, randomFrom, showToast } from './utils.js';

let state;
let app;

export function initTrivia(_state, _app) {
    state = _state;
    app = _app;

    document.getElementById('startTriviaBtn').addEventListener('click', startTrivia);
    document.querySelector('.trivia-results .cta-btn').addEventListener('click', startTrivia);
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
    document.querySelector('.trivia-game .ghost-btn').addEventListener('click', endTrivia);
}

export function switchToTrivia(isWarmup = false) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tabTrivia').classList.add('active');
    document.getElementById('panel-trivia').classList.add('active');
    document.getElementById('panel-trivia').scrollIntoView({ behavior: 'smooth' });
}

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

    const answers = [...q.incorrect_answers, q.correct_answer]
        .map(a => decodeHTML(a))
        .sort(() => Math.random() - 0.5);

    const grid = document.getElementById('answersGrid');
    grid.innerHTML = answers.map(ans => `
        <button class="answer-btn" data-answer="${escapeAttr(ans)}">${ans}</button>
    `).join('');

    grid.querySelectorAll('.answer-btn').forEach(btn => {
        btn.addEventListener('click', () => checkAnswer(btn, btn.dataset.answer, decodeHTML(q.correct_answer)));
    });
}

function checkAnswer(btn, selected, correct) {
    if (state.answered) return;
    state.answered = true;

    const isCorrect = selected === correct;
    if (isCorrect) state.triviaScore++;

    document.querySelectorAll('.answer-btn').forEach(b => {
        b.disabled = true;
        if (b.textContent === correct) b.classList.add('correct');
        if (b === btn && !isCorrect)   b.classList.add('wrong');
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

    state.lastTriviaScore = state.triviaScore;
    document.getElementById('finalScore').textContent = `${state.triviaScore} / ${state.triviaTotal}`;

    const addBtn = document.getElementById('addTriviaScoreBtn');
    if (addBtn) {
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Scoreboard 🏆';
        addBtn.onclick = addTriviaScore;
    }

    const pct = state.triviaScore / state.triviaTotal;
    let emoji, headline, flavour;

    if (pct === 1)       { emoji = '🏆'; headline = 'PERFECT SCORE!';          flavour = "Absolutely flawless. Are you sure you haven't seen these before? 👀"; }
    else if (pct >= 0.8) { emoji = '🥇'; headline = 'Knowledge Champion!';     flavour = "Outstanding performance! You clearly know your stuff."; }
    else if (pct >= 0.6) { emoji = '🥈'; headline = 'Solid Showing!';          flavour = "Above average — you're no slouch in the trivia department!"; }
    else if (pct >= 0.4) { emoji = '🥉'; headline = 'Room to Improve!';        flavour = "Not bad, but there's a rematch with your name on it..."; }
    else if (pct >= 0.2) { emoji = '😅'; headline = 'Better Luck Next Time!';  flavour = "The questions were clearly rigged. Definitely rigged."; }
    else                 { emoji = '💀'; headline = 'Oof...';                   flavour = "That was... a performance. Never speak of this again."; }

    document.getElementById('resultEmoji').textContent   = emoji;
    document.getElementById('resultHeadline').textContent = headline;
    document.getElementById('resultFlavour').textContent  = flavour;
}

async function addTriviaScore() {
    const playerName = await app.openPlayerScoreModal('Award Trivia Points', `Who gets the ${state.lastTriviaScore} points?`);
    if (!playerName) return;

    if (!state.scoreboard[playerName]) {
        showToast('Player not found!');
        return;
    }

    state.scoreboard[playerName].trivia += state.lastTriviaScore;
    app.saveScoreboard();
    app.renderScoreboardAnimated(playerName);
    showToast(`✅ Added ${state.lastTriviaScore} trivia points to ${playerName}!`);

    const addBtn = document.getElementById('addTriviaScoreBtn');
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = 'Points Added! ✅';
    }
}
