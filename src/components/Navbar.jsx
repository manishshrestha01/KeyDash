import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let polling;

    const fetchUserProfile = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData || null);
      setLoading(false);
    };

    fetchUserProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchUserProfile();
    });

    polling = setInterval(fetchUserProfile, 1000); //Data updates in 1 seconds of saving

    return () => {
      listener?.subscription.unsubscribe();
      clearInterval(polling);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    navigate("/login");
  };

  const avatarUrl = profile?.avatar_url;
  const displayName = profile?.display_name || user?.email || "User";

  if (loading) {
    return (
      <nav className="bg-[#101826] text-white sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-screen-xl flex justify-between items-center mx-auto p-4">
          <NavLink to="/" className="flex items-center space-x-3">
            <img src="/logo.svg" className="h-10" alt="logo" />
            <span className="text-3xl font-semibold">KeyDash</span>
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-[#101826] text-white sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-screen-xl flex justify-between items-center mx-auto p-4">
        <NavLink to="/" className="flex items-center space-x-3">
          <img src="/logo.svg" className="h-10" alt="logo" />
          <span className="text-3xl font-semibold">KeyDash</span>
        </NavLink>

        <div className="relative">
          {!user ? (
            <NavLink
              to="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white text-xl font-semibold rounded-lg px-4 py-2"
            >
              Login / Sign Up
            </NavLink>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-4 py-2 text-base rounded-lg bg-gray-800 hover:bg-gray-700"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                    {displayName?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="font-medium whitespace-nowrap">{displayName}</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-black rounded-lg shadow-lg z-50">
                  <NavLink
                    to="/profile"
                    className="group flex items-center px-4 py-3 hover:bg-gray-100 hover:rounded-lg"
                  >
                    {/* Profile SVG */}
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A17.93 17.93 0 0 1 12 21.75c-2.675 0-5.215-.584-7.5-1.632Z" />
                    </svg>
                    View Profile
                  </NavLink>
                  <NavLink
                    to="/leaderboard"
                    className="flex items-center px-4 py-3 hover:bg-gray-100"
                  >
                    {/* Leaderboard SVG */}
                    <svg fill="currentColor" viewBox="0 0 24 24" className="mr-2 h-5 w-5">
                      <path d="M22,7H16.333V4a1,1,0,0,0-1-1H8.667a1,1,0,0,0-1,1v7H2a1,1,0,0,0-1,1v8a1,1,0,0,0,1,1H22a1,1,0,0,0,1-1V8A1,1,0,0,0,22,7ZM7.667,19H3V13H7.667Zm6.666,0H9.667V5h4.666ZM21,19H16.333V9H21Z" />
                    </svg>
                    Leaderboard
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className="flex items-center px-4 py-3 hover:bg-gray-100"
                  >
                    {/* Settings SVG */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                      data-slot="icon"
                      class="mr-2 h-5 w-5"
                    >
                      <path d="M17.004 10.407c.138.435-.216.842-.672.842h-3.465a.75.75 0 0 1-.65-.375l-1.732-3c-.229-.396-.053-.907.393-1.004a5.252 5.252 0 0 1 6.126 3.537ZM8.12 8.464c.307-.338.838-.235 1.066.16l1.732 3a.75.75 0 0 1 0 .75l-1.732 3c-.229.397-.76.5-1.067.161A5.23 5.23 0 0 1 6.75 12a5.23 5.23 0 0 1 1.37-3.536ZM10.878 17.13c-.447-.098-.623-.608-.394-1.004l1.733-3.002a.75.75 0 0 1 .65-.375h3.465c.457 0 .81.407.672.842a5.252 5.252 0 0 1-6.126 3.539Z"></path>
                      <path
                        fill-rule="evenodd"
                        d="M21 12.75a.75.75 0 1 0 0-1.5h-.783a8.22 8.22 0 0 0-.237-1.357l.734-.267a.75.75 0 1 0-.513-1.41l-.735.268a8.24 8.24 0 0 0-.689-1.192l.6-.503a.75.75 0 1 0-.964-1.149l-.6.504a8.3 8.3 0 0 0-1.054-.885l.391-.678a.75.75 0 1 0-1.299-.75l-.39.676a8.188 8.188 0 0 0-1.295-.47l.136-.77a.75.75 0 0 0-1.477-.26l-.136.77a8.36 8.36 0 0 0-1.377 0l-.136-.77a.75.75 0 1 0-1.477.26l.136.77c-.448.121-.88.28-1.294.47l-.39-.676a.75.75 0 0 0-1.3.75l.392.678a8.29 8.29 0 0 0-1.054.885l-.6-.504a.75.75 0 1 0-.965 1.149l.6.503a8.243 8.243 0 0 0-.689 1.192L3.8 8.216a.75.75 0 1 0-.513 1.41l.735.267a8.222 8.222 0 0 0-.238 1.356h-.783a.75.75 0 0 0 0 1.5h.783c.042.464.122.917.238 1.356l-.735.268a.75.75 0 0 0 .513 1.41l.735-.268c.197.417.428.816.69 1.191l-.6.504a.75.75 0 0 0 .963 1.15l.601-.505c.326.323.679.62 1.054.885l-.392.68a.75.75 0 0 0 1.3.75l.39-.679c.414.192.847.35 1.294.471l-.136.77a.75.75 0 0 0 1.477.261l.137-.772a8.332 8.332 0 0 0 1.376 0l.136.772a.75.75 0 1 0 1.477-.26l-.136-.771a8.19 8.19 0 0 0 1.294-.47l.391.677a.75.75 0 0 0 1.3-.75l-.393-.679a8.29 8.29 0 0 0 1.054-.885l.601.504a.75.75 0 0 0 .964-1.15l-.6-.503c.261-.375.492-.774.69-1.191l.735.267a.75.75 0 1 0 .512-1.41l-.734-.267c.115-.439.195-.892.237-1.356h.784Zm-2.657-3.06a6.744 6.744 0 0 0-1.19-2.053 6.784 6.784 0 0 0-1.82-1.51A6.705 6.705 0 0 0 12 5.25a6.8 6.8 0 0 0-1.225.11 6.7 6.7 0 0 0-2.15.793 6.784 6.784 0 0 0-2.952 3.489.76.76 0 0 1-.036.098A6.74 6.74 0 0 0 5.251 12a6.74 6.74 0 0 0 3.366 5.842l.009.005a6.704 6.704 0 0 0 2.18.798l.022.003a6.792 6.792 0 0 0 2.368-.004 6.704 6.704 0 0 0 2.205-.811 6.785 6.785 0 0 0 1.762-1.484l.009-.01.009-.01a6.743 6.743 0 0 0 1.18-2.066c.253-.707.39-1.469.39-2.263a6.74 6.74 0 0 0-.408-2.309Z"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                    Settings
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-3 hover:bg-gray-100 hover:rounded-lg  w-full"
                  >
                    {/* Logout SVG */}
                    <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M16.5 3.75a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V15a.75.75 0 0 0-1.5 0v3.75a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3V9A.75.75 0 1 0 9 9V5.25a1.5 1.5 0 0 1 1.5-1.5h6ZM5.78 8.47a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 0 0 0 1.06l3 3a.75.75 0 0 0 1.06-1.06L5.06 13H15a.75.75 0 0 0 0-1.5H5.06l.72-.72a.75.75 0 0 0 0-1.06Z"
                      />
                    </svg>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
