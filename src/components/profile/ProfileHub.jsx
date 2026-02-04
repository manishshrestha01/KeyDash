import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Settings, History, Trophy, BarChart2,
  Mail, Globe, Github, Linkedin, Instagram, Youtube, Twitch,
  Camera, Check, X, ChevronRight, ChevronUp, ChevronDown, Clock, Target, Zap,
  Calendar, TrendingUp, Award, Flame, Star, Edit3, Save,
  Eye, EyeOff, Trash2, Download, Filter, Search
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { format, formatDistanceToNow } from 'date-fns'

const ProfileHub = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Tab state - derived from URL
  const getTabFromUrl = () => {
    if (location.pathname === '/settings') return 'settings'
    if (location.pathname === '/history') return 'history'
    return searchParams.get('tab') || 'profile'
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
  
  // File input ref
  const fileInputRef = useRef(null)

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'history', label: 'History', icon: History },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
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
    if (initialTab === 'history') fetchHistory()
    if (initialTab === 'achievements') fetchAchievements()
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
    if (activeTab === 'history') fetchHistory()
    if (activeTab === 'achievements') fetchAchievements()
    if (activeTab === 'stats') fetchStats()
  }, [activeTab, user?.id, authLoading])

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

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`*, achievements(*)`)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })

      if (error) throw error
      setAchievements(data || [])
    } catch (err) {
      console.error('Achievements fetch error:', err)
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
    const bestWpm = Math.max(...data.map(t => t.wpm || 0))
    const worstWpm = Math.min(...data.map(t => t.wpm || 0))
    const totalTime = data.reduce((acc, t) => acc + parseFloat(t.duration_seconds || t.time || 0), 0)
    const totalChars = data.reduce((acc, t) => acc + (t.total_characters || t.characters || 0), 0)
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

  const validateUrl = (value) => {
    if (!value) return ''
    try {
      new URL(value)
      return ''
    } catch {
      return 'Must be a valid URL'
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Validate URLs
    if (['website', 'twitter', 'github', 'linkedin', 'instagram', 'youtube', 'twitch'].includes(name)) {
      setErrors(prev => ({ ...prev, [name]: validateUrl(value) }))
    }
  }

  const saveProfile = async () => {
    if (!user?.id) return

    if (!formData.display_name.trim()) {
      setMessage({ text: 'Display name is required', type: 'error' })
      return
    }

    // Check URL errors
    const urlFields = ['website', 'twitter', 'github', 'linkedin', 'instagram', 'youtube', 'twitch']
    const hasUrlErrors = urlFields.some(field => errors[field])
    if (hasUrlErrors) {
      setMessage({ text: 'Please fix URL errors before saving', type: 'error' })
      return
    }

    setSaving(true)

    try {
      // Check for duplicate display name
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', formData.display_name.trim())
        .neq('id', user.id)
        .maybeSingle()

      if (existing) {
        setMessage({ text: 'Username already taken', type: 'error' })
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...formData,
          display_name: formData.display_name.trim(),
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

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
    { value: 'ai_battle', label: 'AI Battle' },
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
                {profile?.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                    <Globe className="w-5 h-5" />
                  </a>
                )}
                {profile?.github && (
                  <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {profile?.twitter && (
                  <a href={profile.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                    {XIcon}
                  </a>
                )}
                {profile?.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {profile?.instagram && (
                  <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {profile?.youtube && (
                  <a href={profile.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {profile?.twitch && (
                  <a href={profile.twitch} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
                    <Twitch className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-yellow-400">
                  {stats?.bestWpm ?? profile?.best_wpm ?? '--'}
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
                        onClick={() => setActiveTab('achievements')}
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
                        { name: 'twitter', icon: XIcon, label: 'X (Twitter)', placeholder: 'https://x.com/handle' },
                        { name: 'github', icon: <Github className="w-5 h-5" />, label: 'GitHub', placeholder: 'https://github.com/username' },
                        { name: 'linkedin', icon: <Linkedin className="w-5 h-5" />, label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
                        { name: 'instagram', icon: <Instagram className="w-5 h-5" />, label: 'Instagram', placeholder: 'https://instagram.com/handle' },
                        { name: 'youtube', icon: <Youtube className="w-5 h-5" />, label: 'YouTube', placeholder: 'https://youtube.com/@channel' },
                        { name: 'twitch', icon: <Twitch className="w-5 h-5" />, label: 'Twitch', placeholder: 'https://twitch.tv/channel' },
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
                              <button
                                onClick={() => deleteHistoryItem(item.id)}
                                className="text-gray-500 hover:text-red-400 transition p-1"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <div className="bg-gradient-to-br from-[#1a1f2e] to-[#141824] rounded-3xl p-6 md:p-8 border border-gray-800/50">
                <h2 className="text-xl font-bold text-white mb-6">Achievements</h2>

                {achievementsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-400 border-t-transparent"></div>
                  </div>
                ) : achievements.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No achievements unlocked yet</p>
                    <p className="text-gray-500 text-sm">Complete typing tests to earn achievements!</p>
                    <button
                      onClick={() => navigate('/')}
                      className="mt-4 px-6 py-2 bg-yellow-400 text-black rounded-xl font-medium hover:bg-yellow-500 transition"
                    >
                      Start Typing
                    </button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map((ua, idx) => (
                      <motion.div
                        key={ua.id || idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-[#0f1219] rounded-xl p-4 border border-gray-700 hover:border-yellow-400/30 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{ua.achievements?.icon || '🏆'}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{ua.achievements?.name || 'Achievement'}</h4>
                            <p className="text-gray-400 text-sm">{ua.achievements?.description || ''}</p>
                            <p className="text-gray-500 text-xs mt-2">
                              Unlocked {ua.unlocked_at 
                                ? formatDistanceToNow(new Date(ua.unlocked_at), { addSuffix: true })
                                : 'recently'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
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
                    { label: 'Total Tests', value: stats?.totalTests || 0, icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Average WPM', value: stats?.avgWpm || 0, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                    { label: 'Best WPM', value: stats?.bestWpm || 0, icon: Trophy, color: 'text-green-400', bg: 'bg-green-400/10' },
                    { label: 'Avg Accuracy', value: `${stats?.avgAccuracy || 0}%`, icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10' },
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
