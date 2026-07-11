import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from "react-router-dom";
import { RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";
import ScorePage from "./modes/ScorePage";
import Errors from "./pages/Errors";
import Homes from "./pages/Homes";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

// v2 Components
import Dashboard from "./components/dashboard/Dashboard";
import MultiplayerLobby from "./components/multiplayer/MultiplayerLobby";
import AIBattle from "./components/ai-battle/AIBattle";
import Achievements from "./components/achievements/Achievements";
import CustomMode from "./components/custom/CustomMode";
import ProfileHub from "./components/profile/ProfileHub";
import UserProfile from "./components/profile/UserProfileV2";
import DailyChallenge from "./components/challenges/DailyChallenge";
import LeaderboardV2 from "./components/leaderboard/LeaderboardV2";
import FAQ from "./pages/FAQ";

const Routes = () => {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route element={<MainLayout />}>
            <Route index element={<Homes />} />
            <Route path="/login" element={<Login/>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/results" element={<ScorePage />} />
            <Route path="/results/:shareCode" element={<ScorePage />} />
            <Route path="/s/:shareCode" element={<ScorePage />} />
            <Route path="/profile" element={<ProfileHub />} />
            <Route path="/settings" element={<ProfileHub />} />
            <Route path="/history" element={<Navigate to="/profile?tab=history" replace />} />
            <Route path="/leaderboard" element={<LeaderboardV2 />} />
            <Route path="/users/:userId" element={<UserProfile />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* v2 Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/multiplayer" element={<MultiplayerLobby />} />
            <Route path="/ai-battle" element={<AIBattle />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/custom" element={<CustomMode />} />
            <Route path="/daily" element={<DailyChallenge />} />
            
            <Route path="*" element={<Errors />} />
        </Route>
    ));
  return (
    <RouterProvider router={router} />
  )
}

export default Routes
