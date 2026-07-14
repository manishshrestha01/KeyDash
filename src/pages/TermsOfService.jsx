import { useState } from "react";
import { Link } from "react-router-dom";
import Meta from "../components/Meta";

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    icon: "📋",
    body: [
      "By accessing or using KeyDash (https://keydash.shresthamanish.info.np), you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.",
      "These Terms apply to all visitors, users, and others who access or use KeyDash. We may update these Terms from time to time — continued use after changes means you accept the new Terms.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts & Registration",
    icon: "👤",
    body: [
      "You may register an account using your email and password, or via Google OAuth. You are responsible for keeping your login credentials secure and confidential.",
      "You must provide accurate, current, and complete information during registration. You are solely responsible for all activity that occurs under your account.",
      "You must be at least 13 years old to create an account. By registering, you confirm you meet this requirement.",
      "We reserve the right to suspend or terminate accounts that violate these Terms, contain offensive display names, or are used for malicious purposes.",
    ],
  },
  {
    id: "service-use",
    title: "Use of the Service",
    icon: "⌨️",
    body: [
      "KeyDash is a typing practice and performance tracking platform. You may use it for personal, non-commercial purposes to improve your typing speed and accuracy.",
      "You agree not to: (a) use bots, scripts, or automated tools to manipulate scores or leaderboards; (b) attempt to gain unauthorized access to any part of the Service; (c) reverse-engineer, decompile, or disassemble any part of the platform; (d) interfere with or disrupt the integrity or performance of the Service.",
      "Fair play is important to us. Any attempt to cheat, manipulate typing results, or exploit bugs for leaderboard advantage may result in immediate account termination.",
    ],
  },
  {
    id: "user-content",
    title: "User Content",
    icon: "✏️",
    body: [
      "You retain ownership of content you submit to KeyDash, such as your display name, bio, and profile links. By submitting content, you grant KeyDash a non-exclusive, worldwide, royalty-free license to use, display, and store that content solely to operate the Service.",
      "You must not submit content that is offensive, illegal, harassing, defamatory, or infringes on the intellectual property rights of others.",
      "We reserve the right to remove any content that violates these Terms without prior notice.",
    ],
  },
  {
    id: "leaderboards",
    title: "Leaderboards & Scores",
    icon: "🏆",
    body: [
      "Typing scores, WPM records, accuracy stats, and leaderboard rankings are publicly visible to all users of the Service.",
      "By participating in leaderboards, you consent to your display name and typing statistics being shown publicly on the platform.",
      "We reserve the right to remove or adjust scores that appear to be achieved through cheating, automation, or exploitation of bugs.",
    ],
  },
  {
    id: "prohibited-conduct",
    title: "Prohibited Conduct",
    icon: "🚫",
    body: [
      "You must not: impersonate another person or entity; harass, threaten, or intimidate other users; post spam or unsolicited messages; attempt to scrape, harvest, or collect data from the platform in bulk.",
      "Uploading or sharing malware, viruses, or any code designed to interfere with the Service is strictly prohibited.",
      "Violations may result in immediate account suspension or termination, with or without notice.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    icon: "©️",
    body: [
      "All content on KeyDash — including the logo, design, code, text, graphics, and typing challenges — is owned by or licensed to KeyDash and is protected by copyright and other intellectual property laws.",
      "You may not copy, reproduce, distribute, or create derivative works from any part of the Service without prior written permission.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    icon: "🔒",
    body: [
      "You may stop using KeyDash at any time. You may request account deletion by contacting us at contact@shresthamanish.info.np.",
      "We may suspend or terminate your access at any time, for any reason, including violation of these Terms — with or without notice.",
      "Upon termination, your right to use the Service will immediately cease. Provisions that by their nature should survive termination shall remain in effect.",
    ],
  },
  {
    id: "liability",
    title: "Disclaimers & Limitation of Liability",
    icon: "⚖️",
    body: [
      'The Service is provided "as is" and "as available" without warranty of any kind. We do not guarantee the Service will be error-free, uninterrupted, or meet your specific requirements.',
      "To the fullest extent permitted by law, KeyDash and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of data or profits — arising from your use of the Service.",
      "Our total liability for any claim arising from your use of KeyDash shall not exceed the amount you paid us in the last 12 months (which, since KeyDash is free, is $0).",
    ],
  },
  {
    id: "changes",
    title: "Changes to Terms",
    icon: "🔄",
    body: [
      'We may revise these Terms at any time. Material changes will be communicated by updating the "Last updated" date at the top of this page.',
      "Your continued use of KeyDash after any changes constitutes your acceptance of the revised Terms. We encourage you to review this page periodically.",
    ],
  },
  {
    id: "law",
    title: "Governing Law",
    icon: "🌐",
    body: [
      "These Terms are governed by and construed in accordance with the laws applicable in the jurisdiction where KeyDash operates, without regard to conflict of law principles.",
      "Any disputes arising from these Terms or your use of the Service shall be resolved through good-faith negotiation. If unresolved, disputes shall be subject to the exclusive jurisdiction of the applicable courts.",
    ],
  },
  {
    id: "contact",
    title: "Contact Us",
    icon: "📬",
    body: [
      "If you have questions, concerns, or feedback about these Terms, please reach out to us:",
      "📧 Email: contact@shresthamanish.info.np",
      "🌐 Website: https://keydash.shresthamanish.info.np",
      "We aim to respond to all inquiries within 3 business days.",
    ],
  },
];

const TermsOfService = () => {
  const [activeId, setActiveId] = useState(null);

  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-80px)] bg-[#0a0f1a] text-slate-100">
      <Meta
        title="Terms of Service | KeyDash — Usage Rules & Guidelines"
        description="Terms of Service for KeyDash — rules, guidelines, and policies for using the free online typing test platform."
        url="https://keydash.shresthamanish.info.np/terms-of-service"
      />

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-yellow-400/5 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-yellow-400/5 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-12 sm:py-16">

        {/* Hero */}
        <div className="rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-[#1a1f2e] to-[#141824] p-8 sm:p-12 shadow-2xl mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-yellow-400 mb-5">
            ⚖️ Legal
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white mb-3">
            Terms of <span className="text-yellow-400">Service</span>
          </h1>
          <p className="text-sm text-gray-500 mb-4">Last updated: July 11, 2025</p>
          <p className="max-w-3xl text-gray-300 leading-relaxed text-base">
            Welcome to <strong className="text-white">KeyDash</strong> — the competitive typing platform. By using our Service you agree to these Terms. Please read them carefully. They're written in plain language so they're easy to understand.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 transition">
              ← Back to Home
            </Link>
            <Link to="/privacy-policy" className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition">
              Privacy Policy
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
                      ? "bg-yellow-400/10 text-yellow-400 font-semibold"
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

export default TermsOfService;
