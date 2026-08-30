import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Sodah.io",
  description: "Privacy Policy for Sodah.io business automation services.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <header className="border-b border-white/10 pb-8">
          <Link href="/" className="text-xl font-black">
            Sodah<span className="text-cyan-400">.io</span>
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-cyan-400">
            Legal
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-white/50">
            Effective date: August 27, 2026
          </p>
        </header>

        <article className="prose prose-invert mt-10 max-w-none">
          <section>
            <h2>1. Introduction</h2>
            <p>
              This Privacy Policy explains how Sodah.io collects, uses,
              stores, and protects information when you use our business
              automation platform and connected communication services.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <p>Depending on the features you use, we may process:</p>
            <ul>
              <li>account information such as name, email, and user ID;</li>
              <li>business information and configuration data;</li>
              <li>customer and contact information you provide or receive through connected channels;</li>
              <li>conversation and message information needed to provide automation features;</li>
              <li>appointment, lead, campaign, and workflow information;</li>
              <li>technical information such as browser, device, and log information; and</li>
              <li>information received from third-party services when you authorize a connection.</li>
            </ul>
          </section>

          <section>
            <h2>3. TikTok Information</h2>
            <p>
              When you connect TikTok to Sodah.io, you authorize the TikTok
              integration to provide the permissions you approve through
              TikTok's authorization flow.
            </p>
            <p>
              Depending on the approved integration, this may include basic
              TikTok account information such as a TikTok user identifier,
              display name, and profile information. We use this information
              to establish and maintain the connection, identify the connected
              TikTok account within your Sodah workspace, and provide the
              TikTok functionality you requested.
            </p>
            <p>
              We do not sell TikTok user data. We do not use TikTok data for
              unrelated advertising or profiling purposes.
            </p>
          </section>

          <section>
            <h2>4. How We Use Information</h2>
            <p>We use information to:</p>
            <ul>
              <li>create and maintain user accounts;</li>
              <li>provide customer conversation and automation features;</li>
              <li>connect and manage authorized third-party channels;</li>
              <li>process leads, bookings, campaigns, and follow-ups;</li>
              <li>provide support and troubleshoot technical problems;</li>
              <li>protect the security and integrity of the platform; and</li>
              <li>comply with applicable legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2>5. Third-Party Services</h2>
            <p>
              Sodah.io may integrate with third-party platforms and service
              providers, including communication platforms, authentication
              providers, hosting providers, databases, analytics services,
              and automation infrastructure.
            </p>
            <p>
              When you authorize a third-party connection, that platform may
              process information according to its own privacy policy and
              terms.
            </p>
          </section>

          <section>
            <h2>6. Data Security</h2>
            <p>
              We use reasonable technical and organizational safeguards to
              protect information against unauthorized access, alteration,
              disclosure, or destruction. Credentials, access tokens, and
              other sensitive integration information are handled using
              security controls appropriate to their purpose.
            </p>
          </section>

          <section>
            <h2>7. Data Retention</h2>
            <p>
              We retain information for as long as reasonably necessary to
              provide the service, maintain business records, resolve
              disputes, prevent abuse, and comply with applicable legal
              obligations. Retention periods may vary depending on the type of
              information and the feature involved.
            </p>
          </section>

          <section>
            <h2>8. Your Choices and Data Requests</h2>
            <p>
              You may request access to, correction of, or deletion of
              personal information associated with your account, subject to
              applicable law and legitimate business requirements.
            </p>
            <p>
              You can also disconnect an authorized third-party channel from
              your Sodah workspace. Disconnecting a service may stop future
              data collection from that service, but information already
              required for legitimate business or legal purposes may be
              retained for the applicable retention period.
            </p>
          </section>

          <section>
            <h2>9. Cookies and Similar Technologies</h2>
            <p>
              Sodah.io may use cookies or similar technologies required for
              authentication, security, session management, preferences, and
              service functionality.
            </p>
          </section>

          <section>
            <h2>10. Children's Privacy</h2>
            <p>
              Sodah.io is a business service and is not directed to children.
              We do not knowingly collect personal information from children
              in violation of applicable law.
            </p>
          </section>

          <section>
            <h2>11. International Processing</h2>
            <p>
              Information may be processed or stored in countries other than
              the country where you access Sodah.io. Where required, we take
              appropriate steps to protect information during such processing.
            </p>
          </section>

          <section>
            <h2>12. Changes to this Privacy Policy</h2>
            <p>
              We may update this Privacy Policy when our services, legal
              requirements, or data practices change. The updated version will
              be published on this page with a revised effective date.
            </p>
          </section>

          <section>
            <h2>13. Contact</h2>
            <p>
              For privacy questions or requests relating to your Sodah.io
              account or connected services, please contact Sodah.io through
              the support options available on our website.
            </p>
          </section>
        </article>

        <footer className="mt-12 flex flex-wrap gap-5 border-t border-white/10 pt-6 text-sm text-white/50">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms of Service
          </Link>
        </footer>
      </div>
    </main>
  );
}
