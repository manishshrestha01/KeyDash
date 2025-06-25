import React, { useEffect, useRef, useState } from "react"
import sentenceData from "../assets/english/english.json"
import { useNavigate } from "react-router-dom"

const getRandomSentence = () => {
  const arr = sentenceData.quotes
  return arr[Math.floor(Math.random() * arr.length)].text
}

const CHARS_PER_LINE = 50

const Timed = () => {
  const [target, setTarget] = useState("")
  const [input, setInput] = useState("")
  const [startTime, setStartTime] = useState(null)
  const [restartCount, setRestartCount] = useState(0)
  const [currentCharIdx, setCurrentCharIdx] = useState(0)
  const textareaRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const sentence = getRandomSentence()
    setTarget(sentence)
    setInput("")
    setStartTime(null)
    setCurrentCharIdx(0)
  }, [restartCount])

  useEffect(() => {
    if (input.length === 1 && !startTime) setStartTime(Date.now())
    setCurrentCharIdx(input.length)
  }, [input, startTime])

  const handleInput = (e) => {
    const val = e.target.value

    if (
      val.length > target.length ||
      (val.trimEnd().endsWith(".") &&
        val.trim().split(/\s+/).length >= target.trim().split(/\s+/).length)
    ) {
      const durationSec = (Date.now() - startTime) / 1000

      // Calculate stats for results page
      let correctChars = 0
      for (let i = 0; i < val.length; i++) {
        if (val[i] === target[i]) correctChars++
      }
      const totalTyped = val.length
      const wpm = durationSec > 0 ? ((correctChars / 5) / (durationSec / 60)).toFixed(0) : 0
      const acc = totalTyped > 0 ? ((correctChars / totalTyped) * 100).toFixed(1) : "0.0"
      const mistakes = totalTyped - correctChars

      navigate("/results", {
        state: {
          target,
          input: val,
          durationSec,
          wpm,
          acc,
          mistakes,
        }
      })
      return
    }

    setInput(val)
  }

  const handleRestart = () => setRestartCount(c => c + 1)

  const getCorrectWordCount = () => {
    const targetWords = target.trim().split(/\s+/)
    const inputWords = input.trim().split(/\s+/)

    let attempted;
    if (
      input.trim() === target.trim() // User finished all words (no trailing space)
    ) {
      attempted = targetWords.length
    } else if (input.endsWith(" ")) {
      // User finished a word with space
      attempted = Math.min(inputWords.length, targetWords.length)
    } else {
      // User is typing the last word, don't count it yet
      attempted = Math.max(0, inputWords.length - 1)
      attempted = Math.min(attempted, targetWords.length)
    }

    return `${attempted} / ${targetWords.length}`
  }

  const renderColoredText = () => {
    const words = target.split(" ")
    const lines = []
    let line = []
    let charIndex = 0

    words.forEach((word, wIdx) => {
      const wordChars = word.split("").map((c, i) => {
        let cls = "text-muted"

        if (charIndex < input.length) {
          cls = input[charIndex] === c
            ? "text-correct"
            : "text-error underline underline-offset-2"
        }

        const isCaret = charIndex === currentCharIdx

        const charSpan = (
          <span key={`${wIdx}-${i}`} className={`relative ${cls}`}>
            {c}
            {isCaret && (
              <span className="caret absolute top-0 left-0 w-[2px] h-[1.4em] bg-caret animate-blink" />
            )}
          </span>
        )

        charIndex++
        return charSpan
      })

      const isSpaceCaret = charIndex === currentCharIdx
      const spaceCorrect = input[charIndex] === " "
      const spaceClass = charIndex < input.length
        ? (spaceCorrect ? "text-correct" : "text-error underline underline-offset-2")
        : "text-muted"

      wordChars.push(
        <span key={`${wIdx}-space`} className={`relative ${spaceClass}`}>
          {" "}
          {isSpaceCaret && (
            <span className="caret absolute top-0 left-0 w-[2px] h-[1.4em] bg-caret animate-blink" />
          )}
        </span>
      )
      charIndex++

      line.push(...wordChars)

      if (line.length >= CHARS_PER_LINE) {
        lines.push(
          <div key={`line-${lines.length}`} style={{ scrollSnapAlign: "start" }}>
            {line}
          </div>
        )
        line = []
      }
    })

    if (line.length > 0) {
      lines.push(
        <div key={`line-${lines.length}`} style={{ scrollSnapAlign: "start" }}>
          {line}
        </div>
      )
    }

    return lines
  }

  return (
    <div className="flex flex-col items-center pt-8 mt-10">
      <div className="text-yellow-300 text-4xl font-medium mb-4">
        {getCorrectWordCount()}
      </div>

      <div
        ref={containerRef}
        className="relative w-full max-w-7xl h-[10.5rem] overflow-hidden cursor-text"
        style={{
          fontFamily: `"Fira Code","JetBrains Mono",monospace`,
          fontSize: "2.3rem",
          lineHeight: "3.5rem",
        }}
        onClick={() => textareaRef.current?.focus()}
      >
        <div
          className="absolute inset-0 px-2 py-1 flex flex-col transition-transform duration-200"
          style={{
            transform: `translateY(-${Math.max(0, Math.floor(currentCharIdx / CHARS_PER_LINE) - 2) * 3.5}rem)`
          }}
        >
          {renderColoredText()}
        </div>

        <textarea
          ref={textareaRef}
          className="absolute inset-0 opacity-0 resize-none text-2xl"
          value={input}
          onChange={handleInput}
          onPaste={e => e.preventDefault()}
          spellCheck="false"
          autoFocus
        />
      </div>

      <button
        onClick={handleRestart}
        className="mt-6 p-3 rounded-full bg-transparent text-[#636569] hover:text-white transition-colors"
        aria-label="Restart"
      >
        <svg
          viewBox="-13.44 -13.44 50.88 50.88"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 rotate-90"
        >
          <g clipPath="url(#clip0)">
            <path
              d="M12 2.99982C16.9706 2.99982 21 7.02925 21 11.9998C21 16.9704 16.9706 20.9998 12 20.9998C7.02944 20.9998 3 16.9704 3 11.9998C3 9.17255 4.30367 6.64977 6.34267 4.99982"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 4.49982H7V8.49982"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </button>
    </div>
  )
}

export default Timed