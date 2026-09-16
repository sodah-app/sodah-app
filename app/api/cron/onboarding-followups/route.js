import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLLOWUP_DELAY_MS = 2 * 60 * 1000;
const FOLLOWUP_EVENT_TYPE = "onboarding_incomplete_followup_1";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
 * ============================================================
 * FOLLOW-UP EMAIL CONTENT
 * ============================================================
 */

function getEmailContent(firstName, stage) {
  const name = esc(firstName);

  const emails = [
    {
      subject:
        "You’re almost ready to start with Sodah.io",

      title:
        "You’re almost ready 👋",

      body: `
        <p>
          We noticed you signed in to Sodah.io but haven't
          completed your business setup yet.
        </p>

        <p>
          Getting started is simple. Just tell Sodah about
          your business and click <strong>Save & Continue</strong>.
        </p>

        <p>
          After that, connect your WhatsApp, scan the QR code
          with your phone, and your WhatsApp automation can
          start working.
        </p>
      `,
    },

    {
      subject:
        "Finish your Sodah.io setup",

      title:
        "Let’s finish your setup",

      body: `
        <p>
          Your Sodah.io workspace is waiting for you.
        </p>

        <p>
          You only need a few simple steps to get started:
        </p>

        <p>
          <strong>
            Tell us about your business → Save & Continue
            → Connect WhatsApp → Scan the QR code.
          </strong>
        </p>

        <p>
          Once WhatsApp is connected, Sodah can begin handling
          your configured customer automation.
        </p>

        <p>
          You can also use your Sodah workspace to manage
          leads, appointments, WhatsApp campaigns and
          business performance.
        </p>
      `,
    },

    {
      subject:
        "Need help getting started with Sodah.io?",

      title:
        "Need help finishing your setup?",

      body: `
        <p>
          We noticed that your Sodah.io setup is still
          incomplete.
        </p>

        <p>
          If you ran into a problem or simply didn't have
          time to finish, you can return to Sodah and
          continue where you stopped.
        </p>

        <p>
          The process is simple:
        </p>

        <p>
          <strong>
            Sign in → Tell us about your business
            → Save & Continue → Connect WhatsApp
            → Scan the QR code.
          </strong>
        </p>

        <p>
          If you're having trouble, our support assistant
          can also help guide you through the process.
        </p>
      `,
    },
  ];

  const email = emails[stage];

  return {
    subject: email.subject,

    html: `
      <!DOCTYPE html>

      <html>
        <body
          style="
            margin:0;
            padding:0;
            background:#f3f7f5;
            font-family:Arial,Helvetica,sans-serif;
            color:#17201c;
          "
        >

          <div
            style="
              max-width:620px;
              margin:40px auto;
              padding:20px;
            "
          >

            <div
              style="
                background:#ffffff;
                border-radius:24px;
                padding:36px;
                border:1px solid #e4ebe7;
              "
            >

              <div
                style="
                  font-size:28px;
                  font-weight:800;
                  color:#123c27;
                  background:linear-gradient(135deg,#b8f5cf,#69e6a0);
                  margin:-36px -36px 0;
                  padding:32px 36px;
                  text-align:center;
                  border-radius:24px 24px 0 0;
                "
              >
                sodah<span style="color:#087f46">.io</span>
              </div>

              <h1
                style="
                  margin-top:30px;
                  margin-bottom:20px;
                  font-size:28px;
                  line-height:1.3;
                "
              >
                ${esc(email.title)}
              </h1>

              <p
                style="
                  font-size:16px;
                  line-height:1.7;
                  color:#52605a;
                "
              >
                Hi ${name},
              </p>

              <div
                style="
                  font-size:16px;
                  line-height:1.7;
                  color:#52605a;
                "
              >
                ${email.body}
              </div>

              <div
                style="
                  text-align:center;
                  margin:32px 0;
                "
              >

                <a
                  href="https://www.sodah.io/welcome"
                  style="
                    display:inline-block;
                    background:#19b95b;
                    color:#ffffff;
                    text-decoration:none;
                    padding:15px 26px;
                    border-radius:12px;
                    font-weight:800;
                  "
                >
                  Continue My Setup
                </a>

              </div>

              <p
                style="
                  font-size:14px;
                  line-height:1.7;
                  color:#68756f;
                "
              >
                Sodah.io helps businesses manage customer
                communication, leads, appointments, WhatsApp
                campaigns and business performance from one space.
              </p>

              <p
                style="
                  font-size:14px;
                  line-height:1.7;
                  color:#52605a;
                "
              >
                The Sodah.io Team
              </p>

            </div>

          </div>

        </body>
      </html>
    `,
  };
}

/*
 * ============================================================
 * CRON AUTHENTICATION
 * ============================================================
 */

function isAuthorized(request) {
  const cronSecret =
    process.env.CRON_SECRET?.trim();

  /*
   * If no CRON_SECRET is configured, allow the request.
   * This preserves the existing behavior.
   */

  if (!cronSecret) {
    return true;
  }

  const authorization =
    request.headers.get("authorization") || "";

  return (
    authorization ===
    `Bearer ${cronSecret}`
  );
}

/*
 * ============================================================
 * CHECK WHETHER BUSINESS EXISTS
 * ============================================================
 */

async function getBusiness(admin, userId) {
  const {
    data,
    error,
  } = await admin
    .from("businesses")
    .select("business_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[Onboarding Followups] Business lookup error:",
      error
    );

    return null;
  }

  return data;
}

/*
 * ============================================================
 * SEND EMAIL
 * ============================================================
 */

