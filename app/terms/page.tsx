import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Sodah.io",
  description:
    "Terms of Service governing use of the Sodah.io business automation platform.",
};

export default function TermsOfServicePage() {
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
            <h2>1. Acceptance of Terms</h2>
            <p>
              These Terms of Service ("Terms") govern your access to and use
              of Sodah.io ("Sodah," "we," "us," or "our"), including our
              website, applications, business automation platform, connected
              communication services, and related features.
            </p>

            <p>
              By creating an account, connecting a third-party service, or
              using Sodah, you agree to these Terms. If you do not agree with
              these Terms, you should not use the service.
            </p>
          </section>

          <section>
            <h2>2. Sodah Services</h2>
            <p>
              Sodah provides business automation and productivity
              functionality that may include:
            </p>

            <ul>
              <li>business and customer communication automation;</li>
              <li>WhatsApp and other communication integrations;</li>
              <li>email and Gmail functionality;</li>
              <li>AI-assisted customer and email workflows;</li>
              <li>lead and customer management;</li>
              <li>appointment and booking automation;</li>
              <li>campaign and follow-up functionality;</li>
              <li>workflow automation;</li>
              <li>business information and product management; and</li>
              <li>other features introduced or modified by Sodah.</li>
            </ul>

            <p>
              Features may vary depending on the subscription plan,
              integrations, configuration, availability, and technical
              limitations.
            </p>
          </section>

          <section>
            <h2>3. Accounts</h2>
            <p>
              You are responsible for providing accurate information when
              creating and maintaining your account.
            </p>

            <p>
              You are responsible for protecting your account credentials and
              for activities performed through your account. You should notify
              Sodah promptly if you believe your account has been accessed
              without authorization.
            </p>
          </section>

          <section>
            <h2>4. Business Data and Content</h2>
            <p>
              You retain your rights to business information, customer
              information, messages, files, configurations, and other content
              that you provide to Sodah or process through the service.
            </p>

            <p>
              You grant Sodah the limited rights necessary to host, process,
              transmit, store, and otherwise handle that content solely to
              provide the services you request and to operate, secure, and
              maintain the platform.
            </p>
          </section>

          <section>
            <h2>5. Third-Party Integrations</h2>
            <p>
              Sodah may allow you to connect third-party services such as
              Google, Gmail, WhatsApp, TikTok, or other supported platforms.
            </p>

            <p>
              You are responsible for reviewing and complying with the terms
              and policies of any third-party service you connect to Sodah.
            </p>

            <p>
              When you authorize a third-party integration, you represent that
              you have the authority to grant the requested permissions.
            </p>
          </section>

          <section>
            <h2>6. Gmail and Google Services</h2>
            <p>
              If you connect Gmail or another Google service to Sodah, the
              connection is subject to the permissions you approve through
              Google's authorization process.
            </p>

            <p>
              Sodah's use of information received from Google APIs is governed
              by our Privacy Policy and applicable Google API Services User
              Data Policy requirements.
            </p>

            <p>
              You may disconnect a Google service from Sodah or revoke the
              authorization through your Google Account.
            </p>
          </section>

          <section>
            <h2>7. AI Features</h2>
            <p>
              Sodah may provide AI-assisted functionality for communication,
              email, customer support, business automation, summaries, and
              other user-requested tasks.
            </p>

            <p>
              AI-generated content may contain errors or omissions. You are
              responsible for reviewing AI-generated communications and
              decisions before relying on them where human review is
              appropriate.
            </p>

            <p>
              You are responsible for ensuring that your use of AI-generated
              content complies with applicable laws, contractual obligations,
              industry requirements, and your own business policies.
            </p>
          </section>

          <section>
            <h2>8. Acceptable Use</h2>
            <p>You agree not to use Sodah to:</p>

            <ul>
              <li>violate applicable laws or regulations;</li>
              <li>infringe the rights of another person or organization;</li>
              <li>impersonate another person or organization;</li>
              <li>access accounts or data without authorization;</li>
              <li>distribute malware, harmful code, or malicious content;</li>
              <li>conduct fraud, phishing, scams, or abusive activity;</li>
              <li>send unlawful or unauthorized communications;</li>
              <li>
                circumvent restrictions imposed by third-party communication
                platforms;
              </li>
              <li>interfere with the security or operation of Sodah; or</li>
              <li>use the service in a manner prohibited by applicable third-party platform policies.</li>
            </ul>
          </section>

          <section>
            <h2>9. Messaging and Communication Responsibility</h2>
            <p>
              If you use Sodah to send messages, emails, campaigns, reminders,
              or other communications, you are responsible for ensuring that
              you have the necessary rights, permissions, consent, and lawful
              basis to send those communications.
            </p>

            <p>
              You are also responsible for complying with applicable
              communication, marketing, privacy, anti-spam, and consumer
              protection requirements.
            </p>
          </section>

          <section>
            <h2>10. Subscriptions and Payments</h2>
            <p>
              Certain Sodah features may require a paid subscription or other
              applicable fees.
            </p>

            <p>
              Pricing, billing periods, usage limits, trial terms, and
              available features may vary by plan and may be displayed during
              signup or within the Sodah platform.
            </p>

            <p>
              Where applicable, paid subscriptions automatically renew
              according to the billing terms presented when the subscription
              is purchased unless cancelled before the applicable renewal.
            </p>
          </section>

          <section>
            <h2>11. Trials and Promotional Offers</h2>
            <p>
              Sodah may provide free trials, promotional credits, discounts,
              or promotional features from time to time.
            </p>

            <p>
              Promotional offers may have additional conditions, expiration
              dates, eligibility requirements, or usage limits. Sodah may
              modify or discontinue promotional offers where permitted by
              applicable law.
            </p>
          </section>

          <section>
            <h2>12. Service Availability</h2>
            <p>
              We work to keep Sodah available and reliable, but we do not
              guarantee uninterrupted or error-free operation.
            </p>

            <p>
              The service may occasionally be unavailable because of
              maintenance, upgrades, security events, third-party outages,
              infrastructure failures, or circumstances outside our reasonable
              control.
            </p>
          </section>

          <section>
            <h2>13. Third-Party Services</h2>
            <p>
              Some Sodah functionality depends on third-party services.
              Sodah is not responsible for outages, policy changes, API
              changes, account restrictions, or other events controlled by a
              third-party provider.
            </p>

            <p>
              Your use of third-party services remains subject to the
              applicable third-party terms and policies.
            </p>
          </section>

          <section>
            <h2>14. Intellectual Property</h2>
            <p>
              Sodah and its licensors retain all rights, title, and interest
              in the Sodah platform, software, branding, designs, interfaces,
              documentation, and other Sodah-owned materials.
            </p>

            <p>
              These Terms do not transfer ownership of Sodah intellectual
              property to you.
            </p>
          </section>

          <section>
            <h2>15. Suspension and Termination</h2>
            <p>
              You may stop using Sodah at any time and may cancel your account
              according to the applicable account or subscription process.
            </p>

            <p>
              Sodah may suspend or terminate access where reasonably necessary
              to protect the service, users, third parties, or infrastructure,
              or where an account materially violates these Terms or
              applicable law.
            </p>
          </section>

          <section>
            <h2>16. Data After Termination</h2>
            <p>
              After an account is terminated or cancelled, data may be
              retained for the periods described in our Privacy Policy,
              including where necessary for security, legal compliance,
              accounting, dispute resolution, or legitimate operational
              requirements.
            </p>
          </section>

          <section>
            <h2>17. Disclaimer</h2>
            <p>
              To the maximum extent permitted by applicable law, Sodah is
              provided on an "as available" and "as is" basis.
            </p>

            <p>
              We do not guarantee that the service will always meet every
              business requirement, operate without interruption, or produce
              completely accurate automated or AI-generated results.
            </p>
          </section>

          <section>
            <h2>18. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Sodah and its
              service providers will not be liable for indirect, incidental,
              special, consequential, or punitive damages arising from or
              related to use of the service.
            </p>

            <p>
              Nothing in these Terms limits liability where such limitation is
              prohibited by applicable law.
            </p>
          </section>

          <section>
            <h2>19. Changes to These Terms</h2>
            <p>
              We may update these Terms when our services, business
              practices, or legal requirements change.
            </p>

            <p>
              Updated Terms will be published on this page with a revised
              effective date. Continued use of Sodah after an update may
              constitute acceptance of the updated Terms to the extent
              permitted by applicable law.
            </p>
          </section>

          <section>
            <h2>20. Contact</h2>
            <p>
              If you have questions about these Terms or the Sodah service,
              please contact Sodah through the support options available on
              the Sodah.io website.
            </p>
          </section>
        </article>

        <footer className="mt-12 flex flex-wrap gap-5 border-t border-white/10 pt-6 text-sm text-white/50">
          <Link href="/" className="hover:text-white">
            Home
          </Link>

          <Link href="/privacy-policy" className="hover:text-white">
            Privacy Policy
          </Link>
        </footer>
      </div>
    </main>
  );
}