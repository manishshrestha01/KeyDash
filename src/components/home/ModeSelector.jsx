import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Code, Hash, FileText, Clock, Trophy, Users, Bot,
  ChevronDown, Flame, Target, Zap, Check
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
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
    description: 'Master special characters and grammar punctuation',
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
    name: 'Battle with AI',
    icon: Bot,
    description: 'Challenge AI opponents',
  },
}

const normalizeModeConfig = (rawConfig) => {
  if (!rawConfig || typeof rawConfig !== 'object') return null

  const modeValue = typeof rawConfig.mode === 'string' ? rawConfig.mode.toLowerCase() : ''
  const mode = Object.prototype.hasOwnProperty.call(MODES, modeValue) ? modeValue : null
  if (!mode) return null

  const language = rawConfig.language === 'nepali' ? 'nepali' : 'english'
  const subModeValue = rawConfig.subMode

  if (mode === 'timed') {
    const parsedTimedSubMode =
      typeof subModeValue === 'number' ? subModeValue : Number.parseInt(subModeValue, 10)
    const subMode = [15, 30, 60, 120].includes(parsedTimedSubMode) ? parsedTimedSubMode : 60
    return { mode, subMode, language }
  }

  if (mode === 'sentence') {
    const sentenceSubMode =
      typeof subModeValue === 'string' ? subModeValue.toLowerCase() : ''
    const subMode = ['easy', 'medium', 'hard', 'extreme'].includes(sentenceSubMode)
      ? sentenceSubMode
      : 'medium'
    return { mode, subMode, language }
  }

  if (mode === 'coding') {
    const codingSubModeValue = typeof subModeValue === 'string' ? subModeValue.toLowerCase() : ''
    const normalizedCodingSubMode = codingSubModeValue === 'c++' ? 'cpp' : codingSubModeValue
    const subMode = ['javascript', 'python', 'java', 'c', 'cpp'].includes(normalizedCodingSubMode)
      ? normalizedCodingSubMode
      : 'javascript'
    return { mode, subMode, language }
  }

  if (mode === 'symbols') {
    const symbolsSubMode = typeof subModeValue === 'string' ? subModeValue.toLowerCase() : ''
    const subMode = ['easy', 'medium', 'hard'].includes(symbolsSubMode)
      ? symbolsSubMode
      : 'medium'
    return { mode, subMode, language }
  }

  return { mode: 'custom', subMode: '', language }
}

const normalizeRetryConfig = (rawRetryConfig) => {
  const modeConfig = normalizeModeConfig(rawRetryConfig)
  if (!modeConfig) return null

  const targetText = typeof rawRetryConfig.targetText === 'string' ? rawRetryConfig.targetText : ''
  if (targetText.length === 0) return null

  return { ...modeConfig, targetText }
}

// Get random sentence from quotes based on difficulty and language
const getRandomQuote = (difficulty = 'medium', language = 'english') => {
  const normalizedDifficulty = ['easy', 'medium', 'hard', 'extreme'].includes(difficulty)
    ? difficulty
    : 'medium'

  const ranges = {
    easy: [0, 100],
    medium: [101, 300],
    hard: [301, 600],
    extreme: [601, 9999],
  }
  const [min, max] = ranges[normalizedDifficulty] || ranges.medium
  
  // Select data based on language
  const data = language === 'nepali' ? nepaliData : englishData
  const quotes = data.quotes || data.sentences || []

  const getText = (item) => (typeof item === 'string' ? item : item?.text || '')

  // Prefer explicit difficulty tags when available (used by Nepali sentence packs).
  const taggedMatches = quotes.filter((item) => {
    if (!item || typeof item !== 'object') return false
    return (item.difficulty || '').toLowerCase() === normalizedDifficulty
  })

  if (taggedMatches.length > 0) {
    const item = taggedMatches[Math.floor(Math.random() * taggedMatches.length)]
    return getText(item)
  }

  // Backward-compatible behavior for datasets without difficulty tags.
  const lengthFiltered = quotes.filter((item) => {
    const text = getText(item)
    const len = typeof text === 'string' ? text.length : 0
    return len >= min && len <= max
  })

  if (lengthFiltered.length === 0) return 'No text found for this difficulty.'
  const item = lengthFiltered[Math.floor(Math.random() * lengthFiltered.length)]
  return getText(item)
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
  const normalizedDifficulty = ['easy', 'medium', 'hard'].includes(difficulty)
    ? difficulty
    : 'medium'

  const groupedPool = Array.isArray(symbolsData?.[normalizedDifficulty])
    ? symbolsData[normalizedDifficulty]
    : []

  if (groupedPool.length > 0) {
    const item = groupedPool[Math.floor(Math.random() * groupedPool.length)]
    return item?.text || item || ''
  }

  // Backward compatibility for the previous symbols.json shape.
  const symbolPool = symbolsData.grammar_practice_texts?.length
    ? symbolsData.grammar_practice_texts
    : symbolsData.practice_texts
  const filtered = symbolPool.filter(t => t.difficulty === normalizedDifficulty)
  if (filtered.length === 0) return symbolPool[0]?.text || ''
  return filtered[Math.floor(Math.random() * filtered.length)].text
}

