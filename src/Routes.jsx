import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import Home from "./components/Home";
import { RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import ScorePage from "./modes/ScorePage";
import Settings from "./components/auth/Settings";
import Leaderboard from "./components/Leaderboard";
import UserProfile from "./components/UserProfile";
import Error from "./components/Error";
import Profile from "./components/Profile";
import LoginForm from "./components/auth/LoginForm";

const Routes = () => {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="/login" element={<LoginForm/>} />
            <Route path="/results" element={<ScorePage />} />
            <Route path="/profile" element={<Profile/>} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/leaderboard" element={<Leaderboard/>} />
            <Route path="/users/:userId" element={<UserProfile />} />
            <Route path="*" element={<Error/>} />


        </Route>
    ));
  return (
    <RouterProvider router={router} />
  )
}

export default Routes