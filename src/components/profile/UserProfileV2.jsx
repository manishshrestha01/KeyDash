import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User, Globe, Github, Linkedin, Instagram, Youtube, Twitch,
  Clock, Target, Zap, Trophy, BarChart2, Calendar, TrendingUp,
  Award, Flame, ArrowLeft, ExternalLink
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { format, formatDistanceToNow } from 'date-fns'
import toast, { Toaster } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useMultiplayerStore } from '../../store'
import { generateRaceText, generateRoomCode } from '../multiplayer/multiplayerUtils'
import { fetchUserAchievements } from '../../utils/achievements'

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
  const { user } = useAuth()
  const { setRoom, setIsHost, setParticipants } = useMultiplayerStore()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [sendingInvite, setSendingInvite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rank, setRank] = useState(null)
  const location = useLocation()
  const stateAvatar = location?.state?.avatar

  // Ensure we start at top of page when navigating to a user's profile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      const root = document.getElementById('profile-root')
      if (root) root.focus()
    }
  }, [userId])

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

      // Fetch history/scores with consistent rules used in profile statistics:
      // prefer typing_history, exclude custom mode, fallback to legacy leaderboard tables.
      const [historyRes, timedRes, sentenceRes, achievementsRes] = await Promise.all([
        supabase
          .from('typing_history')
          .select('*')
          .eq('user_id', userId)
          .neq('mode', 'custom')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase.from('leaderboard_timed').select('*').eq('user_id', userId),
        supabase.from('leaderboard_sentence').select('*').eq('user_id', userId),
        fetchUserAchievements({ userId, limit: 12 }),
      ])

      const historyScores = (historyRes.data || []).filter(
        (s) => (s.mode || '').toLowerCase() !== 'custom'
      )

      const fallbackScores = [
        ...(timedRes.data || []).map(s => ({
          ...s,
          mode: 'timed',
          sub_mode: s.time ? `${s.time}s` : '60s',
          duration_seconds: s.time || 60,
        })),
        ...(sentenceRes.data || []).map(s => ({
          ...s,
          mode: 'sentence',
          sub_mode: s.difficulty || 'medium',
          duration_seconds: s.time || 0,
        })),
      ]

      const canonicalScores = historyScores.length > 0 ? historyScores : fallbackScores
      if (achievementsRes?.error) {
        console.error('Public profile achievements fetch error:', achievementsRes.error)
      }
      setAchievements(achievementsRes?.data || [])

      if (canonicalScores.length > 0) {
        const totalTests = canonicalScores.length
        const avgWpm = Math.round(
          canonicalScores.reduce((sum, s) => sum + (Number(s.wpm) || 0), 0) / totalTests
        )
        const avgAccuracy = (
          canonicalScores.reduce((sum, s) => sum + (Number(s.accuracy) || 0), 0) / totalTests
        ).toFixed(1)
        const leaderboardModes = new Set(['timed', 'sentence'])
        const leaderboardModeScores = canonicalScores.filter((s) =>
          leaderboardModes.has(String(s.mode || '').toLowerCase())
        )
        const bestWpm = leaderboardModeScores.length > 0
          ? Math.max(...leaderboardModeScores.map((s) => Number(s.wpm) || 0))
          : 0
        const totalTime = canonicalScores.reduce(
          (sum, s) => sum + (Number(s.duration_seconds) || Number(s.time) || 0),
          0
        )

        setStats({
          bestWpm,
          avgWpm,
          avgAccuracy,
          totalTests,
          totalTime: Math.round(totalTime / 60),
        })
      } else {
        setStats({
          bestWpm: 0,
          avgWpm: 0,
          avgAccuracy: '0.0',
          totalTests: 0,
          totalTime: 0,
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

  const isInviteTableMissingError = (error) =>
    error?.code === '42P01' || /multiplayer_invitations/i.test(error?.message || '')

  const handleSendChallengeInvite = async () => {
    if (!user?.id) {
      navigate('/login')
      return
    }

    if (user.id === userId) {
      toast.error("You can't challenge your own profile")
      return
    }

    setSendingInvite(true)
    try {
      const code = generateRoomCode()
      const raceText = generateRaceText()

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()

      const displayName =
        senderProfile?.display_name ||
        user.email?.split('@')[0] ||
        'Host'

      const avatarUrl = senderProfile?.avatar_url || null

      const { data: room, error: roomError } = await supabase
        .from('multiplayer_rooms')
        .insert({
          room_code: code,
          host_id: user.id,
          race_text: raceText,
          status: 'waiting',
          max_players: 5,
          current_players: 1,
        })
        .select()
        .single()

      if (roomError) throw roomError

      const { data: participant, error: participantError } = await supabase
        .from('multiplayer_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          is_ready: true,
        })
        .select()
        .single()

      if (participantError) throw participantError

      const { error: inviteError } = await supabase
        .from('multiplayer_invitations')
        .insert({
          room_id: room.id,
          sender_id: user.id,
          receiver_id: userId,
          status: 'pending',
        })

      if (inviteError) {
        if (isInviteTableMissingError(inviteError)) {
          toast.error('Invite feature requires latest database migration. Room was still created.')
        } else {
          throw inviteError
        }
      } else {
        toast.success(`Challenge invite sent to ${profile?.display_name || 'player'}`)
      }

      setRoom(room)
      setIsHost(true)
      setParticipants(participant ? [participant] : [])
      navigate('/multiplayer')
    } catch (error) {
      console.error('Error sending challenge invite:', error)
      toast.error('Failed to send challenge invite')
    } finally {
      setSendingInvite(false)
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
    <div className="min-h-screen bg-[#0a0e17] text-white pb-12" id="profile-root" tabIndex={-1}>
      <Toaster position="top-center" />
      {/* Header with gradient */}
      <div className="relative">
        <div className="h-48"></div>
        
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
                {(() => {
                  const effectiveAvatar = (stateAvatar && stateAvatar.trim()) || (profile.avatar_url && profile.avatar_url.trim())
                  return (
                    <>
                      {effectiveAvatar ? (
                        <img
                          src={effectiveAvatar}
                          alt={profile.display_name}
                          className="w-32 h-32 rounded-2xl object-cover border-4 border-yellow-400/30"
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

                      <div 
                        className={`w-32 h-32 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-4xl font-bold text-black ${effectiveAvatar ? 'hidden' : ''}`}
                      >
                        {(profile.display_name || 'U')[0].toUpperCase()}
                      </div>
                    </>
                  )
                })()}
                
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

      {/* Achievements */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 border border-gray-800/50"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Achievements
          </h2>

          {achievements.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No achievements unlocked yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((ua, idx) => (
                <motion.div
                  key={ua.id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className="p-4 bg-[#252b3b]/50 rounded-xl hover:bg-[#252b3b] transition border border-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="text-2xl leading-none mt-0.5">
                        {ua.achievements?.icon || '🏆'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {ua.achievements?.name || 'Achievement'}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {ua.achievements?.description || 'Unlocked achievement'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Unlocked {ua.unlocked_at
                            ? formatDistanceToNow(new Date(ua.unlocked_at), { addSuffix: true })
                            : 'recently'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 capitalize">
                        {ua.achievements?.rarity || 'common'}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        {(ua.achievements?.points ?? 0)} pts
                      </p>
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
        <button
          type="button"
          onClick={handleSendChallengeInvite}
          disabled={sendingInvite || !user?.id || user?.id === userId}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-xl font-bold hover:from-yellow-500 hover:to-orange-600 transition shadow-lg shadow-yellow-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Flame className="w-5 h-5" />
          {user?.id === userId ? 'Cannot Challenge Yourself' : sendingInvite ? 'Sending Invite...' : 'Challenge to a Race'}
        </button>
      </div>
    </div>
  )
}

export default UserProfileV2
