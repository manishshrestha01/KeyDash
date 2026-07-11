import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Meta from "../components/Meta";

const categories = [
  {
    id: "general",
    label: "General",
    icon: "💡",
    questions: [
      {
        q: "What is KeyDash?",
        a: "KeyDash is a competitive typing practice platform where you can test and improve your typing speed (WPM) and accuracy. It features multiple game modes, daily challenges, leaderboards, achievements, and multiplayer battles.",
      },
      {
        q: "Is KeyDash free to use?",
        a: "Yes! KeyDash is completely free. All core features — typing tests, leaderboards, achievements, daily challenges, and multiplayer — are available at no cost.",
      },
      {
        q: "Do I need an account to use KeyDash?",
        a: "You can take typing tests without an account, but you'll need to register to save your progress, appear on leaderboards, earn achievements, and access your typing history.",
      },
      {
        q: "What devices and browsers does KeyDash support?",
        a: "KeyDash works on any modern browser (Chrome, Firefox, Safari, Edge) on desktop and laptop computers. For the best typing experience, we recommend using a physical keyboard on a desktop or laptop.",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    icon: "👤",
    questions: [
      {
        q: "How do I create an account?",
        a: "Click 'Login' in the navbar and switch to the 'Register' tab. Enter your email and a password (minimum 6 characters), then click 'Create Account'. You'll be logged in immediately — no email confirmation needed.",
      },
      {
        q: "Can I sign in with Google?",
        a: "Yes! On the login page, click 'Continue with Google' to sign in using your Google account. Your display name and avatar will be pulled from your Google profile automatically.",
      },
      {
        q: "I forgot my password — how do I reset it?",
        a: "On the login page, click 'Forgot password?' below the password field. Enter your email, and we'll send a 6-digit OTP code. Enter the code, then set a new password. The whole process takes under a minute.",
      },
      {
        q: "How do I update my profile (display name, avatar, bio)?",
        a: "Go to your Profile page (click your avatar in the navbar). From there you can update your display name, upload a profile picture, add a bio, and link your social accounts.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. To request account deletion, email us at contact@shresthamanish.info.np with the subject 'Account Deletion Request'. We'll delete your account and all associated data within 30 days.",
      },
      {
        q: "Can I make my profile private?",
        a: "Yes. In your profile settings, toggle 'Public Profile' off. This hides you from leaderboards and prevents other users from viewing your profile page.",
      },
    ],
  },
  {
    id: "typing",
    label: "Typing & Modes",
    icon: "⌨️",
    questions: [
      {
        q: "What typing modes are available?",
        a: "KeyDash offers several modes: Timed (15s, 30s, 60s, 120s), Sentence mode (easy, medium, hard, extreme), Custom mode (bring your own text), Daily Challenge, AI Battle, and Multiplayer.",
      },
      {
        q: "How is WPM (Words Per Minute) calculated?",
        a: "WPM is calculated as the number of correctly typed characters divided by 5 (the average word length), divided by the time in minutes. Only correctly typed words count — errors reduce your effective WPM.",
      },
      {
        q: "How is accuracy calculated?",
        a: "Accuracy is the percentage of correctly typed characters out of total characters typed. For example, if you type 95 characters correctly out of 100 total keystrokes, your accuracy is 95%.",
      },
      {
        q: "What is the Daily Challenge?",
        a: "Every day at midnight UTC, a new challenge text is published. All users type the same text and compete on the same daily leaderboard. Your best score for the day is recorded.",
      },
      {
        q: "What is AI Battle mode?",
        a: "AI Battle pits you against an AI opponent with a configurable WPM. Race to finish the text first and beat the AI's pace. Great for pushing yourself to hit a target speed.",
      },
      {
        q: "How does Multiplayer work?",
        a: "In Multiplayer, you can create or join a lobby and race against real users in real time. Each player types the same text and progress is shown live. The fastest finisher wins.",
      },
    ],
  },
  {
    id: "leaderboards",
    label: "Leaderboards & Stats",
    icon: "🏆",
    questions: [
      {
        q: "How do leaderboards work?",
        a: "Leaderboards rank users by their best WPM score for each mode and time period. There are all-time, monthly, and weekly leaderboards. Your display name and score are public by default.",
      },
      {
        q: "Why isn't my score appearing on the leaderboard?",
        a: "Make sure you're logged in and your profile is set to public. Leaderboards update within a few seconds of completing a test. If your score still doesn't appear after a minute, try refreshing the page.",
      },
      {
        q: "What are streaks?",
        a: "A streak counts how many consecutive days you've completed at least one typing test. Log in and type every day to maintain and grow your streak. Missing a day resets it to zero.",
      },
      {
        q: "How do achievements work?",
        a: "Achievements are earned automatically when you hit milestones — like reaching 100 WPM, completing 50 tests, or maintaining a 7-day streak. Check the Achievements page to see your progress and what's left to unlock.",
      },
      {
        q: "Can I see my full typing history?",
        a: "Yes. Visit your Profile page and go to the History tab to see every test you've completed, including WPM, accuracy, mode, and date.",
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy & Data",
    icon: "🔐",
    questions: [
      {
        q: "Is my password stored securely?",
        a: "Yes. Passwords are never stored in plain text. We use bcrypt hashing via Supabase Auth, which is the industry standard. Even we cannot see your password.",
      },
      {
        q: "Does KeyDash sell my data?",
        a: "Absolutely not. We do not sell, rent, or share your personal information with advertisers or any third parties for commercial purposes.",
      },
      {
        q: "What data does KeyDash store about me?",
        a: "We store your email, display name, avatar, typing scores, test history, streak data, and profile information you choose to add. See our full Privacy Policy for details.",
      },
      {
        q: "How can I request my data or have it deleted?",
        a: "Email us at contact@shresthamanish.info.np and we'll provide a copy of your data or delete it within 30 days, as required.",
      },
    ],
  },
  {
    id: "technical",
    label: "Technical",
    icon: "🛠️",
    questions: [
      {
        q: "Why is my WPM lower on KeyDash than on other sites?",
        a: "Different platforms calculate WPM differently. KeyDash uses a strict calculation: only fully correct words count. Some platforms count gross WPM (including errors). Our method gives you a more accurate picture of your real typing speed.",
      },
      {
        q: "The site seems slow or isn't loading — what should I do?",
        a: "Try clearing your browser cache and refreshing the page. If the issue persists, try a different browser or check if there's a network issue on your end. You can also contact us at contact@shresthamanish.info.np.",
      },
      {
        q: "My typing test result didn't save. What happened?",
        a: "Results require an active internet connection and a logged-in account to save. If you lost connection mid-test, the result may not have been recorded. Check your History page — if it's missing, try the test again with a stable connection.",
      },
      {
        q: "I found a bug. How do I report it?",
        a: "We'd love to hear about it! Email contact@shresthamanish.info.np with a description of the bug, what you were doing when it occurred, and your browser/OS. Screenshots are very helpful.",
      },
    ],
  },
];

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border transition-colors duration-200 overflow-hidden ${open ? "border-yellow-400/30 bg-yellow-400/5" : "border-gray-800 bg-[#111824]"}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className={`font-semibold text-base leading-snug transition-colors ${open ? "text-yellow-400" : "text-white"}`}>
          {q}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
          <ChevronDown className={`w-5 h-5 transition-colors ${open ? "text-yellow-400" : "text-gray-500"}`} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-gray-400 leading-relaxed text-sm">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState("general");

  const current = categories.find((c) => c.id === activeCategory);

  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-80px)] bg-[#0a0f1a] text-slate-100">
      <Meta
        title="FAQ | KeyDash"
        description="Frequently asked questions about KeyDash — typing modes, accounts, leaderboards, privacy, and more."
        url="https://keydash.shresthamanish.info.np/faq"
      />

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-yellow-400/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-400/5 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">

        {/* Hero */}
        <div className="rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-[#1a1f2e] to-[#141824] p-8 sm:p-12 shadow-2xl mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-400 mb-5">
            ❓ Help Center
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white mb-4">
            Frequently Asked <span className="text-yellow-400">Questions</span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-base leading-relaxed mb-8">
            Everything you need to know about KeyDash. Can't find what you're looking for?{" "}
            <a href="mailto:contact@shresthamanish.info.np" className="text-yellow-400 hover:underline">
              Contact us
            </a>
            .
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { label: "Questions answered", value: `${categories.reduce((a, c) => a + c.questions.length, 0)}+` },
              { label: "Categories", value: categories.length },
              { label: "Response time", value: "< 3 days" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-yellow-400">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px,1fr]">

          {/* Category sidebar */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all text-left ${
                  activeCategory === c.id
                    ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20"
                    : "bg-[#111824] border border-gray-800 text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-lg">{c.icon}</span>
                {c.label}
                <span className={`ml-auto text-xs rounded-full px-2 py-0.5 font-bold ${
                  activeCategory === c.id ? "bg-black/20 text-black" : "bg-gray-800 text-gray-500"
                }`}>
                  {c.questions.length}
                </span>
              </button>
            ))}

            {/* Contact card */}
            <div className="mt-4 rounded-2xl border border-gray-800 bg-[#111824] p-5">
              <p className="text-sm font-semibold text-white mb-1">Still need help?</p>
              <p className="text-xs text-gray-500 mb-3">Our team usually replies within 3 business days.</p>
              <a
                href="mailto:contact@shresthamanish.info.np"
                className="block text-center rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold py-2.5 transition"
              >
                📧 Email Support
              </a>
            </div>
          </aside>

          {/* Questions */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{current.icon}</span>
              <div>
                <h2 className="text-2xl font-extrabold text-white">{current.label}</h2>
                <p className="text-gray-500 text-sm">{current.questions.length} questions</p>
              </div>
            </div>

            <div className="space-y-3">
              {current.questions.map((item, i) => (
                <FAQItem key={i} q={item.q} a={item.a} />
              ))}
            </div>

            {/* Footer nav */}
            <div className="mt-10 flex flex-wrap gap-3 pt-6 border-t border-gray-800">
              <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 transition">
                ← Back to Home
              </Link>
              <Link to="/terms-of-service" className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition">
                Terms of Service
              </Link>
              <Link to="/privacy-policy" className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
