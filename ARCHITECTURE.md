# 🏗️ Game Night — Architecture

> A technical deep-dive into how the app is structured, what design decisions were made, and how each API integration works.

---

## 📐 Overview

Game Night is a **single-page application (SPA)** built with vanilla HTML, CSS, and JavaScript — no framework, no bundler, no dependencies. The entire app ships as three files.

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│  ┌────────────┐  ┌─────────┐  ┌──────────┐ │
│  │ index.html │  │ style.css│  │  app.js  │ │
│  │  (Shell)   │  │ (Design) │  │  (Logic) │ │
│  └────────────┘  └─────────┘  └──────────┘ │
│         │                          │        │
│         └──────── Tab Router ──────┘        │
│                       │                     │
│    ┌──────────────────┼──────────────────┐  │
│    ▼                  ▼                  ▼  │
│ Planner            Trivia           Mini-Games│
│ Scoreboard                                  │
└─────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
    OpenTDB API      BGG XML API       Deck of Cards API
    jService API     RPS 101 API
```

---

## 📁 File Breakdown

### `index.html` — Application Shell
Defines the **entire DOM structure** up front. All tab panels exist in the HTML simultaneously — JavaScript toggles `display` and `active` classes to switch between them. This avoids any route-based navigation complexity.

Key structural decisions:
- Semantic HTML5 elements (`<header>`, `<main>`, `<footer>`, `<nav>`)
- All interactive elements have unique `id` attributes for JS binding
- `data-tab` attributes on nav buttons drive the tab system
- Inline `onclick` handlers for simplicity (no event delegation needed at this scale)

### `style.css` — Design System
A complete CSS design system built with **custom properties** (CSS variables). No utility classes — all styling is component-scoped.

```css
:root {
  /* Color palette */
  --purple, --pink, --cyan, --amber, --green, --red

  /* Semantic tokens */
  --bg-base, --bg-card, --border, --text-base, --text-muted

  /* Gradients, shadows, radii, transitions */
}
```

Key CSS techniques used:
- **Glassmorphism** — `backdrop-filter: blur()` + semi-transparent backgrounds
- **Animated orbs** — `position: fixed` radial gradient blobs with `keyframe` animation
- **CSS Grid** — used for the setup grid, answer grid, card player layout
- **Custom select styling** — background-image SVG arrow for cross-browser consistency
- **Responsive breakpoints** — single `@media (max-width: 720px)` collapses all multi-column layouts

### `app.js` — Application Logic
All JavaScript in a single file, structured into clearly labelled sections:

```
STATE          — Single source of truth object
BOOT           — DOMContentLoaded initialisation
TAB NAVIGATION — Tab switching logic
PLANNER        — BGG API, schedule builder, warmup
TRIVIA         — OpenTDB API, question renderer, scoring
MINI-GAMES     — RPS 101, Deck of Cards, jService
SCOREBOARD     — localStorage persistence, rendering
UTILITIES      — decodeHTML, escapeAttr, toast, randomFrom
```

---

## 🔄 State Management

A single global `state` object is the source of truth for all transient data:

```js
const state = {
  players: 4,
  duration: 'medium',
  vibe: 'party',
  deckId: null,           // Deck of Cards API session ID

  triviaQuestions: [],    // Current batch of questions
  currentQuestion: 0,
  triviaScore: 0,
  triviaTotal: 10,
  answered: false,
  lastTriviaScore: 0,     // For scoreboard submission

  rpsObjects: [],         // Loaded from RPS 101 API on boot

  scoreboard: {},         // { playerName: { trivia: n, jeopardy: n } }

  jeopardyAnswer: '',
};
```

`localStorage` is used **only** for scoreboard persistence — everything else resets on page load.

---

## 🌐 API Integrations

### 1. Board Game Geek XML API2
**Endpoint:** `https://boardgamegeek.com/xmlapi2/thing?id={id}&stats=1`  
**Format:** XML (parsed with `DOMParser`)  
**Auth:** None

BGG doesn't offer a free "random game" endpoint, so we maintain curated ID pools per vibe:

```js
const gamePools = {
  party:       ['13823','1406','163696','316554','31481'],
  chill:       ['230802','68448','226884','172818','822'],
  competitive: ['84876','12333','167355','72125','199792'],
  family:      ['13823','9209','70323','822','171262'],
  nerdy:       ['167791','161936','220308','224517','236457'],
};
```

