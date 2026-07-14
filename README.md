# KeyDash — Free Online Typing Test with Multiplayer, AI Battles & Achievements 🚀

> **KeyDash** is a free online typing test and practice platform with **multiplayer races**, **AI battles**, **1200+ achievements**, and **competitive leaderboards**. Track your WPM and accuracy in real time, practice with coding snippets in JavaScript, Python, Java, C, and C++, type in English or Nepali (Devanagari), and climb the rankings.

<p align="center">
  <a href="https://keydash.shresthamanish.info.np/"><img src="public/logo.svg" alt="KeyDash — online typing speed test and WPM trainer" width="120" /></a>
</p>

<p align="center">
  <a href="https://keydash.shresthamanish.info.np/"><strong>🌐 Live Demo → keydash.shresthamanish.info.np</strong></a>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img alt="Vite 6" src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white" />
  <img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" />
</p>

**Keywords:** online typing test · typing speed test · WPM test · typing accuracy trainer · coding typing practice · multiplayer typing race · AI typing battle · typing achievements · Nepali typing practice · daily typing challenge · free typing test

## ✨ Features

### 🎮 Multiple Typing Modes
- **Language Mode**: Practice typing in English or Nepali (Devanagari script)
- **Coding Mode**: Practice with real code snippets in JavaScript, Python, Java, C, and C++
- **Symbols Mode**: Master special characters and grammar punctuation (easy, medium, and hard).
- **Custom Mode**: Paste your own text or code to practice

### 📊 Comprehensive Stats & Tracking
- Real-time WPM (Words Per Minute) calculation
- Accuracy tracking with error highlighting
- Character-by-character analysis
- Complete typing history with replay capability

### 🔥 Streak System
- Daily typing challenges to build habits
- Streak tracking with milestone rewards
- Keep your streak alive to earn achievements

### 🏆 Competitive Features
- **Leaderboards**: Daily, Weekly, Monthly, and All-time rankings
- **Multiplayer Racing**: Real-time typing races with Supabase Realtime
- **AI Battles**: Challenge AI opponents at Easy, Medium, Hard, or Pro difficulty

### 🏅 Achievements & Badges
- 1200+ tiered achievements across speed, streak, coding, symbols, multiplayer, AI, and overall progress
- Speed milestones (30+ WPM, 50+ WPM, 70+ WPM, etc.)
- Accuracy achievements (95%+, 98%+, 100%)
- Streak milestones (7 days, 30 days, 100 days)
- Coding mastery and Symbols proficiency badges
- Multiplayer and AI battle victories

### 📱 Social Sharing
- Generate beautiful result cards
- Share to Twitter, Facebook, LinkedIn and WhatsApp
- Download results as images

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS 4
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Build Tool**: Vite 6
- **Icons**: Lucide React

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/manishshrestha01/keydash.git
cd keydash
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Go to your Supabase project's SQL Editor
   - Run the SQL commands from `supabase/schema.sql`

5. Start the development server:
```bash
npm run dev
```

## 🗄️ Database Schema

The app uses the following main tables:
- `profiles` - User profiles with display names and avatars
- `typing_history` - Complete typing test records
- `streaks` - Daily streak tracking
- `achievements` - Available achievements
- `user_achievements` - Unlocked achievements per user
- `multiplayer_rooms` - Real-time race lobbies
- `custom_texts` - User-saved custom texts

## 🚀 Routes

| Route | Description |
|-------|-------------|
| `/` | Home - Mode selector |
| `/dashboard` | User dashboard with stats |
| `/history` | Typing history with retry |
| `/achievements` | Achievement showcase |
| `/leaderboard/v2` | Competitive leaderboards |
| `/multiplayer` | Real-time multiplayer lobby |
| `/ai-battle` | AI opponent battles |
| `/custom` | Custom text mode |
| `/profile` | User profile |
| `/settings` | Account settings |

## 🎯 Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## 📄 License

MIT License - feel free to use this project for learning and personal projects.

## 🙏 Acknowledgements

- Built with [React](https://react.dev/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)

---

Made with ❤️ for typists everywhere
