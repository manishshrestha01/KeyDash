import { useState } from "react";
import { Link } from "react-router-dom";
import Meta from "../components/Meta";

const sections = [
  {
    id: "overview",
    title: "Overview",
    icon: "🛡️",
    body: [
      "At KeyDash, your privacy matters. This Privacy Policy explains what information we collect, why we collect it, how we use it, and the rights and choices you have.",
      "By using KeyDash (https://keydash.shresthamanish.info.np), you agree to the practices described in this policy. If you have questions, contact us at contact@shresthamanish.info.np.",
    ],
  },
  {
    id: "information",
    title: "Information We Collect",
    icon: "📥",
    body: [
      "Account information: when you register, we collect your email address, display name, and optionally an avatar photo. If you sign in via Google, we receive your name, email, and profile picture from Google.",
      "Typing & performance data: WPM, accuracy, error counts, test duration, mode, difficulty, and timestamps for every typing session you complete.",
      "Profile data: bio, social links (Twitter, GitHub, LinkedIn, etc.), streak records, and achievement progress that you choose to add.",
      "Usage & device data: browser type, operating system, pages visited, and session timestamps — collected automatically for debugging and improving the Service.",
      "Cookies: we use essential cookies to keep you logged in. We may also use analytics cookies to understand how users interact with the platform.",
    ],
  },
  {
    id: "usage",
    title: "How We Use Your Information",
    icon: "⚙️",
    body: [
      "To operate the Service: authenticate your account, save your typing history, calculate your statistics, and display your profile.",
      "To personalize your experience: show your progress, streaks, achievements, and personalized leaderboard rankings.",
      "To improve KeyDash: analyze aggregated and anonymized usage patterns to fix bugs, optimize performance, and build new features.",
      "To communicate with you: respond to support requests and send important account-related notices (not marketing spam).",
      "We do not use your personal data for advertising, and we never sell your information to third parties.",
    ],
  },
  {
    id: "sharing",
    title: "Information Sharing",
    icon: "🤝",
    body: [
      "We do not sell, rent, or trade your personal information to anyone — ever.",
      "Public profile data: your display name, avatar, typing stats, and leaderboard rankings are visible to other users of KeyDash by default. You can make your profile private in your settings.",
      "Service providers: we use Supabase (database and authentication) to store your data securely. These providers are bound by strict data processing agreements.",
      "Legal requirements: we may disclose information if required by law, court order, or to protect the rights and safety of our users or the public.",
    ],
  },
  {
    id: "third-party",
    title: "Third-Party Services",
    icon: "🔗",
    body: [
      "Supabase: handles authentication (email/password and Google OAuth) and database storage. Data is stored in Supabase's secure cloud infrastructure. See: https://supabase.com/privacy",
      "Google OAuth: if you choose to sign in with Google, Google shares your name, email, and profile picture with us. We only use this to create and manage your account. See: https://policies.google.com/privacy",
      "We encourage you to review the privacy policies of these third-party services.",
    ],
  },
  {
    id: "retention",
    title: "Data Retention",
    icon: "🗄️",
    body: [
      "We retain your account data for as long as your account is active. Typing history, scores, and profile data are kept to power your stats and history.",
      "If you request account deletion, we will delete your personal data within 30 days, except where we are legally required to retain it.",
      "Aggregated, anonymized data (e.g., average WPM across all users) may be retained indefinitely as it cannot identify you.",
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: "🔐",
    body: [
      "We take security seriously. Passwords are never stored in plain text — they are hashed using bcrypt via Supabase Auth. All data is transmitted over HTTPS.",
      "We implement reasonable technical and organizational safeguards to protect your data from unauthorized access, alteration, or disclosure.",
      "No method of transmission over the internet is 100% secure. If you believe your account has been compromised, contact us immediately at contact@shresthamanish.info.np.",
    ],
  },
  {
    id: "rights",
    title: "Your Rights & Choices",
    icon: "✅",
    body: [
      "Access & update: you can view and edit your profile information anytime from your profile settings page.",
      "Delete your account: contact us at contact@shresthamanish.info.np to request account and data deletion.",
      "Make profile private: you can hide your profile from public leaderboards and other users in your profile settings.",
      "Opt out of cookies: you can disable non-essential cookies in your browser settings, though this may affect some functionality.",
      "If you are in the EU/EEA, you may have additional rights under GDPR, including the right to data portability and the right to object to processing.",
    ],
  },
  {
    id: "children",
    title: "Children's Privacy",
    icon: "👶",
    body: [
      "KeyDash is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.",
      "If you believe a child under 13 has provided us with personal information, please contact us immediately and we will delete it promptly.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    icon: "🔄",
    body: [
      'We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page.',
      "For significant changes, we will make reasonable efforts to notify users. Your continued use of KeyDash after changes are posted means you accept the updated policy.",
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    icon: "📬",
    body: [
      "If you have questions, requests, or concerns about this Privacy Policy or how your data is handled, please contact us:",
      "📧 Email: contact@shresthamanish.info.np",
      "🌐 Website: https://keydash.shresthamanish.info.np",
      "We aim to respond to all privacy-related inquiries within 5 business days.",
    ],
  },
];

const PrivacyPolicy = () => {
  const [activeId, setActiveId] = useState(null);

  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-80px)] bg-[#0a0f1a] text-slate-100">
      <Meta
        title="Privacy Policy | KeyDash"
        description="How KeyDash collects, uses, and protects your personal information."
        url="https://keydash.shresthamanish.info.np/privacy-policy"
      />

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-20 w-96 h-96 bg-emerald-400/5 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-blue-400/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-yellow-400/5 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">

        {/* Hero */}
        <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-[#1a1f2e] to-[#141824] p-8 sm:p-12 shadow-2xl mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400 mb-5">
            🛡️ Privacy
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white mb-3">
            Privacy <span className="text-emerald-400">Policy</span>
          </h1>
          <p className="text-sm text-gray-500 mb-4">Last updated: July 11, 2025</p>
          <p className="max-w-3xl text-gray-300 leading-relaxed text-base">
            At <strong className="text-white">KeyDash</strong>, we believe privacy is a right, not a feature. This policy is written in plain language — no legalese — so you always know what data we have and how we use it.
          </p>

          {/* Quick trust badges */}
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { icon: "🚫", label: "We don't sell your data" },
              { icon: "🔐", label: "Passwords are hashed" },
              { icon: "🌍", label: "HTTPS everywhere" },
            ].map((b) => (
              <span key={b.label} className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-gray-300 font-medium">
                {b.icon} {b.label}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 transition">
              ← Back to Home
            </Link>
            <Link to="/terms-of-service" className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition">
              Terms of Service
            </Link>
            <Link to="/faq" className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition">
              FAQ
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px,1fr]">

          {/* Sticky sidebar */}
          <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-gray-800 bg-[#111824] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">On this page</p>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActiveId(s.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    activeId === s.id
                      ? "bg-emerald-400/10 text-emerald-400 font-semibold"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{s.icon}</span> {s.title}
                </a>
              ))}
            </nav>
          </aside>

          {/* Sections */}
          <div className="space-y-5">
            {sections.map((s) => (
              <article
                key={s.id}
                id={s.id}
                className="rounded-2xl border border-gray-800 bg-[#111824] p-6 sm:p-8 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{s.icon}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{s.title}</h2>
                </div>
                <div className="space-y-3 text-gray-400 leading-relaxed">
                  {s.body.map((p, i) => (
                    <p key={i} className={p.startsWith("📧") || p.startsWith("🌐") ? "text-gray-300 font-medium" : ""}>{p}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacyPolicy;