A random ID is selected from the vibe's pool on each generation. The XML response is parsed for: name, description, min/max players, play time, BGG rating, and weight (complexity).

**Fallback:** Five hardcoded game objects (one per vibe) with pre-filled data.

---

### 2. Open Trivia Database
**Endpoint:** `https://opentdb.com/api.php?amount={n}&type=multiple[&category={id}][&difficulty={level}]`  
**Format:** JSON  
**Auth:** None (rate-limited by session token optionally)

The API returns HTML-encoded strings (e.g. `&amp;` for `&`). All text is passed through `decodeHTML()` which uses a `textarea` element trick:

```js
function decodeHTML(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}
```

Answers (3 incorrect + 1 correct) are stored in state and shuffled with `sort(() => Math.random() - 0.5)` before rendering. The correct answer is encoded into the `onclick` attribute using `escapeAttr()` to prevent HTML injection.

**Fallback:** Toast error message — trivia requires an active connection.

---

### 3. Deck of Cards API
**Endpoints:**
- Shuffle: `https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1`
- Draw: `https://deckofcardsapi.com/api/deck/{deck_id}/draw/?count={n}`
- Re-shuffle: `https://deckofcardsapi.com/api/deck/{deck_id}/shuffle/`

**Format:** JSON  
**Auth:** None

The API maintains a stateful deck server-side identified by `deck_id`. The ID is stored in `state.deckId`. If the deck runs low (< player count cards remaining), it is automatically re-shuffled before drawing.

Card values are mapped to numeric values for comparison:
```js
const cardValues = { 'ACE':14,'KING':13,'QUEEN':12,'JACK':11,'10':10, … }
```

**Fallback:** `generateLocalCards()` — builds and shuffles a standard 52-card deck locally.

---

### 4. RPS 101 API
**Endpoints:**
- All objects: `https://rps101.pythonanywhere.com/api/v1/objects/all`
- Outcome: `https://rps101.pythonanywhere.com/api/v1/outcome?object1={a}&object2={b}`

**Format:** JSON  
**Auth:** None

All 101 objects are fetched on app boot and used to populate both player dropdowns. Two random defaults are pre-selected so the game is immediately playable.

The outcome endpoint returns `{ winner, outcome }` where `outcome` is a human-readable string explaining the result (e.g. *"fire melts scissors"*).

**Fallback:** A reduced set of 10 classic objects with standard win/lose logic.

---

### 5. jService (Jeopardy)
**Endpoint:** `https://jservice.io/api/random`  
**Format:** JSON (array of 1 clue)  
**Auth:** None

Returns a random Jeopardy clue object:
```json
{
  "question": "This is the clue text",
  "answer":   "The correct answer",
  "value":    400,
  "category": { "title": "SCIENCE" }
}
```

The answer is stored in `state.jeopardyAnswer` and only revealed when the player clicks **Reveal Answer**. Scoring is applied to the named player immediately via prompt().

**Fallback:** 5 hardcoded clues covering Science, History, Pop Culture, Geography, and Sports.

---

## 🔒 Security Considerations

| Risk | Mitigation |
|------|-----------|
| HTML injection from API responses | `decodeHTML()` uses textarea, not `innerHTML` for text; `escapeAttr()` for attribute values |
| XSS in player names | Player names rendered via `textContent` in most paths; `escapeAttr` used in `onclick` strings |
| CORS issues | All APIs explicitly support CORS from browser origins |
| API rate limiting | Trivia DB has generous limits for non-authenticated use; others are unrestricted |

---

## ♿ Accessibility

- All interactive elements are `<button>` or `<select>` elements (keyboard navigable)
- Labels are associated with form controls via `for` attributes
- Color is not the sole means of conveying information (icons + text accompany all colour cues)
- Sufficient contrast ratios maintained against the dark background

---

## 📈 Potential Improvements

| Area | Idea |
|------|------|
| Routing | URL hash routing for bookmarkable tabs |
| Trivia | Session token support to avoid repeat questions |
| State | Export/import session as JSON for saving mid-night |
| Sound | Subtle sound effects using Web Audio API |
| Animations | Card flip 3D CSS transform on the High Card game |
| PWA | Service worker + manifest for installable offline app |
| More APIs | Pokemon TCG for a card collecting mini-game |
| Multiplayer | WebSocket or BroadcastChannel API for multi-device play |
