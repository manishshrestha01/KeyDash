import { Outlet } from "react-router"
import { Link } from "react-router-dom"
import NavbarV2 from "../components/NavbarV2"
import RouteMeta from "../components/RouteMeta"

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarV2 />
      <main className="flex-1">
        <RouteMeta />
        <Outlet />
      </main>
      <footer className="bg-[#0a0f1a] border-t border-gray-800/60">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">© {new Date().getFullYear()} KeyDash · All rights reserved</p>
          <div className="flex items-center gap-5">
            <Link to="/faq" className="text-gray-500 hover:text-yellow-400 text-xs transition-colors">FAQ</Link>
            <Link to="/privacy-policy" className="text-gray-500 hover:text-yellow-400 text-xs transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="text-gray-500 hover:text-yellow-400 text-xs transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
