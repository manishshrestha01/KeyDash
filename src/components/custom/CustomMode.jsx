import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Save, Trash2, Play, Clock, Target, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import TypingEngine from '../typing/TypingEngine'

const CustomMode = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [customText, setCustomText] = useState('')
  const [savedTexts, setSavedTexts] = useState([])
  const [selectedText, setSelectedText] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [textTitle, setTextTitle] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (user?.id) {
      fetchSavedTexts()
    }
  }, [user])

  const fetchSavedTexts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('custom_texts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedTexts(data || [])
    } catch (error) {
      console.error('Error fetching saved texts:', error)
      showMessage('error', 'Failed to load saved texts')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const handleSaveText = async () => {
    if (!customText.trim()) {
      showMessage('error', 'Please enter some text first')
      return
    }

    if (!textTitle.trim()) {
      showMessage('error', 'Please enter a title for your text')
      return
    }

    if (!user?.id) {
      showMessage('error', 'Please login to save texts')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('custom_texts')
        .insert({
          user_id: user.id,
          title: textTitle.trim(),
          content: customText.trim(),
          word_count: customText.trim().split(/\s+/).length,
          char_count: customText.trim().length,
        })
        .select()
        .single()

      if (error) throw error

      setSavedTexts([data, ...savedTexts])
      setShowSaveModal(false)
      setTextTitle('')
      showMessage('success', 'Text saved successfully!')
    } catch (error) {
      console.error('Error saving text:', error)
      showMessage('error', 'Failed to save text')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteText = async (textId) => {
    if (!confirm('Are you sure you want to delete this saved text?')) return

    try {
      const { error } = await supabase
        .from('custom_texts')
        .delete()
        .eq('id', textId)
        .eq('user_id', user.id)

      if (error) throw error

      setSavedTexts(savedTexts.filter((t) => t.id !== textId))
      if (selectedText?.id === textId) {
        setSelectedText(null)
        setCustomText('')
      }
      showMessage('success', 'Text deleted successfully!')
    } catch (error) {
      console.error('Error deleting text:', error)
      showMessage('error', 'Failed to delete text')
    }
  }

  const handleSelectText = (text) => {
    setSelectedText(text)
    setCustomText(text.content)
  }

  const handleStartTyping = () => {
    if (!customText.trim()) {
      showMessage('error', 'Please enter or select some text first')
      return
    }
    setIsTyping(true)
  }

  const handleComplete = (results) => {
    setIsTyping(false)
    navigate('/results', {
      state: {
        ...results,
        mode: 'custom',
        subMode: null,
      },
    })
  }

  // Character and word count
  const charCount = customText.length
  const wordCount = customText.trim() ? customText.trim().split(/\s+/).length : 0
  const estimatedTime = Math.ceil(wordCount / 40) // Assuming 40 WPM average

  if (isTyping) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <TypingEngine
          mode="custom"
          text={customText.trim()}
          onComplete={handleComplete}
          onBack={() => setIsTyping(false)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-400/20 rounded-2xl mb-4">
          <FileText className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Custom Mode</h1>
        <p className="text-gray-400">Paste your own text or code to practice typing</p>
      </div>

      {/* Message Toast */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`
            fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl
            ${message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }
          `}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Text Input Section */}
        <div className="lg:col-span-2">
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Text</h2>
              <div className="flex items-center gap-2">
                {user && customText.trim() && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 
                               rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                )}
                {customText && (
                  <button
                    onClick={() => {
                      setCustomText('')
                      setSelectedText(null)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 
                               rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value)
                setSelectedText(null)
              }}
              placeholder="Paste or type your custom text here...

You can paste:
• Paragraphs from articles or books
• Code snippets in any language
• Song lyrics or poetry
• Technical documentation
• Or anything else you want to practice!"
              className="w-full h-64 bg-[#0f1117] rounded-xl p-4 border border-gray-700/50
                         focus:border-purple-400/50 focus:outline-none resize-none
                         font-mono text-sm leading-relaxed placeholder:text-gray-500"
            />

            {/* Text Stats */}
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <div className="flex items-center gap-6">
                <span>{charCount} characters</span>
                <span>{wordCount} words</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Est. {estimatedTime} min</span>
              </div>
            </div>

            {/* Start Button */}
            <motion.button
              onClick={handleStartTyping}
              disabled={!customText.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 
                         text-white font-semibold rounded-xl hover:shadow-lg
                         hover:shadow-purple-500/25 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Typing
            </motion.button>
          </div>
        </div>

        {/* Saved Texts Section */}
        <div className="lg:col-span-1">
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50 h-full">
            <h2 className="text-lg font-semibold mb-4">Saved Texts</h2>

            {!user ? (
              <div className="text-center py-10 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Login to save custom texts</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
              </div>
            ) : savedTexts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No saved texts yet</p>
                <p className="text-sm mt-1">Save your custom texts to practice again</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {savedTexts.map((text) => (
                  <motion.div
                    key={text.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      p-4 rounded-xl border cursor-pointer transition-all
                      ${selectedText?.id === text.id
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-[#0f1117] border-gray-700/50 hover:border-gray-600'
                      }
                    `}
                    onClick={() => handleSelectText(text)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium truncate flex-1">{text.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteText(text.id)
                        }}
                        className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {text.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{text.word_count} words</span>
                      <span>{text.char_count} chars</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1a1f2e] rounded-2xl p-6 max-w-md w-full border border-gray-700/50"
          >
            <h3 className="text-xl font-semibold mb-4">Save Custom Text</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Title</label>
              <input
                type="text"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="Enter a title for your text..."
                className="w-full bg-[#0f1117] rounded-xl px-4 py-3 border border-gray-700/50
                           focus:border-purple-400/50 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2">Preview</div>
              <div className="bg-[#0f1117] rounded-xl p-4 border border-gray-700/50 
                              max-h-32 overflow-hidden text-sm text-gray-300">
                {customText.slice(0, 200)}{customText.length > 200 ? '...' : ''}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setTextTitle('')
                }}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl
                           hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveText}
                disabled={saving || !textTitle.trim()}
                className="flex-1 py-3 bg-purple-500 text-white rounded-xl
                           hover:bg-purple-600 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Text
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default CustomMode
