# 🎲 Game Night

> **The ultimate free, browser-based Game Night planner** — powered entirely by public APIs with no backend, no API keys, and no installs required.

![Game Night App](https://img.shields.io/badge/Status-Live-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![APIs](https://img.shields.io/badge/Free%20APIs-4-purple?style=flat-square)
![No Build Required](https://img.shields.io/badge/Build-None%20Required-orange?style=flat-square)

---

## ✨ Features

### 🗓️ Game Night Planner
- Set your player count (2–12), choose a **vibe** (Party / Chill / Competitive / Family / Nerdy), and pick a duration
- Instantly get a curated **Board Game Geek** recommendation tailored to your setup
- Auto-generates a full **evening schedule** with timed segments

### 🧠 Live Trivia Battle
- Powered by the **Open Trivia Database** — thousands of questions
- Filter by **category** (Film, Music, Science, History, Video Games…) and **difficulty**
- Choose 5–20 questions per round
- Live score tracking with instant feedback and end-of-game results

### 🎮 Mini-Games
| Game | Description | API |
|------|-------------|-----|
| ✊ **RPS 101** | Rock Paper Scissors with 101 objects | RPS 101 API |
| 🃏 **Blackjack 21**| Classic card game against the dealer | Deck of Cards API |
| 📺 **Jeopardy Clues** | Real Jeopardy questions with scoring | jService API |
| 🪓 **Hangman** | Guess the word with optional hints | Local Logic |
| 🃏 **Solitaire** | Classic Klondike Solitaire with drag-and-drop | Local Logic |

### 🏆 Scoreboard
- Add named players before the night begins
- Score accumulates automatically from Trivia and Jeopardy rounds
- Persistent across page refreshes via `localStorage`
- Live leaderboard with rank badges

---

## 🚀 Getting Started

No installation. No npm. No build step.

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/game-night.git

# Open in your browser
open index.html
# or just double-click index.html on Windows/Mac
```

That's it. ✅

---

## 🌐 Free APIs Used

| API | Purpose | Auth Required |
|-----|---------|---------------|
| [Open Trivia DB](https://opentdb.com/api_config.php) | Trivia questions | None |
| [Board Game Geek XML API2](https://boardgamegeek.com/wiki/page/BGG_XML_API2) | Board game data | None |
| [Deck of Cards API](https://deckofcardsapi.com/) | Shuffled card draws | None |
| [RPS 101 API](https://rps101.pythonanywhere.com/api) | Rock Paper Scissors outcomes | None |
| [jService](https://jservice.io/) | Jeopardy clues | None |

All APIs are **100% free** with no key or account required. The app includes robust offline fallbacks for all API calls.

---

## 📁 Project Structure

```
game-night/
├── index.html        # Main application shell & all tab panels
├── style.css         # Complete design system (glassmorphism dark theme)
├── app.js            # All application logic & API integrations
├── README.md         # You are here
├── GUIDE.md          # User guide & how-to-play
└── ARCHITECTURE.md   # Technical architecture & design decisions
```

---

## 🎨 Design Highlights

- **Glassmorphism dark theme** with animated gradient background orbs
- **Google Fonts** — Outfit + Space Grotesk
- Smooth tab transitions with `fadeInUp` animations
- Fully **responsive** — works on mobile and desktop
- Toast notification system for user feedback
- CSS custom properties for easy theming

---

## 📝 License

MIT © 2026 — Free to use, fork, and extend.

---

## 🤝 Contributing

Found a bug or want to add a new mini-game? PRs are welcome!

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/new-minigame`)
3. Commit your changes (`git commit -m 'Add: new mini-game'`)
4. Push to the branch (`git push origin feature/new-minigame`)
5. Open a Pull Request
