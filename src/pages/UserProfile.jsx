import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaTwitter,
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaYoutube,
  FaTwitch,
  FaGlobe,
} from "react-icons/fa";
import { supabase } from "../supabaseClient";

const socialIcons = {
  twitter: FaTwitter,
  github: FaGithub,
  linkedin: FaLinkedin,
  instagram: FaInstagram,
  youtube: FaYoutube,
  twitch: FaTwitch,
  website: FaGlobe,
};

const UserProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `display_name, avatar_url, bio, website, twitter, github, linkedin, instagram, youtube, twitch`
        )
        .eq("id", userId)
        .single();

      if (error) {
        setError(error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
      setLoading(false);
    };

    if (userId) fetchProfile();
  }, [userId]);

  if (loading)
    return (
      <div className="p-6 text-center text-white">
        <p>Loading profile...</p>
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-center text-red-500">
        <p>Error loading profile: {error}</p>
      </div>
    );

  if (!profile)
    return (
      <div className="p-6 text-center text-gray-400">
        <p>User not found</p>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-md">
      <div className="flex items-center gap-6 mb-6">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={`${profile.display_name}'s avatar`}
            className="w-24 h-24 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='%23D1D5DB' viewBox='0 0 24 24'><path d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z'/></svg>";
            }}
          />
        ) : (
          <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center text-5xl font-bold text-gray-300">
            {profile.display_name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <h1 className="text-3xl font-bold">{profile.display_name}</h1>
      </div>

      {profile.bio && <p className="mb-6 whitespace-pre-line">{profile.bio}</p>}

      <div className="flex flex-wrap gap-4 text-blue-400">
        {Object.entries(socialIcons).map(([key, Icon]) => {
          const url = profile[key];
          if (!url) return null;
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <Icon />
              <span className="capitalize">{key}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default UserProfile;
