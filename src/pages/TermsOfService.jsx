import Meta from '../components/Meta'

const TermsOfService = () => {
  return (
    <div className="max-w-screen-md mx-auto p-6">
      <Meta
        title="Terms of Service | KeyDash"
        description="Terms of service for using KeyDash - rules and guidelines for using the typing test service."
        url="https://keydash.shresthamanish.info.np/terms-of-service"
      />

      {/* Content-level H1 (navbar no longer uses an H1) */}
      <h1 className="text-3xl font-semibold mb-4">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-6">Last updated: January 17, 2026</p>

      <p className="mb-4">
        Welcome to KeyDash. By accessing or using the website
        (https://keydash.shresthamanish.info.np) (the "Service"), you agree to
        be bound by these Terms of Service ("Terms"). If you do not agree with
        any part of these Terms, you must not use the Service.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Accounts</h2>
      <p className="mb-4">
        Some features of the Service may require an account. You are responsible
        for maintaining the confidentiality of your account credentials and for
        all activities that occur under your account.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Use of the Service</h2>
      <p className="mb-4">
        You agree to use the Service only for lawful purposes and in accordance
        with these Terms. You must not engage in any activity that interferes
        with or disrupts the Service.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">User content</h2>
      <p className="mb-4">
        You retain ownership of content you submit (for example, profile
        display name). By submitting content you grant KeyDash a non-exclusive,
        worldwide license to use, host, and display that content as necessary to
        provide the Service.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Prohibited conduct</h2>
      <p className="mb-4">
        You must not use the Service to harass, impersonate, harm, or otherwise
        infringe on the rights of others. You also must not attempt to access
        the Service's systems or data without authorization.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Termination</h2>
      <p className="mb-4">
        We may suspend or terminate your access to the Service at any time for
        violation of these Terms or for any other reason at our discretion.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Disclaimers and Limitation of Liability</h2>
      <p className="mb-4">
        The Service is provided "as is" and "as available". To the fullest
        extent permitted by law, KeyDash disclaims all warranties and will not
        be liable for any indirect, incidental, special, or consequential
        damages arising from your use of the Service.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Changes to Terms</h2>
      <p className="mb-4">
        We may modify these Terms from time to time. If we make material
        changes we will provide notice by updating the "Last updated" date. By
        continuing to use the Service after changes become effective, you agree
        to the updated Terms.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Governing Law</h2>
      <p className="mb-4">
        These Terms are governed by the laws of the jurisdiction where KeyDash
        operates, unless otherwise required by applicable law.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
      <p>
        If you have questions about these Terms, please contact us at
        support@keydash.shresthamanish.info.np.
      </p>
    </div>
  );
}

export default TermsOfService;
