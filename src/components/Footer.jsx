import { NavLink } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#101826] text-gray-300 border-t border-white/10">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-center gap-6 text-sm">
        <a
          href="https://github.com/manishshrestha01/KeyDash"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-white"
          aria-label="GitHub"
        >
          <i className="icon fas fa-code fa-fw" aria-hidden="true"></i>
          <span className="capitalize">github</span>
        </a>

        <NavLink
          to="/terms-of-service"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-white"
        >
          <i className="icon fas fa-file-contract fa-fw" aria-hidden="true"></i>
          <span className="capitalize">terms</span>
        </NavLink>

        <NavLink
          to="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-white"
        >
          <i className="icon fas fa-lock fa-fw" aria-hidden="true"></i>
          <span className="capitalize">privacy</span>
        </NavLink>
      </div>
    </footer>
  );
};

export default Footer;
