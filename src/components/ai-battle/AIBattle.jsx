import React, { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Play, Trophy, Zap, Target, ArrowLeft, RefreshCw } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useAIBattleStore } from '../../store'
import TypingEngine from '../typing/TypingEngine'
import Confetti from 'react-confetti'
import toast, { Toaster } from 'react-hot-toast'
import sentenceData from '../../assets/english/english.json'
import timedData from '../../assets/english/timed.json'

// AI opponent profiles
const AI_PROFILES = {
  easy: {
    name: 'AI Beginner',
    avatar: '🤖',
    minWpm: 25,
    maxWpm: 40,
    mistakeRate: 0.08,
    pauseChance: 0.3,
    description: 'A friendly AI for beginners',
  },
  medium: {
    name: 'AI Challenger',
    avatar: '🤖',
    minWpm: 45,
    maxWpm: 65,
    mistakeRate: 0.05,
    pauseChance: 0.2,
    description: 'A moderate challenge',
  },
  hard: {
    name: 'AI Expert',
    avatar: '🤖',
    minWpm: 70,
    maxWpm: 95,
    mistakeRate: 0.03,
    pauseChance: 0.1,
    description: 'A skilled opponent',
  },
  pro: {
    name: 'AI Master',
    avatar: '🤖',
    minWpm: 100,
    maxWpm: 140,
    mistakeRate: 0.01,
    pauseChance: 0.05,
    description: 'The ultimate typing AI',
  },
}

const SENTENCE_OPTIONS = [
  { key: 'easy', name: 'Easy', range: [0, 100] },
  { key: 'medium', name: 'Medium', range: [101, 300] },
  { key: 'hard', name: 'Hard', range: [301, 600] },
  { key: 'extreme', name: 'Extreme', range: [601, 9999] },
]

const TIMED_OPTIONS = [15, 30, 60, 120]

const DEFAULT_USER_STATS = {
  wpm: 0,
  rawWpm: 0,
  accuracy: 0,
  errors: 0,
  typedText: '',
  correctChars: 0,
  totalChars: 0,
  mistakenIndices: [],
  corrections: 0,
}

const DEFAULT_AI_STATS = { wpm: 0, charsTyped: 0, startTime: null }

const getSentenceModeBattleText = (sentenceDifficulty = 'medium') => {
  const option = SENTENCE_OPTIONS.find((item) => item.key === sentenceDifficulty) || SENTENCE_OPTIONS[1]
  const [minLen, maxLen] = option.range
  const allQuotes = sentenceData?.quotes || sentenceData?.sentences || []

  const filtered = allQuotes.filter((entry) => {
    const text = (entry?.text || entry || '').toString()
    return text.length >= minLen && text.length <= maxLen
  })

  if (filtered.length === 0) return 'No text found for this difficulty.'
  const picked = filtered[Math.floor(Math.random() * filtered.length)]
  return picked?.text || picked
}

