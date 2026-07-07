import React, { useEffect, useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Trophy, Medal, Crown, TrendingUp, Clock, Target, Zap, ChevronLeft, ChevronRight, Search, Timer, BookOpen } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { getPeriodBounds } from '../../utils/leaderboardPeriods'

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

const FETCH_LIMIT = 400
const CACHE_TTL_MS = 60 * 1000
const POLL_INTERVAL_MS = 15 * 1000
const PROFILE_BATCH_SIZE = 200

const toNumber = (value, fallback = 0) => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(parsed) ? parsed : fallback
}

const chunkArray = (arr, size) => {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const fetchProfilesMap = async (userIds) => {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()

  const profileBatches = chunkArray(uniqueIds, PROFILE_BATCH_SIZE)
  const profileResults = await Promise.all(
    profileBatches.map((batch) =>
      supabase.from('profiles').select('id, display_name, avatar_url').in('id', batch)
    )
  )

  const profileMap = new Map()
  profileResults.forEach(({ data, error }) => {
    if (error) {
      console.error('Error fetching profile batch:', error)
      return
    }
    ;(data || []).forEach((profile) => {
      profileMap.set(profile.id, profile)
    })
  })

  return profileMap
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
  const [periodLabel, setPeriodLabel] = useState('')
  const itemsPerPage = 20
  const leaderboardCacheRef = useRef(new Map())
  const activeFetchRef = useRef(0)

  const pollRef = useRef(null)

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    clearPoll()
    pollRef.current = setInterval(() => fetchLeaderboard(true), POLL_INTERVAL_MS)
    return clearPoll
  }, [period, mode, timeDuration, difficulty, user?.id])

  const leaderboardFetchingRef = useRef(false)

  const fetchLeaderboard = async (skipCache = false) => {
    if (leaderboardFetchingRef.current) return
    leaderboardFetchingRef.current = true
    const fetchId = ++activeFetchRef.current
    const periodBounds = getPeriodBounds(period, new Date())
    const cacheKey = `${period}|${periodBounds.cacheKey}|${mode}|${timeDuration}|${difficulty}`
    const cached = leaderboardCacheRef.current.get(cacheKey)
    if (!skipCache && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setLeaderboard(cached.rows)
      setPeriodLabel(periodBounds.label)
      if (user?.id) {
        const rank = cached.rows.findIndex((entry) => entry.user_id === user.id)
        setUserRank(rank >= 0 ? cached.rows[rank] : null)
      } else {
        setUserRank(null)
      }
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let allData = []

      if (period !== 'all_time') {
        const periodTableConfig = {
          daily: {
            table: 'leaderboard_daily',
            column: 'date',
            value: periodBounds.dailyDate,
            select: 'id, user_id, wpm, accuracy, errors, duration_seconds, created_at',
          },
          weekly: {
            table: 'leaderboard_weekly',
            column: 'week_start',
            value: periodBounds.weeklyStartDate,
            select: 'id, user_id, wpm, accuracy, errors, total_tests, created_at',
          },
          monthly: {
            table: 'leaderboard_monthly',
            column: 'month_start',
            value: periodBounds.monthlyStartDate,
            select: 'id, user_id, wpm, accuracy, errors, total_tests, month_label, created_at',
          },
        }

        const periodConfig = periodTableConfig[period]

        if (periodConfig?.value) {
          const { data: periodData, error: periodError } = await supabase
            .from(periodConfig.table)
            .select(periodConfig.select)
            .eq(periodConfig.column, periodConfig.value)
            .order('wpm', { ascending: false })
            .order('accuracy', { ascending: false })
            .order('errors', { ascending: true })
            .limit(FETCH_LIMIT)

          if (periodError) {
            console.error(`Error fetching ${periodConfig.table}:`, periodError)
          } else if (periodData?.length) {
            allData = periodData.map((entry) => ({
              ...entry,
              wpm: Math.round(toNumber(entry.wpm, 0)),
              accuracy: toNumber(entry.accuracy, 0),
              errors: Math.max(0, Math.round(toNumber(entry.errors, 0))),
              time: Math.round(toNumber(entry.duration_seconds, 0)),
              source: periodConfig.table,
            }))
          }
        }
      } else {
        // All Time - filter by mode
        if (mode === 'timed') {
          const [timedResult, historyResult] = await Promise.all([
            supabase
              .from('leaderboard_timed')
              .select('*')
              .eq('time', timeDuration)
              .order('wpm', { ascending: false })
              .limit(FETCH_LIMIT),
            supabase
              .from('typing_history')
              .select('id, user_id, wpm, accuracy, errors, duration_seconds, created_at')
              .eq('mode', 'timed')
              .gte('duration_seconds', timeDuration - 1)
              .lte('duration_seconds', timeDuration + 1)
              // Nepali practice runs are excluded from leaderboards (keep NULL/legacy rows).
              .or('language.is.null,language.neq.nepali')
              .order('wpm', { ascending: false })
              .limit(FETCH_LIMIT),
          ])

          const { data: timedData, error: timedError } = timedResult
          const { data: historyData, error: historyError } = historyResult

          if (timedError) console.error('Error fetching timed leaderboard:', timedError)
          if (historyError) console.error('Error fetching timed typing_history leaderboard:', historyError)

          if (timedData?.length) {
            allData.push(
              ...timedData.map((entry) => ({
                ...entry,
                wpm: Math.round(toNumber(entry.wpm, 0)),
                accuracy: toNumber(entry.accuracy, 0),
                errors: Math.max(0, Math.round(toNumber(entry.errors, 0))),
                source: 'leaderboard_timed',
              }))
            )
          }

          if (historyData?.length) {
            allData.push(
              ...historyData.map((entry) => ({
                ...entry,
                wpm: Math.round(toNumber(entry.wpm, 0)),
                accuracy: toNumber(entry.accuracy, 0),
                errors: Math.max(0, Math.round(toNumber(entry.errors, 0))),
                time: Math.round(toNumber(entry.duration_seconds, 0)),
                source: 'typing_history',
              }))
            )
          }
        } else {
          const [sentenceResult, historyResult] = await Promise.all([
            supabase
              .from('leaderboard_sentence')
              .select('*')
              .eq('difficulty', difficulty)
              .order('wpm', { ascending: false })
              .limit(FETCH_LIMIT),
            supabase
              .from('typing_history')
              .select('id, user_id, wpm, accuracy, errors, sub_mode, duration_seconds, created_at')
              .eq('mode', 'sentence')
              .eq('sub_mode', difficulty)
              // Nepali practice runs are excluded from leaderboards (keep NULL/legacy rows).
              .or('language.is.null,language.neq.nepali')
              .order('wpm', { ascending: false })
              .limit(FETCH_LIMIT),
          ])

          const { data: sentenceData, error: sentenceError } = sentenceResult
          const { data: historyData, error: historyError } = historyResult

          if (sentenceError) console.error('Error fetching sentence leaderboard:', sentenceError)
          if (historyError) console.error('Error fetching sentence typing_history leaderboard:', historyError)

          if (sentenceData?.length) {
            allData.push(
              ...sentenceData.map((entry) => ({
                ...entry,
                wpm: Math.round(toNumber(entry.wpm, 0)),
                accuracy: toNumber(entry.accuracy, 0),
                errors: Math.max(0, Math.round(toNumber(entry.errors, 0))),
                source: 'leaderboard_sentence',
              }))
            )
          }

          if (historyData?.length) {
            allData.push(
              ...historyData.map((entry) => ({
                ...entry,
                wpm: Math.round(toNumber(entry.wpm, 0)),
                accuracy: toNumber(entry.accuracy, 0),
                errors: Math.max(0, Math.round(toNumber(entry.errors, 0))),
                difficulty: entry.sub_mode || difficulty,
                time: Math.round(toNumber(entry.duration_seconds, 0)),
                source: 'typing_history',
              }))
            )
          }
        }
      }

      // Group by user and get best scores (deduplicate)
      const userBestScores = {}
      allData.forEach((entry) => {
        if (!entry?.user_id) return
        const userId = entry.user_id
        if (!userBestScores[userId] || entry.wpm > userBestScores[userId].wpm) {
          userBestScores[userId] = entry
        } else if (
          entry.wpm === userBestScores[userId].wpm &&
          entry.accuracy > userBestScores[userId].accuracy
        ) {
          userBestScores[userId] = entry
        } else if (
          entry.wpm === userBestScores[userId].wpm &&
          entry.accuracy === userBestScores[userId].accuracy &&
          (entry.errors || 0) < (userBestScores[userId].errors || 0)
        ) {
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

      const profilesById = await fetchProfilesMap(sortedLeaderboard.map((entry) => entry.user_id))
      const leaderboardWithProfiles = sortedLeaderboard.map((entry) => ({
        ...entry,
        profiles: profilesById.get(entry.user_id) || null,
      }))

      if (fetchId !== activeFetchRef.current) return

      setLeaderboard(leaderboardWithProfiles)
      setPeriodLabel(periodBounds.label)
      leaderboardCacheRef.current.set(cacheKey, {
        fetchedAt: Date.now(),
        rows: leaderboardWithProfiles,
      })

      // Find user rank
      if (user?.id) {
        const rank = leaderboardWithProfiles.findIndex((e) => e.user_id === user.id)
        setUserRank(rank >= 0 ? leaderboardWithProfiles[rank] : null)
      } else {
        setUserRank(null)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      leaderboardFetchingRef.current = false
      if (fetchId === activeFetchRef.current) {
        setLoading(false)
      }
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
        {period !== 'all_time' && periodLabel && (
          <p className="text-sm text-yellow-400 mt-2">{periodLabel}</p>
        )}
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
                  key={`${entry.source || 'score'}-${entry.id}-${entry.user_id}`}
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
                    state={{ avatar: entry.profiles?.avatar_url }}
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
                          e.currentTarget.onerror = null
                          e.currentTarget.src = `data:image/svg+xml;utf8,${encodeURIComponent(
                            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-9 1.67-9 5v1h18v-1c0-3.33-5.69-5-9-5z'/></svg>"
                          )}`
                        }}
                      />
                    ) : null}
                  </Link>

                  {/* Username - Clickable to profile */}
                  <Link to={`/users/${entry.user_id}`} state={{ avatar: entry.profiles?.avatar_url }} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
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
