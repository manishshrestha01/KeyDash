import React, { useEffect, useRef, useState } from "react"
import sentenceData from "../assets/english/english.json"
import { useNavigate } from "react-router-dom"

const getRandomSentence = () => {
  const arr = sentenceData.quotes
  return arr[Math.floor(Math.random() * arr.length)].text
}

const Timed = ({ time }) => {
  const [target, setTarget] = useState("")
  const [input, setInput] = useState("")
  const [startTime, setStartTime] = useState(null)
  const [remainingTime, setRemainingTime] = useState(time)
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
    setRemainingTime(time)
    setCurrentCharIdx(0)
  }, [restartCount, time])

  useEffect(() => {
    if (!startTime || remainingTime <= 0) return

    const interval = setInterval(() => {
      const secondsPassed = Math.floor((Date.now() - startTime) / 1000)
      const newRemaining = Math.max(time - secondsPassed, 0)
      setRemainingTime(newRemaining)

      if (newRemaining <= 0) {
        clearInterval(interval)
        // Go to results page
        const durationSec = time
        navigate("/results", { state: { target, input, durationSec } })
      }
    }, 200)

    return () => clearInterval(interval)
  }, [startTime, remainingTime, time, navigate, input, target])

  useEffect(() => {
    if (input.length === 1 && !startTime) setStartTime(Date.now())
    setCurrentCharIdx(input.length)

    const caretSpan = containerRef.current?.querySelector(".caret")
    caretSpan?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" })
  }, [input, startTime])

  const handleInput = (e) => {
    const val = e.target.value
    setInput(val)
  }

  const handleRestart = () => setRestartCount(c => c + 1)

  const renderColoredText = () =>
    target.split("").map((c, i) => {
      let cls = "text-muted"
      if (i < input.length) {
        cls = input[i] === c ? "text-correct" : "text-error underline underline-offset-2"
      }
      const isCaret = i === currentCharIdx
      return (
        <span key={i} className={`relative ${cls}`}>
          {c}
          {isCaret && <span className="caret absolute top-0 left-0 w-[2px] h-[1.4em] bg-caret animate-blink" />}
        </span>
      )
    })

  return (
    <div className="flex flex-col items-center pt-8 mt-10">
      {/* Timer Counter */}
      <div className="text-yellow-300 text-4xl font-medium mb-4 -ml-300">
        <span>{remainingTime}s</span>
      </div>

      {/* Typing Box */}
      <div
        ref={containerRef}
        className="relative w-full max-w-7xl h-[10.5rem] overflow-hidden cursor-text text-left"
        style={{
          fontFamily: `"Fira Code","JetBrains Mono",monospace`,
          fontSize: "2rem",
          lineHeight: "3.5rem",
        }}
        onClick={() => textareaRef.current?.focus()}
      >
        <div className="absolute inset-0 overflow-y-auto px-2 py-1">
          <div className="whitespace-pre-wrap break-words">
            {renderColoredText()}
            {currentCharIdx >= target.length && <span className="caret inline-block w-[2px] h-[1.4em] bg-caret animate-blink ml-1" />}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="absolute inset-0 opacity-0 resize-none text-2xl"
          value={input}
          onChange={handleInput}
          spellCheck="false"
          autoFocus
        />
      </div>

      {/* Restart Button */}
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
