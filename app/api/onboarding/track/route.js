import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ============================================================
 * FOLLOW-UP DELAY
 * ============================================================
 *
 * 30 minutes
 *
 * The cron job runs every 30 minutes.
 *
 * ============================================================
 */

const FOLLOWUP_DELAY_MS = 30 * 60 * 1000;

const FOLLOWUP_EVENT_TYPE =
  "onboarding_incomplete_followup_1";

/*
 * ============================================================
 * ADMIN SUPABASE CLIENT
 * ============================================================
 */

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

/*
 * ============================================================
 * AUTHENTICATED USER
 * ============================================================
 */

async function getUser(request) {
  const token = (
    request.headers.get("authorization") || ""
  )
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) return null;

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data, error } =
    await client.auth.getUser();

  if (error) {
    console.error(
      "[Onboarding Track] Auth error:",
      error
    );

    return null;
  }

  return data?.user || null;
}

/*
 * ============================================================
 * HTML ESCAPE
 * ============================================================
 */

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
 * ============================================================
 * SEND INCOMPLETE ONBOARDING FOLLOW-UP
 * ============================================================
 */

async function sendIncompleteOnboardingFollowup({
  admin,
  user,
  email,
  fullName,
}) {
  if (!email) {
    return {
      sent: false,
      reason: "No email address available.",
    };
  }

  /*
   * ----------------------------------------------------------
   * CHECK IF THIS FOLLOW-UP WAS ALREADY SENT
   * ----------------------------------------------------------
   */

  const {
    data: existingEvent,
    error: eventLookupError,
  } = await admin
    .from("sodah_email_events")
    .select("id,status")
    .eq("user_id", user.id)
    .eq(
      "event_type",
      FOLLOWUP_EVENT_TYPE
    )
    .maybeSingle();

  if (eventLookupError) {
    console.error(
      "[Onboarding Followup] Event lookup error:",
      eventLookupError
    );

    return {
      sent: false,
      reason:
        "Unable to check email event.",
    };
  }

  if (existingEvent?.status === "sent") {
    return {
      sent: false,
      already_sent: true,
    };
  }

  /*
   * ----------------------------------------------------------
   * RESEND API KEY
   * ----------------------------------------------------------
   */

  const apiKey =
    process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.error(
      "[Onboarding Followup] RESEND_API_KEY is not configured."
    );

    return {
      sent: false,
      reason:
        "RESEND_API_KEY is not configured.",
    };
  }

  /*
   * ----------------------------------------------------------
   * NAME
   * ----------------------------------------------------------
   */

  const metadataFullName =
    user?.user_metadata?.full_name || "";

  const firstName =
    fullName.split(/\s+/)[0] ||
    String(metadataFullName)
      .trim()
      .split(/\s+/)[0] ||
    "there";

  /*
   * ----------------------------------------------------------
   * SETUP URL
   * ----------------------------------------------------------
   */

  const setupUrl =
    "https://www.sodah.io/welcome";

  /*
   * ----------------------------------------------------------
   * EMAIL HTML
   * ----------------------------------------------------------
   */

  const html = `
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width,initial-scale=1.0"
  />
</head>

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
        overflow:hidden;
        border:1px solid #e4ebe7;
        box-shadow:0 15px 45px rgba(0,0,0,.08);
      "
    >

      <!-- HEADER -->

      <div
        style="
          padding:32px;
          text-align:center;
          background:
            linear-gradient(
              135deg,
              #b8f5cf,
              #69e6a0
            );
        "
      >

        <div
          style="
            font-size:28px;
            font-weight:800;
            color:#123c27;
          "
        >
          sodah<span style="color:#087f46;">.io</span>
        </div>

        <div
          style="
            margin-top:8px;
            color:#24563b;
            font-size:13px;
          "
        >
          AI-powered business automation
        </div>

      </div>

      <!-- BODY -->

      <div
        style="
          padding:36px 32px;
        "
      >

        <h1
          style="
            margin:0 0 18px;
            font-size:27px;
            color:#102018;
          "
        >
          Hi ${escapeHtml(firstName)},
          welcome back 👋
        </h1>

        <p
          style="
            font-size:16px;
            line-height:1.7;
            color:#52605a;
          "
        >
          We noticed that you started setting up
          your Sodah.io workspace but haven't
          completed your business setup yet.
        </p>

        <p
          style="
            font-size:16px;
            line-height:1.7;
            color:#52605a;
          "
        >
          Your account is already waiting for you.
          Complete your business information so
          you can continue to your Sodah workspace.
        </p>

        <!-- FEATURES -->

        <div
          style="
            margin:26px 0;
            padding:22px;
            border-radius:16px;
            background:#f0faf4;
            border:1px solid #d7f0df;
          "
        >

          <div
            style="
              font-weight:800;
              font-size:16px;
              color:#123c27;
              margin-bottom:14px;
            "
          >
            What you'll be able to use
          </div>

          <div
            style="
              font-size:14px;
              line-height:2;
              color:#52605a;
            "
          >

            ✓
            <strong>
              WhatsApp Automation
            </strong>
            — automate customer communication.

            <br />

            ✓
            <strong>
              WhatsApp Campaigns
            </strong>
            — launch campaigns for your
            customers and contacts.

            <br />

            ✓
            <strong>
              Business Update AI
            </strong>
            — update your business details,
            services, packages, promotions,
            working hours and other supported
            business information.

            <br />

            ✓
            <strong>
              Campaign History
            </strong>
            — review campaigns you have run.

            <br />

            ✓
            <strong>
              Business Workspace
            </strong>
            — manage your Sodah tools
            from one place.

          </div>

        </div>

        <!-- CTA -->

        <div
          style="
            text-align:center;
            margin:32px 0;
          "
        >

          <a
            href="${setupUrl}"
            style="
              display:inline-block;
              padding:15px 28px;
              border-radius:12px;
              background:#19b95b;
              color:#ffffff;
              text-decoration:none;
              font-weight:800;
              font-size:15px;
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
          Once your business setup is completed,
          you'll be able to access your workspace
          and continue with your WhatsApp connection
          and automation.
        </p>

        <p
          style="
            margin-top:28px;
            font-size:14px;
            line-height:1.7;
            color:#52605a;
          "
        >
          We're looking forward to helping you
          automate and grow your business.
        </p>

        <p
          style="
            margin-top:30px;
            font-size:14px;
            color:#52605a;
          "
        >
          See you inside,

          <br />

          <strong>
            The Sodah.io Team
          </strong>
        </p>

      </div>

      <!-- FOOTER -->

      <div
        style="
          padding:22px 32px;
          background:#f8faf9;
          border-top:1px solid #e7ece9;
          text-align:center;
        "
      >

        <div
          style="
            font-size:12px;
            color:#8a958f;
          "
        >
          © ${new Date().getFullYear()}
          Sodah.io
        </div>

      </div>

    </div>

  </div>

</body>

</html>
`;

  /*
   * ----------------------------------------------------------
   * SEND WITH RESEND
   * ----------------------------------------------------------
   */

  const resendResponse = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },

      body: JSON.stringify({
        from:
          "Sodah.io <hello@sodah.io>",

        to: [email],

        subject:
          `Complete your Sodah.io setup, ${firstName}`,

        html,
      }),
    }
  );

  const resendText =
    await resendResponse.text();

  let resendData = {};

  try {
    resendData = resendText
      ? JSON.parse(resendText)
      : {};
  } catch {
    resendData = {};
  }

  /*
   * ----------------------------------------------------------
   * RESEND FAILURE
   * ----------------------------------------------------------
   */

  if (!resendResponse.ok) {
    console.error(
      "[Onboarding Followup] Resend error:",
      resendData
    );

    return {
      sent: false,
      reason:
        resendData?.message ||
        "Unable to send follow-up email.",
    };
  }

  /*
   * ----------------------------------------------------------
   * RECORD SUCCESSFUL EMAIL
   * ----------------------------------------------------------
   */

  const {
    error: saveEventError,
  } = await admin
    .from("sodah_email_events")
    .upsert(
      {
        user_id: user.id,
        email,
        event_type:
          FOLLOWUP_EVENT_TYPE,
        status: "sent",
        sent_at:
          new Date().toISOString(),
        metadata: {
          resend_id:
            resendData?.id || null,
        },
      },
      {
        onConflict:
          "user_id,event_type",
      }
    );

  if (saveEventError) {
    console.error(
      "[Onboarding Followup] Event save error:",
      saveEventError
    );
  }

  return {
    sent: true,
    resend_id:
      resendData?.id || null,
  };
}

