import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";
import { RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import ScorePage from "./modes/ScorePage";
import Leaderboards from "./pages/Leaderboards";
import Errors from "./pages/Errors";
import Homes from "./pages/Homes";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

// v2 Components
import Dashboard from "./components/dashboard/Dashboard";
import TypingHistory from "./components/history/TypingHistory";
import MultiplayerLobby from "./components/multiplayer/MultiplayerLobby";
import AIBattle from "./components/ai-battle/AIBattle";
import Achievements from "./components/achievements/Achievements";
import LeaderboardV2 from "./components/leaderboard/LeaderboardV2";
import CustomMode from "./components/custom/CustomMode";
import ResultsPage from "./components/results/ResultsPage";
import ProfileHub from "./components/profile/ProfileHub";
import UserProfileV2 from "./components/profile/UserProfileV2";
import DailyChallenge from "./components/challenges/DailyChallenge";

const Routes = () => {
    const router = createBrowserRouter(createRoutesFromElements(
        <Route element={<MainLayout />}>
            <Route index element={<Homes />} />
            <Route path="/login" element={<Login/>} />
            <Route path="/results" element={<ScorePage />} />
            <Route path="/results/v2" element={<ResultsPage />} />
            <Route path="/profile" element={<ProfileHub />} />
            <Route path="/settings" element={<ProfileHub />} />
            <Route path="/leaderboard" element={<Leaderboards/>} />
            <Route path="/leaderboard/v2" element={<LeaderboardV2 />} />
            <Route path="/users/:userId" element={<UserProfileV2 />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            
            {/* v2 Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<TypingHistory />} />
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