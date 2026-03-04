import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Settings, History, Trophy, BarChart2,
  Mail, Globe, Github, Linkedin, Instagram, Youtube, Twitch,
  Camera, Check, X, ChevronRight, ChevronUp, ChevronDown, Clock, Target, Zap,
  Calendar, TrendingUp, Award, Flame, Star, Code, Hash, Users, Bot, Edit3, Save,
  Eye, EyeOff, Trash2, Download, Filter, Search
} from 'lucide-react'
import { FaRedditAlien } from 'react-icons/fa'
import { FaSnapchat } from 'react-icons/fa6'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { fetchUserAchievements, syncUserAchievements } from '../../utils/achievements'
import { AchievementIcon } from '../../utils/achievementIcons'
import { buildProfileLink, validateWebsiteInput } from '../../utils/socialLinks'

const MAX_FEATURED_ACHIEVEMENTS = 4
const PROFILE_ACHIEVEMENTS_FETCH_LIMIT = 1000

const ACHIEVEMENT_CATEGORY_ORDER = ['all', 'speed', 'accuracy', 'coding', 'symbols', 'multiplayer', 'ai', 'special']

const ACHIEVEMENT_CATEGORY_LABELS = {
  all: 'All',
  speed: 'Speed',
  accuracy: 'Accuracy',
  coding: 'Coding',
  symbols: 'Symbols',
  multiplayer: 'Multiplayer',
  ai: 'AI',
  special: 'Special',
}

