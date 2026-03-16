# 🎮 Game Night — User Guide

> Everything you need to run a perfect game night using the app.

---

## 📖 Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Planner Tab](#2-the-planner-tab)
3. [The Trivia Tab](#3-the-trivia-tab)
4. [The Mini-Games Tab](#4-the-mini-games-tab)
5. [The Scores Tab](#5-the-scores-tab)
6. [Tips & Tricks](#6-tips--tricks)
7. [Offline / Fallback Mode](#7-offline--fallback-mode)

---

## 1. Getting Started

### Step 1 — Open the App
Simply open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari). No installation needed.

### Step 2 — Set Up Players (Recommended First)
Head to the **🏆 Scores** tab and add each player's name before the night begins. This allows scores to be tracked automatically as you play.

### Step 2 — Plan Your Night (Onboarding)
Go back to the **🗓️ Planner** tab. If you haven't added players yet, you'll see a "Who's playing?" prompt. Add players in the Scores tab to unlock the planner features.

---

## 2. The Planner Tab

This is your home base. The app acts as your "Digital Host."

### 👥 Player Count
Set your player count (1–12).

### ⏱️ Duration & Lightning Rounds
Pick your session length:
- **10m / 20m** — **New!** Lightning sessions for quick fun.
- **1h / 2h / 3h+** — Standard game night lengths.

### 📋 Interactive Schedule
The schedule at the bottom isn't just for show:
- **Click any item** to jump directly to that activity.
- Items are marked **✅ Done** as you progress.
- The "Director" will glow the next recommended card after you finish a step.

### ✨ Generate My Game Night!
Hit the button and the app will:
1. Pull a **Board Game Geek** recommendation matching your vibe
2. Suggest a **warm-up activity** to kick things off
3. Build a **timed schedule** for the whole evening

> 🔄 Hit the **refresh icon** next to "Your Perfect Game Night Plan" to regenerate a different suggestion.

---

## 3. The Trivia Tab

Run a live trivia round for your whole group. One person can be the quizmaster reading questions aloud, or players can take turns on the device.

### Setup
| Option | Description |
|--------|-------------|
| **Category** | Filter by topic (Film, Music, Science, History, etc.) or pick Any |
| **Difficulty** | Easy / Medium / Hard / Mixed |
| **Questions** | Choose 5, 10, 15, or 20 questions per round |

### Playing
1. Click **Start Trivia Game!**
2. Read the question aloud to all players
3. First person to call out the right answer wins the point (honour system!)
4. Click the correct answer button to confirm and move on
5. The progress bar tracks how far through the round you are

### Scoring
At the end of the round, click **Add to Scoreboard 🏆** and enter the winning player's name to log their score to the scoreboard.

### Result Ratings
| Score | Rating |
|-------|--------|
| 100% | 🏆 PERFECT SCORE |
| 80%+ | 🥇 Knowledge Champion |
| 60%+ | 🥈 Solid Showing |
| 40%+ | 🥉 Room to Improve |
| 20%+ | 😅 Better Luck Next Time |
| <20% | 💀 Oof… |

---

## 4. The Mini-Games Tab

Three quick games to fill breaks between main games or decide who goes first.

---

### ✊ RPS 101 — Rock Paper Scissors (101 ways!)

A turbo-charged version of the classic using the **RPS 101 API** with 101 possible objects.

**How to play:**
1. Player 1 picks their object from the dropdown
2. Player 2 picks theirs
3. Hit **Fight!** — the API calculates the winner and explains *why* one beats the other
4. Great for deciding who goes first or breaking ties!

**Example outcomes:**
- *"Fire melts scissors"*
- *"Tornado blows away rock"*
- *"Dragon breathes fire on paper"*

---

### 🃏 High Card Showdown

A dead-simple, zero-skill card game using a **real shuffled deck** from the Deck of Cards API.

**How to play:**
1. Click **🔀 Shuffle New Deck** to prepare a fresh 52-card deck
2. Click **Deal Cards!** — each player (based on your player count setting) gets one face-up card
3. Highest card wins — Ace is high
4. In a tie, a second deal is needed
5. The winner picks their seat, goes first, or gets a free point!

**Card values:** `2 < 3 < 4 < … < 10 < J < Q < K < A`

---

### 📺 Jeopardy Clue Challenge

Real **Jeopardy!** clues from the jService API. Play it exactly like the TV show.

**How to play:**
1. Optionally pick a category, then click **Get a Clue!**
2. The quizmaster reads the clue aloud — players must answer in the form *"What is…?"*
3. First correct answer wins the dollar value shown
4. Click **Reveal Answer** to show the answer
5. Click **✅ Correct!** or **❌ Wrong** — the app will ask which player to credit/penalise

> ⚠️ *Wrong answers deduct the dollar value from the player's score — just like the real show!*

---

## 5. The Scores Tab

Track the whole evening's scores in one place.

### Adding Players
1. Type a player name in the input field
2. Press **Enter** or click **+ Add**
3. Players appear as purple tags — click **×** to remove one

> 💡 Add all players **before** starting any games so scores can be properly credited.

### Scoreboard Columns
| Column | Tracks |
|--------|--------|
| **Trivia** | Points from completed trivia rounds |
| **Jeopardy** | Dollar amounts won/lost from Jeopardy clues |
| **Total** | Combined score — used for ranking |

### Actions
- **🔄 Reset Scores** — Keep players but zero out all scores (new round)
- **🗑️ Clear All** — Remove all players and scores entirely

### Persistence
Scores are saved to your browser's `localStorage` — they'll survive page refreshes. Clearing your browser data will reset everything.

---

## 6. Tips & Tricks

- 🎯 **Warm-Up First** — Always start with the suggested warm-up activity to get everyone in the mood
- 🔄 **Regenerate** — Don't like the board game suggestion? Hit the 🔄 button and get a different one
- 📱 **Mobile Friendly** — The app works on phones/tablets, great for passing around the table
- 🏆 **Trivia → Scoreboard** — After each trivia round, don't forget to click *Add to Scoreboard* before starting a new game
- 🎲 **RPS for decisions** — Use RPS 101 anytime you need a fun way to make a group decision
- 📺 **Jeopardy for breaks** — Pull up a few Jeopardy clues during snack breaks to keep energy up

---

## 7. Offline / Fallback Mode

The app is designed to work even when APIs are slow or unavailable:

| API | Offline Fallback |
|-----|-----------------|
| Board Game Geek | 5 curated game suggestions per vibe |
| Open Trivia DB | Error toast — retry when connection returns |
| Deck of Cards | Local deck generation (same randomness) |
| RPS 101 | Classic 5-object RPS (Rock/Paper/Scissors/Lizard/Spock + more) |
| jService | 5 pre-loaded Jeopardy clues |

A toast notification will inform you when a fallback is being used.
