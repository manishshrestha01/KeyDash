import React from "react"
import { useLocation, useNavigate } from "react-router-dom"

const Results = () => {
  const { state } = useLocation()
  const navigate = useNavigate()
  if (!state) return <div>No data. <button onClick={() => navigate("/")}>Go Home</button></div>
  
  const { target, input, durationSec } = state
  const correctChars = input.split("").filter((c,i) => c === target[i]).length
  const errors = input.length - correctChars
  const accuracy = ((correctChars / input.length) * 100) || 0
  const wpm = Math.round((input.trim().split(/\s+/).length / durationSec) * 60)

  return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl mb-4">Results</h2>
      <div className="space-y-3">
        <div>WPM: <strong>{wpm}</strong></div>
        <div>Accuracy: <strong>{accuracy.toFixed(1)}%</strong></div>
        <div>Errors: <strong>{errors}</strong></div>
      </div>
      <button onClick={() => navigate("/")} className="mt-6 px-5 py-2 bg-primary text-white rounded hover:bg-primary-hover">
        Try Again
      </button>
    </div>
  )
}

export default Results