/*
 * ============================================================
 * POST
 *
 * Called by the authenticated frontend after login.
 *
 * First login:
 *   Creates incomplete onboarding record.
 *
 * It DOES NOT send the email immediately.
 *
 * The scheduled GET below handles the delayed email.
 * ============================================================
 */

export async function POST(request) {
  try {
    /*
     * ----------------------------------------------------------
     * 1. AUTHENTICATE USER
     * ----------------------------------------------------------
     */

    const user =
      await getUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    /*
     * ----------------------------------------------------------
     * 2. READ EVENT
     * ----------------------------------------------------------
     */

    const body =
      await request.json().catch(
        () => ({})
      );

    const event = String(
      body?.event || "login"
    )
      .trim()
      .toLowerCase();

    if (event !== "login") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported onboarding event.",
        },
        { status: 400 }
      );
    }

    const admin =
      adminClient();

    /*
     * ----------------------------------------------------------
     * 3. CHECK BUSINESS
     * ----------------------------------------------------------
     */

    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .select(
        "business_id,business_name,whatsapp_connected"
      )
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (businessError) {
      throw businessError;
    }

    const email = String(
      user.email ||
        body?.email ||
        ""
    ).trim();

    const fullName = String(
      user.user_metadata?.full_name ||
        body?.full_name ||
        ""
    ).trim();

    /*
     * ----------------------------------------------------------
     * 4. BUSINESS EXISTS
     *
     * ONBOARDING COMPLETED
     * ----------------------------------------------------------
     */

    if (business?.business_id) {
      const {
        error: completedError,
      } = await admin
        .from("sodah_onboarding")
        .upsert(
          {
            user_id: user.id,
            email,
            full_name: fullName,
            status: "completed",
            last_login_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (completedError) {
        throw completedError;
      }

      return NextResponse.json({
        success: true,
        status: "completed",
        onboarding_completed: true,
        business_id:
          business.business_id,
      });
    }

    /*
     * ----------------------------------------------------------
     * 5. NO BUSINESS
     *
     * ONBOARDING INCOMPLETE
     * ----------------------------------------------------------
     */

    const {
      data: existingOnboarding,
      error: existingError,
    } = await admin
      .from("sodah_onboarding")
      .select(
        "user_id,status,followup_stage,last_login_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    /*
     * ----------------------------------------------------------
     * 6. PRESERVE FOLLOW-UP STAGE
     * ----------------------------------------------------------
     */

    const followupStage =
      existingOnboarding?.followup_stage ??
      0;

    /*
     * ----------------------------------------------------------
     * 7. SAVE INCOMPLETE STATE
     *
     * last_login_at is the starting point for the
     * 30-minute follow-up countdown.
     * ----------------------------------------------------------
     */

    const loginTimestamp =
      new Date().toISOString();

    const {
      error: onboardingError,
    } = await admin
      .from("sodah_onboarding")
      .upsert(
        {
          user_id: user.id,
          email,
          full_name: fullName,
          status: "incomplete",
          last_login_at:
            loginTimestamp,
          followup_stage:
            followupStage,
        },
        {
          onConflict:
            "user_id",
        }
      );

    if (onboardingError) {
      throw onboardingError;
    }

    /*
     * ----------------------------------------------------------
     * 8. RETURN INCOMPLETE
     * ----------------------------------------------------------
     */

    return NextResponse.json({
      success: true,
      status: "incomplete",
      onboarding_completed: false,
      business_id: null,
      followup_stage:
        followupStage,
      followup_delay_ms:
        FOLLOWUP_DELAY_MS,
    });

  } catch (error) {
    console.error(
      "[Onboarding Track] Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to track onboarding.",
      },
      { status: 500 }
    );
  }
}

