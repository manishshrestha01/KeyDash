import React from 'react'

const RealTimeStats = ({ wpm, accuracy, mistakes }) => {
  return (
    <div className="-ml-260 -mt-18 bg-yellow-400 rounded-2xl px-7 py-5 text-black text-2xl font-mono shadow-lg z-10">
        <div>WPM = {wpm}</div>
        <div>Acc = {accuracy.toFixed(1)}%</div>
        <div>Error = {mistakes}</div>
    </div>
  )
}

export default RealTimeStats