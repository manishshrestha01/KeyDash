import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import Home from "./pages/Home";
import { RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import ScorePage from "./modes/ScorePage";
import Profile from "./pages/Profile";
import Settings from "./components/auth/Settings";
import Leaderboard from "./pages/Leaderboard";
import UserProfile from "./pages/UserProfile";
import Error from "./pages/Error";

const Routes = () => {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="/login" element={<Login/>} />
            <Route path="/results" element={<ScorePage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/users/:userId" element={<UserProfile />} />
            <Route path="*" element={<Error/>} />


        </Route>
    ));
  return (
    <RouterProvider router={router} />
  )
}

export default Routes