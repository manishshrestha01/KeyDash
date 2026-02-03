import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Clock, Zap, Target, RotateCcw, Search, Filter,
  ChevronDown, Calendar, Trash2, Eye
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import toast, { Toaster } from 'react-hot-toast'

const TypingHistory = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return
    
    // Only redirect if auth is loaded and there's no user
    if (!user?.id) {
      navigate('/login')
      return
    }
    fetchHistory()
  }, [user, authLoading, filterMode, sortBy, navigate])

  const fetchHistory = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // Try to fetch from typing_history table first
      let query = supabase
        .from('typing_history')
        .select('*')
        .eq('user_id', user.id)

      // Apply mode filter
      if (filterMode !== 'all') {
        query = query.eq('mode', filterMode)
      }

      // Apply sorting
      switch (sortBy) {
        case 'wpm':
          query = query.order('wpm', { ascending: false })
          break
        case 'accuracy':
          query = query.order('accuracy', { ascending: false })
          break
        case 'date':
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query.limit(500)

      if (error) {
        console.error('Error fetching from typing_history:', error)
        // Fallback to v1 leaderboard tables
        await fetchFromLeaderboards()
        return
      }
      
      // If no data from typing_history, try v1 tables as well
      if (!data || data.length === 0) {
        await fetchFromLeaderboards()
        return
      }
      
      setHistory(data || [])
    } catch (error) {
      console.error('Error fetching history:', error)
      // Try fallback
      await fetchFromLeaderboards()
    } finally {
      setLoading(false)
    }
  }

  // Fallback: Fetch from v1 leaderboard tables
  const fetchFromLeaderboards = async () => {
    try {
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

      // Apply mode filter if not 'all'
      if (filterMode !== 'all') {
        combined = combined.filter(item => item.mode === filterMode)
      }

      // Sort the combined results
      switch (sortBy) {
        case 'wpm':
          combined.sort((a, b) => (b.wpm || 0) - (a.wpm || 0))
          break
        case 'accuracy':
          combined.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
          break
        case 'date':
        default:
          combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }

      setHistory(combined)
    } catch (fallbackError) {
      console.error('Fallback history fetch error:', fallbackError)
      toast.error('Failed to load history')
    }
  }

  // Filter by search query
  const filteredHistory = history.filter(item => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      item.mode?.toLowerCase().includes(searchLower) ||
      item.sub_mode?.toLowerCase().includes(searchLower) ||
      item.original_text?.toLowerCase().includes(searchLower)
    )
  })

  // Paginate
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Handle retry
  const handleRetry = (item) => {
    navigate('/', { 
      state: { 
        retryText: item.original_text,
        mode: item.mode,
        subMode: item.sub_mode
      } 
    })
  }

  // Handle view details
  const handleView = (item) => {
    navigate('/results', {
      state: {
        target: item.original_text,
        input: item.typed_text,
        durationSec: item.duration_seconds,
        wpm: item.wpm,
        rawWpm: item.raw_wpm,
        acc: item.accuracy,
        mistakes: item.errors,
        mistakenIndices: item.mistake_indices || [],
        corrections: item.corrections,
        mode: item.mode,
        subMode: item.sub_mode,
      }
    })
  }

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const { error } = await supabase
        .from('typing_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
      
      setHistory(prev => prev.filter(item => item.id !== id))
      toast.success('Entry deleted')
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error('Failed to delete entry')
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Delete ${selectedItems.size} selected entries?`)) return

    try {
      const { error } = await supabase
        .from('typing_history')
        .delete()
        .in('id', Array.from(selectedItems))
        .eq('user_id', user.id)

      if (error) throw error
      
      setHistory(prev => prev.filter(item => !selectedItems.has(item.id)))
      setSelectedItems(new Set())
      toast.success(`${selectedItems.size} entries deleted`)
    } catch (error) {
      console.error('Error deleting entries:', error)
      toast.error('Failed to delete entries')
    }
  }

  // Toggle selection
  const toggleSelection = (id) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedItems(newSelection)
  }

  // Select all on current page
  const toggleSelectAll = () => {
    if (selectedItems.size === paginatedHistory.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(paginatedHistory.map(item => item.id)))
    }
  }

  const modes = ['all', 'english', 'timed', 'coding', 'symbols', 'custom', 'daily', 'multiplayer', 'ai_battle']

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Typing History</h1>
          <p className="text-gray-400">
            Review and retry your past typing tests
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <span className="text-gray-400">{filteredHistory.length} entries</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#1a1f2e] rounded-xl p-4 mb-6 border border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by mode or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#252b3b] border border-gray-700 rounded-lg
                       text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-[#252b3b] border border-gray-700 rounded-lg
                     text-gray-300 hover:border-gray-600 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-4 pt-4 border-t border-gray-700"
          >
            <div className="flex flex-wrap gap-4">
              {/* Mode Filter */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Mode</label>
                <div className="flex flex-wrap gap-2">
                  {modes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilterMode(mode)}
                      className={`px-3 py-1 rounded-full text-sm capitalize transition-colors
                        ${filterMode === mode 
                          ? 'bg-yellow-400 text-black' 
                          : 'bg-[#252b3b] text-gray-300 hover:bg-[#2a3142]'
                        }`}
                    >
                      {mode === 'all' ? 'All Modes' : mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 bg-[#252b3b] border border-gray-700 rounded-lg
                           text-white focus:outline-none focus:border-yellow-400/50"
                >
                  <option value="date">Most Recent</option>
                  <option value="wpm">Highest WPM</option>
                  <option value="accuracy">Highest Accuracy</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center justify-between"
        >
          <span className="text-red-400">{selectedItems.size} items selected</span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
        </motion.div>
      )}

      {/* History Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full" />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-20 bg-[#1a1f2e] rounded-xl border border-gray-700/50">
          <Clock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No History Found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || filterMode !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Complete some typing tests to see your history'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-300 transition-colors"
          >
            Start Typing
          </button>
        </div>
      ) : (
        <div className="bg-[#1a1f2e] rounded-xl border border-gray-700/50 overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 p-4 bg-[#252b3b] text-gray-400 text-sm font-medium">
            <div className="col-span-1">
              <input
                type="checkbox"
                checked={selectedItems.size === paginatedHistory.length && paginatedHistory.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-600 bg-transparent text-yellow-400 focus:ring-yellow-400"
              />
            </div>
            <div className="col-span-2">Mode</div>
            <div className="col-span-1">WPM</div>
            <div className="col-span-1">Accuracy</div>
            <div className="col-span-1">Errors</div>
            <div className="col-span-1">Time</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-700/50">
            {paginatedHistory.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="p-4 hover:bg-[#252b3b]/50 transition-colors"
              >
                {/* Mobile Layout */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="rounded border-gray-600 bg-transparent text-yellow-400 focus:ring-yellow-400"
                      />
                      <span className="capitalize font-medium">
                        {item.mode}{item.sub_mode ? ` • ${item.sub_mode}` : ''}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {format(new Date(item.created_at), 'MMM d')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="font-semibold text-yellow-400">{item.wpm}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">{item.accuracy}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400">{item.duration_seconds?.toFixed(1)}s</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRetry(item)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-400/10 text-yellow-400 rounded-lg hover:bg-yellow-400/20 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retry
                    </button>
                    <button
                      onClick={() => handleView(item)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-400/10 text-blue-400 rounded-lg hover:bg-blue-400/20 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-2 bg-red-400/10 text-red-400 rounded-lg hover:bg-red-400/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="rounded border-gray-600 bg-transparent text-yellow-400 focus:ring-yellow-400"
                    />
                  </div>
                  <div className="col-span-2 capitalize">
                    {item.mode}
                    {item.sub_mode && <span className="text-gray-400 text-sm ml-1">({item.sub_mode})</span>}
                  </div>
                  <div className="col-span-1 font-semibold text-yellow-400">{item.wpm}</div>
                  <div className="col-span-1 text-green-400">{item.accuracy}%</div>
                  <div className="col-span-1 text-red-400">{item.errors}</div>
                  <div className="col-span-1 text-blue-400">{item.duration_seconds?.toFixed(1)}s</div>
                  <div className="col-span-2 text-gray-400 text-sm">
                    {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                    <button
                      onClick={() => handleRetry(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-400/10 text-yellow-400 rounded-lg hover:bg-yellow-400/20 transition-colors text-sm"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                    <button
                      onClick={() => handleView(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-400/10 text-blue-400 rounded-lg hover:bg-blue-400/20 transition-colors text-sm"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 bg-red-400/10 text-red-400 rounded-lg hover:bg-red-400/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-700/50">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-[#252b3b] text-gray-300 rounded-lg hover:bg-[#2a3142] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-[#252b3b] text-gray-300 rounded-lg hover:bg-[#2a3142] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TypingHistory
