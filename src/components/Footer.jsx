import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#0a0f1a] border-t border-gray-800/60 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="text-black font-black text-sm">K</span>
              </div>
              <span className="text-white font-bold text-lg">
                Key<span className="text-yellow-400">Dash</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Type faster. Play smarter. Track your progress and compete with typists worldwide.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Platform</p>
            <ul className="space-y-2">
              {[
                { to: "/", label: "Home" },
                { to: "/leaderboard", label: "Leaderboard" },
                { to: "/daily", label: "Daily Challenge" },
                { to: "/achievements", label: "Achievements" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Help */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Help & Legal</p>
            <ul className="space-y-2">
              {[
                { to: "/faq", label: "❓ FAQ" },
                { to: "/privacy-policy", label: "🛡️ Privacy Policy" },
                { to: "/terms-of-service", label: "⚖️ Terms of Service" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="mailto:support@keydash.shresthamanish.info.np"
                  className="text-gray-400 hover:text-yellow-400 text-sm transition-colors"
                >
                  📧 Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} KeyDash · All rights reserved
          </p>
          <div className="flex items-center gap-4">
            <Link to="/faq" className="text-gray-600 hover:text-yellow-400 text-xs transition-colors">FAQ</Link>
            <Link to="/privacy-policy" className="text-gray-600 hover:text-yellow-400 text-xs transition-colors">Privacy</Link>
            <Link to="/terms-of-service" className="text-gray-600 hover:text-yellow-400 text-xs transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
