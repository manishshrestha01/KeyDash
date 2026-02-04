import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { 
  Keyboard, Trophy, LayoutDashboard, User, Settings, 
  History, LogOut, ChevronDown 
} from "lucide-react";

const NavbarV2 = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

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

    polling = setInterval(fetchUserProfile, 5000);

    return () => {
      listener?.subscription.unsubscribe();
      clearInterval(polling);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
    navigate("/");
  };

  const avatarUrl = profile?.avatar_url?.trim();

  // Navigation items
  const navItems = [
    { path: "/", label: "Type", icon: Keyboard },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      className="bg-[#101826] text-white sticky top-0 z-50 border-b border-white/10"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="max-w-screen-xl flex items-center justify-between mx-auto px-2 sm:px-4 py-2 sm:py-3 relative">
        {/* Logo */}
        <NavLink
          to="/"
          className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition"
        >
          <img
            src="/logo.svg"
            alt="KeyDash"
            className="h-7 sm:h-9"
          />
          <span className="text-xl sm:text-3xl font-semibold hidden sm:block">KeyDash</span>
        </NavLink>

        {/* Center Navigation - Absolutely positioned for true center */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1 bg-[#1a2332] rounded-full p-0.5 sm:p-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-[#2a3a4f] text-yellow-400 border border-yellow-400/30"
                  : "text-gray-400 hover:text-white hover:bg-[#242f3f]"
              }`}
            >
              <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Right Side - User */}
        <div className="flex items-center">
          {loading ? (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-700 animate-pulse" />
          ) : !user ? (
            <NavLink
              to="/login"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition"
            >
              Login
            </NavLink>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1 sm:gap-2 p-0.5 sm:p-1 rounded-full hover:bg-[#1a2332] transition"
              >
                <div className="relative w-8 h-8 sm:w-9 sm:h-9">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl?.trim()}
                      alt="avatar"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-gray-600"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = `data:image/svg+xml;utf8,${encodeURIComponent(
                          "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-9 1.67-9 5v1h18v-1c0-3.33-5.69-5-9-5z'/></svg>"
                        )}`
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 items-center justify-center ${avatarUrl ? 'hidden' : 'flex'}`}>
                    {profile?.display_name ? (
                      <span className="text-xs sm:text-sm font-bold text-black">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 transition-transform hidden sm:block ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#1a2332] rounded-xl shadow-xl border border-gray-700/50 overflow-hidden z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-700/50">
                    <p className="text-sm font-medium text-white truncate">
                      {profile?.display_name || "User"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <NavLink
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#242f3f] hover:text-white transition"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </NavLink>
                    <NavLink
                      to="/profile?tab=history"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#242f3f] hover:text-white transition"
                    >
                      <History className="w-4 h-4" />
                      History
                    </NavLink>
                    <NavLink
                      to="/profile?tab=settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#242f3f] hover:text-white transition"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </NavLink>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-700/50 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavbarV2;
