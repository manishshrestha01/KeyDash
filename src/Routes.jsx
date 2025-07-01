import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import { RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import ScorePage from "./modes/ScorePage";
import Setting from "./pages/auth/Setting";
import Leaderboards from "./pages/Leaderboards";
import UserProfile from "./components/UserProfile";
import Errors from "./pages/Errors";
import Profiles from "./pages/Profiles";
import Homes from "./pages/Homes";

const Routes = () => {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route element={<MainLayout />}>
            <Route index element={<Homes />} />
            <Route path="/login" element={<Login/>} />
            <Route path="/results" element={<ScorePage />} />
            <Route path="/profile" element={<Profiles/>} />
            <Route path="/settings" element={<Setting />} />
            <Route path="/leaderboard" element={<Leaderboards/>} />
            <Route path="/users/:userId" element={<UserProfile />} />
            <Route path="*" element={<Errors />} />


        </Route>
    ));
  return (
    <RouterProvider router={router} />
  )
}

export default Routes