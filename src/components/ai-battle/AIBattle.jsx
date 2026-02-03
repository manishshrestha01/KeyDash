import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Play, Trophy, Zap, Target, ArrowLeft, RefreshCw } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useAIBattleStore } from '../../store'
import TypingEngine from '../typing/TypingEngine'
import Confetti from 'react-confetti'
import toast, { Toaster } from 'react-hot-toast'

// AI opponent profiles
const AI_PROFILES = {
  easy: {
    name: 'Bot Beginner',
    avatar: '🤖',
    minWpm: 25,
    maxWpm: 40,
    mistakeRate: 0.08,
    pauseChance: 0.3,
    description: 'A friendly AI for beginners',
  },
  medium: {
    name: 'Bot Challenger',
    avatar: '🤖',
    minWpm: 45,
    maxWpm: 65,
    mistakeRate: 0.05,
    pauseChance: 0.2,
    description: 'A moderate challenge',
  },
  hard: {
    name: 'Bot Expert',
    avatar: '🤖',
    minWpm: 70,
    maxWpm: 95,
    mistakeRate: 0.03,
    pauseChance: 0.1,
    description: 'A skilled opponent',
  },
  pro: {
    name: 'Bot Master',
    avatar: '🤖',
    minWpm: 100,
    maxWpm: 140,
    mistakeRate: 0.01,
    pauseChance: 0.05,
    description: 'The ultimate typing AI',
  },
}

// Battle texts
const BATTLE_TEXTS = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  "How vexingly quick daft zebras jump! The five boxing wizards jump quickly at dawn.",
  "Sphinx of black quartz, judge my vow. Two driven jocks help fax my big quiz.",
  "The jay, pig, fox, zebra and my wolves quack! Sympathizing would fix Quaker objectives.",
  "Crazy Frederick bought many very exquisite opal jewels. The job requires extra pluck and zeal from every young wage earner.",
  "We promptly judged antique ivory buckles for the next prize. A mad boxer shot a quick, gloved jab to the jaw of his dizzy opponent.",
]

