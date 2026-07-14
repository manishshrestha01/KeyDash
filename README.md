# KeyDash — Free Online Typing Test with Multiplayer, AI Battles & Achievements 🚀

> **KeyDash** is a free online typing test and practice platform with **multiplayer races**, **AI battles**, **1200+ achievements**, and **competitive leaderboards**. Track your WPM and accuracy in real time, practice with coding snippets in JavaScript, Python, Java, C, and C++, type in English or Nepali (Devanagari), and climb the rankings.

<p align="center">
  <a href="https://keydash.shresthamanish.info.np/"><img src="public/logo.svg" alt="KeyDash — online typing speed test and WPM trainer" width="120" /></a>
</p>

<p align="center">
  <a href="https://keydash.shresthamanish.info.np/"><strong>Live Demo → keydash.shresthamanish.info.np</strong></a>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img alt="Vite 6" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white" />
  <img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" />
</p>

## What is KeyDash?

KeyDash is a free, open-source typing test platform that measures your WPM (words per minute) and accuracy in real time. It supports multiple typing modes, competitive leaderboards, multiplayer races, AI battles, and 1200+ achievements. It works in English and Nepali (Devanagari script).

## KeyDash vs Other Typing Test Platforms

| Feature | KeyDash | Monkeytype | TypingClub | Nitrotype |
|---------|---------|------------|------------|-----------|
| **Price** | Free | Free | Freemium | Free |
| **Multiplayer** | Real-time (up to 50 players) | No | No | Yes (limited) |
| **AI Battles** | Yes (4 difficulty levels) | No | No | No |
| **Achievements** | 1200+ | None | Limited | Limited |
| **Coding Mode** | JS, Python, Java, C, C++ | No | No | No |
| **Nepali Typing** | Yes (Devanagari) | No | No | No |
| **Daily Challenges** | Yes | No | Yes | No |
| **Streak System** | Yes | No | Yes | No |
| **Leaderboards** | Daily/Weekly/Monthly/All-time | Yes | Yes | Yes |
| **Custom Text** | Yes | Yes | No | No |
| **Open Source** | Yes | Yes | No | No |
| **Social Profiles** | Yes (with replay) | No | No | No |
| **Result Sharing** | Image + link | No | No | No |
| **Offline Support** | PWA ready | No | No | No |

## Quick Start

```bash
git clone https://github.com/manishshrestha01/keydash.git
cd keydash
npm install
cp .env.example .env  # Add your Supabase credentials
npm run dev
```

## Features

### Typing Modes
- **Timed Mode**: 15s, 30s, 60s, 120s typing tests
- **Sentence Mode**: Easy, Medium, Hard, Extreme difficulty levels
- **Coding Mode**: Practice with real code in JavaScript, Python, Java, C, C++
- **Symbols Mode**: Master special characters and punctuation
- **Custom Mode**: Paste your own text to practice
- **Daily Challenge**: New text every day, compete on daily leaderboard

### Competitive Features
- **Multiplayer Racing**: Real-time typing races with Supabase Realtime
- **AI Battles**: Challenge AI opponents at Easy, Medium, Hard, or Pro difficulty
- **Leaderboards**: Daily, Weekly, Monthly, and All-time rankings
- **1200+ Achievements**: Speed milestones, accuracy records, streaks, coding mastery, multiplayer victories

### Languages
- **English**: Full support with multiple difficulty levels
- **Nepali (Devanagari)**: Romanized and Traditional input methods

### Social Features
- **User Profiles**: Public/private profiles with typing history
- **Result Sharing**: Generate beautiful result cards, share to Twitter/Facebook/LinkedIn
- **Typing Replay**: Watch replays of your typing sessions

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 19, Tailwind CSS 4 |
| Build Tool | Vite 6 |
| State Management | Zustand |
| Animations | Framer Motion |
| Backend | Supabase (Auth, PostgreSQL, Realtime, Storage) |
| Icons | Lucide React |
| Hosting | Vercel (Edge Functions for OG images) |

## Database Schema

The app uses the following main tables:
- `profiles` — User profiles with display names and avatars
- `typing_history` — Complete typing test records
- `streaks` — Daily streak tracking
- `achievements` — Available achievements (1200+)
- `user_achievements` — Unlocked achievements per user
- `multiplayer_rooms` — Real-time race lobbies
- `custom_texts` — User-saved custom texts
- `leaderboard_timed` — Timed mode leaderboard entries
- `leaderboard_sentence` — Sentence mode leaderboard entries
- `leaderboard_daily` — Daily challenge entries

## Routes

| Route | Description | SEO |
|-------|-------------|-----|
| `/` | Home — Mode selector and typing test | Indexed |
| `/leaderboard` | Competitive leaderboards (daily/weekly/monthly/all-time) | Indexed |
| `/multiplayer` | Real-time multiplayer typing lobby | Indexed |
| `/ai-battle` | AI opponent typing battles | Indexed |
| `/daily` | Daily typing challenge | Indexed |
| `/custom` | Custom text typing mode | Indexed |
| `/achievements` | Achievement showcase (1200+ badges) | Indexed |
| `/dashboard` | User dashboard with stats | Indexed |
| `/faq` | Frequently asked questions | Indexed |
| `/privacy-policy` | Privacy policy | Indexed |
| `/terms-of-service` | Terms of service | Indexed |
| `/users/:userId` | Public user typing profile | Indexed |
| `/login` | Login / Register | NoIndex |
| `/profile` | My profile (private) | NoIndex |
| `/settings` | Account settings | NoIndex |
| `/results` | Typing test results | NoIndex |

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run linting
```

## FAQ

### Is KeyDash free?
Yes. All core features — typing tests, leaderboards, achievements, daily challenges, multiplayer, and AI battles — are completely free.

### Do I need an account?
You can take typing tests without an account, but you need to register to save progress, appear on leaderboards, earn achievements, and access typing history.

### How is WPM calculated?
WPM = (correctly typed characters / 5) / time in minutes. Only fully correct words count — errors reduce your effective WPM.

### What languages are supported?
KeyDash supports English and Nepali (Devanagari script). Nepali supports both Romanized and Traditional input methods.

### Can I practice coding?
Yes. KeyDash has a Coding Mode with real code snippets in JavaScript, Python, Java, C, and C++.

### How does multiplayer work?
Create or join a lobby, race against real users in real time. Each player types the same text and progress is shown live. The fastest finisher wins.

## License

MIT License — feel free to use this project for learning and personal projects.

## Acknowledgements

- Built with [React](https://react.dev/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)

---

Made with ❤️ for typists everywhere