const getTimedModeBattleText = (wordCount = 100) => {
  const allWords = Array.isArray(timedData?.words) ? timedData.words : []
  if (allWords.length === 0) return 'typing practice'

  const words = []
  for (let i = 0; i < wordCount; i += 1) {
    const randomIndex = Math.floor(Math.random() * allWords.length)
    words.push(allWords[randomIndex])
  }

  return words.join(' ')
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const resolveTimedWinner = (user, ai) => {
  const userChars = Math.max(0, Number(user?.correctChars) || 0)
  const aiChars = Math.max(0, Number(ai?.charsTyped) || 0)

  if (userChars > aiChars) return 'user'
  if (aiChars > userChars) return 'ai'

  const userWpm = Math.max(0, Number(user?.wpm) || 0)
  const aiWpm = Math.max(0, Number(ai?.wpm) || 0)

  if (userWpm >= aiWpm) return 'user'
  return 'ai'
}

const getUserStatsFromResult = (resultData = {}) => ({
  wpm: resultData.wpm || 0,
  rawWpm: resultData.rawWpm || resultData.wpm || 0,
  accuracy: resultData.acc ?? 0,
  errors: resultData.mistakes ?? 0,
  typedText: resultData.input || '',
  correctChars: resultData.correctChars ?? 0,
  totalChars: resultData.totalChars ?? 0,
  mistakenIndices: resultData.mistakenIndices || [],
  corrections: resultData.corrections || 0,
})

const AIBattle = () => {
  const { user } = useAuth()
  const { 
    difficulty, aiProgress, aiWpm, userProgress, userWpm, winner,
    setDifficulty, startBattle, updateAIProgress, updateUserProgress, setWinner, reset
  } = useAIBattleStore()

  const [battleState, setBattleState] = useState('select') // 'select', 'setup', 'countdown', 'racing', 'finished'
  const [countdown, setCountdown] = useState(3)
  const [battleMode, setBattleMode] = useState('sentence') // 'sentence' | 'timed' | 'custom'
  const [sentenceDifficulty, setSentenceDifficulty] = useState('medium')
  const [timedDuration, setTimedDuration] = useState(60)
  const [customBattleText, setCustomBattleText] = useState('')
  const [timedTimeLeft, setTimedTimeLeft] = useState(0)
  const [battleText, setBattleText] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [userStats, setUserStats] = useState({ ...DEFAULT_USER_STATS })
  const [aiStats, setAiStats] = useState({ ...DEFAULT_AI_STATS })

  const aiIntervalRef = useRef(null)
  const timedClockRef = useRef(null)
  const startTimeRef = useRef(null)
  const battleStateRef = useRef(battleState)
  const winnerRef = useRef(winner)
  const userStatsRef = useRef(userStats)
  const aiStatsRef = useRef(aiStats)

  // Keep refs in sync
  useEffect(() => {
    battleStateRef.current = battleState
  }, [battleState])

  useEffect(() => {
    winnerRef.current = winner
  }, [winner])

  useEffect(() => {
    userStatsRef.current = userStats
  }, [userStats])

  useEffect(() => {
    aiStatsRef.current = aiStats
  }, [aiStats])

  // Window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Cleanup AI interval on unmount
  useEffect(() => {
    return () => {
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current)
      }
      if (timedClockRef.current) {
        clearInterval(timedClockRef.current)
      }
    }
  }, [])

  const resetRaceStats = useCallback(() => {
    const nextUser = { ...DEFAULT_USER_STATS }
    const nextAi = { ...DEFAULT_AI_STATS }

    setUserStats(nextUser)
    setAiStats(nextAi)
    userStatsRef.current = nextUser
    aiStatsRef.current = nextAi

    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current)
      aiIntervalRef.current = null
    }
    if (timedClockRef.current) {
      clearInterval(timedClockRef.current)
      timedClockRef.current = null
    }

    setTimedTimeLeft(0)
    winnerRef.current = null
  }, [])

  const getPreparedBattleText = useCallback((modeToUse) => {
    if (modeToUse === 'custom') {
      return customBattleText.trim()
    }

    if (modeToUse === 'timed') {
      return getTimedModeBattleText(100)
    }

    return getSentenceModeBattleText(sentenceDifficulty)
  }, [customBattleText, sentenceDifficulty])

  const handleSelectDifficulty = (selectedDifficulty) => {
    setDifficulty(selectedDifficulty)
    setBattleState('setup')
  }

  // Start battle after setup
  const handleStartBattle = async () => {
    const selectedMode = battleMode
    const selectedTimedDuration = timedDuration
    const preparedText = getPreparedBattleText(selectedMode)

    if (!preparedText) {
      toast.error('Please add custom text first.')
      return
    }

    if (selectedMode === 'custom' && preparedText.length < 30) {
      toast.error('Custom mode needs at least 30 characters.')
      return
    }

    reset()
    resetRaceStats()
    setShowConfetti(false)
    setBattleText(preparedText)

    // Start countdown
    setBattleState('countdown')
    setCountdown(3)

    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      await new Promise(r => setTimeout(r, 1000))
    }

    // Start race
    setBattleState('racing')
    startBattle(difficulty)
    startTimeRef.current = Date.now()

    if (selectedMode === 'timed') {
      setTimedTimeLeft(selectedTimedDuration)
      timedClockRef.current = setInterval(() => {
        setTimedTimeLeft((prev) => {
          if (prev <= 1) {
            if (timedClockRef.current) {
              clearInterval(timedClockRef.current)
              timedClockRef.current = null
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    // Start AI typing simulation
    startAITyping(difficulty, preparedText, selectedMode, selectedTimedDuration)
  }

  // AI typing simulation
  const startAITyping = (diff, text, modeToUse = 'sentence', timedSeconds = 60) => {
    const aiProfile = AI_PROFILES[diff]
    if (!aiProfile || !text?.length) return

    const minWpm = aiProfile.minWpm
    const maxWpm = aiProfile.maxWpm
    const targetWpm = minWpm + Math.random() * (maxWpm - minWpm)
    const targetCharsPerSec = (targetWpm * 5) / 60

    let aiCharsTyped = 0
    let aiCharsExact = 0
    let lastUpdate = Date.now()
    let paceFactor = 1
    
    aiIntervalRef.current = setInterval(() => {
      // Use refs for fresh values
      if (battleStateRef.current === 'finished' || winnerRef.current) {
        clearInterval(aiIntervalRef.current)
        aiIntervalRef.current = null
        return
      }
      
      const now = Date.now()
      const elapsedMs = now - startTimeRef.current
      const elapsedSec = elapsedMs / 1000
      const deltaSec = Math.max(0.016, (now - lastUpdate) / 1000)
      lastUpdate = now

      // Smooth local variance while keeping long-term pace stable.
      paceFactor = clamp(paceFactor + (Math.random() - 0.5) * 0.03, 0.92, 1.08)

      // Very short hesitations, but compensated later so final WPM stays in range.
      const hesitationChancePerSec = Math.max(0, aiProfile.pauseChance) * 0.05
      const hesitationFactor = Math.random() < hesitationChancePerSec * deltaSec ? 0.65 : 1

      aiCharsExact += targetCharsPerSec * deltaSec * paceFactor * hesitationFactor

      // Pull toward target pace if we drift behind due to random hesitations.
      const expectedCharsByNow = targetCharsPerSec * elapsedSec
      const lagChars = expectedCharsByNow - aiCharsExact
      if (lagChars > 0) {
        aiCharsExact += Math.min(lagChars * 0.4, 0.9)
      }

      aiCharsExact = Math.min(text.length, Math.max(aiCharsExact, aiCharsTyped))
      const nextCharsTyped = Math.floor(aiCharsExact)
      if (nextCharsTyped > aiCharsTyped) {
        aiCharsTyped = nextCharsTyped
      }

      const progress = (aiCharsTyped / text.length) * 100
      const typedWpm = elapsedSec > 0 ? ((aiCharsTyped / 5) / (elapsedSec / 60)) : targetWpm
      const currentWpm = Math.round(clamp(typedWpm, minWpm, maxWpm))

      updateAIProgress(Math.min(100, progress), currentWpm)
      setAiStats({ wpm: currentWpm, charsTyped: aiCharsTyped, startTime: startTimeRef.current })

      if (modeToUse === 'timed' && elapsedMs >= timedSeconds * 1000) {
        clearInterval(aiIntervalRef.current)
        aiIntervalRef.current = null
        return
      }
      
      // Check if AI finished
      if (modeToUse !== 'timed' && aiCharsTyped >= text.length && !winnerRef.current) {
        clearInterval(aiIntervalRef.current)
        aiIntervalRef.current = null
        handleRaceEnd('ai', elapsedMs / 1000)
      }
    }, 33)
  }

  // Handle user progress - memoized to prevent infinite loops
  const handleUserProgress = useCallback((progress, wpm, liveStats = {}) => {
    updateUserProgress(progress, wpm)

    setUserStats((prev) => ({
      ...prev,
      wpm: Number.isFinite(wpm) ? wpm : prev.wpm,
      rawWpm: Number.isFinite(liveStats.rawWpm) ? liveStats.rawWpm : prev.rawWpm,
      accuracy: Number.isFinite(liveStats.accuracy) ? liveStats.accuracy : prev.accuracy,
      errors: Number.isFinite(liveStats.errors) ? liveStats.errors : prev.errors,
      typedText: typeof liveStats.typedText === 'string' ? liveStats.typedText : prev.typedText,
      correctChars: Number.isFinite(liveStats.correctChars) ? liveStats.correctChars : prev.correctChars,
      totalChars: Number.isFinite(liveStats.totalChars) ? liveStats.totalChars : prev.totalChars,
    }))
  }, [updateUserProgress])

  // Handle user complete
  const handleUserComplete = (resultData) => {
    if (winnerRef.current) return

    const nextUserStats = getUserStatsFromResult(resultData)
    setUserStats(nextUserStats)

    if (battleMode === 'timed') {
      const timedWinner = resolveTimedWinner(nextUserStats, aiStatsRef.current)
      handleRaceEnd(timedWinner, resultData.durationSec, nextUserStats)
      return
    }

    const didMatchTarget = resultData?.isExactMatch ?? (resultData?.input === resultData?.target)
    if (!didMatchTarget) return

    handleRaceEnd('user', resultData.durationSec, nextUserStats)
  }

  // Handle race end
  const handleRaceEnd = async (raceWinner, duration, completedUserStats = null) => {
    if (winnerRef.current) return

    const finalUserStats = completedUserStats || userStatsRef.current
    const finalAiStats = aiStatsRef.current

    // Set winner ref immediately to prevent race conditions
    winnerRef.current = raceWinner
    
    setWinner(raceWinner)
    setBattleState('finished')
    
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current)
    }
    if (timedClockRef.current) {
      clearInterval(timedClockRef.current)
      timedClockRef.current = null
    }
    
    // Show confetti if user won
    if (raceWinner === 'user') {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
      toast.success('You won! 🎉')
    } else {
      toast.error('AI won this time!')
    }
    
    // Save battle result
    if (user?.id) {
      try {
        await supabase.from('ai_battles').insert({
          user_id: user.id,
          difficulty,
          race_text: battleText,
          user_wpm: finalUserStats.wpm || userWpm,
          user_accuracy: finalUserStats.accuracy ?? 0,
          user_errors: finalUserStats.errors ?? 0,
          user_duration: duration,
          ai_wpm: finalAiStats.wpm || aiWpm,
          ai_duration: raceWinner === 'ai' ? duration : 0,
          winner: raceWinner,
        })

      } catch (error) {
        console.error('Error saving battle result:', error)
      }
    }
  }

  // Reset and go back
  const handleBack = () => {
    reset()
    setBattleState('select')
    setBattleMode('sentence')
    setSentenceDifficulty('medium')
    setTimedDuration(60)
    setCustomBattleText('')
    setBattleText('')
    resetRaceStats()
    battleStateRef.current = 'select'
    setShowConfetti(false)
  }

  const handleBackToSetup = () => {
    reset()
    resetRaceStats()
    setShowConfetti(false)
    setBattleText('')
    setBattleState('setup')
    battleStateRef.current = 'setup'
  }

  const aiProfile = AI_PROFILES[difficulty] || AI_PROFILES.medium
  const isTimedMode = battleMode === 'timed'
  const aiCaretIndex = Math.min(aiStats.charsTyped || 0, battleText?.length || 0)
  const displayUserWpm = userStats.wpm > 0 ? userStats.wpm : userWpm
  const displayUserAccuracy = userStats.totalChars > 0 ? userStats.accuracy : 0
  const displayUserErrors = userStats.errors ?? 0
  const customTrimmedLength = customBattleText.trim().length
  const canStartBattle = battleMode !== 'custom' || customTrimmedLength >= 30
  const sentenceDifficultyLabel = SENTENCE_OPTIONS.find((item) => item.key === sentenceDifficulty)?.name || 'Medium'
  const battleModeLabel = battleMode === 'timed'
    ? `Timed ${timedDuration}s`
    : battleMode === 'custom'
      ? 'Custom'
      : `Sentence ${sentenceDifficultyLabel}`

  // Safety check - if no profile, show selection
  if (!aiProfile && battleState !== 'select' && battleState !== 'setup') {
    setBattleState('select')
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Toaster position="top-center" />
      
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={['#facc15', '#22c55e', '#3b82f6', '#8b5cf6']}
        />
      )}

      {/* Countdown Overlay */}
      <AnimatePresence>
        {battleState === 'countdown' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-9xl font-bold text-yellow-400"
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Difficulty Selection */}
      {battleState === 'select' && (
        <div>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-2xl mb-4">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Battle AI</h1>
            <p className="text-gray-400">Challenge AI opponents at different difficulty levels</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(AI_PROFILES).map(([key, profile]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectDifficulty(key)}
                className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50 
                         hover:border-purple-500/50 transition-all text-left group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{profile.avatar}</div>
                  <div>
                    <h3 className="text-xl font-bold group-hover:text-purple-400 transition-colors">
                      {profile.name}
                    </h3>
                    <p className="text-sm text-gray-400 capitalize">{key} Difficulty</p>
                  </div>
                </div>
                <p className="text-gray-400 mb-4">{profile.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Speed: {profile.minWpm}-{profile.maxWpm} WPM</span>
                  <span className="text-purple-400 group-hover:text-purple-300">
                    Setup →
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Battle Setup */}
      {battleState === 'setup' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => setBattleState('select')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Change AI
            </button>
            <div className="text-lg font-medium capitalize">
              {aiProfile.name} ({difficulty})
            </div>
          </div>

          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-2xl font-bold mb-2">Battle Setup</h2>
            <p className="text-gray-400 mb-6">
              Pick a mode, tune settings, then press ready.
            </p>

            <div className="grid md:grid-cols-3 gap-3 mb-6">
              {[
                { id: 'sentence', title: 'Sentence Mode', desc: 'First to complete the full text wins.' },
                { id: 'timed', title: 'Timed Mode', desc: 'Most correct characters before time ends wins.' },
                { id: 'custom', title: 'Custom Mode', desc: 'Battle with your own text.' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setBattleMode(item.id)}
                  className={`rounded-xl p-4 border text-left transition-all ${
                    battleMode === item.id
                      ? 'border-yellow-400/70 bg-yellow-400/10'
                      : 'border-gray-700/60 hover:border-gray-600/80'
                  }`}
                >
                  <p className="font-semibold mb-1">{item.title}</p>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </button>
              ))}
            </div>

            {battleMode === 'sentence' && (
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-3">Select sentence difficulty</p>
                <div className="flex flex-wrap gap-2">
                  {SENTENCE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setSentenceDifficulty(option.key)}
                      className={`px-4 py-2 rounded-lg border transition ${
                        sentenceDifficulty === option.key
                          ? 'border-yellow-400 bg-yellow-400/15 text-yellow-300'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {battleMode === 'timed' && (
              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-3">Select timer</p>
                <div className="flex flex-wrap gap-2">
                  {TIMED_OPTIONS.map((seconds) => (
                    <button
                      key={seconds}
                      onClick={() => setTimedDuration(seconds)}
                      className={`px-4 py-2 rounded-lg border transition ${
                        timedDuration === seconds
                          ? 'border-purple-400 bg-purple-500/15 text-purple-300'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {battleMode === 'custom' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">Custom text</p>
                  <p className={`text-xs ${customTrimmedLength >= 30 ? 'text-green-400' : 'text-gray-500'}`}>
                    {customTrimmedLength}/30 min chars
                  </p>
                </div>
                <textarea
                  value={customBattleText}
                  onChange={(e) => setCustomBattleText(e.target.value)}
                  placeholder="Paste or type your custom battle text..."
                  className="w-full min-h-[120px] rounded-xl border border-gray-700/60 bg-[#121827] px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-400/70"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-400">
                Ready mode: <span className="text-yellow-400 font-medium">{battleModeLabel}</span>
              </p>
              <button
                onClick={handleStartBattle}
                disabled={!canStartBattle}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-5 h-5" />
                Ready
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Racing State */}
      {battleState === 'racing' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Quit Battle
            </button>
            <div className="text-right">
              <div className="text-lg font-medium capitalize">
                vs {aiProfile.name} ({difficulty})
              </div>
              <div className="text-sm text-gray-400">
                {battleModeLabel}
                {isTimedMode && <span className="ml-2 text-yellow-400">{timedTimeLeft}s</span>}
              </div>
            </div>
          </div>

          {/* Progress Comparison */}
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <div className="space-y-6">
              {/* User Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-medium">You</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-yellow-400 font-bold">{userWpm} WPM</span>
                    <span className="text-gray-400">{Math.round(userProgress)}%</span>
                  </div>
                </div>
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
                    animate={{ width: `${userProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>

              {/* AI Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-medium">{aiProfile.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-purple-400 font-bold">{aiWpm} WPM</span>
                    <span className="text-gray-400">{Math.round(aiProgress)}%</span>
                  </div>
                </div>
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
                    animate={{ width: `${aiProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typing Area */}
          {battleText && (
            <TypingEngine
              text={battleText}
              mode={isTimedMode ? 'timed' : 'ai_battle'}
              subMode={isTimedMode ? `${difficulty}_${battleMode}_${timedDuration}s` : `${difficulty}_${battleMode}_${sentenceDifficulty}`}
              timeLimit={isTimedMode ? timedDuration : null}
              startImmediately={isTimedMode}
              historyModeOverride="ai_battle"
              opponentCaretIndex={aiCaretIndex}
              onProgress={handleUserProgress}
              onComplete={handleUserComplete}
              showLiveStats={false}
              showRestartButton={false}
            />
          )}
        </div>
      )}

      {/* Results */}
      {battleState === 'finished' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Result Header */}
          <div className="text-center py-8 bg-[#1a1f2e] rounded-2xl border border-gray-700/50">
            <div className="text-6xl mb-4">
              {winner === 'user' ? '🏆' : '🤖'}
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {winner === 'user' ? 'You Won!' : `${aiProfile.name} Won!`}
            </h2>
            <p className="text-gray-400">
              {winner === 'user' 
                ? 'Congratulations on defeating the AI!' 
                : "Don't give up, try again!"}
            </p>
          </div>

          {/* Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Your Stats */}
            <div className={`bg-[#1a1f2e] rounded-2xl p-6 border ${
              winner === 'user' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-gray-700/50'
            }`}>
              <div className="text-center mb-4">
                <div className="text-2xl mb-2">👤</div>
                <h3 className="text-xl font-bold">You</h3>
                {winner === 'user' && (
                  <span className="inline-block px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded text-sm mt-2">
                    Winner!
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">WPM</span>
                  <span className="font-bold text-yellow-400">{displayUserWpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Accuracy</span>
                  <span className="font-bold text-green-400">{displayUserAccuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Errors</span>
                  <span className="font-bold text-red-400">{displayUserErrors}</span>
                </div>
              </div>
            </div>

            {/* AI Stats */}
            <div className={`bg-[#1a1f2e] rounded-2xl p-6 border ${
              winner === 'ai' ? 'border-purple-500/50 bg-purple-500/5' : 'border-gray-700/50'
            }`}>
              <div className="text-center mb-4">
                <div className="text-2xl mb-2">{aiProfile.avatar}</div>
                <h3 className="text-xl font-bold">{aiProfile.name}</h3>
                {winner === 'ai' && (
                  <span className="inline-block px-2 py-1 bg-purple-400/20 text-purple-400 rounded text-sm mt-2">
                    Winner!
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">WPM</span>
                  <span className="font-bold text-purple-400">{aiStats.wpm || aiWpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Difficulty</span>
                  <span className="font-bold capitalize">{difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Speed Range</span>
                  <span className="font-bold">{aiProfile.minWpm}-{aiProfile.maxWpm}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleBackToSetup}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Change Setup
            </button>
            <button
              onClick={handleStartBattle}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Rematch
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default AIBattle