async function sendEmail({
  apiKey,
  email,
  firstName,
  stage,
}) {
  const content =
    getEmailContent(
      firstName,
      stage
    );

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          from:
            "Sodah.io <hello@sodah.io>",

          to: [email],

          subject:
            content.subject,

          html:
            content.html,
        }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "[Onboarding Followups] Resend error:",
      errorText
    );

    return false;
  }

  return true;
}

/*
 * ============================================================
 * GET — DELAYED FOLLOW-UP JOB
 *
 * TEST MODE:
 * - Runs from Vercel Cron
 * - Checks incomplete onboarding records
 * - Sends the first follow-up after 2 minutes
 * - Does NOT send immediately on login
 * ============================================================
 */

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const admin = adminClient();

    const apiKey =
      process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not configured."
      );
    }

    /*
     * Find incomplete onboarding records.
     *
     * We intentionally do not use a 6-hour cutoff anymore.
     * The test processor checks the actual age of last_login_at.
     */

    const {
      data: candidates,
      error,
    } = await admin
      .from("sodah_onboarding")
      .select(
        `
          user_id,
          email,
          full_name,
          last_login_at,
          followup_stage,
          status
        `
      )
      .eq(
        "status",
        "incomplete"
      )
      .eq(
        "followup_stage",
        0
      )
      .not(
        "last_login_at",
        "is",
        null
      )
      .limit(100);

    if (error) {
      throw error;
    }

    const now = Date.now();
    const results = [];

    for (
      const item of
        candidates || []
    ) {
      if (
        !item.last_login_at
      ) {
        continue;
      }

      const loginTime =
        new Date(
          item.last_login_at
        ).getTime();

      if (
        Number.isNaN(loginTime)
      ) {
        continue;
      }

      /*
       * Wait 2 minutes from the recorded login.
       */

      const elapsed =
        now - loginTime;

      if (
        elapsed <
        FOLLOWUP_DELAY_MS
      ) {
        continue;
      }

      /*
       * ======================================================
       * STOP FOLLOW-UP IF BUSINESS EXISTS
       * ======================================================
       *
       * If the user completed setup during the waiting period,
       * do not send the incomplete-onboarding email.
       */

      const business =
        await getBusiness(
          admin,
          item.user_id
        );

      if (
        business?.business_id
      ) {
        await admin
          .from(
            "sodah_onboarding"
          )
          .update({
            status:
              "completed",
          })
          .eq(
            "user_id",
            item.user_id
          );

        results.push({
          user_id:
            item.user_id,

          status:
            "completed",

          reason:
            "Business setup completed before follow-up.",
        });

        continue;
      }

      /*
       * ======================================================
       * SEND FIRST FOLLOW-UP
       * ======================================================
       */

      const firstName =
        String(
          item.full_name ||
            "there"
        )
          .trim()
          .split(/\s+/)[0] ||
        "there";

      /*
       * Idempotency check.
       *
       * If this follow-up was already sent, do not send it again.
       */

      const {
        data: existingEvent,
        error: eventLookupError,
      } = await admin
        .from(
          "sodah_email_events"
        )
        .select("id,status")
        .eq(
          "user_id",
          item.user_id
        )
        .eq(
          "event_type",
          FOLLOWUP_EVENT_TYPE
        )
        .limit(1)
        .maybeSingle();

      if (eventLookupError) {
        console.error(
          "[Onboarding Followups] Event lookup error:",
          eventLookupError
        );
      }

      if (
        existingEvent?.status ===
        "sent"
      ) {
        await admin
          .from(
            "sodah_onboarding"
          )
          .update({
            followup_stage: 1,
          })
          .eq(
            "user_id",
            item.user_id
          );

        results.push({
          user_id:
            item.user_id,

          stage: 1,

          sent: false,

          reason:
            "Follow-up already sent.",
        });

        continue;
      }

      const sent =
        await sendEmail({
          apiKey,
          email:
            item.email,
          firstName,
          stage: 0,
        });

      if (!sent) {
        results.push({
          user_id:
            item.user_id,

          stage: 0,

          sent: false,
        });

        continue;
      }

      const sentAt =
        new Date().toISOString();

      /*
       * Save the email event.
       */

      const {
        error:
          eventError,
      } =
        await admin
          .from(
            "sodah_email_events"
          )
          .insert({
            user_id:
              item.user_id,

            email:
              item.email,

            event_type:
              FOLLOWUP_EVENT_TYPE,

            status:
              "sent",

            sent_at:
              sentAt,

            metadata: {
              stage: 0,

              scheduled_after_minutes:
                2,
            },
          });

      if (eventError) {
        console.error(
          "[Onboarding Followups] Email event error:",
          eventError
        );
      }

      /*
       * Advance stage so the same follow-up is not processed again.
       */

      const {
        error:
          updateError,
      } =
        await admin
          .from(
            "sodah_onboarding"
          )
          .update({
            followup_stage: 1,

            last_followup_at:
              sentAt,
          })
          .eq(
            "user_id",
            item.user_id
          );

      if (updateError) {
        console.error(
          "[Onboarding Followups] Stage update error:",
          updateError
        );
      }

      results.push({
        user_id:
          item.user_id,

        stage: 1,

        sent: true,

        sent_at:
          sentAt,
      });
    }

    return NextResponse.json({
      success: true,

      mode:
        "test_2_minute_followup",

      processed:
        results.length,

      results,
    });
  } catch (error) {
    console.error(
      "[Onboarding Followups] Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Follow-up job failed.",
      },
      {
        status: 500,
      }
    );
  }
}