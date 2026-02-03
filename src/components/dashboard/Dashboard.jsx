import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Flame, Trophy, Target, Clock, TrendingUp, Award,
  Calendar, BarChart2, Zap, Star, ChevronRight, Play
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInDays, startOfDay, isToday } from 'date-fns'

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [recentTests, setRecentTests] = useState([])
  const [achievements, setAchievements] = useState([])
  const [dailyChallenge, setDailyChallenge] = useState(null)
  const [dailyCompleted, setDailyCompleted] = useState(false)
  const [leaderboardRank, setLeaderboardRank] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return

    // Only redirect if auth is loaded and there's no user
    if (!user?.id) {
      navigate('/login')
      return
    }

    fetchDashboardData()
  }, [user, authLoading, navigate])

  const fetchDashboardData = async () => {
    if (!user?.id) return

    setLoading(true)

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      // Fetch recent typing history from multiple sources
      // First try typing_history (v2)
      const { data: historyData } = await supabase
        .from('typing_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      // Also fetch from leaderboard_timed and leaderboard_sentence (v1)
      const { data: timedData } = await supabase
        .from('leaderboard_timed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: sentenceData } = await supabase
        .from('leaderboard_sentence')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Combine all data sources
      const allHistory = [
        ...(historyData || []).map(h => ({ ...h, source: 'typing_history' })),
        ...(timedData || []).map(h => ({ 
          ...h, 
          mode: 'timed',
          sub_mode: `${h.time}s`,
          duration_seconds: h.time,
          errors: 0,
          source: 'leaderboard_timed' 
        })),
        ...(sentenceData || []).map(h => ({ 
          ...h, 
          mode: 'sentence',
          sub_mode: h.difficulty,
          duration_seconds: h.time,
          errors: 0,
          source: 'leaderboard_sentence' 
        })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10)
      
      setRecentTests(allHistory)

      // Calculate stats from all history
      if (allHistory && allHistory.length > 0) {
        const totalTests = allHistory.length
        const avgWpm = Math.round(allHistory.reduce((acc, t) => acc + (t.wpm || 0), 0) / totalTests)
        const avgAccuracy = (allHistory.reduce((acc, t) => acc + parseFloat(t.accuracy || 0), 0) / totalTests).toFixed(1)
        const bestWpm = Math.max(...allHistory.map(t => t.wpm || 0))
        const totalTime = allHistory.reduce((acc, t) => acc + parseFloat(t.duration_seconds || 0), 0)

        setStats({
          totalTests,
          avgWpm,
          avgAccuracy,
          bestWpm,
          totalTime: Math.round(totalTime / 60), // in minutes
        })
      } else {
        // Set default stats if no history
        setStats({
          totalTests: 0,
          avgWpm: 0,
          avgAccuracy: '0.0',
          bestWpm: 0,
          totalTime: 0,
        })
      }

      // Fetch user achievements
      const { data: achievementData } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements(*)
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(6)
      
      setAchievements(achievementData || [])

      // Check for daily challenge
      const today = new Date().toISOString().split('T')[0]
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('*')
        .eq('challenge_type', 'daily')
        .lte('start_date', today)
        .gte('end_date', today)
        .eq('is_active', true)
        .single()
      
      setDailyChallenge(challengeData)

      if (challengeData) {
        // Check if user completed daily challenge
        const { data: attemptData } = await supabase
          .from('challenge_attempts')
          .select('id')
          .eq('user_id', user.id)
          .eq('challenge_id', challengeData.id)
          .single()
        
        setDailyCompleted(!!attemptData)
      }

      // Get leaderboard rank (simplified - based on best WPM)
      // This would ideally be a database function for efficiency
      const { count: betterCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('average_wpm', profileData?.average_wpm || 0)
      
      setLeaderboardRank((betterCount || 0) + 1)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check and update streak
  const checkStreak = () => {
    if (!profile) return

    const lastActivity = profile.last_activity_date
    if (!lastActivity) return { current: 0, isActive: false }

    const lastDate = new Date(lastActivity)
    const today = startOfDay(new Date())
    const daysDiff = differenceInDays(today, startOfDay(lastDate))

    if (daysDiff === 0) {
      return { current: profile.current_streak, isActive: true }
    } else if (daysDiff === 1) {
      return { current: profile.current_streak, isActive: false }
    } else {
      return { current: 0, isActive: false }
    }
  }

  const streakInfo = checkStreak()

  // Show loading while auth is checking or data is fetching
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome back, {profile?.display_name || 'Typist'}! 👋
          </h1>
          <p className="text-gray-400">
            Ready to improve your typing skills today?
          </p>
        </div>
        
        <Link
          to="/"
          className="mt-4 md:mt-0 flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors"
        >
          <Play className="w-5 h-5" />
          Start Typing
        </Link>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-500/20 to-red-500/10 rounded-2xl p-5 border border-orange-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-gray-400 text-sm">Current Streak</span>
          </div>
          <div className="text-3xl font-bold text-orange-400">
            {profile?.current_streak || 0}
            <span className="text-lg ml-1">days</span>
          </div>
          {!streakInfo?.isActive && profile?.current_streak > 0 && (
            <p className="text-xs text-orange-300 mt-2">Complete a test today to keep your streak!</p>
          )}
        </motion.div>

        {/* Average WPM */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-yellow-500/20 to-amber-500/10 rounded-2xl p-5 border border-yellow-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Average WPM</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400">
            {stats?.avgWpm || profile?.average_wpm?.toFixed(0) || 0}
          </div>
        </motion.div>

        {/* Accuracy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl p-5 border border-green-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Accuracy</span>
          </div>
          <div className="text-3xl font-bold text-green-400">
            {stats?.avgAccuracy || profile?.average_accuracy?.toFixed(1) || 0}%
          </div>
        </motion.div>

        {/* Leaderboard Rank */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500/20 to-violet-500/10 rounded-2xl p-5 border border-purple-500/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Global Rank</span>
          </div>
          <div className="text-3xl font-bold text-purple-400">
            #{leaderboardRank || '—'}
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Daily Challenge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-2 bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-400" />
              Daily Challenge
            </h2>
            {dailyCompleted && (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                ✓ Completed
              </span>
            )}
          </div>

          {dailyChallenge ? (
            <div>
              <p className="text-gray-400 mb-4">
                Complete today's challenge to maintain your streak and compete on the daily leaderboard!
              </p>
              {!dailyCompleted && (
                <Link
                  to="/daily"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-300 transition-colors"
                >
                  Start Challenge
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
              {dailyCompleted && (
                <Link
                  to="/daily"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  View Results
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            <p className="text-gray-400">No daily challenge available. Check back tomorrow!</p>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
        >
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-yellow-400" />
            Your Stats
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Tests</span>
              <span className="font-semibold">{profile?.total_tests || stats?.totalTests || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Best WPM</span>
              <span className="font-semibold text-yellow-400">{stats?.bestWpm || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time Practiced</span>
              <span className="font-semibold">{stats?.totalTime || 0} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Longest Streak</span>
              <span className="font-semibold text-orange-400">{profile?.longest_streak || 0} days</span>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="md:col-span-2 bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Recent Activity
            </h2>
            <Link to="/history" className="text-yellow-400 hover:text-yellow-300 text-sm">
              View All →
            </Link>
          </div>

          {recentTests.length > 0 ? (
            <div className="space-y-3">
              {recentTests.slice(0, 5).map((test, idx) => (
                <div
                  key={test.id || idx}
                  className="flex items-center justify-between p-3 bg-[#252b3b] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-medium capitalize">
                        {test.mode}{test.sub_mode ? ` • ${test.sub_mode}` : ''}
                      </div>
                      <div className="text-sm text-gray-400">
                        {test.created_at ? format(new Date(test.created_at), 'MMM d, h:mm a') : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-yellow-400">{test.wpm} WPM</div>
                    <div className="text-sm text-gray-400">{test.accuracy}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              No recent tests. Start typing to see your activity!
            </p>
          )}
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Achievements
            </h2>
            <Link to="/achievements" className="text-yellow-400 hover:text-yellow-300 text-sm">
              View All →
            </Link>
          </div>

          {achievements.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {achievements.slice(0, 6).map((ua, idx) => (
                <div
                  key={ua.id || idx}
                  className="text-center p-3 bg-[#252b3b] rounded-xl hover:bg-[#2a3142] transition-colors"
                  title={ua.achievements?.description}
                >
                  <div className="text-2xl mb-1">{ua.achievements?.icon || '🏆'}</div>
                  <div className="text-xs text-gray-400 truncate">{ua.achievements?.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">
              Complete tests to unlock achievements!
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
