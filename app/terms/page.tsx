import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Sodah.io",
  description: "Terms of Service for Sodah.io business automation services.",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>

          <p className="mt-3 text-sm text-white/50">
            Effective date: August 27, 2026
          </p>
        </header>

        <article className="prose prose-invert mt-10 max-w-none">
          <section>
            <h2>1. About Sodah.io</h2>
            <p>
              Sodah.io provides business automation software that helps
              businesses manage customer conversations, leads, bookings,
              follow-ups, campaigns, and connected communication channels
              from a centralized workspace.
            </p>
          </section>

          <section>
            <h2>2. Acceptance of these Terms</h2>
            <p>
              By creating an account, accessing Sodah.io, or using any of our
              services, you agree to these Terms of Service. If you do not
              agree with these Terms, do not use the service.
            </p>
          </section>

          <section>
            <h2>3. Accounts and Business Information</h2>
            <p>
              You are responsible for providing accurate business information
              and keeping your account credentials secure. You are responsible
              for activity performed through your account and must promptly
              notify us if you believe your account has been accessed without
              authorization.
            </p>
          </section>

          <section>
            <h2>4. Connected Third-Party Channels</h2>
            <p>
              Sodah.io may allow you to connect third-party communication
              services such as WhatsApp, Instagram, Facebook, and TikTok.
              When you connect a third-party account, you authorize Sodah.io
              to perform the actions and access the information permitted by
              the permissions you approve.
            </p>
            <p>
              Your use of third-party services remains subject to the
              applicable third party's terms, policies, and requirements.
              Sodah.io does not control those third-party services.
            </p>
          </section>

          <section>
            <h2>5. TikTok Integration</h2>
            <p>
              Where the TikTok integration is enabled, Sodah.io uses TikTok's
              Login Kit and approved APIs to authenticate a TikTok account and
              provide the connected functionality available within Sodah.io.
              The permissions requested are limited to the functionality
              configured for the integration.
            </p>
          </section>

          <section>
            <h2>6. Acceptable Use</h2>
            <p>You agree not to use Sodah.io to:</p>
            <ul>
              <li>break applicable laws or regulations;</li>
              <li>impersonate another person or business;</li>
              <li>send unlawful, deceptive, abusive, or harmful content;</li>
              <li>attempt to gain unauthorized access to systems or accounts;</li>
              <li>interfere with or disrupt the service; or</li>
              <li>violate the policies of a connected third-party platform.</li>
            </ul>
          </section>

          <section>
            <h2>7. Messaging and Campaign Responsibility</h2>
            <p>
              You are responsible for the messages, campaigns, customer data,
              and other content you send through Sodah.io. You must have the
              appropriate rights, permissions, and lawful basis required to
              communicate with your customers and contacts.
            </p>
          </section>

          <section>
            <h2>8. AI-Assisted Features</h2>
            <p>
              Sodah.io may provide AI-assisted replies, business automation,
              lead handling, and other automated features. AI-generated
              content should be reviewed where appropriate. You remain
              responsible for the accuracy and appropriateness of information
              sent to your customers.
            </p>
          </section>

          <section>
            <h2>9. Availability</h2>
            <p>
              We work to keep Sodah.io available and reliable, but the service
              may occasionally be unavailable because of maintenance,
              upgrades, outages, or issues involving third-party services.
            </p>
          </section>

          <section>
            <h2>10. Fees and Subscriptions</h2>
            <p>
              Paid features are subject to the plan, price, billing period,
              and terms displayed when you subscribe. We may change pricing or
              plan features with reasonable notice where required by law.
            </p>
          </section>

          <section>
            <h2>11. Suspension or Termination</h2>
            <p>
              We may suspend or terminate access where necessary to protect
              the service, comply with law, address abuse, or enforce these
              Terms. You may stop using the service at any time.
            </p>
          </section>

          <section>
            <h2>12. Intellectual Property</h2>
            <p>
              Sodah.io and its software, branding, interfaces, and original
              materials are owned by or licensed to Sodah.io and are protected
              by applicable intellectual property laws. These Terms do not
              transfer ownership of our intellectual property to you.
            </p>
          </section>

          <section>
            <h2>13. Disclaimer</h2>
            <p>
              To the extent permitted by applicable law, Sodah.io is provided
              on an as-available basis. We do not guarantee that every
              third-party integration, API, messaging channel, or automated
              feature will operate continuously or without interruption.
            </p>
          </section>

          <section>
            <h2>14. Limitation of Liability</h2>
            <p>
              To the extent permitted by applicable law, Sodah.io will not be
              responsible for indirect, incidental, special, consequential, or
              loss-of-profit damages arising from use of the service or from
              third-party services connected to it.
            </p>
          </section>

          <section>
            <h2>15. Privacy</h2>
            <p>
              Our collection and use of personal information is described in
              our Privacy Policy.
            </p>
          </section>

          <section>
            <h2>16. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Updated Terms will
              be published on this page with a revised effective date.
            </p>
          </section>

          <section>
            <h2>17. Contact</h2>
            <p>
              For questions about these Terms or the Sodah.io service, please
              contact Sodah.io through the support options available on our
              website.
            </p>
          </section>
        </article>

        <footer className="mt-12 flex flex-wrap gap-5 border-t border-white/10 pt-6 text-sm text-white/50">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </main>
  );
}
