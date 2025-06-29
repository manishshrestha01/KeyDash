import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // 1. Profile info
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setLoading(false);
        return;
      }
      setProfile(profileData);

      // 2. Timed scores
      const { data: timedScores, error: timedError } = await supabase
        .from("leaderboard_timed")
        .select("wpm, accuracy, time, created_at")
        .eq("user_id", user.id);

      if (timedError) console.error("Timed error:", timedError);

      // 3. Sentence scores
      const { data: sentenceScores, error: sentenceError } = await supabase
        .from("leaderboard_sentence")
        .select("wpm, accuracy, difficulty, time, created_at")
        .eq("user_id", user.id);

      if (sentenceError) console.error("Sentence error:", sentenceError);

      // 4. Normalize + combine
      const combined = [
        ...(timedScores || []).map((s) => ({
          mode: "Timed",
          wpm: s.wpm,
          accuracy: s.accuracy,
          time: s.time,
          difficulty: "-",
          date: s.created_at,
        })),
        ...(sentenceScores || []).map((s) => ({
          mode: "Sentence",
          wpm: s.wpm,
          accuracy: s.accuracy,
          time: s.time,
          difficulty: s.difficulty,
          date: s.created_at,
        })),
      ];

      // 5. Remove duplicates (keep only the first of each identical entry)
      const uniqueScores = [];
      const seen = new Set();

      for (const score of combined) {
        const key = [
          score.mode,
          score.wpm,
          score.accuracy,
          score.time,
          score.difficulty,
          new Date(score.date).getTime(), // round to second
        ].join("|");

        if (!seen.has(key)) {
          seen.add(key);
          uniqueScores.push(score);
        }
      }

      // 6. Sort by newest first
      uniqueScores.sort((a, b) => new Date(b.date) - new Date(a.date));

      setScores(uniqueScores);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center mt-8">
        <h2 className="text-4xl font-bold mb-2 mt-4 text-center">
          Profile
        </h2>
        <p className="mb-8 text-center text-xl text-gray-400">
          View your profile and stats.
        </p>
        <div className="max-w-3xl w-full mx-auto p-10 bg-[#172133] text-white rounded-xl shadow-lg border border-[#324154] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-white mb-6"></div>
          <div className="text-lg text-gray-200">Fetching profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-white p-8">Profile not found.</div>;
  }

  const bestWpm = scores.length > 0 ? Math.max(...scores.map((s) => s.wpm || 0)) : 0;
  const avgAccuracy = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s.accuracy || 0), 0) / scores.length
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 text-white">
      {/* User Info */}
      <div className="flex items-center gap-4 mb-8">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400"
          />
        ) : (
          <div className="w-14 h-14 bg-gray-600 flex items-center justify-center rounded-full border-2 border-yellow-400">
            <svg className="w-12 h-12 rounded-full object-cover" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
        )}
        <div>
          <h2 className="text-2xl font-semibold">Hello, {profile.display_name || "User"}</h2>
          <p className="text-gray-400">Welcome back to your typing dashboard</p>
        </div>
      </div>

      {/* Stats */}
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
              {scores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No sessions yet.
                  </td>
                </tr>
              ) : (
                scores.map((s, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-[#3a3d3f]">
                    <td className="px-4 py-2">{new Date(s.date).toLocaleString()}</td>
                    <td className="px-4 py-2">{s.mode}</td>
                    <td className="px-4 py-2">{s.difficulty || "-"}</td>
                    <td className="px-4 py-2">{`${parseFloat(s.time).toFixed(1)}s`}</td>
                    <td className="px-4 py-2 font-semibold">{s.wpm}</td>
                    <td className="px-4 py-2">{`${parseFloat(s.accuracy).toFixed(1)}%`}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Profile;
