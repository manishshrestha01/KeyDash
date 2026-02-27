import { Link } from "react-router-dom";
import Meta from "../components/Meta";

const sections = [
  {
    id: "information",
    title: "Information We Collect",
    body: [
      "Account information: if you create an account we may collect your email address, display name and avatar.",
      "Usage data: data about your interactions with the Service such as typing results (WPM, accuracy, scores), timestamps, and device/browser information.",
      "Cookies and similar technologies for functionality and analytics.",
    ],
  },
  {
    id: "usage",
    title: "How We Use Information",
    body: [
      "We use the information to provide and improve the Service, personalize your experience, maintain your account, and communicate with you about updates. We also use aggregated and anonymized data for analytics and performance monitoring.",
    ],
  },
  {
    id: "third-party",
    title: "Third-Party Services",
    body: [
      "We may use third-party services (for example, Supabase for authentication and data storage, and Google Analytics for site analytics). Those services have their own privacy policies and we encourage you to review them. We do not sell your personal information.",
    ],
  },
  {
    id: "retention",
    title: "Data Retention",
    body: [
      "We retain information as long as necessary to provide the Service and to comply with legal obligations. Usage data may be retained in aggregated form for analytics and troubleshooting.",
    ],
  },
  {
    id: "choices",
    title: "Your Choices",
    body: [
      "You can manage or delete your account information by visiting your profile settings or by contacting us at support@keydash.shresthamanish.info.np.",
    ],
  },
  {
    id: "security",
    title: "Security",
    body: [
      "We take reasonable technical and organizational measures to protect your information, but no method of transmission or storage is completely secure. If you suspect a security issue, please contact us right away.",
    ],
  },
  {
    id: "children",
    title: "Children",
    body: [
      "The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13.",
    ],
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    body: [
      'We may update this Privacy Policy from time to time. If we make material changes we will provide notice by updating the "Last updated" date at the top of this page.',
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [
      "If you have questions about this Privacy Policy, please contact us at support@keydash.shresthamanish.info.np.",
    ],
  },
];

const PrivacyPolicy = () => {
  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-80px)] bg-[#070d18] text-slate-100">
      <Meta
        title="Privacy Policy | KeyDash"
        description="How KeyDash collects, uses, and protects your information."
        url="https://keydash.shresthamanish.info.np/privacy-policy"
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-72 h-72 bg-sky-500/10 blur-3xl rounded-full" />
        <div className="absolute top-1/3 -right-16 w-72 h-72 bg-emerald-400/10 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm p-6 sm:p-10 shadow-2xl">
          <p className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-200">
            Privacy
          </p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-bold leading-tight">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-300">Last updated: January 17, 2026</p>
          <p className="mt-5 max-w-3xl text-slate-200 leading-relaxed">
            At KeyDash ("we", "us", "our"), your privacy is important to us. This
            Privacy Policy explains what information we collect, how we use it, and
            the choices you have regarding your information when you use
            https://keydash.shresthamanish.info.np/ (the "Service").
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-yellow-500 transition"
            >
              Back to Home
            </Link>
            <Link
              to="/terms-of-service"
              className="inline-flex items-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[240px,1fr]">
          <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-white/10 bg-[#111a2b]/90 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">
              On this page
            </h2>
            <nav className="space-y-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10 transition"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-4">
            {sections.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="rounded-2xl border border-white/10 bg-[#111a2b]/80 p-5 sm:p-6"
              >
                <h2 className="text-xl sm:text-2xl font-semibold">{section.title}</h2>
                <div className="mt-3 space-y-3 text-slate-300 leading-relaxed">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
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
