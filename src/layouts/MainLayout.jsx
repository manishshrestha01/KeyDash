import { Outlet } from "react-router"
import NavbarV2 from "../components/NavbarV2"
import RouteMeta from "../components/RouteMeta"
import Footer from "../components/Footer"

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarV2 />
      <main className="flex-1">
        <RouteMeta />
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default MainLayout
