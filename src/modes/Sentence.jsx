import React, { useEffect, useRef, useState } from "react"
import sentenceData from "../assets/english/english.json"
import { useNavigate } from "react-router-dom"

const getRandomSentence = () => {
  const arr = sentenceData.quotes
  return arr[Math.floor(Math.random() * arr.length)].text
}

const Sentence = () => {
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

    // Scroll caret into view
    const caretSpan = containerRef.current?.querySelector(".caret")
    caretSpan?.scrollIntoView({ inline: "nearest" })
  }, [input, startTime])

  const handleInput = (e) => {
    const val = e.target.value
    // If finished, navigate to results
    if (val.length > target.length ||
        (val.trimEnd().endsWith(".") && val.trim().split(/\s+/).length >= target.trim().split(/\s+/).length)) {
      const durationSec = (Date.now() - startTime) / 1000
      navigate("/results", { state: { target, input: val, durationSec } })
      return
    }
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
          {isCaret && <span className="caret absolute top-0 left-0 w-[2px] h-6 bg-caret animate-blink" />}
        </span>
      )
    })

  return (
    <div className="flex flex-col items-center p-6">
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl p-4 border border-border bg-surface rounded shadow overflow-auto whitespace-pre-wrap break-words cursor-text"
        style={{ minHeight: "140px", fontFamily: `"Fira Code","JetBrains Mono",monospace`, fontSize: "1.4rem", lineHeight: 1.6 }}
        onClick={() => textareaRef.current?.focus()}
      >
        {renderColoredText()}
        {/* caret if at end */}
        {currentCharIdx >= target.length && <span className="caret inline-block w-[2px] h-6 bg-caret animate-blink ml-1" />}
        <textarea
          ref={textareaRef}
          className="absolute inset-0 opacity-0 resize-none"
          value={input}
          onChange={handleInput}
          spellCheck="false"
          autoFocus
        />
      </div>

      <button onClick={handleRestart} className="mt-4 px-5 py-2 bg-primary text-white rounded hover:bg-primary-hover">Restart</button>
    </div>
  )
}

export default Sentence
