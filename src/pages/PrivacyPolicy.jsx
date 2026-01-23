import Meta from '../components/Meta'

const PrivacyPolicy = () => {
  return (
    <div className="max-w-screen-md mx-auto p-6">
      <Meta
        title="Privacy Policy | KeyDash"
        description="How KeyDash collects, uses, and protects your information."
        url="https://keydash.shresthamanish.info.np/privacy-policy"
      />

      {/* Use H2 here to avoid duplicate top-level headings from site chrome (Navbar) */}
      <h2 className="text-3xl font-semibold mb-4">Privacy Policy</h2>
      <p className="text-sm text-gray-500 mb-6">Last updated: January 17, 2026</p>

      <p className="mb-4">
        At KeyDash ("we", "us", "our"), your privacy is important to us. This
        Privacy Policy explains what information we collect, how we use it, and
        the choices you have regarding your information when you use
        https://keydash.shresthamanish.info.np/ (the "Service").
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Information we collect</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>
          Account information: if you create an account we may collect your
          email address, display name and avatar.
        </li>
        <li>
          Usage data: data about your interactions with the Service such as
          typing results (WPM, accuracy, scores), timestamps, and device/browser
          information.
        </li>
        <li>Cookies and similar technologies for functionality and analytics.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">How we use information</h2>
      <p className="mb-4">
        We use the information to provide and improve the Service, personalize
        your experience, maintain your account, and communicate with you about
        updates. We also use aggregated and anonymized data for analytics and
        performance monitoring.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Third-party services</h2>
      <p className="mb-4">
        We may use third-party services (for example, Supabase for authentication
        and data storage, and Google Analytics for site analytics). Those
        services have their own privacy policies and we encourage you to review
        them. We do not sell your personal information.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Data retention</h2>
      <p className="mb-4">
        We retain information as long as necessary to provide the Service and to
        comply with legal obligations. Usage data may be retained in aggregated
        form for analytics and troubleshooting.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Your choices</h2>
      <p className="mb-4">
        You can manage or delete your account information by visiting your
        profile settings or by contacting us at support@keydash.shresthamanish.info.np.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Security</h2>
      <p className="mb-4">
        We take reasonable technical and organizational measures to protect your
        information, but no method of transmission or storage is completely
        secure. If you suspect a security issue, please contact us right away.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Children</h2>
      <p className="mb-4">
        The Service is not intended for children under 13. We do not knowingly
        collect personal information from children under 13.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Changes to this policy</h2>
      <p className="mb-4">
        We may update this Privacy Policy from time to time. If we make
        material changes we will provide notice by updating the "Last updated"
        date at the top of this page.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
      <p>
        If you have questions about this Privacy Policy, please contact us at
        support@keydash.shresthamanish.info.np.
      </p>
    </div>
  );
}

export default PrivacyPolicy;