const ModeSelector = () => {
  const location = useLocation()
  const { lastMode, lastSubMode, lastLanguage, setLastMode, setLastLanguage } = useAppStore()

  const initialRetryConfig = useMemo(
    () => normalizeRetryConfig(location.state?.retryConfig),
    [location.state?.retryConfig]
  )

  const initialNextTestConfig = useMemo(
    () => normalizeModeConfig(location.state?.nextTestConfig),
    [location.state?.nextTestConfig]
  )
  
  const [selectedMode, setSelectedMode] = useState(
    () => initialRetryConfig?.mode || initialNextTestConfig?.mode || lastMode || 'sentence'
  )
  const [selectedSubMode, setSelectedSubMode] = useState(() => {
    if (initialRetryConfig) return initialRetryConfig.subMode
    if (initialNextTestConfig) return initialNextTestConfig.subMode
    return lastSubMode || 'medium'
  })
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => initialRetryConfig?.language || initialNextTestConfig?.language || lastLanguage || 'english'
  )
  const [targetText, setTargetText] = useState(() => initialRetryConfig?.targetText || '')
  const [customText, setCustomText] = useState(
    () => (initialRetryConfig?.mode === 'custom' ? initialRetryConfig.targetText : '')
  )
  const [customTypingActive, setCustomTypingActive] = useState(
    () => initialRetryConfig?.mode === 'custom'
  )
  const [isRetrySeeded, setIsRetrySeeded] = useState(() => Boolean(initialRetryConfig))
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
        text = customTypingActive ? customText.trim() : ''
        break
      default:
        text = getRandomQuote('medium', selectedLanguage)
    }
    
    setTargetText(text)
  }, [selectedMode, selectedSubMode, selectedLanguage, customText, customTypingActive])

  // Generate text on mount and mode/language change
  useEffect(() => {
    if (isRetrySeeded) return
    if (selectedMode !== 'custom') {
      generateText()
    }
  }, [selectedMode, selectedSubMode, selectedLanguage, generateText, isRetrySeeded])

  // Handle mode change
  const handleModeChange = (mode) => {
    setIsRetrySeeded(false)
    setSelectedMode(mode)
    // If switching to custom mode and user hasn't provided any custom text,
    // ensure the typing area is empty instead of showing the previous mode text.
    if (mode === 'custom') {
      setCustomTypingActive(false)
      setTargetText('')
    } else {
      setCustomTypingActive(false)
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
    setIsRetrySeeded(false)
    setSelectedSubMode(subMode)
    setLastMode(selectedMode, subMode)
    setRestartKey(prev => prev + 1)
  }

  // Handle language change
  const handleLanguageChange = (language) => {
    setIsRetrySeeded(false)
    setSelectedLanguage(language)
    if (setLastLanguage) setLastLanguage(language)
    setShowLanguageDropdown(false)
    setRestartKey(prev => prev + 1)
  }

  // Handle restart
  const handleRestart = () => {
    if (selectedMode === 'custom' && !customTypingActive) {
      return
    }
    setIsRetrySeeded(false)
    generateText()
    setRestartKey(prev => prev + 1)
  }

  // Handle custom text submit
  const handleCustomTextSubmit = () => {
    if (customText.trim()) {
      setIsRetrySeeded(false)
      setTargetText(customText.trim())
      setCustomTypingActive(true)
      setRestartKey(prev => prev + 1)
    }
  }

  const currentModeConfig = MODES[selectedMode]

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 2xl:px-6 py-4 sm:py-6 2xl:py-8">
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
                  flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 2xl:px-5 py-1.5 sm:py-2 2xl:py-2.5 rounded-full font-medium text-sm sm:text-base 2xl:text-lg
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
                      px-2.5 sm:px-3 2xl:px-4 py-1 sm:py-1.5 2xl:py-2 rounded-full text-xs sm:text-sm 2xl:text-base font-medium
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
                className="flex items-center gap-2 px-4 sm:px-5 2xl:px-6 py-2 sm:py-2.5 2xl:py-3 rounded-full text-sm 2xl:text-base font-semibold transition-all duration-200 bg-yellow-400 text-gray-900 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20"
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
            className="mt-4 max-w-2xl 2xl:max-w-4xl mx-auto"
          >
            <div className="relative">
              <textarea
                value={customText}
                onChange={(e) => {
                  setIsRetrySeeded(false)
                  setCustomText(e.target.value)
                  // Editing custom text should not auto-run the typing engine.
                  setCustomTypingActive(false)
                }}
                placeholder="Paste or type your custom text here..."
                className="w-full h-32 2xl:h-44 p-4 2xl:p-5 bg-[#1a1f2e] border border-gray-700 rounded-xl 
                         text-white placeholder-gray-500 resize-none
                         focus:outline-none focus:border-yellow-400/50"
              />
              <button
                onClick={handleCustomTextSubmit}
                disabled={!customText.trim()}
              className="absolute bottom-3 right-3 px-4 2xl:px-5 py-1.5 2xl:py-2 bg-yellow-400 text-black 
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
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 2xl:px-5 py-1.5 sm:py-2 2xl:py-2.5 rounded-xl
                       bg-gradient-to-r from-gray-800 to-gray-700/50
                       border border-gray-600/50 text-gray-300 hover:text-white
                       transition-all duration-200 hover:border-gray-500"
            >
              <Icon className="w-4 h-4 text-yellow-400" />
              <span className="text-xs sm:text-sm 2xl:text-base font-medium">{mode.name}</span>
            </motion.a>
          )
        })}
      </div>

      {/* Typing Engine */}
      {selectedMode === 'custom' && !customTypingActive ? (
        // Empty placeholder when user hasn't entered custom text yet
        <div className="w-full max-w-4xl 2xl:max-w-6xl mx-auto px-2 sm:px-4 2xl:px-6">
          <div className="relative bg-[#1a1f2e] rounded-xl p-3 sm:p-6 md:p-8 2xl:p-10 cursor-text border border-gray-700/50 min-h-[120px] sm:min-h-[160px] 2xl:min-h-[220px]">
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
