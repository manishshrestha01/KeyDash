import { Outlet } from "react-router"
import Navbar from "../components/Navbar"

const MainLayout = () => {
  return (
    <>
        <Navbar />
         <Outlet/>
    </>
   
  // Assuming Outlet is imported from 'react-router-dom'
  )
}

export default MainLayout