import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Code, Hash, FileText, Clock, Trophy, Users, Bot,
  ChevronDown, Flame, Target, Zap, Check
} from 'lucide-react'
import { useAppStore } from '../../store'
import TypingEngine from '../typing/TypingEngine'

// Custom Sentence icon
const SentenceIcon = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 5h12"/>
    <path d="M4 12h10"/>
    <path d="M12 19h8"/>
  </svg>
)

// Mode data imports
import englishData from '../../assets/english/english.json'
import nepaliData from '../../assets/nepali/nepali.json'
import timedData from '../../assets/english/timed.json'
import javascriptCode from '../../assets/coding/javascript.json'
import pythonCode from '../../assets/coding/python.json'
import javaCode from '../../assets/coding/java.json'
import cCode from '../../assets/coding/c.json'
import cppCode from '../../assets/coding/cpp.json'
import symbolsData from '../../assets/symbols/symbols.json'

// Language configurations
const LANGUAGES = {
  english: { name: 'English' },
  nepali: { name: 'Nepali' },
}

// Mode configurations
const MODES = {
  sentence: {
    name: 'Sentence',
    icon: SentenceIcon,
    description: 'Classic typing with quotes',
    subModes: [
      { key: 'easy', name: 'Easy', range: [0, 100] },
      { key: 'medium', name: 'Medium', range: [101, 300] },
      { key: 'hard', name: 'Hard', range: [301, 600] },
      { key: 'extreme', name: 'Extreme', range: [601, 9999] },
    ]
  },
  timed: {
    name: 'Time',
    icon: Clock,
    description: 'Race against the clock',
    subModes: [
      { key: 15, name: '15s' },
      { key: 30, name: '30s' },
      { key: 60, name: '60s' },
      { key: 120, name: '120s' },
    ]
  },
  coding: {
    name: 'Coding',
    icon: Code,
    description: 'Practice typing real code',
    subModes: [
      { key: 'javascript', name: 'JavaScript', data: javascriptCode },
      { key: 'python', name: 'Python', data: pythonCode },
      { key: 'java', name: 'Java', data: javaCode },
      { key: 'c', name: 'C', data: cCode },
      { key: 'cpp', name: 'C++', data: cppCode },
    ]
  },
  symbols: {
    name: 'Symbols',
    icon: Hash,
    description: 'Master keyboard symbols',
    subModes: [
      { key: 'easy', name: 'Easy' },
      { key: 'medium', name: 'Medium' },
      { key: 'hard', name: 'Hard' },
    ]
  },
  custom: {
    name: 'Custom',
    icon: FileText,
    description: 'Type your own text',
    subModes: []
  },
}

const SPECIAL_MODES = {
  daily: {
    name: 'Daily Challenge',
    icon: Target,
    description: 'Same text for everyone today',
  },
  multiplayer: {
    name: 'Multiplayer',
    icon: Users,
    description: 'Race against others',
  },
  ai_battle: {
    name: 'AI Battle',
    icon: Bot,
    description: 'Challenge AI opponents',
  },
}

// Get random sentence from quotes based on difficulty and language
const getRandomQuote = (difficulty = 'medium', language = 'english') => {
  const ranges = {
    easy: [0, 100],
    medium: [101, 300],
    hard: [301, 600],
    extreme: [601, 9999],
  }
  const [min, max] = ranges[difficulty] || ranges.medium
  
  // Select data based on language
  const data = language === 'nepali' ? nepaliData : englishData
  const quotes = data.quotes || data.sentences || []
  
  const filtered = quotes.filter(q => {
    const text = q.text || q
    const len = typeof text === 'string' ? text.length : 0
    return len >= min && len <= max
  })
  
  if (filtered.length === 0) return 'No text found for this difficulty.'
  const item = filtered[Math.floor(Math.random() * filtered.length)]
  return item.text || item
}

// Get random words for timed mode
const getRandomWords = (count = 100, language = 'english') => {
  const words = []
  const wordList = language === 'nepali' 
    ? (nepaliData.words || []) 
    : (timedData.words || [])
  
  if (wordList.length === 0) return 'No words available'
  
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * wordList.length)
    words.push(wordList[idx])
  }
  return words.join(' ')
}

