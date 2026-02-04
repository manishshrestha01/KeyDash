import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Trophy, Medal, Crown, TrendingUp, Clock, Target, Zap, ChevronLeft, ChevronRight, Search, Timer, BookOpen } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

// Time period configs
const TIME_PERIODS = {
  daily: { label: 'Daily', icon: Clock },
  weekly: { label: 'Weekly', icon: TrendingUp },
  monthly: { label: 'Monthly', icon: Trophy },
  all_time: { label: 'All Time', icon: Crown },
}

// Mode configs
const MODES = {
  sentence: { label: 'Sentence', icon: BookOpen },
  timed: { label: 'Time', icon: Timer },
}

// Time durations for timed mode
const TIME_DURATIONS = [15, 30, 60, 120]

// Difficulties for sentence mode
const DIFFICULTIES = ['easy', 'medium', 'hard', 'extreme']

// Rank colors
const getRankStyle = (rank) => {
  switch (rank) {
    case 1:
      return {
        bg: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20',
        border: 'border-yellow-500/50',
        icon: <Crown className="w-6 h-6 text-yellow-400" />,
        text: 'text-yellow-400',
      }
    case 2:
      return {
        bg: 'bg-gradient-to-r from-gray-400/20 to-gray-500/20',
        border: 'border-gray-400/50',
        icon: <Medal className="w-6 h-6 text-gray-300" />,
        text: 'text-gray-300',
      }
    case 3:
      return {
        bg: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20',
        border: 'border-orange-500/50',
        icon: <Medal className="w-6 h-6 text-orange-400" />,
        text: 'text-orange-400',
      }
    default:
      return {
        bg: 'bg-[#1a1f2e]',
        border: 'border-gray-700/50',
        icon: null,
        text: 'text-gray-300',
      }
  }
}

// Helper to normalize profiles (handles array vs object from Supabase joins)
const normalizeProfiles = (profiles) => {
  if (!profiles) return null
  if (Array.isArray(profiles)) return profiles[0] || null
  return profiles
}

