import React from 'react'

// Responsive and centered: use flex, mx-auto, and remove negative margins
const RealTimeStats = ({ wpm, accuracy, mistakes }) => {
  return (
    <div className="absolute inset-x-1/12 mt-60 bg-yellow-400 rounded-2xl px-7 py-5 text-black text-2xl font-mono shadow-lg z-10 flex flex-col w-fit">
      <div>WPM = {wpm}</div>
      <div>Acc = {accuracy.toFixed(1)}%</div>
      <div>Error = {mistakes}</div>
    </div>
  )
}

export default RealTimeStats