// src/pages/Leaderboard.jsx

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import ModesButton from "../components/ModesButton";
import {
  FaTwitter,
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaYoutube,
  FaTwitch,
} from "react-icons/fa";

const modes = ["Sentence", "Timed"];
const difficulties = ["easy", "medium", "hard", "extreme"];
const times = [15, 30, 60, 120];

const socialIcons = {
  twitter: FaTwitter,
  github: FaGithub,
  linkedin: FaLinkedin,
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitch: FaTwitch,
};

const Leaderboard = () => {
  const [mode, setMode] = useState("Sentence");
  const [difficulty, setDifficulty] = useState("easy");
  const [time, setTime] = useState(15);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      let query = supabase
        .from("leaderboard")
        .select(`
          user_id, wpm, accuracy, mode,
          profiles!inner(
            display_name, avatar_url,
            twitter, github, linkedin,
            instagram, youtube, twitch
          )
        `)
        .eq("mode", mode);

      if (mode === "Sentence") query = query.eq("difficulty", difficulty);
      if (mode === "Timed") query = query.eq("time", time);

      query = query.order("wpm", { ascending: false }).limit(100);

      const { data, error } = await query;

      if (error) {
        console.error("Leaderboard fetch error:", error);
        setScores([]);
      } else {
        setScores(data || []);
      }

      setLoading(false);
    };

    fetchLeaderboard();
  }, [mode, difficulty, time]);

  const topThree = scores.slice(0, 3);
  const others = scores.slice(3);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">
      <h1 className="text-5xl text-center font-bold mb-9 -mt-3">Leaderboard</h1>

      {/* Mode Selector */}
      <div className="flex gap-4 mb-4 justify-center">
        {modes.map((m) => (
          <ModesButton
            key={m}
            onClick={() => setMode(m)}
            active={mode === m}
            theme="dark"
          >
            {m}
          </ModesButton>
        ))}
      </div>

      {/* Difficulty Selector */}
      {mode === "Sentence" && (
        <div className="flex gap-2 justify-center mb-6">
          {difficulties.map((d) => (
            <ModesButton
              key={d}
              onClick={() => setDifficulty(d)}
              active={difficulty === d}
              theme="dark"
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </ModesButton>
          ))}
        </div>
      )}

      {/* Time Selector */}
      {mode === "Timed" && (
        <div className="flex gap-2 justify-center mb-6">
          {times.map((t) => (
            <ModesButton
              key={t}
              onClick={() => setTime(t)}
              active={time === t}
              theme="dark"
            >
              {t}s
            </ModesButton>
          ))}
        </div>
      )}

      {/* Podium */}
      <div className="flex justify-center items-end gap-6 mb-10">
        {[1, 0, 2].map((i, rank) => {
          const user = topThree[i];
          if (!user)
            return <div key={rank} className="w-24 h-24" />;
          const heights = [40, 56, 32];
          const bg = ["#b0b0b0", "#facc15", "#cd7f32"];

          return (
            <div
              key={rank}
              className="flex flex-col items-center justify-end"
              style={{ minWidth: 100 }}
            >
              <img
                src={user.profiles.avatar_url || ""}
                alt="avatar"
                className="w-16 h-16 rounded-full border-2 border-white mb-2 object-cover"
              />
              <Link
                to={`/users/${user.user_id}`}
                className="hover:underline text-sm font-semibold"
              >
                {user.profiles.display_name || "Anonymous"}
              </Link>
              <div
                className="mt-2 w-full text-center rounded-t-md font-bold text-black"
                style={{ backgroundColor: bg[rank], height: `${heights[rank]}px` }}
              >
                {user.wpm} WPM
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-[#2f3133] rounded-lg overflow-hidden">
        <table className="w-full text-sm table-auto">
          <thead>
            <tr className="text-left text-gray-300 border-b border-gray-600 bg-[#1f2022]">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">WPM</th>
              <th className="px-4 py-2">Accuracy</th>
              <th className="px-4 py-2">Social</th>
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No entries yet.
                </td>
              </tr>
            )}

            {scores.map((u, i) => (
              <tr
                key={u.user_id + "-" + i}
                className="border-b border-gray-700 hover:bg-[#3a3d3f]"
              >
                <td className="px-4 py-2">{i + 1}</td>
                <td className="px-4 py-2 flex items-center gap-3">
                  <img
                    src={u.profiles.avatar_url || ""}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <Link
                    to={`/users/${u.user_id}`}
                    className="hover:underline font-medium"
                  >
                    {u.profiles.display_name || "Anonymous"}
                  </Link>
                </td>
                <td className="px-4 py-2 font-semibold">{u.wpm}</td>
                <td className="px-4 py-2">{u.accuracy?.toFixed(1) ?? "-"}%</td>
                <td className="px-4 py-2 flex gap-2 text-xl">
                  {Object.entries(socialIcons).map(([key, IconComp]) => {
                    const url = u.profiles[key];
                    if (!url) return null;
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={key}
                        className="hover:text-yellow-400"
                      >
                        <IconComp />
                      </a>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="py-4 text-center text-yellow-300 font-mono">Loading...</div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
