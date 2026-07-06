// Global store using Zustand for state management
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Main App Store
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // Sound
      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      // Typing preferences
      smoothCaret: true,
      setSmoothCaret: (smooth) => set({ smoothCaret: smooth }),
      
      caretStyle: 'line', // 'line', 'block', 'underline'
      setCaretStyle: (style) => set({ caretStyle: style }),

      fontSize: 'medium', // 'small', 'medium', 'large'
      setFontSize: (size) => set({ fontSize: size }),

      showLiveWpm: true,
      setShowLiveWpm: (show) => set({ showLiveWpm: show }),

      showLiveAccuracy: true,
      setShowLiveAccuracy: (show) => set({ showLiveAccuracy: show }),

      // Typing mode preferences
      lastMode: 'sentence',
      lastSubMode: 'medium',
      lastLanguage: 'english',
      lastNepaliInputMethod: 'romanized', // 'romanized' | 'traditional'
      setLastMode: (mode, subMode) => set({ lastMode: mode, lastSubMode: subMode }),
      setLastLanguage: (language) => set({ lastLanguage: language }),
      setLastNepaliInputMethod: (inputMethod) => set({ lastNepaliInputMethod: inputMethod }),
    }),
    {
      name: 'keydash-settings',
    }
  )
)

// Typing Session Store (non-persisted)
export const useTypingStore = create((set, get) => ({
  // Current session state
  isTyping: false,
  isPaused: false,
  isFinished: false,
  
  // Text data
  targetText: '',
  typedText: '',
  currentIndex: 0,
  
  // Stats
  wpm: 0,
  rawWpm: 0,
  accuracy: 100,
  errors: 0,
  correctChars: 0,
  
  // Timing
  startTime: null,
  endTime: null,
  elapsedTime: 0,
  timeLimit: null, // for timed mode
  
  // Detailed tracking
  mistakeIndices: [],
  corrections: 0,
  charTimings: [], // for heatmap analysis
  
  // Actions
  setTargetText: (text) => set({ 
    targetText: text,
    typedText: '',
    currentIndex: 0,
    isTyping: false,
    isPaused: false,
    isFinished: false,
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    errors: 0,
    correctChars: 0,
    startTime: null,
    endTime: null,
    elapsedTime: 0,
    mistakeIndices: [],
    corrections: 0,
    charTimings: [],
  }),
  
  startTyping: () => set({ 
    isTyping: true, 
    startTime: Date.now(),
    isPaused: false,
  }),
  
  pauseTyping: () => set({ isPaused: true }),
  
  resumeTyping: () => set({ isPaused: false }),
  
  updateTypedText: (text) => {
    const state = get()
    const isCorrect = text.length > 0 && text[text.length - 1] === state.targetText[text.length - 1]
    
    set({ 
      typedText: text,
      currentIndex: text.length,
      errors: isCorrect ? state.errors : state.errors + 1,
      mistakeIndices: isCorrect 
        ? state.mistakeIndices 
        : [...state.mistakeIndices, text.length - 1],
    })
  },
  
  finishTyping: () => set({ 
    isFinished: true, 
    isTyping: false,
    endTime: Date.now(),
  }),
  
  updateStats: (stats) => set(stats),
  
  reset: () => set({
    isTyping: false,
    isPaused: false,
    isFinished: false,
    typedText: '',
    currentIndex: 0,
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    errors: 0,
    correctChars: 0,
    startTime: null,
    endTime: null,
    elapsedTime: 0,
    mistakeIndices: [],
    corrections: 0,
    charTimings: [],
  }),
}))

// Multiplayer Store
export const useMultiplayerStore = create((set, get) => ({
  // Room state
  currentRoom: null,
  roomCode: null,
  isHost: false,
  status: 'idle', // 'idle', 'waiting', 'countdown', 'racing', 'finished'
  
  // Participants
  participants: [],
  
  // Race data
  raceText: '',
  countdown: 3,
  
  // User progress
  myProgress: 0,
  myWpm: 0,
  
  // Actions
  setRoom: (room) => set({ 
    currentRoom: room,
    roomCode: room?.room_code,
    status: room?.status || 'waiting',
    raceText: room?.race_text || '',
  }),
  
  setIsHost: (isHost) => set({ isHost }),
  
  setParticipants: (participants) => set({ participants }),
  
  updateParticipant: (userId, data) => {
    const participants = get().participants.map(p => 
      p.user_id === userId ? { ...p, ...data } : p
    )
    set({ participants })
  },
  
  setStatus: (status) => set({ status }),
  
  setCountdown: (countdown) => set({ countdown }),
  
  updateMyProgress: (progress, wpm) => set({ myProgress: progress, myWpm: wpm }),
  
  leaveRoom: () => set({
    currentRoom: null,
    roomCode: null,
    isHost: false,
    status: 'idle',
    participants: [],
    raceText: '',
    countdown: 3,
    myProgress: 0,
    myWpm: 0,
  }),
}))

// AI Battle Store
export const useAIBattleStore = create((set, get) => ({
  isActive: false,
  difficulty: 'medium',
  aiProgress: 0,
  aiWpm: 0,
  aiName: 'AI',
  userProgress: 0,
  userWpm: 0,
  winner: null,
  
  // AI settings by difficulty
  aiSettings: {
    easy: { minWpm: 25, maxWpm: 40, mistakeRate: 0.08, pauseChance: 0.3 },
    medium: { minWpm: 45, maxWpm: 65, mistakeRate: 0.05, pauseChance: 0.2 },
    hard: { minWpm: 70, maxWpm: 95, mistakeRate: 0.03, pauseChance: 0.1 },
    pro: { minWpm: 100, maxWpm: 140, mistakeRate: 0.01, pauseChance: 0.05 },
  },
  
  setDifficulty: (difficulty) => set({ difficulty }),
  
  startBattle: (difficulty) => set({ 
    isActive: true,
    difficulty: difficulty || get().difficulty,
    aiProgress: 0,
    aiWpm: 0,
    userProgress: 0,
    userWpm: 0,
    winner: null,
  }),
  
  updateAIProgress: (progress, wpm) => set({ aiProgress: progress, aiWpm: wpm }),
  
  updateUserProgress: (progress, wpm) => set({ userProgress: progress, userWpm: wpm }),
  
  setWinner: (winner) => set({ winner, isActive: false }),
  
  reset: () => set({
    isActive: false,
    aiProgress: 0,
    aiWpm: 0,
    userProgress: 0,
    userWpm: 0,
    winner: null,
  }),
}))

export default useAppStore
