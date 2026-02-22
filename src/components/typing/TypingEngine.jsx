import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useAppStore } from '../../store'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Core Typing Engine Component
 * Handles all typing logic with support for different modes
 * 
 * Props:
 * - text: The target text to type
 * - mode: 'sentence' | 'timed' | 'coding' | 'symbols' | 'custom' | 'daily' | 'multiplayer' | 'ai_battle'
 * - subMode: specific difficulty or time duration
 * - language: 'english' | 'nepali'
 * - timeLimit: optional time limit in seconds (for timed mode)
 * - onProgress: callback for progress updates (for multiplayer/AI)
 * - onComplete: callback when typing is complete
 * - showLiveStats: show WPM and accuracy during typing
 * - disabled: disable input
 */
const TypingEngine = ({
  text = '',
  mode = 'sentence',
  subMode = '',
  language = 'english',
  timeLimit = null,
  onProgress = null,
  onComplete = null,
  showLiveStats = true,
  disabled = false,
  showRestartButton = true,
  onRestart = null,
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { smoothCaret, caretStyle, fontSize, showLiveWpm, showLiveAccuracy } = useAppStore()

  // Core state
  const [input, setInput] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(timeLimit)

  // Stats
  const [wpm, setWpm] = useState(0)
  const [rawWpm, setRawWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [errors, setErrors] = useState(0)

  // Tracking
  const [lockedIndex, setLockedIndex] = useState(0)
  const [caretState, setCaretState] = useState('idle')
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const wrongIndicesRef = useRef(new Set())
  const correctionsRef = useRef(0)
  const charTimingsRef = useRef([])

  // Refs
  const textareaRef = useRef(null)
  const containerRef = useRef(null)
  const textDisplayRef = useRef(null)
  const measureRef = useRef(null)
  const inputRef = useRef(input)
  const startTimeRef = useRef(startTime)
  const intervalRef = useRef(null)
  const caretIdleTimerRef = useRef(null)
  const caretPopTimerRef = useRef(null)
  const isFinishingRef = useRef(false) // To handle race conditions on finish

  // Measured chars per line (based on actual font metrics)
  const [measuredCharsPerLine, setMeasuredCharsPerLine] = useState(null)

  const CARET_ACTIVE_TIMEOUT = 600
  const CARET_POP_DURATION = 160

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Font size classes
  const fontSizeClasses = {
    small: 'text-base sm:text-lg md:text-xl',
    medium: 'text-lg sm:text-xl md:text-2xl',
    large: 'text-xl sm:text-2xl md:text-3xl',
  }

  // Responsive chars per line - optimized for comfortable mobile reading
  const getCharsPerLine = useCallback(() => {
    // Prefer measured value when available, fall back to window-based heuristic
    if (measuredCharsPerLine) return measuredCharsPerLine
    const width = windowWidth
    if (width >= 1280) return 52
    if (width >= 1024) return 45
    if (width >= 768) return 38
    if (width >= 640) return 32
    if (width >= 425) return 28
    if (width >= 375) return 24
    if (width >= 320) return 20
    return 18
  }, [windowWidth, measuredCharsPerLine])

  // Split text into lines - preserve exact character positions, never break words
  const lines = useMemo(() => {
    if (!text) return [];
    const charsPerLine = getCharsPerLine();
    const result = [];
    let currentLine = '';
    // Split text into words (preserve spaces after each word)
    const wordRegex = /(\S+\s*)/g;
    const words = text.match(wordRegex) || [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // If word contains a hard newline, split it
      if (word.includes('\n')) {
        const parts = word.split(/(\n)/);
        for (let part of parts) {
          if (part === '\n') {
            if (currentLine.trim()) result.push(currentLine);
            currentLine = '';
          } else if (part.length > 0) {
            if (currentLine.length + part.length <= charsPerLine) {
              currentLine += part;
            } else {
              if (currentLine.trim()) result.push(currentLine);
              currentLine = part;
            }
          }
        }
        continue;
      }
      // Greedy: add word if fits, else push current line and start new
      if (currentLine.length + word.length <= charsPerLine) {
        currentLine += word;
      } else {
        if (currentLine.trim()) result.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine.trim()) result.push(currentLine);
    return result.filter(line => line.trim().length > 0);
  }, [text, getCharsPerLine]);

  // Determine visible lines (show 3 lines at a time)
  const visibleLineIndices = useMemo(() => {
    let charCount = 0
    let currentLineIdx = 0
    for (let i = 0; i < lines.length; i++) {
      if (currentIndex < charCount + lines[i].length) {
        currentLineIdx = i
        break
      }
      charCount += lines[i].length
    }
    const startLine = Math.max(0, currentLineIdx - 1)
    return { startLine, currentLineIdx }
  }, [lines, currentIndex])

  // Update refs
  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    startTimeRef.current = startTime
  }, [startTime])

  // Reset on text change
  useEffect(() => {
    setInput('')
    setStartTime(null)
    setCurrentIndex(0)
    setIsFinished(false)
    setTimeLeft(timeLimit)

    setWpm(0)
    setRawWpm(0)
    setAccuracy(100)
    setErrors(0)

    setLockedIndex(0)
    isFinishingRef.current = false
    wrongIndicesRef.current.clear()
    correctionsRef.current = 0
    charTimingsRef.current = []

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (caretIdleTimerRef.current) {
      clearTimeout(caretIdleTimerRef.current)
      caretIdleTimerRef.current = null
    }
    if (caretPopTimerRef.current) {
      clearTimeout(caretPopTimerRef.current)
      caretPopTimerRef.current = null
    }
  }, [text])

  // Timer logic for timed mode
  useEffect(() => {
    if (!timeLimit || !startTime || isFinished) return

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          handleFinish(inputRef.current, startTimeRef.current, true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [startTime, timeLimit, isFinished])

  // Update stats on input change
  useEffect(() => {
    if (!text || isFinished) return
    // Skip if input hasn't actually changed from current index
    if (input.length === currentIndex && input.length > 0) return

    setCurrentIndex(input.length)

    // Detect mistakes
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== text[i] && !wrongIndicesRef.current.has(i)) {
        wrongIndicesRef.current.add(i)
      }
    }

    const totalTyped = input.length
    const mistakesCount = wrongIndicesRef.current.size
    const adjustedCorrect = Math.max(0, totalTyped - mistakesCount)

    setErrors(mistakesCount)

    const durationSec = startTime ? (Date.now() - startTime) / 1000 : 0
    const wpmVal = durationSec > 0 ? (adjustedCorrect / 5) / (durationSec / 60) : 0
    const rawWpmVal = durationSec > 0 ? (totalTyped / 5) / (durationSec / 60) : 0
    const accVal = totalTyped > 0 ? (adjustedCorrect / totalTyped) * 100 : 100

    setWpm(Math.round(wpmVal))
    setRawWpm(Math.round(rawWpmVal))
    setAccuracy(parseFloat(accVal.toFixed(1)))

    // Report progress for multiplayer/AI
    if (onProgress && totalTyped > 0 && text.length > 0) {
      const progress = Math.floor((totalTyped / text.length) * 100)
      onProgress(progress, Math.round(wpmVal))
    }

    // Check for completion
    if (input.length >= text.length && !isFinished) {
      handleFinish(input, startTime)
    }
  }, [input, startTime, text, isFinished])

  // Handle typing finish
  const handleFinish = async (finalInput = input, finishStartTime = startTime, forcedTimeUp = false) => {
    if (!finishStartTime || isFinishingRef.current) return

    // Immediately mark as finishing to prevent duplicate calls
    isFinishingRef.current = true
    setIsFinished(true)

    const durationSec = forcedTimeUp && timeLimit 
      ? timeLimit 
      : (Date.now() - finishStartTime) / 1000

    const totalTyped = finalInput.length
    const mistakesVal = wrongIndicesRef.current.size
    const adjustedCorrect = Math.max(0, totalTyped - mistakesVal)
    const wpmVal = durationSec > 0 ? (adjustedCorrect / 5) / (durationSec / 60) : 0
    const rawWpmVal = durationSec > 0 ? (totalTyped / 5) / (durationSec / 60) : 0
    const accVal = totalTyped > 0 ? (adjustedCorrect / totalTyped) * 100 : 0

    const resultData = {
      target: text,
      input: finalInput,
      durationSec,
      wpm: Math.round(wpmVal),
      rawWpm: Math.round(rawWpm || rawWpmVal),
      acc: parseFloat(accVal.toFixed(1)),
      mistakes: mistakesVal,
      mistakenIndices: Array.from(wrongIndicesRef.current),
      corrections: correctionsRef.current,
      charTimings: charTimingsRef.current.map((entry) => ({
        index: entry.index,
        char: entry.char,
        type: entry.type || 'insert',
        time: entry.time,
        correct: entry.correct,
      })),
      mode,
      subMode,
      language,
    }

    // Save to typing history
    if (user?.id) {
      try {
        await supabase.from('typing_history').insert({
          user_id: user.id,
          mode,
          sub_mode: subMode,
          language,
          original_text: text,
          typed_text: finalInput,
          wpm: Math.round(wpmVal),
          raw_wpm: Math.round(rawWpm || rawWpmVal),
          accuracy: parseFloat(accVal.toFixed(1)),
          errors: mistakesVal,
          correct_chars: adjustedCorrect,
          total_chars: totalTyped,
          duration_seconds: durationSec,
          mistake_indices: Array.from(wrongIndicesRef.current),
          corrections: correctionsRef.current,
          is_completed: true,
        })
      } catch (error) {
        console.error('Failed to save typing history:', error)
      }
    }

    if (onComplete) {
      onComplete(resultData)
    } else {
      navigate('/results', { state: resultData })
    }
  }

  // Handle input change
  const handleInput = (e) => {
    if (disabled || isFinished) return

    const previousInput = input
    const val = e.target.value

    // Start timer on first character
    if (val.length === 1 && !startTime) {
      setStartTime(Date.now())
    }

    // Track corrections (backspace usage)
    if (val.length < previousInput.length) {
      correctionsRef.current += (previousInput.length - val.length)
    }

    // Record per-character timings for inserted/replaced characters.
    if (val !== previousInput) {
      let firstDiff = 0
      const sharedLength = Math.min(previousInput.length, val.length)
      while (firstDiff < sharedLength && previousInput[firstDiff] === val[firstDiff]) {
        firstDiff += 1
      }

      const now = Date.now()
      // Capture characters the user newly produced in this event.
      if (val.length > previousInput.length) {
        const insertedCount = val.length - previousInput.length
        const endIdx = Math.min(val.length, firstDiff + insertedCount)
        for (let i = firstDiff; i < endIdx; i++) {
          charTimingsRef.current.push({
            type: 'insert',
            index: i,
            char: val[i],
            time: now + (i - firstDiff),
            correct: val[i] === text[i],
          })
        }
      } else if (val.length < previousInput.length) {
        // Track deleted characters so results can show what the user erased.
        let prevEnd = previousInput.length - 1
        let valEnd = val.length - 1
        while (
          prevEnd >= firstDiff &&
          valEnd >= firstDiff &&
          previousInput[prevEnd] === val[valEnd]
        ) {
          prevEnd -= 1
          valEnd -= 1
        }

        const removed = previousInput.slice(firstDiff, prevEnd + 1)
        for (let i = 0; i < removed.length; i++) {
          charTimingsRef.current.push({
            type: 'delete',
            index: firstDiff + i,
            char: removed[i],
            time: now + i,
            correct: null,
          })
        }
      } else if (val.length === previousInput.length) {
        for (let i = firstDiff; i < val.length; i++) {
          if (val[i] === previousInput[i]) continue
          charTimingsRef.current.push({
            type: 'insert',
            index: i,
            char: val[i],
            time: now + (i - firstDiff),
            correct: val[i] === text[i],
          })
        }
      }
    }

    // Update caret state
    setCaretState('moving')
    if (caretIdleTimerRef.current) clearTimeout(caretIdleTimerRef.current)
    if (caretPopTimerRef.current) clearTimeout(caretPopTimerRef.current)

    caretIdleTimerRef.current = setTimeout(() => {
      setCaretState('popping')
      caretPopTimerRef.current = setTimeout(() => {
        setCaretState('idle')
      }, CARET_POP_DURATION)
    }, CARET_ACTIVE_TIMEOUT)

    setInput(val)
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Tab to restart
    if (e.key === 'Tab' && showRestartButton) {
      e.preventDefault()
      handleRestart()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      textareaRef.current?.blur()
    }
  }

  // Restart typing
  const handleRestart = () => {
    setInput('')
    setStartTime(null)
    setCurrentIndex(0)
    setIsFinished(false)
    setTimeLeft(timeLimit)
    setWpm(0)
    setRawWpm(0)
    setAccuracy(100)
    setErrors(0)
    setLockedIndex(0)
    setCaretState('idle')
    isFinishingRef.current = false
    wrongIndicesRef.current.clear()
    correctionsRef.current = 0
    charTimingsRef.current = []

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    textareaRef.current?.focus()

    if (onRestart) {
      onRestart()
    }
  }

  // Focus container
  const handleContainerClick = () => {
    if (!disabled && !isFinished) {
      textareaRef.current?.focus()
    }
  }

  // Get caret class
  const getCaretClass = () => {
    if (caretState === 'moving') return 'caret-static'
    if (caretState === 'popping') return 'caret-pop'
    return 'animate-blink'
  }

  // Render character with styling
  const renderChar = (char, idx) => {
    const isTyped = idx < input.length
    const isCorrect = isTyped && input[idx] === char
    const isError = isTyped && input[idx] !== char
    const isCurrent = idx === currentIndex

    let charClass = 'text-gray-500' // untyped
    if (isCorrect) charClass = 'text-white'
    if (isError) charClass = 'text-red-500 bg-red-500/20'

    // Handle special characters display
    let displayChar = char
    // Use normal spaces so the browser can wrap at word boundaries.
    // Replacing with non-breaking spaces prevented proper wrapping and
    // could cause words to be split across lines unexpectedly.
    if (char === '\t') displayChar = '  '
    if (char === '\n') displayChar = '↵'

    return (
      <span key={idx} className={`relative ${charClass} transition-colors duration-75`}>
        {isCurrent && !isFinished && (
          <span
            className={`absolute left-0 top-0 h-full w-0.5 bg-yellow-400 ${getCaretClass()} ${
              smoothCaret ? 'transition-all duration-75' : ''
            }`}
            style={{
              transform: caretStyle === 'block' ? 'scaleX(8)' : 
                        caretStyle === 'underline' ? 'translateY(100%) scaleY(0.15)' : 'none'
            }}
          />
        )}
        {displayChar}
      </span>
    )
  }

 
  useLayoutEffect(() => {
    const measure = () => {
      if (!textDisplayRef.current || !measureRef.current) return
      // Use a representative character to estimate width
      measureRef.current.textContent = 'M'
      const charWidth = measureRef.current.getBoundingClientRect().width || 8
      const containerWidth = textDisplayRef.current.getBoundingClientRect().width || windowWidth
      const approx = Math.max(10, Math.floor(containerWidth / charWidth) - 1)
      setMeasuredCharsPerLine(approx)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [windowWidth, fontSize])

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (caretIdleTimerRef.current) clearTimeout(caretIdleTimerRef.current)
      if (caretPopTimerRef.current) clearTimeout(caretPopTimerRef.current)
    }
  }, [])

  if (!text) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      {/* Live Stats Bar - Mobile optimized */}
      {showLiveStats && (showLiveWpm || showLiveAccuracy || timeLimit) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center flex-wrap gap-3 sm:gap-6 md:gap-10 mb-4 sm:mb-6 text-sm sm:text-lg md:text-xl"
        >
          {timeLimit && (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-gray-400 text-xs sm:text-base">Time:</span>
              <span className={`font-mono font-bold ${timeLeft && timeLeft <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                {timeLeft}s
              </span>
            </div>
          )}
          {showLiveWpm && startTime && (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-gray-400 text-xs sm:text-base">WPM:</span>
              <span className="font-mono font-bold text-yellow-400">{wpm}</span>
            </div>
          )}
          {showLiveAccuracy && startTime && (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-gray-400 text-xs sm:text-base">Acc:</span>
              <span className={`font-mono font-bold ${accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                {accuracy}%
              </span>
            </div>
          )}
          {startTime && errors > 0 && (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-gray-400 text-xs sm:text-base">Err:</span>
              <span className="font-mono font-bold text-red-400">
                {errors}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Typing Area */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`
          relative bg-[#1a1f2e] rounded-xl p-3 sm:p-6 md:p-8 cursor-text
          border border-gray-700/50 hover:border-gray-600/50 transition-colors
          min-h-[120px] sm:min-h-[160px]
          ${isFinished ? 'opacity-70' : ''}
        `}
      >
        {/* Hidden Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isFinished}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="absolute opacity-0 w-0 h-0"
          aria-label="Typing input"
        />

        {/* Text Display */}
        <div ref={textDisplayRef} className={`${fontSizeClasses[fontSize]} font-mono leading-relaxed tracking-wide select-none overflow-hidden`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={visibleLineIndices.startLine}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {lines.slice(visibleLineIndices.startLine, visibleLineIndices.startLine + 3).map((line, lineIdx) => {
                const actualLineIdx = visibleLineIndices.startLine + lineIdx
                let charOffset = 0
                for (let i = 0; i < actualLineIdx; i++) {
                  charOffset += lines[i].length
                }

                return (
                  <div 
                    key={actualLineIdx} 
                    className={`
                      whitespace-pre-wrap break-normal
                      ${actualLineIdx === visibleLineIndices.currentLineIdx ? 'opacity-100' : 'opacity-50'}
                      transition-opacity duration-200
                    `}
                    style={{
                      wordBreak: 'normal',
                      overflowWrap: 'normal',
                      hyphens: 'none'
                    }}
                  >
                    {line.split('').map((char, charIdx) => 
                      renderChar(char, charOffset + charIdx)
                    )}
                  </div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Invisible measurement element for accurate chars-per-line calculation */}
        <span ref={measureRef} className={`${fontSizeClasses[fontSize]} font-mono`} style={{ position: 'absolute', left: -9999, top: -9999, visibility: 'hidden' }}>M</span>

        {/* Focus indicator */}
        {document.activeElement !== textareaRef.current && !isFinished && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
            <span className="text-gray-300 text-lg">Click to focus or press any key</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (input.length / text.length) * 100)}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Restart Button & Hints */}
      {showRestartButton && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-yellow-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Restart</span>
          </button>
          <span className="text-gray-600 text-sm">or press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">Tab</kbd></span>
        </div>
      )}
    </div>
  )
}

export default TypingEngine
