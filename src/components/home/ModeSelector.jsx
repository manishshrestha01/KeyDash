import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Code, Hash, FileText, Clock, Trophy, Users, Bot,
  ChevronDown, Flame, Target, Zap
} from 'lucide-react'
import { useAppStore } from '../../store'
import TypingEngine from '../typing/TypingEngine'

// Mode data imports
import englishData from '../../assets/english/english.json'
import timedData from '../../assets/english/timed.json'
import javascriptCode from '../../assets/coding/javascript.json'
import pythonCode from '../../assets/coding/python.json'
import javaCode from '../../assets/coding/java.json'
import cCode from '../../assets/coding/c.json'
import cppCode from '../../assets/coding/cpp.json'
import symbolsData from '../../assets/symbols/symbols.json'

// Mode configurations
const MODES = {
  english: {
    name: 'English',
    icon: Globe,
    description: 'Classic typing with English quotes',
    subModes: [
      { key: 'easy', name: 'Easy', range: [0, 100] },
      { key: 'medium', name: 'Medium', range: [101, 300] },
      { key: 'hard', name: 'Hard', range: [301, 600] },
      { key: 'extreme', name: 'Extreme', range: [601, 9999] },
    ]
  },
  timed: {
    name: 'Timed',
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

// Get random sentence from quotes based on difficulty
const getRandomQuote = (difficulty = 'medium') => {
  const ranges = {
    easy: [0, 100],
    medium: [101, 300],
    hard: [301, 600],
    extreme: [601, 9999],
  }
  const [min, max] = ranges[difficulty] || ranges.medium
  const filtered = englishData.quotes.filter(q => q.length >= min && q.length <= max)
  if (filtered.length === 0) return 'No text found for this difficulty.'
  return filtered[Math.floor(Math.random() * filtered.length)].text
}

// Get random words for timed mode
const getRandomWords = (count = 100) => {
  const words = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * timedData.words.length)
    words.push(timedData.words[idx])
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
  const { lastMode, lastSubMode, setLastMode } = useAppStore()
  
  const [selectedMode, setSelectedMode] = useState(lastMode || 'english')
  const [selectedSubMode, setSelectedSubMode] = useState(lastSubMode || 'medium')
  const [targetText, setTargetText] = useState('')
  const [customText, setCustomText] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [restartKey, setRestartKey] = useState(0)

  // Get time limit for timed mode
  const timeLimit = selectedMode === 'timed' ? parseInt(selectedSubMode) : null

  // Generate text based on mode
  const generateText = useCallback(() => {
    let text = ''
    
    switch (selectedMode) {
      case 'english':
        text = getRandomQuote(selectedSubMode)
        break
      case 'timed':
        text = getRandomWords(100)
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
        text = getRandomQuote('medium')
    }
    
    setTargetText(text)
  }, [selectedMode, selectedSubMode, customText])

  // Generate text on mount and mode change
  useEffect(() => {
    if (selectedMode !== 'custom') {
      generateText()
    }
  }, [selectedMode, selectedSubMode, generateText])

  // Handle mode change
  const handleModeChange = (mode) => {
    setSelectedMode(mode)
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

  const currentModeConfig = MODES[selectedMode]

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Mode Selector */}
      <div className="mb-8">
        {/* Main Modes */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-4">
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
                  flex items-center gap-2 px-4 py-2 rounded-full font-medium
                  transition-all duration-200 border
                  ${isActive 
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20' 
                    : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-500 hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{mode.name}</span>
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
              className="flex flex-wrap justify-center gap-2"
            >
              {currentModeConfig.subModes.map((subMode) => {
                const isActive = selectedSubMode === subMode.key
                
                return (
                  <button
                    key={subMode.key}
                    onClick={() => handleSubModeChange(subMode.key)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium
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
      <div className="flex justify-center gap-3 mb-8">
        {Object.entries(SPECIAL_MODES).map(([key, mode]) => {
          const Icon = mode.icon
          return (
            <motion.a
              key={key}
              href={`/${key.replace('_', '-')}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-gradient-to-r from-gray-800 to-gray-700/50
                       border border-gray-600/50 text-gray-300 hover:text-white
                       transition-all duration-200 hover:border-gray-500"
            >
              <Icon className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">{mode.name}</span>
            </motion.a>
          )
        })}
      </div>

      {/* Typing Engine */}
      <TypingEngine
        key={restartKey}
        text={targetText}
        mode={selectedMode}
        subMode={selectedSubMode}
        timeLimit={timeLimit}
        onRestart={handleRestart}
        showLiveStats={true}
        showRestartButton={true}
      />
    </div>
  )
}

export default ModeSelector