const ACHIEVEMENT_CATEGORY_ICONS = {
  all: Award,
  speed: Zap,
  accuracy: Target,
  coding: Code,
  symbols: Hash,
  multiplayer: Users,
  ai: Bot,
  special: Star,
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
  const value = String(rarity || 'common').trim().toLowerCase()
  if (value === 'conqueror' || value === 'legendary' || value === 'epic' || value === 'rare' || value === 'common') {
    return value
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

  return [...new Set(ids.filter((id) => typeof id === 'string' && id.trim() !== ''))]
    .slice(0, MAX_FEATURED_ACHIEVEMENTS)
}

const isMissingProfileColumnError = (error, columnName) => {
  const message = String(error?.message || '')
  return error?.code === '42703' || message.toLowerCase().includes(String(columnName || '').toLowerCase())
}

const normalizeAchievementCategory = (category) => {
  const key = String(category || '').trim().toLowerCase()
  return ACHIEVEMENT_CATEGORY_ORDER.includes(key) ? key : 'special'
}

const PROFILE_TABS = ['profile', 'settings', 'history', 'stats']

const ProfileHub = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Tab state - derived from URL
  const getTabFromUrl = () => {
    if (location.pathname === '/settings') return 'settings'
    if (location.pathname === '/history') return 'history'
    const rawTab = searchParams.get('tab')
    if (!rawTab) return 'profile'
    return PROFILE_TABS.includes(rawTab) ? rawTab : 'profile'
  }
  const [activeTab, setActiveTab] = useState(getTabFromUrl())
  
  // Update activeTab when URL changes (for dropdown navigation)
  useEffect(() => {
    const newTab = getTabFromUrl()
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [location.pathname, searchParams])
  
  // Profile data
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  
  // Form data for settings
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    website: '',
    twitter: '',
    github: '',
    linkedin: '',
    instagram: '',
    youtube: '',
    twitch: '',
    reddit: '',
    snapchat: '',
    is_profile_public: true,
    featured_achievement_ids: [],
  })
  const [errors, setErrors] = useState({})
  
  // History data
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')
  const [historySearch, setHistorySearch] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [showHistoryFilters, setShowHistoryFilters] = useState(false)
  const [historySortBy, setHistorySortBy] = useState('recent')
  const HISTORY_PER_PAGE = 15
  
  // Stats data
  const [stats, setStats] = useState(null)
  
  // Achievements data
  const [achievements, setAchievements] = useState([])
  const [achievementsLoading, setAchievementsLoading] = useState(false)
  const [achievementsError, setAchievementsError] = useState('')
  const [achievementsFetched, setAchievementsFetched] = useState(false)
  const [achievementCategoryFilter, setAchievementCategoryFilter] = useState('all')
  
  // File input ref
  const fileInputRef = useRef(null)

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'history', label: 'History', icon: History },
    { id: 'stats', label: 'Statistics', icon: BarChart2 },
  ]

  // Initial data fetch when user is available
  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return
    
    // Only redirect if auth is loaded and there's no user
    if (!user?.id) {
      navigate('/login')
      return
    }
    fetchProfile()
    fetchStats() // Always fetch stats for profile overview
    
    // Fetch tab-specific data on initial load based on URL
    const initialTab = getTabFromUrl()
    if (initialTab === 'history') {
      fetchHistory()
    }
  }, [user?.id, authLoading])

  // Fetch data when tab changes (user clicks on tab)
  useEffect(() => {
    if (authLoading || !user?.id) return
    
    // Update URL when tab changes (only if different from current)
    const currentUrlTab = getTabFromUrl()
    if (activeTab !== currentUrlTab) {
      setSearchParams({ tab: activeTab })
    }
    
    // Fetch tab-specific data
    if (activeTab === 'history') {
      fetchHistory()
    }
    if (activeTab === 'settings' && !achievementsFetched) fetchAchievements()
    if (activeTab === 'stats') fetchStats()
  }, [activeTab, user?.id, authLoading, achievementsFetched])

  // Re-fetch history when filter changes
  useEffect(() => {
    if (authLoading || !user?.id || activeTab !== 'history') return
    fetchHistory()
  }, [historyFilter])

  const fetchProfile = async () => {
    if (!user?.id) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
      }

      if (data) {
        setProfile(data)
        setFormData({
          display_name: data.display_name || '',
          bio: data.bio || '',
          website: data.website || '',
          twitter: data.twitter || '',
          github: data.github || '',
          linkedin: data.linkedin || '',
          instagram: data.instagram || '',
          youtube: data.youtube || '',
          twitch: data.twitch || '',
          reddit: data.reddit || '',
          snapchat: data.snapchat || '',
          is_profile_public: data.is_profile_public ?? true,
          featured_achievement_ids: normalizeFeaturedAchievementIds(data.featured_achievement_ids),
        })
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    if (!user?.id) return
    setHistoryLoading(true)

    try {
      // Fetch from typing_history table
      let query = supabase
        .from('typing_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (historyFilter !== 'all') {
        query = query.eq('mode', historyFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('History fetch error:', error)
        // Fall through to fallback
      } else if (data && data.length > 0) {
        setHistory(data)
        setHistoryLoading(false)
        return
      }
      
      // Fallback to leaderboard tables if typing_history is empty or errored
      const [timedRes, sentenceRes] = await Promise.all([
        supabase.from('leaderboard_timed').select('*').eq('user_id', user.id),
        supabase.from('leaderboard_sentence').select('*').eq('user_id', user.id)
      ])

      let combined = [
        ...(timedRes.data || []).map(s => ({ 
          ...s, 
          mode: 'timed',
          sub_mode: s.time ? `${s.time}s` : '60s',
          duration_seconds: s.time || 60
        })),
        ...(sentenceRes.data || []).map(s => ({ 
          ...s, 
          mode: 'sentence',
          sub_mode: s.difficulty || 'medium'
        }))
      ]

      // Apply filter if not 'all'
      if (historyFilter !== 'all') {
        combined = combined.filter(item => item.mode === historyFilter)
      }

      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setHistory(combined)
    } catch (err) {
      console.error('History fetch error:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const fetchAchievements = async () => {
    if (!user?.id) return
    setAchievementsLoading(true)
    setAchievementsError('')
    setAchievementsFetched(true)

    try {
      const syncRes = await syncUserAchievements({ userId: user.id })
      if (syncRes?.error) {
        console.error('Achievements sync error:', syncRes.error)
      }

      const { data, error } = await fetchUserAchievements({
        userId: user.id,
        limit: PROFILE_ACHIEVEMENTS_FETCH_LIMIT,
      })
      if (error) {
        console.error('Achievements fetch error:', error)
        setAchievementsError('Could not load achievements right now')
      }
      setAchievements(data || [])
    } catch (err) {
      console.error('Achievements fetch error:', err)
      setAchievementsError('Could not load achievements right now')
    } finally {
      setAchievementsLoading(false)
    }
  }

  const fetchStats = async () => {
    if (!user?.id) return

    try {
      // Try typing_history first
      const { data: historyData } = await supabase
        .from('typing_history')
        .select('*')
        .eq('user_id', user.id)
        .neq('mode', 'custom')

      if (historyData && historyData.length > 0) {
        calculateStats(historyData)
        return
      }

      // Fallback to leaderboard tables
      const [timedRes, sentenceRes] = await Promise.all([
        supabase.from('leaderboard_timed').select('*').eq('user_id', user.id),
        supabase.from('leaderboard_sentence').select('*').eq('user_id', user.id)
      ])

      const combined = [
        ...(timedRes.data || []),
        ...(sentenceRes.data || [])
      ]

      calculateStats(combined)
    } catch (err) {
      console.error('Stats fetch error:', err)
    }
  }

  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      setStats({ 
        empty: true,
        totalTests: 0,
        avgWpm: 0,
        avgAccuracy: '0.0',
        bestWpm: 0,
        worstWpm: 0,
        totalTime: 0,
        totalChars: 0,
        totalErrors: 0,
        modeStats: {},
        improvement: '0.0',
        improvementPercent: 0
      })
      return
    }

    const totalTests = data.length
    const avgWpm = Math.round(data.reduce((acc, t) => acc + (t.wpm || 0), 0) / totalTests)
    const avgAccuracy = (data.reduce((acc, t) => acc + parseFloat(t.accuracy || 0), 0) / totalTests).toFixed(1)
    const leaderboardModes = new Set(['timed', 'sentence'])
    const leaderboardModeEntries = data.filter((t) =>
      leaderboardModes.has(String(t.mode || '').toLowerCase())
    )
    const bestWpm = leaderboardModeEntries.length > 0
      ? Math.max(...leaderboardModeEntries.map((t) => Number(t.wpm) || 0))
      : 0
    const worstWpm = Math.min(...data.map(t => t.wpm || 0))
    const totalTime = data.reduce((acc, t) => acc + parseFloat(t.duration_seconds || t.time || 0), 0)
    const totalChars = data.reduce((acc, t) => {
      const charCount = t.total_chars ?? t.total_characters ?? t.characters ?? t.typed_text?.length ?? 0
      return acc + (Number(charCount) || 0)
    }, 0)
    const totalErrors = data.reduce((acc, t) => acc + (t.mistakes || t.errors || 0), 0)

    // Mode breakdown
    const modeStats = {}
    data.forEach(t => {
      const mode = t.mode || 'unknown'
      if (!modeStats[mode]) {
        modeStats[mode] = { count: 0, totalWpm: 0, totalAcc: 0 }
      }
      modeStats[mode].count++
      modeStats[mode].totalWpm += t.wpm || 0
      modeStats[mode].totalAcc += parseFloat(t.accuracy || 0)
    })

    Object.keys(modeStats).forEach(mode => {
      modeStats[mode].avgWpm = Math.round(modeStats[mode].totalWpm / modeStats[mode].count)
      modeStats[mode].avgAcc = (modeStats[mode].totalAcc / modeStats[mode].count).toFixed(1)
    })

    // Recent improvement (last 10 vs first 10)
    const sorted = [...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const first10 = sorted.slice(0, Math.min(10, sorted.length))
    const last10 = sorted.slice(-Math.min(10, sorted.length))
    
    const first10Avg = first10.reduce((acc, t) => acc + (t.wpm || 0), 0) / first10.length
    const last10Avg = last10.reduce((acc, t) => acc + (t.wpm || 0), 0) / last10.length
    const improvement = last10Avg - first10Avg

    setStats({
      totalTests,
      avgWpm,
      avgAccuracy,
      bestWpm,
      worstWpm,
      totalTime: Math.round(totalTime / 60), // minutes
      totalChars,
      totalErrors,
      modeStats,
      improvement: improvement.toFixed(1),
      improvementPercent: first10Avg > 0 ? ((improvement / first10Avg) * 100).toFixed(1) : 0
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'website') {
      setErrors(prev => ({ ...prev, website: validateWebsiteInput(value) }))
      return
    }

    if (['twitter', 'github', 'linkedin', 'instagram', 'youtube', 'twitch', 'reddit', 'snapchat'].includes(name)) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const unlockedAchievementsById = useMemo(
    () => new Map((achievements || []).map((item) => [item.achievement_id, item])),
    [achievements]
  )

  const selectedFeaturedAchievementIds = useMemo(
    () => normalizeFeaturedAchievementIds(formData.featured_achievement_ids),
    [formData.featured_achievement_ids]
  )

  const selectedFeaturedAchievementIdSet = useMemo(
    () => new Set(selectedFeaturedAchievementIds),
    [selectedFeaturedAchievementIds]
  )

  const selectedFeaturedAchievements = useMemo(() => {
    return selectedFeaturedAchievementIds
      .map((achievementId) => unlockedAchievementsById.get(achievementId))
      .filter(Boolean)
  }, [selectedFeaturedAchievementIds, unlockedAchievementsById])

  const achievementsByCategory = useMemo(() => {
    const grouped = {}

    ;(achievements || []).forEach((achievementRow) => {
      const category = normalizeAchievementCategory(achievementRow?.achievements?.category)
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(achievementRow)
    })

    return grouped
  }, [achievements])

  const availableAchievementCategories = useMemo(
    () =>
      ACHIEVEMENT_CATEGORY_ORDER
        .filter((category) => category !== 'all')
        .filter((category) => (achievementsByCategory[category] || []).length > 0),
    [achievementsByCategory]
  )

  const visibleAchievementCategories = useMemo(() => {
    if (achievementCategoryFilter === 'all') return availableAchievementCategories
    if (availableAchievementCategories.includes(achievementCategoryFilter)) {
      return [achievementCategoryFilter]
    }
    return []
  }, [achievementCategoryFilter, availableAchievementCategories])

  useEffect(() => {
    if (achievementCategoryFilter === 'all') return
    if (!availableAchievementCategories.includes(achievementCategoryFilter)) {
      setAchievementCategoryFilter('all')
    }
  }, [achievementCategoryFilter, availableAchievementCategories])

  const handleProfileVisibilityToggle = () => {
    setFormData((prev) => ({
      ...prev,
      is_profile_public: !Boolean(prev.is_profile_public),
    }))
  }

  const handleToggleFeaturedAchievement = (achievementId) => {
    if (!achievementId) return
    setFormData((prev) => {
      const selected = normalizeFeaturedAchievementIds(prev.featured_achievement_ids)
      if (selected.includes(achievementId)) {
        return {
          ...prev,
          featured_achievement_ids: selected.filter((id) => id !== achievementId),
        }
      }

      if (selected.length >= MAX_FEATURED_ACHIEVEMENTS) {
        setMessage({
          text: `You can feature up to ${MAX_FEATURED_ACHIEVEMENTS} achievements`,
          type: 'error',
        })
        setTimeout(() => setMessage({ text: '', type: '' }), 2500)
        return prev
      }

      return {
        ...prev,
        featured_achievement_ids: [...selected, achievementId],
      }
    })
  }

  const saveProfile = async () => {
    if (!user?.id) return

    const normalizedDisplayName = formData.display_name.trim()
    if (!normalizedDisplayName) {
      setMessage({ text: 'Display name is required', type: 'error' })
      return
    }

    const websiteError = validateWebsiteInput(formData.website)
    if (websiteError) {
      setErrors((prev) => ({ ...prev, website: websiteError }))
    }

    const hasUrlErrors = Boolean(websiteError) || Object.values(errors).some(Boolean)
    if (hasUrlErrors) {
      setMessage({ text: 'Please fix URL errors before saving', type: 'error' })
      return
    }

    setSaving(true)

    try {
      const currentDisplayName = String(profile?.display_name || '').trim()
      const hasDisplayNameChanged =
        normalizedDisplayName.toLowerCase() !== currentDisplayName.toLowerCase()

      // Only check duplicates when the user is changing display name.
      if (hasDisplayNameChanged) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .ilike('display_name', normalizedDisplayName)
          .neq('id', user.id)
          .maybeSingle()

        if (existing) {
          setMessage({ text: 'Username already taken', type: 'error' })
          setSaving(false)
          return
        }
      }

      // Keep selected IDs as-is to avoid dropping older selections if local
      // picker data is incomplete due to partial fetches.
      const featuredAchievementIds = selectedFeaturedAchievementIds

      const profilePayload = {
        id: user.id,
        ...formData,
        display_name: normalizedDisplayName,
        is_profile_public: Boolean(formData.is_profile_public),
        featured_achievement_ids: featuredAchievementIds,
        updated_at: new Date().toISOString(),
      }

      const { error: saveError } = await supabase
        .from('profiles')
        .upsert(profilePayload)

      if (
        saveError &&
        (
          isMissingProfileColumnError(saveError, 'is_profile_public') ||
          isMissingProfileColumnError(saveError, 'featured_achievement_ids') ||
          isMissingProfileColumnError(saveError, 'reddit') ||
          isMissingProfileColumnError(saveError, 'snapchat')
        )
      ) {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            display_name: normalizedDisplayName,
            bio: formData.bio,
            website: formData.website,
            twitter: formData.twitter,
            github: formData.github,
            linkedin: formData.linkedin,
            instagram: formData.instagram,
            youtube: formData.youtube,
            twitch: formData.twitch,
            updated_at: new Date().toISOString(),
          })

        if (fallbackError) throw fallbackError

        setMessage({
          text: 'Profile saved. Run latest SQL migrations to enable new profile fields.',
          type: 'success',
        })
        fetchProfile()
        return
      }

      if (saveError) throw saveError

      setMessage({ text: 'Profile updated successfully!', type: 'success' })
      fetchProfile()
    } catch (err) {
      console.error('Save error:', err)
      setMessage({ text: 'Failed to save profile', type: 'error' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ text: '', type: '' }), 3000)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      setMessage({ text: 'Avatar updated!', type: 'success' })
    } catch (err) {
      console.error('Upload error:', err)
      setMessage({ text: 'Failed to upload avatar', type: 'error' })
    }

    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const deleteHistoryItem = async (id) => {
    try {
      const { error } = await supabase
        .from('typing_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      setHistory(prev => prev.filter(item => item.id !== id))
      setMessage({ text: 'Test deleted', type: 'success' })
    } catch (err) {
      setMessage({ text: 'Failed to delete', type: 'error' })
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 2000)
  }

  const toFiniteNumber = (value, fallback = 0) => {
    const parsed = typeof value === 'string' ? Number(value) : value
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const parseMistakeIndices = (value) => {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  const viewHistoryResult = (item) => {
    const targetText = typeof item.original_text === 'string' ? item.original_text : ''
    const typedText = typeof item.typed_text === 'string' ? item.typed_text : ''

    if (!targetText && !typedText) {
      setMessage({ text: 'Detailed result is not available for this legacy entry', type: 'error' })
      setTimeout(() => setMessage({ text: '', type: '' }), 2500)
      return
    }

    navigate('/results', {
      state: {
        target: targetText,
        input: typedText,
        durationSec: toFiniteNumber(item.duration_seconds, toFiniteNumber(item.time, 0)),
        wpm: Math.round(toFiniteNumber(item.wpm, 0)),
        acc: toFiniteNumber(item.accuracy, 0),
        mistakes: Math.max(0, Math.round(toFiniteNumber(item.errors, toFiniteNumber(item.mistakes, 0)))),
        mistakenIndices: parseMistakeIndices(item.mistake_indices),
        corrections: Math.max(0, Math.round(toFiniteNumber(item.corrections, 0))),
        mode: item.mode || 'unknown',
        subMode: item.sub_mode || null,
        language: item.language || null,
      },
    })
  }

  // Mode options for history filter
  const historyModes = [
    { value: 'all', label: 'All Modes' },
    { value: 'sentence', label: 'Sentence' },
    { value: 'timed', label: 'Time' },
    { value: 'coding', label: 'Coding' },
    { value: 'symbols', label: 'Symbols' },
    { value: 'custom', label: 'Custom' },
    { value: 'daily', label: 'Daily' },
    { value: 'multiplayer', label: 'Multiplayer' },
    { value: 'ai_battle', label: 'Battle with AI' },
  ]

  // Filter and sort history
  const filteredHistory = history
    .filter(item => {
      // Mode filter
      if (historyFilter !== 'all' && item.mode !== historyFilter) return false
      
      // Search filter
      if (historySearch) {
        const search = historySearch.toLowerCase()
        return (
          item.mode?.toLowerCase().includes(search) ||
          item.sub_mode?.toLowerCase().includes(search)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (historySortBy) {
        case 'recent':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'wpm_high':
          return (b.wpm || 0) - (a.wpm || 0)
        case 'wpm_low':
          return (a.wpm || 0) - (b.wpm || 0)
        case 'accuracy_high':
          return (parseFloat(b.accuracy) || 0) - (parseFloat(a.accuracy) || 0)
        case 'accuracy_low':
          return (parseFloat(a.accuracy) || 0) - (parseFloat(b.accuracy) || 0)
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })

  // Pagination helpers for history
  const totalHistoryPages = Math.ceil(filteredHistory.length / HISTORY_PER_PAGE)
  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE
  )

  // Reset page when filter or search changes
  useEffect(() => {
    setHistoryPage(1)
  }, [historyFilter, historySearch, historySortBy])

  // Show loading while auth is checking or profile is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent"></div>
      </div>
    )
  }

  // Custom X icon
  const XIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20.39 3H16.9L12.75 9.25 8.59 3H3.25L9.88 12.4 3 21h3.49l4.57-6.59L16.1 21h5.4l-7.05-9.65L20.39 3z" />
    </svg>
  )

  const RedditIcon = <FaRedditAlien className="w-5 h-5" />
  const SnapchatIcon = <FaSnapchat className="w-5 h-5" />

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50 mb-6"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-700 border-4 border-gray-600">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url?.trim()}
                    alt="Avatar"
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
                ) : (
                   null
                )}
                <div className={`w-full h-full items-center justify-center ${profile?.avatar_url ? 'hidden' : 'flex'}`}>
                  {profile?.display_name ? (
                    <span className="text-3xl md:text-4xl font-bold text-gray-200">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
                  )}
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-yellow-400 text-black p-2 rounded-full hover:bg-yellow-500 transition shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {profile?.display_name || 'User'}
              </h1>
              <p className="text-gray-400 mb-3">{user?.email}</p>
              {profile?.bio && (
                <p className="text-gray-300 text-sm max-w-lg">{profile.bio}</p>
              )}
              
              {/* Social Links */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                {[
                  { platform: 'website', value: profile?.website, icon: <Globe className="w-5 h-5" /> },
                  { platform: 'github', value: profile?.github, icon: <Github className="w-5 h-5" /> },
                  { platform: 'twitter', value: profile?.twitter, icon: XIcon },
                  { platform: 'linkedin', value: profile?.linkedin, icon: <Linkedin className="w-5 h-5" /> },
                  { platform: 'instagram', value: profile?.instagram, icon: <Instagram className="w-5 h-5" /> },
                  { platform: 'youtube', value: profile?.youtube, icon: <Youtube className="w-5 h-5" /> },
                  { platform: 'twitch', value: profile?.twitch, icon: <Twitch className="w-5 h-5" /> },
                  { platform: 'reddit', value: profile?.reddit, icon: RedditIcon },
                  { platform: 'snapchat', value: profile?.snapchat, icon: SnapchatIcon },
                ]
                  .map((entry) => ({ ...entry, href: buildProfileLink(entry.platform, entry.value) }))
                  .filter((entry) => entry.href)
                  .map((entry) => (
                    <a
                      key={`social-${entry.platform}`}
                      href={entry.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition"
                    >
                      {entry.icon}
                    </a>
                  ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-yellow-400">
                  {stats?.bestWpm ?? '--'}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Best WPM</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-green-400">
                  {stats?.avgAccuracy ?? profile?.avg_accuracy ?? '--'}%
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Avg Acc</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-purple-400">
                  {stats?.totalTests ?? history.length ?? '--'}
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Tests</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-black'
                  : 'bg-[#1a1f2e] text-gray-400 hover:bg-[#242938] hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50">
                <h2 className="text-xl font-bold text-white mb-6">Profile Overview</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Personal Information</h3>
                    
                    <div className="bg-[#0f1219] rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <User className="w-5 h-5 text-yellow-400" />
                        <div>
                          <div className="text-xs text-gray-500">Display Name</div>
                          <div className="text-white">{profile?.display_name || 'Not set'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <Mail className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="text-xs text-gray-500">Email</div>
                          <div className="text-white">{user?.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="text-xs text-gray-500">Member Since</div>
                          <div className="text-white">
                            {profile?.created_at 
                              ? format(new Date(profile.created_at), 'MMMM d, yyyy')
                              : 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Quick Actions</h3>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('settings')}
                        className="w-full flex items-center justify-between p-4 bg-[#0f1219] rounded-xl hover:bg-[#151a24] transition group"
                      >
                        <div className="flex items-center gap-3">
                          <Edit3 className="w-5 h-5 text-yellow-400" />
                          <span className="text-white">Edit Profile</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('history')}
                        className="w-full flex items-center justify-between p-4 bg-[#0f1219] rounded-xl hover:bg-[#151a24] transition group"
                      >
                        <div className="flex items-center gap-3">
                          <History className="w-5 h-5 text-blue-400" />
                          <span className="text-white">View History</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
                      </button>
                      
                      <button
                        onClick={() => navigate('/achievements')}
                        className="w-full flex items-center justify-between p-4 bg-[#0f1219] rounded-xl hover:bg-[#151a24] transition group"
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-green-400" />
                          <span className="text-white">Achievements</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
                      </button>
                      
                      <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center justify-between p-4 bg-yellow-400/10 rounded-xl hover:bg-yellow-400/20 transition group border border-yellow-400/20"
                      >
                        <div className="flex items-center gap-3">
                          <Zap className="w-5 h-5 text-yellow-400" />
                          <span className="text-yellow-400 font-medium">Start New Test</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-yellow-400/50 group-hover:text-yellow-400 transition" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50">
                <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
                
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Display Name *</label>
                      <div className="flex items-center bg-[#0f1219] rounded-xl px-4 py-3 border border-gray-700 focus-within:border-yellow-400 transition">
                        <User className="w-5 h-5 text-gray-500 mr-3" />
                        <input
                          type="text"
                          name="display_name"
                          value={formData.display_name}
                          onChange={handleInputChange}
                          className="flex-1 bg-transparent outline-none text-white"
                          placeholder="Your display name"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Email</label>
                      <div className="flex items-center bg-[#0f1219] rounded-xl px-4 py-3 border border-gray-700 opacity-60">
                        <Mail className="w-5 h-5 text-gray-500 mr-3" />
                        <input
                          type="text"
                          value={user?.email || ''}
                          readOnly
                          className="flex-1 bg-transparent outline-none text-white cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full bg-[#0f1219] rounded-xl px-4 py-3 border border-gray-700 focus:border-yellow-400 transition outline-none text-white resize-none"
                      placeholder="Write a few sentences about yourself..."
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Website</label>
                    <div className="flex items-center bg-[#0f1219] rounded-xl px-4 py-3 border border-gray-700 focus-within:border-yellow-400 transition">
                      <Globe className="w-5 h-5 text-gray-500 mr-3" />
                      <input
                        type="text"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="flex-1 bg-transparent outline-none text-white"
                        placeholder="https://example.com"
                      />
                    </div>
                    {errors.website && <p className="text-red-400 text-sm mt-1">{errors.website}</p>}
                  </div>

                  {/* Social Links */}
                  <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4">Social Links</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        { name: 'twitter', icon: XIcon, label: 'X (Twitter)', placeholder: 'username' },
                        { name: 'github', icon: <Github className="w-5 h-5" />, label: 'GitHub', placeholder: 'username' },
                        { name: 'linkedin', icon: <Linkedin className="w-5 h-5" />, label: 'LinkedIn', placeholder: 'username' },
                        { name: 'instagram', icon: <Instagram className="w-5 h-5" />, label: 'Instagram', placeholder: 'username' },
                        { name: 'youtube', icon: <Youtube className="w-5 h-5" />, label: 'YouTube', placeholder: 'channelname' },
                        { name: 'twitch', icon: <Twitch className="w-5 h-5" />, label: 'Twitch', placeholder: 'username' },
                        { name: 'reddit', icon: RedditIcon, label: 'Reddit', placeholder: 'username' },
                        { name: 'snapchat', icon: SnapchatIcon, label: 'Snapchat', placeholder: 'username' },
                      ].map(social => (
                        <div key={social.name}>
                          <label className="block text-gray-500 text-xs mb-1">{social.label}</label>
                          <div className="flex items-center bg-[#0f1219] rounded-xl px-4 py-3 border border-gray-700 focus-within:border-yellow-400 transition">
                            <span className="text-gray-500 mr-3">{social.icon}</span>
                            <input
                              type="text"
                              name={social.name}
                              value={formData[social.name]}
                              onChange={handleInputChange}
                              className="flex-1 bg-transparent outline-none text-white text-sm"
                              placeholder={social.placeholder}
                            />
                          </div>
                          {errors[social.name] && <p className="text-red-400 text-xs mt-1">{errors[social.name]}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Public Profile Preview */}
                  <div className="space-y-4">
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Public Profile Preview</h3>

                    <div className="bg-[#0f1219] rounded-2xl p-4 border border-gray-700">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="text-white font-medium">Profile visibility</p>
                          <p className="text-gray-400 text-sm">
                            If private, other users cannot see your achievements on your public profile.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleProfileVisibilityToggle}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            formData.is_profile_public
                              ? 'bg-green-500/15 text-green-300 border border-green-500/40'
                              : 'bg-red-500/15 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {formData.is_profile_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          {formData.is_profile_public ? 'Public' : 'Private'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#0f1219] rounded-2xl p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-white font-medium">Featured achievements</p>
                        <p className="text-gray-500 text-xs">
                          {selectedFeaturedAchievementIds.length}/{MAX_FEATURED_ACHIEVEMENTS} selected
                        </p>
                      </div>

                      {selectedFeaturedAchievements.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          No featured achievements selected yet.
                        </p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                          {selectedFeaturedAchievements.map((ua) => {
                            const rarity = normalizeRarity(ua.achievements?.rarity)
                            const theme = RARITY_THEME[rarity] || RARITY_THEME.common
                            return (
                              <div key={`featured-${ua.id || ua.achievement_id}`} className={`p-3 rounded-xl border ${theme.card}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${theme.icon}`}>
                                      <AchievementIcon achievement={ua.achievements} className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white truncate">
                                        {ua.achievements?.name || 'Achievement'}
                                      </p>
                                      <p className="text-xs text-gray-400 line-clamp-2">
                                        {ua.achievements?.description || 'Unlocked achievement'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className={`text-[10px] px-2 py-1 rounded-md capitalize ${theme.badge}`}>
                                      {rarity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleFeaturedAchievement(ua.achievement_id)}
                                      className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-red-500/40 text-red-200 bg-red-500/10 hover:bg-red-500/20 transition"
                                    >
                                      <X className="w-3 h-3" />
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white font-medium">Choose achievements to show on public profile</p>
                        <p className="text-xs text-gray-500">Select up to {MAX_FEATURED_ACHIEVEMENTS}</p>
                      </div>

                      {achievementsLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-yellow-400 border-t-transparent"></div>
                        </div>
                      ) : achievementsError ? (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                          <p className="text-sm text-red-300">{achievementsError}</p>
                          <button
                            type="button"
                            onClick={fetchAchievements}
                            className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-gray-600 text-gray-200 hover:text-white hover:border-gray-500 transition"
                          >
                            Retry loading achievements
                          </button>
                        </div>
                      ) : achievements.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Unlock achievements first to feature them on your public profile.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {['all', ...availableAchievementCategories].map((category) => {
                              const Icon = ACHIEVEMENT_CATEGORY_ICONS[category] || Award
                              const isActive = achievementCategoryFilter === category

                              return (
                                <button
                                  type="button"
                                  key={`category-filter-${category}`}
                                  onClick={() => setAchievementCategoryFilter(category)}
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                    isActive
                                      ? 'bg-yellow-400 text-black border-yellow-400'
                                      : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-500'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {ACHIEVEMENT_CATEGORY_LABELS[category] || category}
                                </button>
                              )
                            })}
                          </div>

                          {visibleAchievementCategories.length === 0 ? (
                            <p className="text-sm text-gray-500">
                              No achievements available in this mode yet.
                            </p>
                          ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                              {visibleAchievementCategories.map((category) => {
                                const categoryItems = achievementsByCategory[category] || []
                                if (categoryItems.length === 0) return null
                                const CategoryIcon = ACHIEVEMENT_CATEGORY_ICONS[category] || Award

                                return (
                                  <div key={`category-group-${category}`} className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                                      <CategoryIcon className="w-3.5 h-3.5 text-yellow-400" />
                                      <span>{ACHIEVEMENT_CATEGORY_LABELS[category] || category}</span>
                                      <span className="text-gray-500">({categoryItems.length})</span>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-3">
                                      {categoryItems.map((ua) => {
                                        const rarity = normalizeRarity(ua.achievements?.rarity)
                                        const theme = RARITY_THEME[rarity] || RARITY_THEME.common
                                        const isSelected = selectedFeaturedAchievementIdSet.has(ua.achievement_id)
                                        const hasRoom = selectedFeaturedAchievementIds.length < MAX_FEATURED_ACHIEVEMENTS
                                        const canSelect = isSelected || hasRoom

                                        return (
                                          <button
                                            type="button"
                                            key={`picker-${ua.id || ua.achievement_id}`}
                                            onClick={() => handleToggleFeaturedAchievement(ua.achievement_id)}
                                            disabled={!canSelect}
                                            className={`text-left p-3 rounded-xl border transition ${
                                              isSelected
                                                ? `${theme.card} border-yellow-400/60`
                                                : 'bg-[#111622] border-gray-700 hover:border-gray-500'
                                            } ${!canSelect ? 'opacity-60 cursor-not-allowed' : ''}`}
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="flex items-start gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${theme.icon}`}>
                                                  <AchievementIcon achievement={ua.achievements} className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-sm font-semibold text-white truncate">{ua.achievements?.name || 'Achievement'}</p>
                                                  <p className="text-xs text-gray-400 line-clamp-2">{ua.achievements?.description || ''}</p>
                                                </div>
                                              </div>
                                              <div className="flex flex-col items-end gap-2 shrink-0">
                                                <span className={`text-[10px] px-2 py-1 rounded-md capitalize ${theme.badge}`}>
                                                  {rarity}
                                                </span>
                                                <span className={`text-[10px] px-2 py-1 rounded-md border ${
                                                  isSelected
                                                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200'
                                                    : 'bg-gray-700/40 border-gray-600 text-gray-300'
                                                }`}>
                                                  {isSelected ? 'Selected' : 'Select'}
                                                </span>
                                              </div>
                                            </div>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50">
                {/* Search and Filters Header */}
                <div className="flex flex-col gap-4 mb-6">
                  {/* Search Bar Row */}
                  <div className="flex gap-3">
                    {/* Search Input */}
                    <div className="flex-1 flex items-center bg-[#0f1219] rounded-xl px-4 py-3 border border-gray-700">
                      <Search className="w-5 h-5 text-gray-500 mr-3" />
                      <input
                        type="text"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="bg-transparent outline-none text-white text-sm w-full"
                        placeholder="Search by mode or text..."
                      />
                    </div>
                    
                    {/* Filters Toggle Button */}
                    <button
                      onClick={() => setShowHistoryFilters(!showHistoryFilters)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition ${
                        showHistoryFilters 
                          ? 'bg-[#1a1f2e] border-gray-600 text-white' 
                          : 'bg-[#0f1219] border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium">Filters</span>
                      {showHistoryFilters ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Expandable Filters */}
                  <AnimatePresence>
                    {showHistoryFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 pb-4 border-t border-gray-800">
                          <div className="flex flex-col gap-4 mt-4">
                            {/* Mode Pills */}
                            <div className="flex flex-col gap-2">
                              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Mode</span>
                              <div className="flex flex-wrap gap-2">
                                {historyModes.map((mode) => (
                                  <button
                                    key={mode.value}
                                    onClick={() => setHistoryFilter(mode.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                      historyFilter === mode.value
                                        ? 'bg-yellow-400 text-black'
                                        : 'bg-[#0f1219] text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600'
                                    }`}
                                  >
                                    {mode.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Sort Row */}
                            <div className="flex flex-col md:flex-row md:items-end gap-4">
                              {/* Sort By */}
                              <div className="flex flex-col gap-2 md:ml-auto">
                                <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Sort By</span>
                                <select
                                  value={historySortBy}
                                  onChange={(e) => setHistorySortBy(e.target.value)}
                                  className="bg-[#0f1219] text-white rounded-xl px-4 py-2.5 border border-gray-700 outline-none text-sm min-w-[150px]"
                                >
                                  <option value="recent">Most Recent</option>
                                  <option value="oldest">Oldest First</option>
                                  <option value="wpm_high">Highest WPM</option>
                                  <option value="wpm_low">Lowest WPM</option>
                                  <option value="accuracy_high">Highest Accuracy</option>
                                  <option value="accuracy_low">Lowest Accuracy</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-400 border-t-transparent"></div>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No typing history found</p>
                    <button
                      onClick={() => navigate('/')}
                      className="mt-4 px-6 py-2 bg-yellow-400 text-black rounded-xl font-medium hover:bg-yellow-500 transition"
                    >
                      Start Typing
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-gray-400 text-sm border-b border-gray-700">
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-left py-3 px-4">Mode</th>
                          <th className="text-left py-3 px-4">Difficulty</th>
                          <th className="text-right py-3 px-4">WPM</th>
                          <th className="text-right py-3 px-4">Accuracy</th>
                          <th className="text-right py-3 px-4">Duration</th>
                          <th className="text-right py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedHistory.map((item, idx) => (
                          <tr key={item.id || idx} className="border-b border-gray-800 hover:bg-[#0f1219] transition">
                            <td className="py-3 px-4 text-gray-300 text-sm">
                              {item.created_at 
                                ? format(new Date(item.created_at), 'MMM d, yyyy h:mm a')
                                : '--'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                item.mode === 'timed' ? 'bg-blue-500/20 text-blue-400' :
                                item.mode === 'sentence' ? 'bg-green-500/20 text-green-400' :
                                item.mode === 'coding' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {item.mode === 'timed' ? 'Time' : 
                                 item.mode === 'sentence' ? 'Sentence' : 
                                 item.mode === 'coding' ? 'Coding' : 
                                 item.mode || 'Unknown'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                item.sub_mode === 'easy' ? 'bg-green-500/20 text-green-400' :
                                item.sub_mode === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                item.sub_mode === 'hard' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {item.sub_mode || '--'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-yellow-400 font-semibold">{item.wpm || '--'}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`${
                                parseFloat(item.accuracy) >= 95 ? 'text-green-400' :
                                parseFloat(item.accuracy) >= 80 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {item.accuracy ? `${parseFloat(item.accuracy).toFixed(1)}%` : '--'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-400 text-sm">
                              {item.duration_seconds || item.time 
                                ? `${parseFloat(item.duration_seconds || item.time).toFixed(1)}s`
                                : '--'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => viewHistoryResult(item)}
                                  className="text-gray-400 hover:text-blue-400 transition p-1"
                                  title="View Result"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteHistoryItem(item.id)}
                                  className="text-gray-500 hover:text-red-400 transition p-1"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Pagination */}
                    {totalHistoryPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                        <p className="text-gray-500 text-sm">
                          Showing {((historyPage - 1) * HISTORY_PER_PAGE) + 1} - {Math.min(historyPage * HISTORY_PER_PAGE, filteredHistory.length)} of {filteredHistory.length}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                            className="px-3 py-1.5 text-sm bg-[#0f1219] text-gray-400 rounded-lg border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalHistoryPages) }, (_, i) => {
                              let pageNum
                              if (totalHistoryPages <= 5) {
                                pageNum = i + 1
                              } else if (historyPage <= 3) {
                                pageNum = i + 1
                              } else if (historyPage >= totalHistoryPages - 2) {
                                pageNum = totalHistoryPages - 4 + i
                              } else {
                                pageNum = historyPage - 2 + i
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setHistoryPage(pageNum)}
                                  className={`w-8 h-8 text-sm rounded-lg transition ${
                                    historyPage === pageNum
                                      ? 'bg-yellow-400 text-black font-semibold'
                                      : 'bg-[#0f1219] text-gray-400 border border-gray-700 hover:border-gray-600'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              )
                            })}
                          </div>
                          <button
                            onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                            disabled={historyPage === totalHistoryPages}
                            className="px-3 py-1.5 text-sm bg-[#0f1219] text-gray-400 rounded-lg border border-gray-700 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Best WPM', value: stats?.bestWpm || 0, icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                    { label: 'Average WPM', value: stats?.avgWpm || 0, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Avg Accuracy', value: `${stats?.avgAccuracy || 0}%`, icon: Target, color: 'text-green-400', bg: 'bg-green-400/10' },
                    { label: 'Total Tests', value: stats?.totalTests || 0, icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                  ].map((stat, idx) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-2xl p-5 border border-gray-800/50"
                    >
                      <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-gray-400 text-sm">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Detailed Stats */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Time & Progress */}
                  <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 border border-gray-800/50">
                    <h3 className="text-lg font-bold text-white mb-4">Progress</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Practice Time</span>
                        <span className="text-white font-medium">{stats?.totalTime || 0} minutes</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Characters</span>
                        <span className="text-white font-medium">{(stats?.totalChars || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Errors</span>
                        <span className="text-red-400 font-medium">{stats?.totalErrors || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">WPM Improvement</span>
                        <span className={`font-medium ${parseFloat(stats?.improvement || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(stats?.improvement || 0) >= 0 ? '+' : ''}{stats?.improvement || 0} WPM
                          {stats?.improvementPercent && ` (${stats.improvementPercent}%)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mode Breakdown */}
                  <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 border border-gray-800/50">
                    <h3 className="text-lg font-bold text-white mb-4">By Mode</h3>
                    {stats?.modeStats && Object.keys(stats.modeStats).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(stats.modeStats).map(([mode, data]) => (
                          <div key={mode} className="flex items-center justify-between p-3 bg-[#0f1219] rounded-xl">
                            <div>
                              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                mode === 'timed' ? 'bg-blue-500/20 text-blue-400' :
                                mode === 'sentence' ? 'bg-green-500/20 text-green-400' :
                                mode === 'coding' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {mode}
                              </span>
                              <span className="text-gray-500 text-sm ml-2">{data.count} tests</span>
                            </div>
                            <div className="text-right">
                              <span className="text-yellow-400 font-semibold">{data.avgWpm}</span>
                              <span className="text-gray-500 text-sm ml-1">WPM</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No mode data available</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Toast Message */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 ${
                message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ProfileHub