// Get random code snippet
const getRandomCode = (language) => {
  const codeData = {
    javascript: javascriptCode,
    python: pythonCode,
    java: javaCode,
    c: cCode,
    cpp: cppCode,
  }
  const data = codeData[language]
  if (!data?.snippets?.length) return '// No code found'
  const snippet = data.snippets[Math.floor(Math.random() * data.snippets.length)]
  return snippet.code
}

// Get symbol practice text
const getSymbolText = (difficulty) => {
  const filtered = symbolsData.practice_texts.filter(t => t.difficulty === difficulty)
  if (filtered.length === 0) return symbolsData.practice_texts[0].text
  return filtered[Math.floor(Math.random() * filtered.length)].text
}

const ModeSelector = () => {
  const { lastMode, lastSubMode, lastLanguage, setLastMode, setLastLanguage } = useAppStore()
  
  const [selectedMode, setSelectedMode] = useState(lastMode || 'sentence')
  const [selectedSubMode, setSelectedSubMode] = useState(lastSubMode || 'medium')
  const [selectedLanguage, setSelectedLanguage] = useState(lastLanguage || 'english')
  const [targetText, setTargetText] = useState('')
  const [customText, setCustomText] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  
  const languageDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setShowLanguageDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get time limit for timed mode
  const timeLimit = selectedMode === 'timed' ? parseInt(selectedSubMode) : null

  // Generate text based on mode and language
  const generateText = useCallback(() => {
    let text = ''
    
    switch (selectedMode) {
      case 'sentence':
        text = getRandomQuote(selectedSubMode, selectedLanguage)
        break
      case 'timed':
        text = getRandomWords(100, selectedLanguage)
        break
      case 'coding':
        text = getRandomCode(selectedSubMode)
        break
      case 'symbols':
        text = getSymbolText(selectedSubMode)
        break
      case 'custom':
        text = customText || 'Enter your custom text above to start typing...'
        break
      default:
        text = getRandomQuote('medium', selectedLanguage)
    }
    
    setTargetText(text)
  }, [selectedMode, selectedSubMode, selectedLanguage, customText])

  // Generate text on mount and mode/language change
  useEffect(() => {
    if (selectedMode !== 'custom') {
      generateText()
    }
  }, [selectedMode, selectedSubMode, selectedLanguage, generateText])

  // Handle mode change
  const handleModeChange = (mode) => {
    setSelectedMode(mode)
    // If switching to custom mode and user hasn't provided any custom text,
    // ensure the typing area is empty instead of showing the previous mode text.
    if (mode === 'custom') {
      setTargetText(customText.trim() || '')
    }
    const modeConfig = MODES[mode]
    if (modeConfig?.subModes?.length > 0) {
      setSelectedSubMode(modeConfig.subModes[0].key)
    }
    setLastMode(mode, modeConfig?.subModes?.[0]?.key || '')
    setRestartKey(prev => prev + 1)
  }

  // Handle sub-mode change
  const handleSubModeChange = (subMode) => {
    setSelectedSubMode(subMode)
    setLastMode(selectedMode, subMode)
    setRestartKey(prev => prev + 1)
  }

  // Handle language change
  const handleLanguageChange = (language) => {
    setSelectedLanguage(language)
    if (setLastLanguage) setLastLanguage(language)
    setShowLanguageDropdown(false)
    setRestartKey(prev => prev + 1)
  }

  // Handle restart
  const handleRestart = () => {
    generateText()
    setRestartKey(prev => prev + 1)
  }

  // Handle custom text submit
  const handleCustomTextSubmit = () => {
    if (customText.trim()) {
      setTargetText(customText.trim())
      setShowCustomInput(false)
      setRestartKey(prev => prev + 1)
    }
  }

  // Keep targetText in sync when editing custom text so users get a live preview
  useEffect(() => {
    if (selectedMode === 'custom') {
      setTargetText(customText.trim())
    }
  }, [customText, selectedMode])

  const currentModeConfig = MODES[selectedMode]

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Mode Selector */}
      <div className="mb-6 sm:mb-8">
        {/* Main Modes */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-3 sm:mb-4">
          {Object.entries(MODES).map(([key, mode]) => {
            const Icon = mode.icon
            const isActive = selectedMode === key
            
            return (
              <motion.button
                key={key}
                onClick={() => handleModeChange(key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-medium text-sm sm:text-base
                  transition-all duration-200 border
                  ${isActive 
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20' 
                    : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-500 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{mode.name}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Sub-mode Selector */}
        <AnimatePresence mode="wait">
          {currentModeConfig?.subModes?.length > 0 && (
            <motion.div
              key={selectedMode}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap justify-center gap-1.5 sm:gap-2"
            >
              {currentModeConfig.subModes.map((subMode) => {
                const isActive = selectedSubMode === subMode.key
                
                return (
                  <button
                    key={subMode.key}
                    onClick={() => handleSubModeChange(subMode.key)}
                    className={`
                      px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium
                      transition-all duration-200 border
                      ${isActive 
                        ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50' 
                        : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
                      }
                    `}
                  >
                    {subMode.name}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Language Selector Dropdown - show for sentence and timed modes */}
        {(selectedMode === 'sentence' || selectedMode === 'timed') && (
          <div className="flex justify-center mt-3 sm:mt-4" ref={languageDropdownRef}>
            <div className="relative">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-200 bg-yellow-400 text-gray-900 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20"
              >
                <Globe className="w-5 h-5" />
                <span>{LANGUAGES[selectedLanguage]?.name || 'English'}</span>
              </button>
              
              <AnimatePresence>
                {showLanguageDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 min-w-[140px]"
                  >
                    {Object.entries(LANGUAGES).map(([key, lang]) => {
                      const isActive = selectedLanguage === key
                      return (
                        <button
                          key={key}
                          onClick={() => handleLanguageChange(key)}
                          className={`
                            w-full flex items-center justify-between px-4 py-2.5 text-sm text-left
                            transition-all duration-150
                            ${isActive 
                              ? 'bg-yellow-400/20 text-yellow-400' 
                              : 'text-gray-300 hover:bg-gray-700/50'
                            }
                          `}
                        >
                          <span>{lang.name}</span>
                          {isActive && <Check className="w-4 h-4" />}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Custom Text Input */}
        {selectedMode === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 max-w-2xl mx-auto"
          >
            <div className="relative">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste or type your custom text here..."
                className="w-full h-32 p-4 bg-[#1a1f2e] border border-gray-700 rounded-xl 
                         text-white placeholder-gray-500 resize-none
                         focus:outline-none focus:border-yellow-400/50"
              />
              <button
                onClick={handleCustomTextSubmit}
                disabled={!customText.trim()}
                className="absolute bottom-3 right-3 px-4 py-1.5 bg-yellow-400 text-black 
                         rounded-lg font-medium hover:bg-yellow-300 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Typing
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Special Modes Row */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
        {Object.entries(SPECIAL_MODES).map(([key, mode]) => {
          const Icon = mode.icon
          return (
            <motion.a
              key={key}
              href={`/${key.replace('_', '-')}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl
                       bg-gradient-to-r from-gray-800 to-gray-700/50
                       border border-gray-600/50 text-gray-300 hover:text-white
                       transition-all duration-200 hover:border-gray-500"
            >
              <Icon className="w-4 h-4 text-yellow-400" />
              <span className="text-xs sm:text-sm font-medium">{mode.name}</span>
            </motion.a>
          )
        })}
      </div>

      {/* Typing Engine */}
      {selectedMode === 'custom' && !customText.trim() ? (
        // Empty placeholder when user hasn't entered custom text yet
        <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
          <div className="relative bg-[#1a1f2e] rounded-xl p-3 sm:p-6 md:p-8 cursor-text border border-gray-700/50 min-h-[120px] sm:min-h-[160px]">
            <div className="font-mono text-sm leading-relaxed tracking-wide select-none text-gray-500 opacity-60">
              {/* intentionally left blank until user provides text */}
              <div className="h-32" />
            </div>
          </div>
        </div>
      ) : (
        <TypingEngine
          key={restartKey}
          text={targetText}
          mode={selectedMode}
          subMode={selectedSubMode}
          language={selectedLanguage}
          timeLimit={timeLimit}
          onRestart={handleRestart}
          showLiveStats={true}
          showRestartButton={true}
        />
      )}
    </div>
  )
}

export default ModeSelector
