/* =============================================
   GAME NIGHT — app.js
   APIs: OpenTDB, Deck of Cards, RPS 101, jService
   ============================================= */

'use strict';
import { decodeHTML, escapeAttr, randomFrom, showToast } from './utils.js';

import { initScoreboard, openPlayerScoreModal, saveScoreboard, renderScoreboardAnimated } from './scoreboard.js';

import { initTrivia, switchToTrivia } from './trivia.js';

import { initMinigames, switchToMinigames } from './minigames.js';

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
  jeopardyValue: 200,
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

const app = {
  openPlayerScoreModal,
  saveScoreboard,
  renderScoreboardAnimated,
  switchToScoresTab,
  switchToTrivia,
  switchToMinigames,
};

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initScoreboard(state, app);
  initTrivia(state, app);
  initMinigames(state, app);
});

function switchToScoresTab() {
  // This function is passed to the scoreboard module
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tabScores').classList.add('active');
  document.getElementById('panel-scores').classList.add('active');
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
