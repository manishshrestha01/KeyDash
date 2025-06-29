import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  Globe,
  Github,
  Linkedin,
  Instagram,
  Youtube,
  Twitch,
} from "lucide-react";

// Custom X (Twitter) icon
const XIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5"
  >
    <path d="M20.39 3H16.9L12.75 9.25 8.59 3H3.25L9.88 12.4 3 21h3.49l4.57-6.59L16.1 21h5.4l-7.05-9.65L20.39 3z" />
  </svg>
);

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rank, setRank] = useState("-");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "display_name, avatar_url, website, twitter, github, linkedin, instagram, youtube, twitch, bio"
        )
        .eq("id", userId)
        .maybeSingle();

      setProfile(profileData);

      const { data: timedScores } = await supabase
        .from("leaderboard_timed")
        .select("wpm, accuracy, time, created_at")
        .eq("user_id", userId);

      const { data: sentenceScores } = await supabase
        .from("leaderboard_sentence")
        .select("wpm, accuracy, difficulty, time, created_at")
        .eq("user_id", userId);

      // Combine & normalize
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

      // Deduplicate
      const uniqueScores = [];
      const seen = new Set();

      for (const score of combined) {
        const key = [
          score.mode,
          score.wpm,
          score.accuracy,
          score.time,
          score.difficulty,
          new Date(score.date).getTime(),
        ].join("|");

        if (!seen.has(key)) {
          seen.add(key);
          uniqueScores.push(score);
        }
      }

      // Sort by newest
      uniqueScores.sort((a, b) => new Date(b.date) - new Date(a.date));

      setScores(uniqueScores);
      setRank(2); // You can update this with actual ranking logic
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-white p-10 text-center">Loading profile...</div>
    );
  }

  const bestWpm =
    scores.length > 0 ? Math.max(...scores.map((s) => s.wpm || 0)) : 0;

  const avgAccuracy =
    scores.length > 0
      ? (
          scores.reduce((sum, s) => sum + (s.accuracy || 0), 0) / scores.length
        ).toFixed(1)
      : 0;

  const socialLinks = [
    { url: profile.website, icon: <Globe size={20} />, label: "Website" },
    { url: profile.twitter, icon: XIcon, label: "X" },
    { url: profile.github, icon: <Github size={20} />, label: "GitHub" },
    { url: profile.linkedin, icon: <Linkedin size={20} />, label: "LinkedIn" },
    {
      url: profile.instagram,
      icon: <Instagram size={20} />,
      label: "Instagram",
    },
    { url: profile.youtube, icon: <Youtube size={20} />, label: "YouTube" },
    { url: profile.twitch, icon: <Twitch size={20} />, label: "Twitch" },
  ];

  return (
    <div className="min-h-screen bg-[#101826] flex items-center justify-center px-4 py-10 -mt-20 text-white">
      <div className="max-w-3xl w-full bg-[#161B22] rounded-xl shadow-xl p-8">
        {/* Avatar and Name */}
        <div className="flex flex-col items-center">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="avatar"
              className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white"
            />
          ) : (
            <div className="w-20 h-20 rounded-full overflow-hidden mb-2">
              <div className="w-full h-full bg-gray-600 flex items-center justify-center text-2xl text-white rounded-full">
                <svg
                  className="h-full w-full text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
            </div>
          )}

          <h2 className="text-3xl font-bold mb-2">
            {profile?.display_name || "User"}
          </h2>

          {/* Social Icons */}
          <div className="flex flex-wrap gap-4 text-gray-400 mt-3 justify-center">
            {socialLinks.map(
              ({ url, icon, label }) =>
                url && (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group"
                  >
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
                      {label}
                    </span>
                    <div className="hover:text-blue-400 transition">{icon}</div>
                  </a>
                )
            )}
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="text-sm text-gray-300 text-center mt-4 max-w-xl">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10 text-center">
          <div className="bg-[#1F2937] p-6 rounded-xl">
            <p className="text-gray-400 text-sm">Best WPM</p>
            <h3 className="text-3xl font-bold mt-2">{bestWpm}</h3>
          </div>
          <div className="bg-[#1F2937] p-6 rounded-xl">
            <p className="text-gray-400 text-sm">Average Accuracy</p>
            <h3 className="text-3xl font-bold mt-2">{avgAccuracy}%</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
