import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Sodah.io",
  description:
    "Privacy Policy for Sodah.io, including how Sodah handles account, business, communication, and Google Gmail data.",
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
              This Privacy Policy explains how Sodah.io ("Sodah," "we," "us,"
              or "our") collects, accesses, uses, stores, protects, and
              discloses information when you use the Sodah business automation
              platform and its connected communication and productivity
              services.
            </p>
            <p>
              Sodah provides business automation features including
              communication automation, customer conversations, lead
              management, appointment workflows, campaigns, email
              functionality, and other business productivity tools.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <p>
              Depending on the features you use, Sodah may process the
              following categories of information:
            </p>

            <ul>
              <li>
                account information, such as your name, email address, user
                identifier, and authentication information;
              </li>
              <li>
                business information, including business name, business
                configuration, services, products, and automation settings;
              </li>
              <li>
                customer and contact information that you or your business
                provide to Sodah or receive through connected communication
                channels;
              </li>
              <li>
                conversation and message information required to provide
                communication and automation features;
              </li>
              <li>
                appointment, lead, campaign, workflow, and business process
                information;
              </li>
              <li>
                technical information such as browser, device, IP address,
                operating system, timestamps, diagnostic information, and
                security logs; and
              </li>
              <li>
                information received from third-party services when you
                explicitly authorize a connection.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Google Account and Gmail Data</h2>

            <p>
              Sodah provides an optional Gmail integration. When you choose to
              connect a Google Account or Gmail account to Sodah, you authorize
              Sodah to access the Google data covered by the permissions shown
              during Google's authorization process.
            </p>

            <h3>3.1 Gmail data we access</h3>

            <p>
              For the Gmail features currently offered by Sodah, the
              authorization permissions may allow Sodah to:
            </p>

            <ul>
              <li>
                access the email address associated with the connected Google
                Account;
              </li>
              <li>
                read Gmail messages and related message information needed to
                display and process the user's inbox within Sodah; and
              </li>
              <li>
                send email messages on the user's behalf when the user
                explicitly uses a Sodah email feature that requires sending
                email.
              </li>
            </ul>

            <p>
              The Gmail permissions currently configured for Sodah include
              <code>gmail.readonly</code>, <code>gmail.send</code>, and
              <code>userinfo.email</code>.
            </p>

            <h3>3.2 How we use Gmail data</h3>

            <p>
              Gmail data is used only to provide the Gmail and Email AI
              functionality requested by the user. This may include displaying
              inbox messages, retrieving message information, helping the user
              work with email, generating requested email-related assistance,
              and sending email when the user initiates or authorizes that
              action through Sodah.
            </p>

            <p>
              Sodah does not sell Google user data. We do not use Google user
              data for targeted advertising, personalized advertising, or
              selling information to data brokers.
            </p>

            <p>
              Sodah does not use Google user data obtained through Gmail APIs
              to train generalized or non-personalized artificial intelligence
              or machine-learning models.
            </p>

            <p>
              Sodah's use of information received from Google APIs complies
              with the Google API Services User Data Policy, including the
              Limited Use requirements.
            </p>

            <h3>3.3 Gmail data storage and processing</h3>

            <p>
              Gmail information may be processed and stored as necessary to
              provide the Gmail features requested by the user, maintain the
              connected account, display email information, operate requested
              automation, maintain security, and comply with legal
              obligations.
            </p>

            <p>
              Authentication credentials and access tokens used to maintain
              authorized connections are handled using security controls
              appropriate to their purpose.
            </p>

            <p>
              Where third-party service providers are used to provide a
              requested Sodah feature, information is shared only as necessary
              to provide that feature, maintain the service, protect security,
              or comply with applicable law.
            </p>

            <h3>3.4 Human access to Gmail data</h3>

            <p>
              Sodah does not permit routine human access to Gmail content.
              Access may occur only where necessary for security, abuse
              prevention, legal compliance, technical support requested or
              authorized by the user, or another circumstance permitted under
              applicable Google policies and law.
            </p>

            <h3>3.5 Disconnecting Gmail</h3>

            <p>
              You may disconnect your Gmail account from Sodah through the
              applicable account or connection controls. You may also revoke
              Sodah's authorization from your Google Account.
            </p>

            <p>
              Disconnecting or revoking authorization prevents Sodah from
              obtaining additional Gmail data through that authorization.
              Information already stored may remain for the applicable
              retention period described in this Privacy Policy or where
              retention is required for security, legal, accounting, dispute
              resolution, or other legitimate service purposes.
            </p>

            <p>
              When a user requests deletion of eligible Gmail-related
              information, Sodah will delete or de-identify that information
              within a reasonable period, subject to legal, security, and
              legitimate business retention requirements.
            </p>
          </section>

          <section>
            <h2>4. Other Connected Services</h2>

            <p>
              Sodah may connect with other services and communication
              platforms when you explicitly authorize those integrations.
            </p>

            <p>
              Depending on the integration and permissions granted, this may
              include information such as account identifiers, profile
              information, messages, conversations, media, business
              information, or other data necessary to provide the connected
              functionality.
            </p>

            <p>
              Each third-party service may have its own privacy policy and
              terms. You should review those policies before authorizing a
              connection.
            </p>
          </section>

          <section>
            <h2>5. TikTok Information</h2>

            <p>
              When you connect TikTok to Sodah.io, you authorize the TikTok
              integration to provide the permissions you approve through
              TikTok's authorization flow.
            </p>

            <p>
              Depending on the approved integration, this may include basic
              TikTok account information such as a TikTok user identifier,
              display name, and profile information.
            </p>

            <p>
              We use this information to establish and maintain the
              connection, identify the connected TikTok account within your
              Sodah workspace, and provide the TikTok functionality you
              requested.
            </p>

            <p>
              We do not sell TikTok user data or use TikTok data for unrelated
              advertising or profiling purposes.
            </p>
          </section>

          <section>
            <h2>6. How We Use Information</h2>

            <p>Sodah may use information to:</p>

            <ul>
              <li>create and maintain user accounts;</li>
              <li>provide business automation functionality;</li>
              <li>provide communication and customer-support features;</li>
              <li>connect and manage authorized third-party services;</li>
              <li>process leads, appointments, campaigns, and workflows;</li>
              <li>provide email and inbox functionality;</li>
              <li>provide requested AI-assisted features;</li>
              <li>maintain and improve user-facing Sodah functionality;</li>
              <li>provide customer support;</li>
              <li>detect and prevent fraud, abuse, and security incidents;</li>
              <li>maintain service reliability and performance; and</li>
              <li>comply with applicable legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2>7. AI and Automated Processing</h2>

            <p>
              Some Sodah features use automated processing and artificial
              intelligence to assist with business conversations, email
              workflows, customer communication, summaries, automation, and
              other user-requested functions.
            </p>

            <p>
              AI processing is used to provide or improve user-facing Sodah
              functionality. Information obtained from connected third-party
              services, including Google APIs, is handled according to the
              applicable service-specific restrictions and the disclosures in
              this Privacy Policy.
            </p>

            <p>
              Google user data obtained through Google APIs is not used to
              train generalized or non-personalized AI or machine-learning
              models.
            </p>
          </section>

          <section>
            <h2>8. Sharing and Third-Party Service Providers</h2>

            <p>
              Sodah does not sell personal information or Google user data.
            </p>

            <p>
              We may use service providers that support hosting, databases,
              authentication, security, communications, analytics,
              infrastructure, automation, or other functionality necessary to
              operate Sodah.
            </p>

            <p>
              Information may be shared with such providers only to the extent
              reasonably necessary to provide the requested service, maintain
              security and reliability, comply with legal obligations, or
              protect Sodah, our users, or others.
            </p>

            <p>
              Google user data obtained through Google APIs is subject to the
              additional restrictions described in Google's applicable user
              data policies.
            </p>
          </section>

          <section>
            <h2>9. Data Security</h2>

            <p>
              We use reasonable technical and organizational safeguards
              designed to protect information against unauthorized access,
              alteration, disclosure, loss, or destruction.
            </p>

            <p>
              Depending on the information and service involved, safeguards
              may include access controls, authentication controls,
              encryption, secure transmission, token protection, logging,
              monitoring, and other security measures.
            </p>

            <p>
              No internet-based service can guarantee absolute security, but
              we take reasonable measures appropriate to the nature of the
              information we process.
            </p>
          </section>

          <section>
            <h2>10. Data Retention</h2>

            <p>
              We retain information only for as long as reasonably necessary
              for the purposes described in this Privacy Policy, including
              providing the service, maintaining account and business records,
              security, fraud prevention, dispute resolution, and complying
              with applicable legal obligations.
            </p>

            <p>
              Retention periods vary depending on the type of information, the
              feature involved, the user's configuration, and applicable legal
              requirements.
            </p>

            <p>
              When information is no longer required for the applicable
              purpose or retention requirement, we may delete or de-identify
              it in accordance with our operational procedures.
            </p>
          </section>

          <section>
            <h2>11. Data Deletion and User Requests</h2>

            <p>
              You may request access to, correction of, or deletion of
              personal information associated with your Sodah account, subject
              to applicable law and legitimate retention requirements.
            </p>

            <p>
              Requests involving connected services may also require the user
              to revoke authorization directly with the relevant third-party
              provider.
            </p>

            <p>
              To request deletion or assistance with your information, please
              contact us through the support contact provided on the Sodah.io
              website.
            </p>
          </section>

          <section>
            <h2>12. Cookies and Similar Technologies</h2>

            <p>
              Sodah.io may use cookies or similar technologies necessary for
              authentication, security, session management, preferences, and
              service functionality.
            </p>
          </section>

          <section>
            <h2>13. Children's Privacy</h2>

            <p>
              Sodah.io is a business service and is not directed to children.
              We do not knowingly collect personal information from children in
              violation of applicable law.
            </p>
          </section>

          <section>
            <h2>14. International Processing</h2>

            <p>
              Information may be processed or stored in countries other than
              the country where you access Sodah.io.
            </p>

            <p>
              Where required, we take appropriate measures to protect
              information during international processing and transfers.
            </p>
          </section>

          <section>
            <h2>15. Changes to this Privacy Policy</h2>

            <p>
              We may update this Privacy Policy when our services, data
              practices, security measures, or legal requirements change.
            </p>

            <p>
              The updated version will be published on this page with a
              revised effective date. Users should periodically review this
              page for changes.
            </p>
          </section>

          <section>
            <h2>16. Contact</h2>

            <p>
              For privacy questions, data requests, or questions about how
              Sodah handles connected Google or Gmail data, please contact
              Sodah.io through the support options available on our website.
            </p>

            <p>
              You may also use the support email associated with your Sodah
              account or OAuth authorization.
            </p>
          </section>

          <section>
            <h2>17. Google API Services User Data Policy</h2>

            <p>
              Sodah's use and transfer of information received from Google APIs
              will adhere to the Google API Services User Data Policy,
              including the Limited Use requirements.
            </p>

            <p>
              Google user data is used only to provide or improve the
              user-facing functionality described in this Privacy Policy and
              is not sold or used for unrelated advertising purposes.
            </p>
          </section>
        </article>

        <footer className="mt-12 flex flex-wrap gap-5 border-t border-white/10 pt-6 text-sm text-white/50">
          <Link href="/" className="hover:text-white">
            Home
          </Link>

          <Link href="/terms-of-service" className="hover:text-white">
            Terms of Service
          </Link>
        </footer>
      </div>
    </main>
  );
}