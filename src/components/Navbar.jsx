import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();
  }, []);

  // Logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="bg-[#101826] text-white sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="/" className="flex items-center space-x-3">
          <img src="/logo.svg" className="h-10" alt="logo" />
          <span className="text-3xl font-semibold text-white">KeyDash</span>
        </a>

        <div className="relative">
          {!user ? (
            <NavLink
              to="/login"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xl rounded-lg px-4 py-2.5"
            >
              Login / Sign Up
            </NavLink>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700"
              >
                <div className="bg-purple-700 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold">
                  {user.email[0]?.toUpperCase()}
                </div>
                <span className="font-medium">{user.user_metadata?.name || "KeyDash"}</span>
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-black rounded-lg shadow-lg z-50">
                  <NavLink
                    to="/profile"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center space-x-2">
                      <span>👤</span> <span>View Profile</span>
                    </span>
                  </NavLink>
                  <NavLink
                    to="/create-challenge"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center space-x-2">
                      <span>➕</span> <span>Create a Challenge</span>
                    </span>
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center space-x-2">
                      <span>⚙️</span> <span>Settings</span>
                    </span>
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    <span className="inline-flex items-center space-x-2">
                      <span>🚪</span> <span>Sign out</span>
                    </span>
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
