import { Link } from "react-router-dom";
import Meta from "../components/Meta";

const sections = [
  {
    id: "accounts",
    title: "Accounts",
    body: [
      "Some features of the Service may require an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.",
    ],
  },
  {
    id: "service-use",
    title: "Use of the Service",
    body: [
      "You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not engage in any activity that interferes with or disrupts the Service.",
    ],
  },
  {
    id: "user-content",
    title: "User Content",
    body: [
      "You retain ownership of content you submit (for example, profile display name). By submitting content you grant KeyDash a non-exclusive, worldwide license to use, host, and display that content as necessary to provide the Service.",
    ],
  },
  {
    id: "prohibited-conduct",
    title: "Prohibited Conduct",
    body: [
      "You must not use the Service to harass, impersonate, harm, or otherwise infringe on the rights of others. You also must not attempt to access the Service's systems or data without authorization.",
    ],
  },
  {
    id: "termination",
    title: "Termination",
    body: [
      "We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our discretion.",
    ],
  },
  {
    id: "liability",
    title: "Disclaimers and Limitation of Liability",
    body: [
      'The Service is provided "as is" and "as available". To the fullest extent permitted by law, KeyDash disclaims all warranties and will not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.',
    ],
  },
  {
    id: "changes",
    title: "Changes to Terms",
    body: [
      'We may modify these Terms from time to time. If we make material changes we will provide notice by updating the "Last updated" date. By continuing to use the Service after changes become effective, you agree to the updated Terms.',
    ],
  },
  {
    id: "law",
    title: "Governing Law",
    body: [
      "These Terms are governed by the laws of the jurisdiction where KeyDash operates, unless otherwise required by applicable law.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [
      "If you have questions about these Terms, please contact us at support@keydash.shresthamanish.info.np.",
    ],
  },
];

const TermsOfService = () => {
  return (
    <section className="relative overflow-hidden min-h-[calc(100vh-80px)] bg-[#070d18] text-slate-100">
      <Meta
        title="Terms of Service | KeyDash"
        description="Terms of service for using KeyDash - rules and guidelines for using the typing test service."
        url="https://keydash.shresthamanish.info.np/terms-of-service"
      />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-72 h-72 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute top-1/3 -right-16 w-72 h-72 bg-yellow-400/10 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
        <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm p-6 sm:p-10 shadow-2xl">
          <p className="inline-flex items-center rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-yellow-300">
            Legal
          </p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-bold leading-tight">Terms of Service</h1>
          <p className="mt-3 text-sm text-slate-300">Last updated: January 17, 2026</p>
          <p className="mt-5 max-w-3xl text-slate-200 leading-relaxed">
            Welcome to KeyDash. By accessing or using the website
            (https://keydash.shresthamanish.info.np) (the "Service"), you agree to be
            bound by these Terms of Service ("Terms"). If you do not agree with any
            part of these Terms, you must not use the Service.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-yellow-500 transition"
            >
              Back to Home
            </Link>
            <Link
              to="/privacy-policy"
              className="inline-flex items-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Privacy Policy
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

export default TermsOfService;
