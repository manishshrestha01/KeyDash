import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User, Globe, Github, Linkedin, Instagram, Youtube, Twitch,
  Target, Zap, Trophy, BarChart2, Calendar, TrendingUp,
  Award, Flame, ArrowLeft, ExternalLink, EyeOff
} from 'lucide-react'
import { FaRedditAlien } from 'react-icons/fa'
import { FaSnapchat } from 'react-icons/fa6'
import { supabase } from '../../supabaseClient'
import { format, differenceInDays, startOfDay } from 'date-fns'
import toast, { Toaster } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useMultiplayerStore } from '../../store'
import { generateRaceText, generateRoomCode } from '../multiplayer/multiplayerUtils'
import { AchievementIcon } from '../../utils/achievementIcons'
import { buildProfileLink } from '../../utils/socialLinks'

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

const calculateStreakFromActivity = (activityDates = []) => {
  const uniqueDays = Array.from(
    new Set(
      activityDates
        .filter(Boolean)
        .map((date) => format(startOfDay(new Date(date)), 'yyyy-MM-dd'))
    )
  )

  if (uniqueDays.length === 0) {
    return { current: 0, longest: 0, isActive: false }
  }

  const sortedDays = uniqueDays
    .map((day) => startOfDay(new Date(`${day}T00:00:00`)))
    .sort((a, b) => a - b)

  let longest = 1
  let run = 1

  for (let i = 1; i < sortedDays.length; i += 1) {
    const dayGap = differenceInDays(sortedDays[i], sortedDays[i - 1])
    if (dayGap === 1) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }

  const latestDay = sortedDays[sortedDays.length - 1]
  const gapFromToday = differenceInDays(startOfDay(new Date()), latestDay)
  const canContinue = gapFromToday === 0 || gapFromToday === 1

  if (!canContinue) {
    return { current: 0, longest, isActive: false }
  }

  let current = 1
  for (let i = sortedDays.length - 2; i >= 0; i -= 1) {
    const dayGap = differenceInDays(sortedDays[i + 1], sortedDays[i])
    if (dayGap === 1) {
      current += 1
    } else {
      break
    }
  }

  return { current, longest, isActive: gapFromToday === 0 }
}

const RARITY_THEME = {
  common: {
    card: 'bg-gray-500/5 border-gray-700/70',
    icon: 'bg-gradient-to-br from-gray-500 to-gray-600 text-white border-gray-400/40',
    badge: 'bg-gray-500/15 text-gray-200 border border-gray-500/30',
  },
  rare: {
    card: 'bg-blue-500/10 border-blue-500/30',
    icon: 'bg-gradient-to-br from-blue-400 to-blue-500 text-white border-blue-300/50',
    badge: 'bg-blue-500/20 text-blue-200 border border-blue-400/40',
  },
  epic: {
    card: 'bg-purple-500/10 border-purple-500/30',
    icon: 'bg-gradient-to-br from-purple-400 to-purple-500 text-white border-purple-300/50',
    badge: 'bg-purple-500/20 text-purple-200 border border-purple-400/40',
  },
  legendary: {
    card: 'bg-yellow-500/10 border-yellow-500/30',
    icon: 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-yellow-300/50',
    badge: 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/40',
  },
  conqueror: {
    card: 'bg-rose-500/10 border-rose-500/35',
    icon: 'bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white border-fuchsia-300/50',
    badge: 'bg-rose-500/20 text-rose-100 border border-rose-400/50',
  },
}

const normalizeRarity = (rarity) => {
  const key = String(rarity || 'common').trim().toLowerCase()
  if (key === 'conqueror' || key === 'legendary' || key === 'epic' || key === 'rare' || key === 'common') {
    return key
  }
  return 'common'
}

const normalizeFeaturedAchievementIds = (value) => {
  let ids = []

  if (Array.isArray(value)) {
    ids = value
  } else if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) ids = parsed
      } catch {
        ids = []
      }
    } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim()
      if (inner) {
        ids = inner
          .split(',')
          .map((entry) => entry.trim().replace(/^"(.*)"$/, '$1'))
      }
    }
  }

  return [...new Set(ids.filter((id) => typeof id === 'string' && id.trim() !== ''))].slice(0, 4)
}

const toNumber = (value, fallback = 0) => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(parsed) ? parsed : fallback
}

const isMissingColumnError = (error, columnName) =>
  error?.code === 'PGRST204' &&
  String(error?.message || '')
    .toLowerCase()
    .includes(`'${String(columnName || '').toLowerCase()}'`)

const isRelationshipError = (error) =>
  error?.code === 'PGRST200' ||
  /relationship between .*user_achievements.*achievements/i.test(error?.message || '')

