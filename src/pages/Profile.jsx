import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, scores")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data || null);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-white">
        <div className="text-2xl">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-white">
        <div className="text-2xl">Profile not found.</div>
      </div>
    );
  }

  const scores = Array.isArray(profile.scores) ? profile.scores : [];
  const bestWpm = scores.length > 0 ? Math.max(...scores.map(s => s.wpm || 0)) : 0;
  const avgAccuracy = scores.length > 0
    ? (scores.reduce((sum, s) => sum + (s.accuracy || 0), 0) / scores.length)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">
      {/* User Info */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-yellow-400 text-black font-bold rounded-full w-14 h-14 flex items-center justify-center text-xl">
          {profile.display_name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Hello, {profile.display_name || "User"}</h2>
          <p className="text-gray-400">Welcome back to your typing dashboard</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#444] p-4 rounded-xl text-center shadow">
          <p className="text-sm text-gray-300">Best WPM</p>
          <h3 className="text-3xl font-bold">{bestWpm}</h3>
        </div>
        <div className="bg-[#444] p-4 rounded-xl text-center shadow">
          <p className="text-sm text-gray-300">Avg Accuracy</p>
          <h3 className="text-3xl font-bold">{avgAccuracy.toFixed(1)}%</h3>
        </div>
        <div className="bg-[#444] p-4 rounded-xl text-center shadow">
          <p className="text-sm text-gray-300">Sessions</p>
          <h3 className="text-3xl font-bold">{scores.length}</h3>
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
              {scores.slice(0, 10).map((s, idx) => (
                <tr key={idx} className="border-b border-gray-700 hover:bg-[#3a3d3f]">
                  <td className="px-4 py-2">{s.date ? new Date(s.date).toLocaleString() : "-"}</td>
                  <td className="px-4 py-2">{s.mode || "-"}</td>
                  <td className="px-4 py-2">{s.difficulty || "-"}</td>
                  <td className="px-4 py-2">{s.time ? `${s.time.toFixed(1)}s` : "-"}</td>
                  <td className="px-4 py-2 font-semibold">{s.wpm ?? "-"}</td>
                  <td className="px-4 py-2">{s.accuracy != null ? `${s.accuracy}%` : "-"}</td>
                </tr>
              ))}
              {scores.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No sessions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Profile

