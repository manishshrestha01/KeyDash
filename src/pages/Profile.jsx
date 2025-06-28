import React from "react"
import { Link } from "react-router-dom"
<Link to="/profile" className="text-yellow-400 hover:underline">
  Profile
</Link>
const mockUser = {
  username: "manish",
  bestWpm: 102,
  averageAccuracy: 94.6,
  sessions: [
    {
      date: "2025-06-26",
      mode: "Timed",
      difficulty: "Medium",
      time: "60s",
      wpm: 98,
      accuracy: 96.2
    },
    {
      date: "2025-06-25",
      mode: "Sentence",
      difficulty: "Hard",
      wpm: 87,
      accuracy: 92.4
    }
  ]
}

const Profile = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">
      {/* User Info */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-yellow-400 text-black font-bold rounded-full w-14 h-14 flex items-center justify-center text-xl">
          {mockUser.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Hello, {mockUser.username}</h2>
          <p className="text-gray-400">Welcome back to your typing dashboard</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#444] p-4 rounded-xl text-center shadow">
          <p className="text-sm text-gray-300">Best WPM</p>
          <h3 className="text-3xl font-bold">{mockUser.bestWpm}</h3>
        </div>
        <div className="bg-[#444] p-4 rounded-xl text-center shadow">
          <p className="text-sm text-gray-300">Avg Accuracy</p>
          <h3 className="text-3xl font-bold">{mockUser.averageAccuracy.toFixed(1)}%</h3>
        </div>
        <div className="bg-[#444] p-4 rounded-xl text-center shadow">
          <p className="text-sm text-gray-300">Sessions</p>
          <h3 className="text-3xl font-bold">{mockUser.sessions.length}</h3>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Recent Sessions</h3>
        <div className="bg-[#2f3133] rounded-lg overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead>
              <tr className="border-b border-gray-600 text-sm text-gray-300">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Mode</th>
                <th className="px-4 py-2">Difficulty</th>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">WPM</th>
                <th className="px-4 py-2">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {mockUser.sessions.map((s, idx) => (
                <tr key={idx} className="border-b border-gray-700 hover:bg-[#3a3d3f]">
                  <td className="px-4 py-2">{s.date}</td>
                  <td className="px-4 py-2">{s.mode}</td>
                  <td className="px-4 py-2">{s.difficulty}</td>
                  <td className="px-4 py-2">{s.time || "-"}</td>
                  <td className="px-4 py-2 font-semibold">{s.wpm}</td>
                  <td className="px-4 py-2">{s.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Profile

