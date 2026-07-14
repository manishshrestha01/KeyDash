import { matchPath, useLocation } from "react-router-dom";
import Meta from "./Meta";

const SITE_URL = "https://keydash.shresthamanish.info.np";

const ROUTE_META_CONFIG = [
  {
    path: "/leaderboard",
    title: "Typing Leaderboard | KeyDash — Top Speed Rankings",
    description:
      "View daily, weekly, monthly, and all-time typing speed rankings on KeyDash. See the fastest typists, compare WPM and accuracy, and compete for the top spot.",
    keywords:
      "typing leaderboard, typing speed ranking, online typing leaderboard, fastest typists, wpm leaderboard, typing competition, best typists online",
  },
  {
    path: "/multiplayer",
    title: "Multiplayer Typing Race | KeyDash — Race Against Friends",
    description:
      "Join real-time multiplayer typing races on KeyDash. Create a room, invite friends, and race to type the fastest. Track WPM and accuracy live during the race.",
    keywords:
      "multiplayer typing race, real-time typing game, typing race online, type against friends, multiplayer typing test, competitive typing game, race typing speed",
  },
  {
    path: "/ai-battle",
    title: "AI Typing Battle | KeyDash — Race Against AI Opponents",
    description:
      "Challenge AI opponents in KeyDash typing battles. Choose Easy, Medium, Hard, or Pro difficulty and race to finish the text first. Improve your typing speed with AI practice.",
    keywords:
      "AI typing battle, typing vs computer, AI typing practice, typing bot challenge, improve typing speed, AI typing game, typing competition AI",
  },
  {
    path: "/daily",
    title: "Daily Typing Challenge | KeyDash — Test Your Speed Every Day",
    description:
      "Complete KeyDash's daily typing challenge. Every day a new text is published — type it as fast as you can and compete on the daily leaderboard. Build your streak and earn achievements.",
    keywords:
      "daily typing challenge, typing challenge today, daily typing test, typing streak, daily WPM challenge, typing practice daily, everyday typing test",
  },
  {
    path: "/custom",
    title: "Custom Typing Test | KeyDash — Practice With Your Own Text",
    description:
      "Create custom typing tests on KeyDash. Paste any text — code, articles, or practice material — and test your typing speed and accuracy on it.",
    keywords:
      "custom typing test, type your own text, custom typing practice, paste text typing test, typing test with custom text, practice typing code",
  },
  {
    path: "/achievements",
    title: "Typing Achievements | KeyDash — Unlock 1200+ Badges",
    description:
      "Track and unlock over 1200 typing achievements on KeyDash. Earn badges for speed milestones, accuracy records, streaks, coding mastery, multiplayer victories, and more.",
    keywords:
      "typing achievements, typing badges, typing milestones, typing speed achievements, typing streak badges, typing gamification, typing rewards",
  },
  {
    path: "/dashboard",
    title: "Typing Dashboard | KeyDash — Your Stats & Progress",
    description:
      "View your complete typing dashboard on KeyDash. Track WPM, accuracy, streaks, achievements, and progress over time. Your personal typing performance hub.",
    keywords:
      "typing dashboard, typing stats, typing progress tracker, WPM history, typing performance, typing analytics, typing history dashboard",
  },
  {
    path: "/faq",
    title: "FAQ | KeyDash — Typing Test Questions & Answers",
    description:
      "Frequently asked questions about KeyDash — typing modes, accounts, leaderboards, multiplayer, AI battles, achievements, privacy, and more.",
    keywords:
      "keydash faq, typing test help, typing test questions, keydash support, typing test troubleshooting, how to type faster, typing test accuracy",
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