const LeaderboardV2 = () => {
  const { user } = useAuth()
  const [period, setPeriod] = useState('daily')
  const [mode, setMode] = useState('sentence')
  const [timeDuration, setTimeDuration] = useState(15)
  const [difficulty, setDifficulty] = useState('easy')
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [userRank, setUserRank] = useState(null)
  const itemsPerPage = 20

  useEffect(() => {
    fetchLeaderboard()
  }, [period, mode, timeDuration, difficulty])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      // Calculate date range based on period
      const now = new Date()
      let startDate = null

      switch (period) {
        case 'daily':
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          break
        case 'weekly':
          startDate = new Date()
          const dayOfWeek = startDate.getDay()
          startDate.setDate(startDate.getDate() - dayOfWeek)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = null // All time
      }

      let allData = []

      // For daily/weekly/monthly - fetch ALL results without mode filtering
      if (period !== 'all_time') {
        // Fetch from typing_history (all modes)
        let historyQuery = supabase
          .from('typing_history')
          .select(`
            id,
            user_id,
            wpm,
            accuracy,
            errors,
            mode,
            sub_mode,
            duration_seconds,
            created_at,
            profiles:user_id (display_name, avatar_url)
          `)
          .gte('created_at', startDate.toISOString())
          .order('wpm', { ascending: false })
          .limit(500)

        const { data: historyData } = await historyQuery
        if (historyData) {
          allData = historyData.map(entry => ({
            ...entry,
            profiles: normalizeProfiles(entry.profiles),
            time: Math.round(entry.duration_seconds),
            source: 'typing_history'
          }))
        }

        // Fetch from leaderboard_timed
        let timedQuery = supabase
          .from('leaderboard_timed')
          .select(`
            id,
            user_id,
            wpm,
            accuracy,
            time,
            created_at,
            profiles:user_id (display_name, avatar_url)
          `)
          .gte('created_at', startDate.toISOString())
          .order('wpm', { ascending: false })
          .limit(500)

        const { data: timedData } = await timedQuery
        if (timedData) {
          allData = [...allData, ...timedData.map(entry => ({
            ...entry,
            profiles: normalizeProfiles(entry.profiles),
            mode: 'timed',
            errors: 0,
            source: 'leaderboard_timed'
          }))]
        }

        // Fetch from leaderboard_sentence
        let sentenceQuery = supabase
          .from('leaderboard_sentence')
          .select(`
            id,
            user_id,
            wpm,
            accuracy,
            difficulty,
            time,
            created_at,
            profiles:user_id (display_name, avatar_url)
          `)
          .gte('created_at', startDate.toISOString())
          .order('wpm', { ascending: false })
          .limit(500)

        const { data: sentenceData } = await sentenceQuery
        if (sentenceData) {
          allData = [...allData, ...sentenceData.map(entry => ({
            ...entry,
            profiles: normalizeProfiles(entry.profiles),
            mode: 'sentence',
            errors: 0,
            source: 'leaderboard_sentence'
          }))]
        }

      } else {
        // All Time - filter by mode
        if (mode === 'timed') {
          // Fetch from leaderboard_timed (v1 table)
          let query = supabase
            .from('leaderboard_timed')
            .select(`
              id,
              user_id,
              wpm,
              accuracy,
              time,
              created_at,
              profiles:user_id (display_name, avatar_url)
            `)
            .eq('time', timeDuration)
            .order('wpm', { ascending: false })
            .limit(500)

          const { data: timedData, error: timedError } = await query
          if (timedError) console.error('Error fetching timed leaderboard:', timedError)
          
          if (timedData) {
            allData = timedData.map(entry => ({
              ...entry,
              profiles: normalizeProfiles(entry.profiles),
              errors: 0,
              source: 'leaderboard_timed'
            }))
          }

          // Also fetch from typing_history for v2 data
          let historyQuery = supabase
            .from('typing_history')
            .select(`
              id,
              user_id,
              wpm,
              accuracy,
              errors,
              duration_seconds,
              created_at,
              profiles:user_id (display_name, avatar_url)
            `)
            .eq('mode', 'timed')
            .gte('duration_seconds', timeDuration - 1)
            .lte('duration_seconds', timeDuration + 1)
            .order('wpm', { ascending: false })
            .limit(500)

          const { data: historyData } = await historyQuery
          if (historyData) {
            const mappedHistoryData = historyData.map(entry => ({
              ...entry,
              profiles: normalizeProfiles(entry.profiles),
              time: Math.round(entry.duration_seconds),
              source: 'typing_history'
            }))
            allData = [...allData, ...mappedHistoryData]
          }

        } else {
          // Sentence mode
          // Fetch from leaderboard_sentence (v1 table)
          let query = supabase
            .from('leaderboard_sentence')
            .select(`
              id,
              user_id,
              wpm,
              accuracy,
              difficulty,
              time,
              created_at,
              profiles:user_id (display_name, avatar_url)
            `)
            .eq('difficulty', difficulty)
            .order('wpm', { ascending: false })
            .limit(500)

          const { data: sentenceData, error: sentenceError } = await query
          if (sentenceError) console.error('Error fetching sentence leaderboard:', sentenceError)
          
          if (sentenceData) {
            allData = sentenceData.map(entry => ({
              ...entry,
              profiles: normalizeProfiles(entry.profiles),
              errors: 0,
              source: 'leaderboard_sentence'
            }))
          }

          // Also fetch from typing_history for v2 data
          let historyQuery = supabase
            .from('typing_history')
            .select(`
              id,
              user_id,
              wpm,
              accuracy,
              errors,
              sub_mode,
              duration_seconds,
              created_at,
              profiles:user_id (display_name, avatar_url)
            `)
            .eq('mode', 'sentence')
            .eq('sub_mode', difficulty)
            .order('wpm', { ascending: false })
            .limit(500)

          const { data: historyData } = await historyQuery
          if (historyData) {
            const mappedHistoryData = historyData.map(entry => ({
              ...entry,
              profiles: normalizeProfiles(entry.profiles),
              difficulty: entry.sub_mode,
              time: entry.duration_seconds,
              source: 'typing_history'
            }))
            allData = [...allData, ...mappedHistoryData]
          }
        }
      }

      // Also fetch from challenge_attempts for Daily Challenge when period is 'daily'
      if (period === 'daily') {
        // Get today's active daily challenge
        const { data: challengeData } = await supabase
          .from('challenges')
          .select('id')
          .eq('challenge_type', 'daily')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (challengeData) {
          const { data: attemptData } = await supabase
            .from('challenge_attempts')
            .select('*')
            .eq('challenge_id', challengeData.id)
            .order('wpm', { ascending: false })
            .limit(500)

          if (attemptData && attemptData.length > 0) {
            // Fetch profiles separately
            const userIds = [...new Set(attemptData.map(d => d.user_id))]
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', userIds)

            const challengeEntries = attemptData.map(entry => ({
              ...entry,
              profiles: profiles?.find(p => p.id === entry.user_id) || null,
              time: entry.duration_seconds,
              source: 'challenge_attempts'
            }))
            allData = [...allData, ...challengeEntries]
          }
        }
      }

      // Group by user and get best scores (deduplicate)
      const userBestScores = {}
      allData.forEach((entry) => {
        const userId = entry.user_id
        if (!userBestScores[userId] || entry.wpm > userBestScores[userId].wpm) {
          userBestScores[userId] = entry
        } else if (entry.wpm === userBestScores[userId].wpm && entry.accuracy > userBestScores[userId].accuracy) {
          userBestScores[userId] = entry
        }
      })

      // Convert to array and sort
      const sortedLeaderboard = Object.values(userBestScores)
        .sort((a, b) => {
          if (b.wpm !== a.wpm) return b.wpm - a.wpm
          if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy
          return (a.errors || 0) - (b.errors || 0)
        })
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }))

      setLeaderboard(sortedLeaderboard)

      // Find user rank
      if (user?.id) {
        const rank = sortedLeaderboard.findIndex((e) => e.user_id === user.id)
        setUserRank(rank >= 0 ? sortedLeaderboard[rank] : null)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter by search
  const filteredLeaderboard = useMemo(() => {
    if (!search.trim()) return leaderboard
    return leaderboard.filter((entry) =>
      entry.profiles?.display_name?.toLowerCase().includes(search.toLowerCase())
    )
  }, [leaderboard, search])

  // Paginate
  const paginatedLeaderboard = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredLeaderboard.slice(start, start + itemsPerPage)
  }, [filteredLeaderboard, page])

  const totalPages = Math.ceil(filteredLeaderboard.length / itemsPerPage)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400/20 rounded-2xl mb-4">
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Leaderboard</h1>
        <p className="text-gray-400">Compete with typists worldwide</p>
      </div>

      {/* Time Period Tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-[#1a1f2e] rounded-xl p-1 border border-gray-700/50">
          {Object.entries(TIME_PERIODS).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => {
                setPeriod(key)
                setPage(1)
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                transition-all
                ${period === key
                  ? 'bg-yellow-400 text-black'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Tabs - Only show for All Time */}
      {period === 'all_time' && (
        <div className="flex justify-center mb-4">
          <div className="inline-flex bg-[#1a1f2e] rounded-xl p-1 border border-gray-700/50">
            {Object.entries(MODES).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => {
                  setMode(key)
                  setPage(1)
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                  transition-all
                  ${mode === key
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time Duration Selector (for timed mode) - Only show for All Time */}
      {period === 'all_time' && mode === 'timed' && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-[#1a1f2e] rounded-xl p-1 border border-gray-700/50">
            {TIME_DURATIONS.map((duration) => (
              <button
                key={duration}
                onClick={() => {
                  setTimeDuration(duration)
                  setPage(1)
                }}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${timeDuration === duration
                    ? 'bg-green-500 text-white'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Difficulty Selector (for sentence mode) - Only show for All Time */}
      {period === 'all_time' && mode === 'sentence' && (
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-[#1a1f2e] rounded-xl p-1 border border-gray-700/50">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  setDifficulty(diff)
                  setPage(1)
                }}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all capitalize
                  ${difficulty === diff
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username..."
          className="w-full bg-[#1a1f2e] rounded-xl pl-12 pr-4 py-3 border border-gray-700/50 
                     focus:border-yellow-400/50 focus:outline-none transition-colors"
        />
      </div>

      {/* User's Rank Card */}
      {userRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 
                     rounded-xl border border-yellow-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-yellow-400">#{userRank.rank}</div>
              <div>
                <div className="font-semibold">Your Rank</div>
                <div className="text-sm text-gray-400">
                  {userRank.wpm} WPM • {userRank.accuracy.toFixed(1)}% Accuracy
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Keep practicing!</div>
              {userRank.rank > 1 && (
                <div className="text-xs text-yellow-400">
                  {Math.round(leaderboard[userRank.rank - 2]?.wpm - userRank.wpm)} WPM to next rank
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      ) : paginatedLeaderboard.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {paginatedLeaderboard.map((entry, idx) => {
              const rankStyle = getRankStyle(entry.rank)
              const isCurrentUser = user?.id === entry.user_id

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl border transition-all
                    ${rankStyle.bg} ${rankStyle.border}
                    ${isCurrentUser ? 'ring-2 ring-yellow-400/50' : ''}
                    hover:scale-[1.01]
                  `}
                >
                  {/* Rank */}
                  <div className="w-12 text-center">
                    {rankStyle.icon || (
                      <span className={`text-lg font-bold ${rankStyle.text}`}>
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar - Clickable to profile */}
                  <Link 
                    to={`/users/${entry.user_id}`}
                    className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-yellow-400/50 transition-all"
                  >
                    {entry.profiles?.avatar_url ? (
                      <img
                        src={entry.profiles.avatar_url?.trim()}
                        alt={entry.profiles?.display_name || 'User'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full items-center justify-center text-lg font-bold text-gray-400 ${entry.profiles?.avatar_url ? 'hidden' : 'flex'}`}
                    >
                      {entry.profiles?.display_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  </Link>

                  {/* Username - Clickable to profile */}
                  <Link to={`/users/${entry.user_id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <div className={`font-semibold truncate ${isCurrentUser ? 'text-yellow-400' : ''}`}>
                      {entry.profiles?.display_name || 'Anonymous'}
                      {isCurrentUser && <span className="text-xs ml-2">(You)</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </Link>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${entry.rank <= 3 ? rankStyle.text : 'text-blue-400'}`}>
                        {entry.wpm}
                      </div>
                      <div className="text-gray-500 text-xs">WPM</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">
                        {entry.accuracy.toFixed(1)}%
                      </div>
                      <div className="text-gray-500 text-xs">Accuracy</div>
                    </div>
                    <div className="text-center hidden sm:block">
                      <div className="text-lg font-bold text-red-400">
                        {entry.errors}
                      </div>
                      <div className="text-gray-500 text-xs">Errors</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20">
          <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Results Yet</h3>
          <p className="text-gray-400">
            Be the first to set a record for this {period} leaderboard!
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-[#1a1f2e] border border-gray-700/50 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:border-gray-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`
                    w-10 h-10 rounded-lg font-medium transition-all
                    ${page === pageNum
                      ? 'bg-yellow-400 text-black'
                      : 'bg-[#1a1f2e] border border-gray-700/50 hover:border-gray-600'
                    }
                  `}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-[#1a1f2e] border border-gray-700/50 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:border-gray-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center mt-8 text-gray-500 text-sm">
        <p>Leaderboard updates in real-time • Rankings based on WPM, then accuracy</p>
      </div>
    </div>
  )
}

export default LeaderboardV2
