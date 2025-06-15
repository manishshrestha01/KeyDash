import React, { useEffect, useRef, useState } from "react"
import sentenceData from "../assets/sentence.json"
import { useNavigate } from "react-router-dom"

const getRandomSentence = () => {
  const arr = sentenceData.sentence
  return arr[Math.floor(Math.random() * arr.length)].text
}

const Sentence = () => {
  const [target, setTarget] = useState("")
  const [input, setInput] = useState("")
  const [startTime, setStartTime] = useState(null)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [errors, setErrors] = useState(0)
  const textareaRef = useRef(null)
  const navigate = useNavigate()

  // Track current word index for highlighting
  const [currentWordIdx, setCurrentWordIdx] = useState(0)

  useEffect(() => {
    setTarget(getRandomSentence())
  }, [])

  useEffect(() => {
    if (input.length === 1 && !startTime) setStartTime(Date.now())
    // Navigate if word count matches or exceeds and last word ends with '.'
    const inputWords = input.trim().split(/\s+/).filter(Boolean)
    const targetWords = target.trim().split(/\s+/).filter(Boolean)
    if (
      inputWords.length >= targetWords.length &&
      target.length > 0 &&
      inputWords.length > 0 &&
      inputWords[inputWords.length - 1].endsWith(".")
    ) {
      setTimeout(() => navigate("/contact"), 500)
    }
    // Calculate stats
    const correctChars = input
      .split("")
      .filter((ch, i) => ch === target[i]).length
    const totalErrors = input.length - correctChars
    setErrors(totalErrors)
    setAccuracy(input.length ? (correctChars / input.length) * 100 : 100)
    const wordsTyped = input.trim().split(/\s+/).length
    const elapsed = startTime ? (Date.now() - startTime) / 1000 / 60 : 1
    setWpm(startTime && input.length ? Math.round(wordsTyped / elapsed) : 0)

    // Update current word index
    setCurrentWordIdx(input.split(/\s+/).length - 1)
  }, [input, target, startTime, navigate])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current && textareaRef.current.focus()
  }, [target])

  const handleInput = (e) => {
    // Move to next word on spacebar (allow input to continue)
    setInput(e.target.value)
  }

  // Render logic for coloring only typed chars in each word
  const renderColoredText = () => {
    const targetWords = target.split(" ")
    const inputWords = input.split(" ")
    return targetWords.map((word, wIdx) => {
      const inputWord = inputWords[wIdx] || ""
      return (
        <span key={wIdx} className="mr-2">
          {word.split("").map((char, cIdx) => {
            if (inputWord.length > cIdx) {
              return (
                <span
                  key={cIdx}
                  className={
                    inputWord[cIdx] === char
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {char}
                </span>
              )
            } else {
              return (
                <span key={cIdx} className="">
                  {char}
                </span>
              )
            }
          })}
        </span>
      )
    })
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto mt-8">
      <div
        className="whitespace-pre-wrap text-lg font-mono select-none"
        style={{ position: "relative", zIndex: 1, minHeight: 80 }}
        onClick={() => textareaRef.current && textareaRef.current.focus()}
      >
        {renderColoredText()}
      </div>
      {/* Invisible textarea overlays the text */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        className="absolute top-0 left-0 w-full h-full opacity-0 resize-none"
        style={{ zIndex: 2, minHeight: 80 }}
        spellCheck={false}
        autoFocus
      />
      <div className="mt-6 flex gap-8 text-lg">
        <div>
          WPM:{" "}
          <span className="font-bold">{wpm}</span>
        </div>
        <div>
          Accuracy:{" "}
          <span className="font-bold">{accuracy.toFixed(1)}%</span>
        </div>
        <div>
          Errors: <span className="font-bold">{errors}</span>
        </div>
      </div>
    </div>
  )
}

export default Sentence
