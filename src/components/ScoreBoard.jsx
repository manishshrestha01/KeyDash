import React from 'react'
import StatsChart from './StatsChart'

const ScoreBoard = ({ wpm, accuracy, errors, mode, onRestart, ...props }) => {
  return (
    <div className="fixed inset-0 z-10 mt-16 flex items-center justify-center bg-[var(--background-color)] bg-opacity-60 w-full h-full">
      <div className="bg-[var(--background-color)] text-[var(--text-color)] rounded-lg shadow-lg p-8 min-w-[320px] text-center max-w-3xl w-full mt-8">
        <h2 className="text-2xl font-bold mb-4">Score Board</h2>
        <StatsChart wpm={wpm} accuracy={accuracy} errors={errors}/>
        <div className="mb-2 mt-4">WPM: <span className="font-bold">{wpm}</span></div>
        <div className="mb-2">Accuracy: <span className="font-bold">{accuracy?.toFixed(1)}%</span></div>
        <div className="mb-4">Errors: <span className="font-bold">{errors}</span></div>
        <button
          className="mt-2 px-4 py-2 bg-[var(--accent-color)] rounded hover:bg-[var(--accent-color-hover)]"
          onClick={onRestart}
        >
          Restart {mode}
        </button>
      </div>
    </div>
  )
}

export default ScoreBoard