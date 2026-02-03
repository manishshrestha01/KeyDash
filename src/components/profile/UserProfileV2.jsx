import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User, Globe, Github, Linkedin, Instagram, Youtube, Twitch,
  Clock, Target, Zap, Trophy, BarChart2, Calendar, TrendingUp,
  Award, Flame, Star, ArrowLeft, ExternalLink
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { format, formatDistanceToNow } from 'date-fns'

// Custom X (Twitter) icon
const XIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className || "w-5 h-5"}
  >
    <path d="M20.39 3H16.9L12.75 9.25 8.59 3H3.25L9.88 12.4 3 21h3.49l4.57-6.59L16.1 21h5.4l-7.05-9.65L20.39 3z" />
  </svg>
)

const UserProfileV2 = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [recentScores, setRecentScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [rank, setRank] = useState(null)

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Fetch typing history/scores
      const [timedRes, sentenceRes, historyRes] = await Promise.all([
        supabase.from('leaderboard_timed').select('*').eq('user_id', userId),
        supabase.from('leaderboard_sentence').select('*').eq('user_id', userId),
        supabase.from('typing_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      ])

      // Combine scores
      const allScores = [
        ...(timedRes.data || []).map(s => ({ 
          ...s, 
          mode: 'timed',
          sub_mode: s.time ? `${s.time}s` : '60s'
        })),
        ...(sentenceRes.data || []).map(s => ({ 
          ...s, 
          mode: 'sentence',
          sub_mode: s.difficulty || 'medium'
        })),
        ...(historyRes.data || [])
      ]

      // Sort by date and deduplicate
      const uniqueScores = []
      const seen = new Set()
      for (const score of allScores.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) {
        const key = `${score.wpm}-${score.accuracy}-${new Date(score.created_at).getTime()}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueScores.push(score)
        }
      }

      setRecentScores(uniqueScores.slice(0, 10))

      // Calculate stats
      if (uniqueScores.length > 0) {
        const bestWpm = Math.max(...uniqueScores.map(s => s.wpm || 0))
        const avgWpm = Math.round(uniqueScores.reduce((sum, s) => sum + (s.wpm || 0), 0) / uniqueScores.length)
        const avgAccuracy = (uniqueScores.reduce((sum, s) => sum + (s.accuracy || 0), 0) / uniqueScores.length).toFixed(1)
        const totalTests = uniqueScores.length
        const totalTime = uniqueScores.reduce((sum, s) => sum + (s.duration_seconds || s.time || 60), 0)

        setStats({
          bestWpm,
          avgWpm,
          avgAccuracy,
          totalTests,
          totalTime: Math.round(totalTime / 60), // Convert to minutes
        })
      }

      // Calculate rank (based on best WPM across all users)
      const { data: rankData, error: rankError } = await supabase
        .from('leaderboard_timed')
        .select('user_id, wpm')
        .order('wpm', { ascending: false })

      if (!rankError && rankData) {
        // Get unique users with their best WPM
        const userBestWpm = {}
        rankData.forEach(r => {
          if (!userBestWpm[r.user_id] || r.wpm > userBestWpm[r.user_id]) {
            userBestWpm[r.user_id] = r.wpm
          }
        })
        
        // Sort and find rank
        const sortedUsers = Object.entries(userBestWpm)
          .sort((a, b) => b[1] - a[1])
          .map(([id], idx) => ({ userId: id, rank: idx + 1 }))
        
        const userRank = sortedUsers.find(u => u.userId === userId)
        setRank(userRank?.rank || null)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const socialLinks = profile ? [
    { url: profile.website, icon: Globe, label: 'Website' },
    { url: profile.twitter, icon: XIcon, label: 'X (Twitter)' },
    { url: profile.github, icon: Github, label: 'GitHub' },
    { url: profile.linkedin, icon: Linkedin, label: 'LinkedIn' },
    { url: profile.instagram, icon: Instagram, label: 'Instagram' },
    { url: profile.youtube, icon: Youtube, label: 'YouTube' },
    { url: profile.twitch, icon: Twitch, label: 'Twitch' },
  ].filter(link => link.url && link.url.trim() !== '') : []

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">User Not Found</h2>
          <p className="text-gray-400 mb-6">This user profile doesn't exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-yellow-400 text-black rounded-xl font-medium hover:bg-yellow-500 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white pb-12">
      {/* Header with gradient */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20"></div>
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Profile Card */}
        <div className="max-w-4xl mx-auto px-4 -mt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-8 border border-gray-800/50 shadow-2xl"
          >
            {/* Avatar and Basic Info */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-yellow-400/30"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = ''
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div 
                  className={`w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-4xl font-bold text-black ${profile.avatar_url ? 'hidden' : ''}`}
                >
                  {(profile.display_name || 'U')[0].toUpperCase()}
                </div>
                
                {/* Rank Badge */}
                {rank && rank <= 100 && (
                  <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
                    #{rank}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                  {profile.display_name || 'Anonymous'}
                </h1>
                
                {profile.bio && (
                  <p className="text-gray-400 mb-4 max-w-lg">{profile.bio}</p>
                )}

                {/* Social Links */}
                {socialLinks.length > 0 && (
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {socialLinks.map(({ url, icon: Icon, label }) => (
                      <a
                        key={label}
                        href={url?.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-[#252b3b] rounded-xl text-gray-400 hover:text-white hover:bg-[#2a3142] transition group"
                        title={label}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm hidden sm:inline">{label}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Join Date */}
                {profile.created_at && (
                  <p className="text-gray-500 text-sm mt-4 flex items-center gap-2 justify-center md:justify-start">
                    <Calendar className="w-4 h-4" />
                    Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          {[
            { 
              label: 'Best WPM', 
              value: stats?.bestWpm ?? '--', 
              icon: Zap,
              color: 'text-yellow-400',
              bg: 'from-yellow-500/20 to-yellow-600/10'
            },
            { 
              label: 'Avg WPM', 
              value: stats?.avgWpm ?? '--', 
              icon: TrendingUp,
              color: 'text-blue-400',
              bg: 'from-blue-500/20 to-blue-600/10'
            },
            { 
              label: 'Accuracy', 
              value: stats?.avgAccuracy ? `${stats.avgAccuracy}%` : '--', 
              icon: Target,
              color: 'text-green-400',
              bg: 'from-green-500/20 to-green-600/10'
            },
            { 
              label: 'Tests', 
              value: stats?.totalTests ?? '--', 
              icon: BarChart2,
              color: 'text-purple-400',
              bg: 'from-purple-500/20 to-purple-600/10'
            },
            { 
              label: 'Time', 
              value: stats?.totalTime ? `${stats.totalTime}m` : '--', 
              icon: Clock,
              color: 'text-orange-400',
              bg: 'from-orange-500/20 to-orange-600/10'
            },
          ].map((stat, idx) => {
            const StatIcon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className={`bg-gradient-to-br ${stat.bg} rounded-2xl p-5 border border-gray-800/50 text-center`}
              >
                <StatIcon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 border border-gray-800/50"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Recent Activity
          </h2>

          {recentScores.length === 0 ? (
            <div className="text-center py-8">
              <BarChart2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScores.map((score, idx) => (
                <motion.div
                  key={score.id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className="flex items-center justify-between p-4 bg-[#252b3b]/50 rounded-xl hover:bg-[#252b3b] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      score.mode === 'timed' ? 'bg-blue-500/20 text-blue-400' :
                      score.mode === 'sentence' ? 'bg-green-500/20 text-green-400' :
                      score.mode === 'coding' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {score.mode || 'Unknown'}
                    </div>
                    {score.sub_mode && (
                      <span className="text-gray-500 text-sm">{score.sub_mode}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-yellow-400 font-bold">{score.wpm || '--'}</span>
                      <span className="text-gray-500 text-sm ml-1">WPM</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-medium ${
                        parseFloat(score.accuracy) >= 95 ? 'text-green-400' :
                        parseFloat(score.accuracy) >= 80 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {score.accuracy ? `${parseFloat(score.accuracy).toFixed(1)}%` : '--'}
                      </span>
                    </div>
                    <div className="text-gray-500 text-sm w-24 text-right">
                      {score.created_at 
                        ? formatDistanceToNow(new Date(score.created_at), { addSuffix: true })
                        : '--'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Challenge Button */}
      <div className="max-w-4xl mx-auto px-4 mt-8 text-center">
        <Link
          to="/multiplayer"
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-xl font-bold hover:from-yellow-500 hover:to-orange-600 transition shadow-lg shadow-yellow-500/25"
        >
          <Flame className="w-5 h-5" />
          Challenge to a Race
        </Link>
      </div>
    </div>
  )
}

export default UserProfileV2
