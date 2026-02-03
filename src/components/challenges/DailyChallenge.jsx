import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Trophy, Clock, Target, Zap, ArrowLeft, 
  Medal, Crown, Star, RefreshCw, Users
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import TypingEngine from '../typing/TypingEngine'
import { format, formatDistanceToNow } from 'date-fns'
import toast, { Toaster } from 'react-hot-toast'
import Confetti from 'react-confetti'

// Daily challenge texts pool - moved outside component
const DAILY_TEXTS = [
  "The quick brown fox jumps over the lazy dog. Programming is the art of turning caffeine into code. Every expert was once a beginner, and every master was once a disaster.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. The only way to do great work is to love what you do.",
  "In the middle of difficulty lies opportunity. The best time to plant a tree was twenty years ago. The second best time is now.",
  "Code is like humor. When you have to explain it, it's bad. First, solve the problem. Then, write the code. Keep it simple, stupid.",
  "The only limit to our realization of tomorrow will be our doubts of today. Believe you can and you're halfway there.",
  "Practice makes perfect. The more you type, the faster you become. Speed without accuracy is meaningless. Focus on precision first.",
  "Technology is best when it brings people together. Innovation distinguishes between a leader and a follower. Stay hungry, stay foolish.",
  "Learning to code is learning to create and innovate. The computer was born to solve problems that did not exist before.",
  "Simplicity is the ultimate sophistication. Make it work, make it right, make it fast. Clean code always looks like it was written by someone who cares.",
  "The best error message is the one that never shows up. Testing leads to failure, and failure leads to understanding."
]

