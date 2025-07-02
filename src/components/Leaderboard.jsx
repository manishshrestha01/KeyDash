import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import ModesButton from "./ModesButton";

const modes = ["Sentence", "Timed"];
const difficulties = ["easy", "medium", "hard", "extreme"];
const times = [15, 30, 60, 120];


const Leaderboard = () => {
  const [mode, setMode] = useState("Sentence");
  const [difficulty, setDifficulty] = useState("easy");
  const [time, setTime] = useState(15);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      const table = mode === "Sentence" ? "best_sentence_scores" : "best_timed_scores";
      
      let query = supabase
        .from(table)
        .select(`
          user_id, wpm, accuracy, ${mode === "Timed" ? "time" : "difficulty"},
          profiles!inner(display_name, avatar_url, twitter, github, linkedin, instagram, youtube, twitch)
        `);

      if (mode === "Sentence") {
        query = query.eq("difficulty", difficulty);
      } else {
        query = query.eq("time", time);
      }

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 text-white">
      <h1 className="text-4xl sm:text-4xl md:text-5xl lg:text-5xl text-center font-bold mb-6 md:mb-9 -mt-2 md:-mt-3">Leaderboard</h1>

      {/* Mode Selector */}
      <div className="flex gap-4 mb-4 justify-center">
        {modes.map((m) => (
          <ModesButton key={m} onClick={() => setMode(m)} active={mode === m} theme="dark">
            {m}
          </ModesButton>
        ))}
      </div>

      {/* Difficulty Selector */}
      {mode === "Sentence" && (
        <div className="flex gap-2 justify-center mb-6">
          {difficulties.map((d) => (
            <ModesButton key={d} onClick={() => setDifficulty(d)} active={difficulty === d} theme="dark">
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </ModesButton>
          ))}
        </div>
      )}

      {/* Time Selector */}
      {mode === "Timed" && (
        <div className="flex gap-2 justify-center mb-6">
          {times.map((t) => (
            <ModesButton key={t} onClick={() => setTime(t)} active={time === t} theme="dark">
              {t}s
            </ModesButton>
          ))}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#2f3133] rounded-lg overflow-x-auto">
        <table className="w-full min-w-[320px] sm:min-w-0 text-xs sm:text-sm md:text-base lg:text-lg table-auto">
          <thead>
            <tr className="text-left text-gray-300 border-b border-gray-600 bg-[#1f2022] text-xs sm:text-sm md:text-base lg:text-lg">
              <th className="px-2 sm:px-3 md:px-4 py-2">#</th>
              <th className="px-2 sm:px-3 md:px-4 py-2">User</th>
              <th className="px-2 sm:px-3 md:px-4 py-2">WPM</th>
              <th className="hidden md:table-cell px-2 sm:px-3 md:px-4 py-2">Accuracy</th>
              {mode === "Timed" && (
                <th className="hidden lg:table-cell px-2 sm:px-3 md:px-4 py-2">Time</th>
              )}
              {mode === "Sentence" && (
                <th className="hidden lg:table-cell px-2 sm:px-3 md:px-4 py-2">Difficulty</th>
              )}
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-2 sm:px-3 md:px-4 py-6 text-center text-gray-400 text-xs sm:text-sm md:text-base lg:text-lg">
                  No entries yet.
                </td>
              </tr>
            )}

            {scores.map((u, i) => (
              <tr key={u.user_id + "-" + i} className="border-b border-gray-700 hover:bg-[#3a3d3f] text-xs sm:text-sm md:text-base lg:text-lg">
                <td className="px-2 sm:px-3 md:px-4 py-2">{i + 1}</td>
                <td className="px-2 sm:px-2 md:px-4 py-2 flex items-center gap-1 sm:gap-2 md:gap-3">
                  {u.profiles.avatar_url ? (
                    <img
                      src={u.profiles.avatar_url}
                      alt="avatar"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%23D1D5DB' viewBox='0 0 24 24'><path d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z'/></svg>";
                      }}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-600 flex items-center justify-center rounded-full">
                      <svg
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  )}

                  <Link to={`/users/${u.user_id}`} className="hover:underline font-medium truncate max-w-[70px] sm:max-w-[100px] md:max-w-none">
                    {u.profiles.display_name || "Anonymous"}
                  </Link>
                </td>
                <td className="px-2 sm:px-3 md:px-4 py-2 font-semibold">{u.wpm}</td>
                <td className="hidden md:table-cell px-2 sm:px-3 md:px-4 py-2">{u.accuracy?.toFixed(1) ?? "-"}%</td>
                {mode === "Timed" && <td className="hidden lg:table-cell px-2 sm:px-3 md:px-4 py-2">{u.time}s</td>}
                {mode === "Sentence" && <td className="hidden lg:table-cell px-2 sm:px-3 md:px-4 py-2 capitalize">{u.difficulty}</td>}
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