import { matchPath, useLocation } from "react-router-dom";
import Meta from "./Meta";

const SITE_URL = "https://keydash.shresthamanish.info.np";

const ROUTE_META_CONFIG = [
  {
    path: "/leaderboard",
    title: "Typing Leaderboard | KeyDash",
    description:
      "See daily, weekly, monthly, and all-time typing speed rankings. Compare WPM, accuracy, and consistency on KeyDash's online typing leaderboard.",
    keywords:
      "typing leaderboard, typing speed ranking, online typing leaderboard, fastest typists, wpm leaderboard",
  },
  {
    path: "/faq",
    title: "FAQ | KeyDash — Typing Test Questions & Answers",
    description:
      "Frequently asked questions about KeyDash — typing modes, accounts, leaderboards, multiplayer, AI battles, achievements, privacy, and more.",
    keywords:
      "keydash faq, typing test help, typing test questions, keydash support, typing test troubleshooting",
  },
  {
    path: "/users/:userId",
    title: "Typing Profile | KeyDash",
    description:
      "Public KeyDash typing profile with speed stats, achievements, and recent performance.",
    keywords:
      "typing profile, typing stats, online typing achievements, typing speed profile",
  },
  {
    path: "/dashboard",
    title: "Dashboard | KeyDash",
    description: "Personal typing dashboard for KeyDash users.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/profile",
    title: "My Profile | KeyDash",
    description: "Manage your typing profile and account settings on KeyDash.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/settings",
    title: "Settings | KeyDash",
    description: "Update your KeyDash account and profile settings.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/multiplayer",
    title: "Multiplayer Typing Race | KeyDash",
    description: "Join real-time multiplayer typing races on KeyDash.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/ai-battle",
    title: "AI Typing Battle | KeyDash",
    description: "Race against AI opponents in KeyDash typing battles.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/achievements",
    title: "Typing Achievements | KeyDash",
    description: "Track and unlock typing achievements in KeyDash.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/custom",
    title: "Custom Typing Test | KeyDash",
    description: "Create custom text typing tests on KeyDash.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/daily",
    title: "Daily Typing Challenge | KeyDash",
    description: "Complete the daily typing challenge on KeyDash.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/results",
    title: "Typing Results | KeyDash",
    description: "Your recent KeyDash typing test results.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/results/:shareCode",
    title: "Shared Typing Result | KeyDash",
    description: "Shared KeyDash typing test result.",
    noIndex: true,
    noFollow: true,
  },
  {
    path: "/s/:shareCode",
    title: "Shared Typing Result | KeyDash",
    description: "Shared KeyDash typing test result.",
    noIndex: true,
    noFollow: true,
  },
];

const RouteMeta = () => {
  const location = useLocation();

  const matchedRoute = ROUTE_META_CONFIG.find((item) =>
    matchPath({ path: item.path, end: true }, location.pathname)
  );

  if (!matchedRoute) {
    return null;
  }

  const canonicalUrl = `${SITE_URL}${location.pathname}`;

  return (
    <Meta
      title={matchedRoute.title}
      description={matchedRoute.description}
      keywords={matchedRoute.keywords}
      url={canonicalUrl}
      noIndex={matchedRoute.noIndex}
      noFollow={matchedRoute.noFollow}
    />
  );
};

export default RouteMeta;
