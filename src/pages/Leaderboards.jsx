import React from 'react'
import Leaderboard from '../components/Leaderboard'
import Meta from '../components/Meta'

const Leaderboards = () => {
  return (
    <div>
    <Meta
      title="Leaderboard | KeyDash"
      description="View the top players and their scores."
      url="https://keydash.shresthamanish.info.np/leaderboard"
    />
    <Leaderboard />
  </div>
  )
}

export default Leaderboards