const fetchFeaturedAchievementsByIds = async ({ userId, achievementIds } = {}) => {
  if (!userId || !Array.isArray(achievementIds) || achievementIds.length === 0) {
    return { data: [], error: null }
  }

  const joinedRes = await supabase
    .from('user_achievements')
    .select('id, user_id, achievement_id, unlocked_at, achievements(*)')
    .eq('user_id', userId)
    .in('achievement_id', achievementIds)

  if (!joinedRes.error) {
    return { data: joinedRes.data || [], error: null }
  }

  if (!isRelationshipError(joinedRes.error)) {
    return { data: [], error: joinedRes.error }
  }

  const baseRes = await supabase
    .from('user_achievements')
    .select('id, user_id, achievement_id, unlocked_at')
    .eq('user_id', userId)
    .in('achievement_id', achievementIds)

  if (baseRes.error) {
    return { data: [], error: baseRes.error }
  }

  const achievementsRes = await supabase
    .from('achievements')
    .select('*')
    .in('id', achievementIds)

  if (achievementsRes.error) {
    return {
      data: (baseRes.data || []).map((row) => ({ ...row, achievements: null })),
      error: achievementsRes.error,
    }
  }

  const achievementMap = new Map((achievementsRes.data || []).map((row) => [row.id, row]))
  return {
    data: (baseRes.data || []).map((row) => ({
      ...row,
      achievements: achievementMap.get(row.achievement_id) || null,
    })),
    error: null,
  }
}

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
  }, [userId, user?.id])

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

      const isOwnerView = Boolean(user?.id && user.id === userId)
      const isProfilePublic = profileData?.is_profile_public ?? true
      const canViewAchievements = isOwnerView || isProfilePublic
      const featuredAchievementIds = normalizeFeaturedAchievementIds(profileData?.featured_achievement_ids)
      const shouldFetchFeaturedAchievements = canViewAchievements && featuredAchievementIds.length > 0

      // Public profile stats should be consistent regardless of who is viewing.
      // Use profile aggregates + shared leaderboard tables as canonical sources.
      const [timedRes, sentenceRes, dailyActivityRes, achievementsRes] = await Promise.all([
        supabase.from('leaderboard_timed').select('*').eq('user_id', userId),
        supabase.from('leaderboard_sentence').select('*').eq('user_id', userId),
        supabase
          .from('leaderboard_daily')
          .select('date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(500),
        shouldFetchFeaturedAchievements
          ? fetchFeaturedAchievementsByIds({ userId, achievementIds: featuredAchievementIds })
          : Promise.resolve({ data: [], error: null }),
      ])

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

      const activityDates = [
        ...((dailyActivityRes.data || []).map((entry) => entry.date)),
      ]
      const streak = calculateStreakFromActivity(activityDates)
      const profileCurrentStreak = Math.max(0, Math.round(toNumber(profileData?.current_streak, 0)))
      const profileLongestStreak = Math.max(
        profileCurrentStreak,
        Math.round(toNumber(profileData?.longest_streak, 0))
      )
      const currentStreak = Math.max(profileCurrentStreak, Math.max(0, streak.current))
      const longestStreak = Math.max(profileLongestStreak, currentStreak, Math.max(0, streak.longest))
      const supportsStoredStreak =
        Object.prototype.hasOwnProperty.call(profileData || {}, 'current_streak') &&
        Object.prototype.hasOwnProperty.call(profileData || {}, 'longest_streak')

      // Keep stored streak in sync so viewers see the same value as the owner.
      if (
        isOwnerView &&
        supportsStoredStreak &&
        (profileCurrentStreak !== currentStreak || profileLongestStreak !== longestStreak)
      ) {
        const { error: streakSyncError } = await supabase
          .from('profiles')
          .update({
            current_streak: currentStreak,
            longest_streak: longestStreak,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (streakSyncError) {
          if (
            !isMissingColumnError(streakSyncError, 'current_streak') &&
            !isMissingColumnError(streakSyncError, 'longest_streak')
          ) {
            console.error('Failed to sync public profile streak:', streakSyncError)
          }
        } else {
          setProfile((prev) => (
            prev
              ? { ...prev, current_streak: currentStreak, longest_streak: longestStreak }
              : prev
          ))
        }
      }

      if (shouldFetchFeaturedAchievements && achievementsRes?.error) {
        console.error('Public profile achievements fetch error:', achievementsRes.error)
      }
      setAchievements(shouldFetchFeaturedAchievements ? (achievementsRes?.data || []) : [])

      const fallbackTotalTests = fallbackScores.length
      const fallbackAvgWpm = fallbackTotalTests > 0
        ? Math.round(fallbackScores.reduce((sum, s) => sum + toNumber(s.wpm, 0), 0) / fallbackTotalTests)
        : 0
      const fallbackAvgAccuracy = fallbackTotalTests > 0
        ? (
            fallbackScores.reduce((sum, s) => sum + toNumber(s.accuracy, 0), 0) / fallbackTotalTests
          ).toFixed(1)
        : '0.0'
      const fallbackBestWpm = fallbackTotalTests > 0
        ? Math.max(...fallbackScores.map((s) => toNumber(s.wpm, 0)))
        : 0
      const fallbackTotalTime = fallbackScores.reduce(
        (sum, s) => sum + toNumber(s.duration_seconds, toNumber(s.time, 0)),
        0
      )

      const profileTotalTests = Math.max(0, Math.round(toNumber(profileData?.total_tests, 0)))
      const profileAvgWpm = toNumber(profileData?.average_wpm ?? profileData?.avg_wpm, 0)
      const profileAvgAccuracy = toNumber(profileData?.average_accuracy ?? profileData?.avg_accuracy, 0)
      const profileBestWpm = Math.max(
        0,
        toNumber(profileData?.best_wpm, 0),
        toNumber(profileData?.highest_wpm, 0),
        toNumber(profileData?.max_wpm, 0),
        toNumber(profileData?.top_wpm, 0)
      )

      setStats({
        bestWpm: profileBestWpm > 0 ? Math.round(profileBestWpm) : fallbackBestWpm,
        avgWpm: profileAvgWpm > 0 ? Math.round(profileAvgWpm) : fallbackAvgWpm,
        avgAccuracy: profileAvgAccuracy > 0 ? profileAvgAccuracy.toFixed(1) : fallbackAvgAccuracy,
        totalTests: profileTotalTests > 0 ? profileTotalTests : fallbackTotalTests,
        totalTime: Math.round(fallbackTotalTime / 60),
        currentStreak,
        longestStreak,
      })

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

  const socialLinks = profile
    ? [
        { platform: 'website', value: profile.website, icon: Globe, label: 'Website' },
        { platform: 'twitter', value: profile.twitter, icon: XIcon, label: 'X (Twitter)' },
        { platform: 'github', value: profile.github, icon: Github, label: 'GitHub' },
        { platform: 'linkedin', value: profile.linkedin, icon: Linkedin, label: 'LinkedIn' },
        { platform: 'instagram', value: profile.instagram, icon: Instagram, label: 'Instagram' },
        { platform: 'youtube', value: profile.youtube, icon: Youtube, label: 'YouTube' },
        { platform: 'twitch', value: profile.twitch, icon: Twitch, label: 'Twitch' },
        { platform: 'reddit', value: profile.reddit, icon: FaRedditAlien, label: 'Reddit' },
        { platform: 'snapchat', value: profile.snapchat, icon: FaSnapchat, label: 'Snapchat' },
      ]
        .map((item) => ({ ...item, url: buildProfileLink(item.platform, item.value) }))
        .filter((item) => item.url)
    : []

  const isOwnerView = Boolean(user?.id && user.id === userId)
  const isProfilePublic = profile?.is_profile_public ?? true
  const canViewAchievements = isOwnerView || isProfilePublic

  const featuredAchievementIds = useMemo(
    () => normalizeFeaturedAchievementIds(profile?.featured_achievement_ids),
    [profile?.featured_achievement_ids]
  )

  const curatedAchievements = useMemo(() => {
    if (!canViewAchievements) return []
    if (featuredAchievementIds.length === 0) return []
    if (!Array.isArray(achievements) || achievements.length === 0) return []

    const unlockedByAchievementId = new Map()
    achievements.forEach((row) => {
      const achievementId = row?.achievement_id
      if (!achievementId || unlockedByAchievementId.has(achievementId)) return
      unlockedByAchievementId.set(achievementId, row)
    })

    return featuredAchievementIds
      .map((achievementId) => unlockedByAchievementId.get(achievementId))
      .filter(Boolean)
      .slice(0, 4)
  }, [achievements, canViewAchievements, featuredAchievementIds])

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
                        href={url}
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
              label: 'Streak', 
              value: Math.max(0, Number(stats?.currentStreak ?? profile?.current_streak ?? 0)), 
              icon: Flame,
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

          {!canViewAchievements ? (
            <div className="text-center py-8">
              <EyeOff className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-300">This user set their achievements to private.</p>
            </div>
          ) : curatedAchievements.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No achievements unlocked yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {curatedAchievements.map((ua, idx) => {
                const rarityKey = normalizeRarity(ua.achievements?.rarity)
                const rarityTheme = RARITY_THEME[rarityKey] || RARITY_THEME.common

                return (
                <motion.div
                  key={ua.id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  className={`p-4 rounded-xl transition border ${rarityTheme.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${rarityTheme.icon}`}>
                        <AchievementIcon achievement={ua.achievements} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {ua.achievements?.name || 'Achievement'}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {ua.achievements?.description || 'Unlocked achievement'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${rarityTheme.badge}`}>
                        {rarityKey}
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        {(ua.achievements?.points ?? 0)} pts
                      </p>
                    </div>
                  </div>
                </motion.div>
                )
              })}
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