const AIBattle = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { 
    isActive, difficulty, aiProgress, aiWpm, userProgress, userWpm, winner,
    setDifficulty, startBattle, updateAIProgress, updateUserProgress, setWinner, reset
  } = useAIBattleStore()

  const [battleState, setBattleState] = useState('select') // 'select', 'countdown', 'racing', 'finished'
  const [countdown, setCountdown] = useState(3)
  const [battleText, setBattleText] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [userStats, setUserStats] = useState({ wpm: 0, accuracy: 0, errors: 0 })
  const [aiStats, setAiStats] = useState({ wpm: 0, charsTyped: 0, startTime: null })

  const aiIntervalRef = useRef(null)
  const startTimeRef = useRef(null)
  const battleStateRef = useRef(battleState)
  const winnerRef = useRef(winner)

  // Keep refs in sync
  useEffect(() => {
    battleStateRef.current = battleState
  }, [battleState])

  useEffect(() => {
    winnerRef.current = winner
  }, [winner])

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
    }
  }, [])

  // Start battle
  const handleStartBattle = async (selectedDifficulty) => {
    setDifficulty(selectedDifficulty)
    
    // Select random text
    const text = BATTLE_TEXTS[Math.floor(Math.random() * BATTLE_TEXTS.length)]
    setBattleText(text)
    
    // Start countdown
    setBattleState('countdown')
    setCountdown(3)
    
    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      await new Promise(r => setTimeout(r, 1000))
    }
    
    // Start race
    setBattleState('racing')
    startBattle(selectedDifficulty)
    startTimeRef.current = Date.now()
    
    // Start AI typing simulation
    startAITyping(selectedDifficulty, text)
  }

  // AI typing simulation
  const startAITyping = (diff, text) => {
    const aiProfile = AI_PROFILES[diff]
    if (!aiProfile) return
    
    const targetWpm = aiProfile.minWpm + Math.random() * (aiProfile.maxWpm - aiProfile.minWpm)
    const charsPerMinute = targetWpm * 5
    const msPerChar = 60000 / charsPerMinute
    
    let aiCharsTyped = 0
    let aiMistakes = 0
    let lastUpdate = Date.now()
    
    aiIntervalRef.current = setInterval(() => {
      // Use refs for fresh values
      if (battleStateRef.current === 'finished' || winnerRef.current) {
        clearInterval(aiIntervalRef.current)
        return
      }
      
      const now = Date.now()
      const elapsed = now - startTimeRef.current
      
      // Add some variance to typing speed
      const variance = 1 + (Math.random() - 0.5) * 0.4
      const baseChars = (elapsed / 1000) * (charsPerMinute / 60) * variance
      
      // Simulate pauses
      if (Math.random() < aiProfile.pauseChance * 0.01) {
        // Small pause, don't advance
        return
      }
      
      // Simulate mistakes
      if (Math.random() < aiProfile.mistakeRate) {
        aiMistakes++
        // Delay slightly for "correction"
        aiCharsTyped = Math.max(0, aiCharsTyped - 1)
      }
      
      aiCharsTyped = Math.min(Math.floor(baseChars), text.length)
      
      const progress = (aiCharsTyped / text.length) * 100
      const timeMin = elapsed / 60000
      const currentWpm = timeMin > 0 ? Math.round((aiCharsTyped / 5) / timeMin) : 0
      
      updateAIProgress(Math.min(100, progress), currentWpm)
      setAiStats({ wpm: currentWpm, charsTyped: aiCharsTyped, startTime: startTimeRef.current })
      
      // Check if AI finished
      if (aiCharsTyped >= text.length && !winnerRef.current) {
        clearInterval(aiIntervalRef.current)
        handleRaceEnd('ai', currentWpm, elapsed / 1000)
      }
    }, 50)
  }

  // Handle user progress - memoized to prevent infinite loops
  const handleUserProgress = useCallback((progress, wpm) => {
    updateUserProgress(progress, wpm)
  }, [updateUserProgress])

  // Handle user complete - memoized to prevent re-renders
  const handleUserComplete = useCallback((resultData) => {
    if (winnerRef.current) return
    
    setUserStats({
      wpm: resultData.wpm,
      accuracy: resultData.acc,
      errors: resultData.mistakes,
    })
    
    handleRaceEnd('user', resultData.wpm, resultData.durationSec)
  }, [])

  // Handle race end
  const handleRaceEnd = async (raceWinner, winnerWpm, duration) => {
    if (winnerRef.current) return
    
    // Set winner ref immediately to prevent race conditions
    winnerRef.current = raceWinner
    
    setWinner(raceWinner)
    setBattleState('finished')
    
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current)
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
          user_wpm: userStats.wpm || userWpm,
          user_accuracy: userStats.accuracy || 100,
          user_errors: userStats.errors || 0,
          user_duration: duration,
          ai_wpm: aiStats.wpm || aiWpm,
          ai_duration: raceWinner === 'ai' ? duration : 0,
          winner: raceWinner,
        })

        // Save to typing history
        await supabase.from('typing_history').insert({
          user_id: user.id,
          mode: 'ai_battle',
          sub_mode: difficulty,
          original_text: battleText,
          typed_text: userStats.typedText || battleText,
          wpm: Math.round(userStats.wpm || userWpm),
          raw_wpm: Math.round(userStats.rawWpm || userStats.wpm || userWpm),
          accuracy: parseFloat((userStats.accuracy || 100).toFixed(2)),
          errors: userStats.errors || 0,
          correct_chars: userStats.correctChars || battleText.length,
          total_chars: userStats.totalChars || battleText.length,
          duration_seconds: parseFloat(duration.toFixed(2)),
          mistake_indices: userStats.mistakenIndices || [],
          corrections: userStats.corrections || 0,
          is_completed: true,
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
    setBattleText('')
    setUserStats({ wpm: 0, accuracy: 0, errors: 0 })
    setAiStats({ wpm: 0, charsTyped: 0, startTime: null })
    winnerRef.current = null
    battleStateRef.current = 'select'
    if (aiIntervalRef.current) {
      clearInterval(aiIntervalRef.current)
    }
  }

  // Play again
  const handlePlayAgain = () => {
    handleBack()
  }

  const aiProfile = AI_PROFILES[difficulty] || AI_PROFILES.medium

  // Safety check - if no profile, show selection
  if (!aiProfile && battleState !== 'select') {
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
                onClick={() => handleStartBattle(key)}
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
                    Challenge →
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
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
            <div className="text-lg font-medium capitalize">
              vs {aiProfile.name} ({difficulty})
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
              mode="ai_battle"
              subMode={difficulty}
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
                  <span className="font-bold text-yellow-400">{userStats.wpm || userWpm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Accuracy</span>
                  <span className="font-bold text-green-400">{userStats.accuracy || 100}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Errors</span>
                  <span className="font-bold text-red-400">{userStats.errors || 0}</span>
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
              onClick={handleBack}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Change Difficulty
            </button>
            <button
              onClick={() => handleStartBattle(difficulty)}
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