const DailyChallenge = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [userRank, setUserRank] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [gameState, setGameState] = useState('loading') // 'loading', 'ready', 'playing', 'completed', 'no-challenge'

  // Window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    fetchChallenge()
  }, [user, authLoading, navigate])

  const fetchChallenge = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      console.log('Fetching challenge for date:', today)
      
      // Get today's daily challenge from database
      // First try exact date match
      let { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('challenge_type', 'daily')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('Challenge query result:', { challengeData, challengeError })

      // If no challenge exists in database, show no-challenge state
      if (challengeError || !challengeData) {
        console.log('No daily challenge found in database:', challengeError?.message || 'No data')
        setGameState('no-challenge')
        setLoading(false)
        return
      }

      setChallenge(challengeData)

      // Check if user already completed this challenge
      try {
        const { data: attemptData } = await supabase
          .from('challenge_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('challenge_id', challengeData.id)
          .maybeSingle()

        if (attemptData) {
          setAttempt(attemptData)
          setGameState('completed')
        } else {
          setGameState('ready')
        }
        
        // Fetch leaderboard
        fetchLeaderboard(challengeData.id)
      } catch (err) {
        console.error('Error checking attempt:', err)
        setGameState('ready')
      }

    } catch (error) {
      console.error('Error fetching challenge:', error)
      setGameState('no-challenge')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaderboard = async (challengeId) => {
    if (!challengeId) {
      console.log('No challengeId provided to fetchLeaderboard')
      return
    }
    
    console.log('Fetching leaderboard for challengeId:', challengeId)
    
    try {
      // First try without the join to see if basic query works
      const { data, error } = await supabase
        .from('challenge_attempts')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('wpm', { ascending: false })
        .limit(20)

      console.log('Leaderboard fetch result:', { data, error, dataLength: data?.length })

      if (error) throw error

      // If we have data, fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds)

        console.log('Profiles fetched:', profiles)

        // Merge profiles into data
        const dataWithProfiles = data.map(entry => ({
          ...entry,
          profiles: profiles?.find(p => p.id === entry.user_id) || null
        }))

        console.log('Data with profiles:', dataWithProfiles)
        setLeaderboard(dataWithProfiles)
      } else {
        setLeaderboard([])
      }

      // Find user's rank
      if (user?.id && data) {
        const userAttempt = data.findIndex(a => a.user_id === user.id)
        if (userAttempt !== -1) {
          setUserRank(userAttempt + 1)
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  const handleStartChallenge = () => {
    setGameState('playing')
  }

  // Memoize callbacks to prevent infinite loops
  const handleProgress = useCallback((progress, wpm) => {
    // Optional: track progress during typing
  }, [])

  const handleComplete = useCallback(async (resultData) => {
    if (!challenge || !user?.id) return

    console.log('Completing challenge with result:', resultData)

    try {
      let newAttempt = {
        wpm: Math.round(resultData.wpm),
        accuracy: parseFloat(resultData.acc.toFixed(2)),
        errors: resultData.mistakes,
        duration_seconds: parseFloat(resultData.durationSec.toFixed(2)),
      }

      console.log('Saving attempt:', {
        user_id: user.id,
        challenge_id: challenge.id,
        ...newAttempt
      })

      // Save to challenge_attempts
      const { data: savedAttempt, error } = await supabase
        .from('challenge_attempts')
        .insert({
          user_id: user.id,
          challenge_id: challenge.id,
          wpm: newAttempt.wpm,
          accuracy: newAttempt.accuracy,
          errors: newAttempt.errors,
          duration_seconds: newAttempt.duration_seconds,
          typed_text: resultData.input,
        })
        .select()
        .single()

      console.log('Save result:', { savedAttempt, error })

      if (error) {
        // Check if it's a duplicate key error
        if (error.code === '23505') {
          toast.error('You have already completed this challenge!')
          setGameState('completed')
          return
        }
        console.error('Error saving attempt:', error)
        toast.error('Failed to save your attempt')
      } else {
        newAttempt = savedAttempt
        console.log('Attempt saved successfully:', savedAttempt)
      }

      // Refresh leaderboard
      console.log('Fetching leaderboard for challenge:', challenge.id)
      await fetchLeaderboard(challenge.id)

      setAttempt(newAttempt)
      setGameState('completed')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
      toast.success('Challenge completed! 🎉')

      // Also save to typing history
      await supabase.from('typing_history').insert({
        user_id: user.id,
        mode: 'daily',
        sub_mode: format(new Date(), 'yyyy-MM-dd'),
        original_text: challenge.challenge_text,
        typed_text: resultData.input,
        wpm: Math.round(resultData.wpm),
        raw_wpm: Math.round(resultData.rawWpm || resultData.wpm),
        accuracy: parseFloat(resultData.acc.toFixed(2)),
        errors: resultData.mistakes,
        correct_chars: resultData.correctChars || 0,
        total_chars: resultData.totalChars || challenge.challenge_text.length,
        duration_seconds: parseFloat(resultData.durationSec.toFixed(2)),
        mistake_indices: resultData.mistakenIndices || [],
        corrections: resultData.corrections || 0,
        is_completed: true,
      })

    } catch (error) {
      console.error('Error saving challenge attempt:', error)
      // Still show completion even if save fails
      setAttempt({
        wpm: Math.round(resultData.wpm),
        accuracy: parseFloat(resultData.acc.toFixed(2)),
        errors: resultData.mistakes,
        duration_seconds: parseFloat(resultData.durationSec.toFixed(2)),
      })
      setGameState('completed')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
      toast.success('Challenge completed! 🎉')
    }
  }, [challenge, user?.id])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading daily challenge...</p>
        </div>
      </div>
    )
  }

  if (gameState === 'no-challenge') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Toaster position="top-center" />
        
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="bg-[#1a1f2e] rounded-2xl p-12 border border-gray-700/50 text-center">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">No Challenge Today</h2>
          <p className="text-gray-400 mb-6">
            There's no daily challenge available right now. Check back tomorrow for a new challenge!
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors"
          >
            Practice Typing Instead
          </button>
        </div>
      </div>
    )
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

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Daily Challenge</p>
          <p className="text-white font-medium">{format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Ready State */}
      {gameState === 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-2xl p-8 border border-yellow-500/30 text-center">
            <Calendar className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Today's Daily Challenge</h1>
            <p className="text-gray-400 mb-6">
              Complete this challenge to compete on today's leaderboard!
            </p>
            <button
              onClick={handleStartChallenge}
              className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-600 transition-all shadow-lg shadow-yellow-500/25"
            >
              Start Challenge
            </button>
          </div>

          {/* Today's Leaderboard Preview */}
          {leaderboard.length > 0 && (
            <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Today's Top Performers
              </h2>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-[#252b3b] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-yellow-400 text-black' :
                        idx === 1 ? 'bg-gray-400 text-black' :
                        idx === 2 ? 'bg-orange-400 text-black' :
                        'bg-gray-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      {entry.profiles?.avatar_url ? (
                        <img src={entry.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                          {(entry.profiles?.display_name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{entry.profiles?.display_name || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-yellow-400 font-bold">{entry.wpm} WPM</span>
                      <span className="text-gray-400">{entry.accuracy}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Playing State */}
      {gameState === 'playing' && challenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-yellow-400" />
                Daily Challenge
              </h2>
              <span className="text-gray-400">One attempt only!</span>
            </div>
            
            <TypingEngine
              text={challenge.challenge_text}
              mode="daily"
              subMode={format(new Date(), 'yyyy-MM-dd')}
              onProgress={handleProgress}
              onComplete={handleComplete}
              showLiveStats={true}
              showRestartButton={false}
            />
          </div>
        </motion.div>
      )}

      {/* Completed State */}
      {gameState === 'completed' && attempt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Results Card */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl p-8 border border-green-500/30 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold mb-2">Challenge Completed!</h2>
            {userRank && (
              <p className="text-xl text-green-400 mb-4">
                You ranked #{userRank} today!
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'WPM', value: attempt.wpm, icon: Zap, color: 'text-yellow-400' },
              { label: 'Accuracy', value: `${attempt.accuracy}%`, icon: Target, color: 'text-green-400' },
              { label: 'Errors', value: attempt.errors, icon: RefreshCw, color: 'text-red-400' },
              { label: 'Time', value: `${attempt.duration_seconds.toFixed(1)}s`, icon: Clock, color: 'text-blue-400' },
            ].map((stat) => {
              const StatIcon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="bg-[#1a1f2e] rounded-xl p-4 border border-gray-700/50 text-center"
                >
                  <StatIcon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                </div>
              )
            })}
          </div>

          {/* Full Leaderboard */}
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Today's Leaderboard
            </h2>
            
            {leaderboard.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                You're the first one to complete today's challenge!
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => {
                  const isCurrentUser = entry.user_id === user?.id
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        isCurrentUser ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-[#252b3b]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-400 text-black' :
                          idx === 1 ? 'bg-gray-400 text-black' :
                          idx === 2 ? 'bg-orange-400 text-black' :
                          'bg-gray-700 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        {entry.profiles?.avatar_url ? (
                          <img src={entry.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                            {(entry.profiles?.display_name || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <span className={`font-medium ${isCurrentUser ? 'text-yellow-400' : ''}`}>
                          {entry.profiles?.display_name || 'Anonymous'}
                          {isCurrentUser && ' (You)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-yellow-400 font-bold">{entry.wpm} WPM</span>
                        <span className="text-gray-400">{entry.accuracy}%</span>
                        <span className="text-gray-500 text-sm">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors"
            >
              Practice More
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default DailyChallenge