/*
 * ============================================================
 * GET
 *
 * SCHEDULED FOLLOW-UP PROCESSOR
 *
 * This endpoint is called by the scheduler/cron.
 *
 * It finds incomplete onboarding records where:
 *
 * last_login_at + FOLLOWUP_DELAY_MS <= NOW
 *
 * and followup_stage = 0.
 *
 * It then checks that the user STILL does not have
 * a business before sending the email.
 * ============================================================
 */

export async function GET(request) {
  try {
    /*
     * ----------------------------------------------------------
     * 1. PROTECT CRON ENDPOINT
     * ----------------------------------------------------------
     */

    const cronSecret =
      process.env.CRON_SECRET?.trim();

    const authorization =
      request.headers.get(
        "authorization"
      ) || "";

    const providedSecret =
      authorization
        .replace(/^Bearer\s+/i, "")
        .trim();

    if (
      !cronSecret ||
      providedSecret !== cronSecret
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const admin =
      adminClient();

    /*
     * ----------------------------------------------------------
     * 2. FIND INCOMPLETE USERS
     * ----------------------------------------------------------
     */

    const {
      data: onboardingRows,
      error: onboardingError,
    } = await admin
      .from("sodah_onboarding")
      .select(
        "user_id,email,full_name,status,followup_stage,last_login_at"
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
      );

    if (onboardingError) {
      throw onboardingError;
    }

    const now =
      Date.now();

    const dueRows =
      (onboardingRows || []).filter(
        (row) => {
          const lastLogin =
            new Date(
              row.last_login_at
            ).getTime();

          if (
            !Number.isFinite(
              lastLogin
            )
          ) {
            return false;
          }

          return (
            now - lastLogin >=
            FOLLOWUP_DELAY_MS
          );
        }
      );

    /*
     * ----------------------------------------------------------
     * 3. PROCESS DUE USERS
     * ----------------------------------------------------------
     */

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const results = [];

    for (const row of dueRows) {
      try {
        /*
         * ------------------------------------------------------
         * CHECK BUSINESS AGAIN
         *
         * This is critical.
         *
         * If the user completed setup during the
         * 30-minute period, DO NOT send the follow-up.
         * ------------------------------------------------------
         */

        const {
          data: business,
          error: businessError,
        } = await admin
          .from("businesses")
          .select(
            "business_id,business_name"
          )
          .eq(
            "user_id",
            row.user_id
          )
          .limit(1)
          .maybeSingle();

        if (businessError) {
          throw businessError;
        }

        if (business?.business_id) {
          /*
           * User completed setup.
           * Mark onboarding completed.
           */

          const {
            error:
              completedError,
          } = await admin
            .from(
              "sodah_onboarding"
            )
            .update({
              status:
                "completed",
              followup_stage:
                row.followup_stage,
            })
            .eq(
              "user_id",
              row.user_id
            );

          if (completedError) {
            throw completedError;
          }

          skippedCount++;

          results.push({
            user_id:
              row.user_id,
            status:
              "completed_before_followup",
          });

          continue;
        }

        /*
         * ------------------------------------------------------
         * SEND FOLLOW-UP
         * ------------------------------------------------------
         */

        const fakeUser = {
          id: row.user_id,
          email: row.email,
          user_metadata: {
            full_name:
              row.full_name || "",
          },
        };

        const result =
          await sendIncompleteOnboardingFollowup(
            {
              admin,
              user: fakeUser,
              email:
                String(
                  row.email || ""
                ).trim(),
              fullName:
                String(
                  row.full_name || ""
                ).trim(),
            }
          );

        /*
         * ------------------------------------------------------
         * UPDATE FOLLOW-UP STAGE
         * ------------------------------------------------------
         */

        if (result.sent) {
          const {
            error:
              stageError,
          } = await admin
            .from(
              "sodah_onboarding"
            )
            .update({
              followup_stage: 1,
            })
            .eq(
              "user_id",
              row.user_id
            )
            .eq(
              "status",
              "incomplete"
            );

          if (stageError) {
            throw stageError;
          }

          sentCount++;

          results.push({
            user_id:
              row.user_id,
            status:
              "followup_sent",
          });
        } else {
          if (
            result.already_sent
          ) {
            /*
             * The email already exists in
             * sodah_email_events.
             *
             * Make sure onboarding also
             * reflects stage 1.
             */

            await admin
              .from(
                "sodah_onboarding"
              )
              .update({
                followup_stage: 1,
              })
              .eq(
                "user_id",
                row.user_id
              )
              .eq(
                "status",
                "incomplete"
              );

            skippedCount++;

            results.push({
              user_id:
                row.user_id,
              status:
                "followup_already_sent",
            });
          } else {
            failedCount++;

            results.push({
              user_id:
                row.user_id,
              status:
                "followup_failed",
              reason:
                result.reason ||
                "Unknown error",
            });
          }
        }

      } catch (error) {
        failedCount++;

        console.error(
          "[Onboarding Followup] User processing error:",
          row.user_id,
          error
        );

        results.push({
          user_id:
            row.user_id,
          status:
            "error",
          reason:
            error?.message ||
            "Unknown error",
        });
      }
    }

    /*
     * ----------------------------------------------------------
     * 4. RETURN PROCESSING RESULT
     * ----------------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      delay_ms:
        FOLLOWUP_DELAY_MS,

      checked:
        onboardingRows?.length || 0,

      due:
        dueRows.length,

      sent:
        sentCount,

      skipped:
        skippedCount,

      failed:
        failedCount,

      results,
    });

  } catch (error) {
    console.error(
      "[Onboarding Followup] Cron error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to process onboarding follow-ups.",
      },
      { status: 500 }
    );
  }
}