import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ============================================================
 * SODAH.IO SUBSCRIPTION REMINDERS
 * ============================================================
 *
 * Reminder schedule:
 *
 *   3 days before expiry → first reminder
 *   1 day before expiry  → final reminder
 *   Expiry day           → expired notice
 *
 * Cron:
 *   cron-job.org → every 1 hour
 *
 * Each reminder is sent only once.
 *
 * Database columns used from "businesses":
 *
 *   business_id
 *   user_id
 *   business_name
 *   subscription_plan
 *   subscription_status
 *   subscription_expiry
 *
 * Email events:
 *
 *   sodah_email_events
 *
 * ============================================================
 */

const TIME_ZONE = "Asia/Dubai";

const REMINDER_EVENTS = {
  THREE_DAYS: "subscription_expiry_3_days",
  ONE_DAY: "subscription_expiry_1_day",
  EXPIRED: "subscription_expired",
};

/*
 * ============================================================
 * ADMIN SUPABASE CLIENT
 * ============================================================
 */

function adminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
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
 * HTML ESCAPE
 * ============================================================
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
 * ============================================================
 * DUBAI DATE
 * ============================================================
 *
 * Returns:
 *
 *   YYYY-MM-DD
 *
 * The subscription expiry date is treated as a calendar date
 * in Dubai so that timezone conversion does not accidentally
 * move the reminder to the previous or next day.
 * ============================================================
 */

function getDubaiDate(value = new Date()) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

/*
 * ============================================================
 * PARSE SUBSCRIPTION EXPIRY
 * ============================================================
 */

function parseCalendarDate(value) {
  if (!value) {
    return null;
  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  /*
   * If the database value begins with YYYY-MM-DD,
   * preserve that exact calendar date.
   */
  const match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return getDubaiDate(text);
}

/*
 * ============================================================
 * DATE DIFFERENCE
 * ============================================================
 */

function daysBetween(
  startDate,
  endDate
) {
  const start =
    new Date(
      `${startDate}T00:00:00Z`
    );

  const end =
    new Date(
      `${endDate}T00:00:00Z`
    );

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return null;
  }

  return Math.round(
    (
      end.getTime() -
      start.getTime()
    ) /
      (24 * 60 * 60 * 1000)
  );
}

/*
 * ============================================================
 * DETERMINE REMINDER
 * ============================================================
 *
 * Only these three days trigger emails:
 *
 *   3 days remaining
 *   1 day remaining
 *   0 days remaining
 *
 * No email is sent on any other day.
 * ============================================================
 */

function getReminderForExpiry(
  expiryDate,
  today
) {
  const daysRemaining =
    daysBetween(
      today,
      expiryDate
    );

  if (daysRemaining === 3) {
    return {
      key: "THREE_DAYS",

      type: "3_days",

      eventType:
        REMINDER_EVENTS.THREE_DAYS,

      subject:
        "Your Sodah.io subscription expires in 3 days",

      title:
        "Your subscription expires in 3 days",

      message:
        "Your Sodah.io subscription will expire in 3 days. Renew now to keep your automation running without interruption.",

      button:
        "Renew My Subscription",
    };
  }

  if (daysRemaining === 1) {
    return {
      key: "ONE_DAY",

      type: "1_day",

      eventType:
        REMINDER_EVENTS.ONE_DAY,

      subject:
        "Your Sodah.io subscription expires tomorrow",

      title:
        "Your subscription expires tomorrow",

      message:
        "Your Sodah.io subscription will expire tomorrow. Renew now to avoid interruption to your workspace and automation.",

      button:
        "Renew My Subscription",
    };
  }

  if (daysRemaining === 0) {
    return {
      key: "EXPIRED",

      type: "expired",

      eventType:
        REMINDER_EVENTS.EXPIRED,

      subject:
        "Your Sodah.io subscription has expired",

      title:
        "Your subscription has expired",

      message:
        "Your Sodah.io subscription has reached its expiry date. Renew your plan to continue using your Sodah workspace and automation.",

      button:
        "Renew My Subscription",
    };
  }

  return null;
}

/*
 * ============================================================
 * CHECK IF REMINDER WAS ALREADY SENT
 * ============================================================
 */

async function hasSentEvent({
  admin,
  userId,
  eventType,
}) {
  const {
    data,
    error,
  } = await admin
    .from("sodah_email_events")
    .select(
      "id,status"
    )
    .eq(
      "user_id",
      userId
    )
    .eq(
      "event_type",
      eventType
    )
    .eq(
      "status",
      "sent"
    )
    .limit(1);

  if (error) {
    throw error;
  }

  return (
    Array.isArray(data) &&
    data.length > 0
  );
}

/*
 * ============================================================
 * SEND SUBSCRIPTION EMAIL
 * ============================================================
 */

async function sendSubscriptionEmail({
  admin,
  user,
  business,
  reminder,
}) {
  const email =
    String(
      user?.email || ""
    ).trim();

  if (!email) {
    return {
      sent: false,
      already_sent: false,
      reason:
        "No email address available.",
    };
  }

  /*
   * Prevent duplicate reminders.
   */
  const alreadySent =
    await hasSentEvent({
      admin,
      userId: user.id,
      eventType:
        reminder.eventType,
    });

  if (alreadySent) {
    return {
      sent: false,
      already_sent: true,
      reason:
        "Reminder already sent.",
    };
  }

  const resendApiKey =
    process.env.RESEND_API_KEY?.trim();

  if (!resendApiKey) {
    return {
      sent: false,
      already_sent: false,
      reason:
        "RESEND_API_KEY is not configured.",
    };
  }

  /*
   * Get user's first name.
   */
  const firstName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.firstName ||
    user?.user_metadata?.full_name
      ?.split(/\s+/)[0] ||
    user?.user_metadata?.name
      ?.split(/\s+/)[0] ||
    "there";

  /*
   * Existing businesses table fields.
   */
  const businessName =
    String(
      business?.business_name ||
        "your business"
    ).trim();

  const planName =
    String(
      business?.subscription_plan ||
        "Sodah plan"
    ).trim();

  const expiryDate =
    parseCalendarDate(
      business?.subscription_expiry
    );

  const subscriptionUrl =
    "https://www.sodah.io/subscription";

  const isExpired =
    reminder.key === "EXPIRED";

  const formattedExpiryDate =
    (() => {
      if (!expiryDate) {
        return "Not available";
      }

      const [
        year,
        month,
        day,
      ] =
        expiryDate
          .split("-")
          .map(Number);

      return new Intl.DateTimeFormat(
        "en-GB",
        {
          timeZone:
            TIME_ZONE,
          day: "2-digit",
          month: "long",
          year: "numeric",
        }
      ).format(
        new Date(
          Date.UTC(
            year,
            month - 1,
            day
          )
        )
      );
    })();

  /*
   * ==========================================================
   * EMAIL HTML
   * ==========================================================
   */

  const html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    ${escapeHtml(reminder.subject)}
  </title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f3faf6;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
    color:#17231d;
  "
>

  <div
    style="
      width:100%;
      padding:28px 12px;
      box-sizing:border-box;
    "
  >

    <div
      style="
        max-width:620px;
        margin:0 auto;
        background:#ffffff;
        border:1px solid #dfece5;
        border-radius:20px;
        overflow:hidden;
        box-shadow:0 10px 35px rgba(18,60,39,0.08);
      "
    >

      <!-- HEADER -->

      <div
        style="
          padding:30px 28px;
          background:linear-gradient(
            135deg,
            #b8f5cf,
            #69e6a0
          );
        "
      >

        <div
          style="
            font-size:27px;
            font-weight:800;
            letter-spacing:-0.7px;
            color:#123c27;
          "
        >
          sodah<span
            style="color:#087f46;"
          >.io</span>
        </div>

        <div
          style="
            margin-top:5px;
            font-size:12px;
            font-weight:600;
            letter-spacing:1.4px;
            color:#24563b;
            text-transform:uppercase;
          "
        >
          AI AUTOMATION
        </div>

      </div>


      <!-- CONTENT -->

      <div
        style="
          padding:34px 30px 36px;
        "
      >

        <!-- STATUS -->

        <div
          style="
            display:inline-block;
            padding:7px 11px;
            border-radius:999px;
            background:${
              isExpired
                ? "#fff0f0"
                : "#e8f9ef"
            };
            color:${
              isExpired
                ? "#b42318"
                : "#087f46"
            };
            font-size:12px;
            font-weight:700;
          "
        >
          ${
            isExpired
              ? "SUBSCRIPTION EXPIRED"
              : "SUBSCRIPTION REMINDER"
          }
        </div>


        <!-- TITLE -->

        <h1
          style="
            margin:18px 0 10px;
            font-size:27px;
            line-height:1.25;
            color:#17231d;
          "
        >
          ${escapeHtml(
            reminder.title
          )}
        </h1>


        <!-- MESSAGE -->

        <p
          style="
            margin:0;
            font-size:15px;
            line-height:1.75;
            color:#52605a;
          "
        >
          Hi ${escapeHtml(
            firstName
          )},<br /><br />

          ${escapeHtml(
            reminder.message
          )}
        </p>


        <!-- SUBSCRIPTION DETAILS -->

        <div
          style="
            margin-top:26px;
            padding:18px;
            border:1px solid #e2ece7;
            border-radius:16px;
            background:#f8fbf9;
          "
        >

          <div
            style="
              font-size:12px;
              font-weight:700;
              color:#7a8981;
              text-transform:uppercase;
              letter-spacing:1px;
            "
          >
            Subscription details
          </div>


          <div
            style="
              margin-top:12px;
              font-size:14px;
              line-height:1.8;
              color:#26352e;
            "
          >

            <strong>
              Business:
            </strong>

            ${escapeHtml(
              businessName
            )}

            <br />


            <strong>
              Plan:
            </strong>

            ${escapeHtml(
              planName
            )}

            <br />


            <strong>
              Expiry date:
            </strong>

            ${escapeHtml(
              formattedExpiryDate
            )}

          </div>

        </div>


        <!-- CTA -->

        <div
          style="
            margin-top:28px;
          "
        >

          <a
            href="${subscriptionUrl}"
            style="
              display:inline-block;
              padding:14px 22px;
              border-radius:12px;
              background:#087f46;
              color:#ffffff;
              text-decoration:none;
              font-size:14px;
              font-weight:700;
            "
          >
            ${escapeHtml(
              reminder.button
            )}
          </a>

        </div>


        <!-- SECONDARY MESSAGE -->

        <p
          style="
            margin-top:28px;
            font-size:14px;
            line-height:1.7;
            color:#52605a;
          "
        >
          ${
            isExpired
              ? "Renew your subscription to restore continued access to your Sodah workspace."
              : "We are reminding you early so you have time to renew before your subscription expires."
          }
        </p>


        <!-- SIGN OFF -->

        <p
          style="
            margin-top:28px;
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
          padding:20px 28px;
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
   * ==========================================================
   * SEND THROUGH RESEND
   * ==========================================================
   */

  try {
    const resendResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${resendApiKey}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              from:
                "Sodah.io <hello@sodah.io>",

              to: [email],

              subject:
                reminder.subject,

              html,
            }),
        }
      );

    const resendText =
      await resendResponse.text();

    let resendData = {};

    try {
      resendData =
        resendText
          ? JSON.parse(
              resendText
            )
          : {};
    } catch {
      resendData = {};
    }

    /*
     * Resend failed.
     */
    if (!resendResponse.ok) {
      console.error(
        "[Subscription Reminder] Resend error:",
        resendData
      );

      return {
        sent: false,
        already_sent: false,
        reason:
          resendData?.message ||
          "Unable to send subscription reminder.",
      };
    }

    /*
     * ========================================================
     * SAVE SUCCESSFUL EMAIL EVENT
     * ========================================================
     */

    const {
      error: eventError,
    } = await admin
      .from(
        "sodah_email_events"
      )
      .upsert(
        {
          user_id:
            user.id,

          email,

          event_type:
            reminder.eventType,

          status:
            "sent",

          sent_at:
            new Date().toISOString(),

          metadata: {
            resend_id:
              resendData?.id ||
              null,

            business_id:
              business?.business_id ||
              null,

            subscription_plan:
              business?.subscription_plan ||
              null,

            subscription_status:
              business?.subscription_status ||
              null,

            subscription_expiry:
              business?.subscription_expiry ||
              null,

            reminder:
              reminder.type,
          },
        },
        {
          onConflict:
            "user_id,event_type",
        }
      );

    /*
     * The email was already sent successfully even if
     * event logging fails.
     */
    if (eventError) {
      console.error(
        "[Subscription Reminder] Event save error:",
        eventError
      );

      return {
        sent: true,
        already_sent: false,
        resend_id:
          resendData?.id ||
          null,

        warning:
          "Email sent successfully, but event logging failed.",
      };
    }

    return {
      sent: true,
      already_sent: false,
      resend_id:
        resendData?.id ||
        null,
    };
  } catch (error) {
    console.error(
      "[Subscription Reminder] Resend request error:",
      error
    );

    return {
      sent: false,
      already_sent: false,
      reason:
        error?.message ||
        "Unexpected error while sending subscription reminder.",
    };
  }
}

/*
 * ============================================================
 * CRON AUTHENTICATION
 * ============================================================
 *
 * cron-job.org sends:
 *
 * Authorization:
 * Bearer YOUR_CRON_SECRET
 *
 * ============================================================
 */

function isAuthorizedCron(request) {
  const expectedSecret =
    process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    console.error(
      "[Subscription Reminder] CRON_SECRET is missing."
    );

    return false;
  }

  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  /*
   * Accept the normal Bearer format.
   */
  const token =
    authorization
      .replace(
        /^Bearer\s+/i,
        ""
      )
      .trim();

  return (
    token === expectedSecret
  );
}

/*
 * ============================================================
 * GET /api/subscription/reminders
 * ============================================================
 *
 * Called automatically by cron-job.org.
 *
 * Current cron schedule:
 *   Every 1 hour
 *
 * ============================================================
 */

export async function GET(request) {
  try {
    /*
     * --------------------------------------------------------
     * 1. CHECK CRON AUTHENTICATION
     * --------------------------------------------------------
     */

    if (
      !isAuthorizedCron(
        request
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * 2. CREATE ADMIN SUPABASE CLIENT
     * --------------------------------------------------------
     */

    const admin =
      adminClient();

    /*
     * --------------------------------------------------------
     * 3. GET TODAY IN DUBAI
     * --------------------------------------------------------
     */

    const today =
      getDubaiDate();

    if (!today) {
      throw new Error(
        "Unable to determine current Dubai date."
      );
    }

    /*
     * --------------------------------------------------------
     * 4. LOAD BUSINESSES
     * --------------------------------------------------------
     *
     * IMPORTANT:
     *
     * These are the REAL columns from the current
     * businesses table.
     *
     * subscription_plan
     * subscription_status
     * subscription_expiry
     *
     * There is NO "plan" column.
     * There is NO "subscription" column.
     * There is NO "plan_expiry" column.
     * --------------------------------------------------------
     */

    const {
      data: businesses,
      error:
        businessesError,
    } = await admin
      .from("businesses")
      .select(
        "business_id,user_id,business_name,subscription_plan,subscription_status,subscription_expiry"
      )
      .not(
        "subscription_expiry",
        "is",
        null
      );

    if (businessesError) {
      console.error(
        "[Subscription Reminder] Failed to load businesses:",
        businessesError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            businessesError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * 5. COUNTERS
     * --------------------------------------------------------
     */

    let checked = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const results = [];

    /*
     * --------------------------------------------------------
     * 6. PROCESS EACH BUSINESS
     * --------------------------------------------------------
     */

    for (
      const business
      of businesses || []
    ) {
      checked++;

      try {
        /*
         * ----------------------------------------------------
         * 6A. PARSE EXPIRY DATE
         * ----------------------------------------------------
         */

        const expiryDate =
          parseCalendarDate(
            business.subscription_expiry
          );

        if (!expiryDate) {
          skipped++;

          results.push({
            business_id:
              business.business_id,

            status:
              "skipped_no_expiry_date",
          });

          continue;
        }

        /*
         * ----------------------------------------------------
         * 6B. DETERMINE WHETHER A REMINDER IS DUE
         * ----------------------------------------------------
         */

        const reminder =
          getReminderForExpiry(
            expiryDate,
            today
          );

        /*
         * Nothing is due today.
         */
        if (!reminder) {
          skipped++;

          continue;
        }

        /*
         * ----------------------------------------------------
         * 6C. RE-CHECK THE CURRENT BUSINESS
         * ----------------------------------------------------
         *
         * This is important.
         *
         * If the customer renewed their subscription after
         * the initial query, the latest expiry date wins.
         *
         * This prevents an old/stale reminder from being sent.
         * ----------------------------------------------------
         */

        const {
          data:
            currentBusiness,
          error:
            currentBusinessError,
        } = await admin
          .from("businesses")
          .select(
            "business_id,user_id,business_name,subscription_plan,subscription_status,subscription_expiry"
          )
          .eq(
            "business_id",
            business.business_id
          )
          .maybeSingle();

        if (
          currentBusinessError
        ) {
          throw currentBusinessError;
        }

        /*
         * Business no longer exists.
         */
        if (!currentBusiness) {
          skipped++;

          results.push({
            business_id:
              business.business_id,

            status:
              "business_not_found",
          });

          continue;
        }

        /*
         * ----------------------------------------------------
         * 6D. CHECK CURRENT EXPIRY AGAIN
         * ----------------------------------------------------
         */

        const currentExpiry =
          parseCalendarDate(
            currentBusiness.subscription_expiry
          );

        if (!currentExpiry) {
          skipped++;

          results.push({
            business_id:
              business.business_id,

            status:
              "skipped_current_expiry_invalid",
          });

          continue;
        }

        const currentReminder =
          getReminderForExpiry(
            currentExpiry,
            today
          );

        /*
         * Subscription was renewed or changed.
         *
         * Do not send the original stale reminder.
         */
        if (
          !currentReminder ||
          currentReminder.eventType !==
            reminder.eventType
        ) {
          skipped++;

          results.push({
            business_id:
              business.business_id,

            status:
              "skipped_subscription_changed",
          });

          continue;
        }

        /*
         * ----------------------------------------------------
         * 6E. CHECK USER ID
         * ----------------------------------------------------
         */

        if (
          !currentBusiness.user_id
        ) {
          skipped++;

          results.push({
            business_id:
              business.business_id,

            status:
              "skipped_user_id_missing",
          });

          continue;
        }

        /*
         * ----------------------------------------------------
         * 6F. GET SUPABASE AUTH USER
         * ----------------------------------------------------
         *
         * The email is taken from the authenticated account.
         * ----------------------------------------------------
         */

        const {
          data:
            authUserData,
          error:
            authUserError,
        } =
          await admin.auth.admin.getUserById(
            currentBusiness.user_id
          );

        if (authUserError) {
          throw authUserError;
        }

        const user =
          authUserData?.user;

        if (!user) {
          skipped++;

          results.push({
            business_id:
              business.business_id,

            status:
              "skipped_user_not_found",
          });

          continue;
        }

        /*
         * ----------------------------------------------------
         * 6G. SEND EMAIL
         * ----------------------------------------------------
         */

        const result =
          await sendSubscriptionEmail({
            admin,
            user,
            business:
              currentBusiness,
            reminder:
              currentReminder,
          });

        /*
         * Email sent.
         */
        if (
          result.sent
        ) {
          sent++;

          results.push({
            business_id:
              business.business_id,

            user_id:
              currentBusiness.user_id,

            email:
              user.email,

            reminder:
              currentReminder.key,

            event_type:
              currentReminder.eventType,

            status:
              "reminder_sent",

            resend_id:
              result.resend_id ||
              null,
          });

          continue;
        }

        /*
         * Already sent.
         */
        if (
          result.already_sent
        ) {
          skipped++;

          results.push({
            business_id:
              business.business_id,

            user_id:
              currentBusiness.user_id,

            email:
              user.email,

            reminder:
              currentReminder.key,

            event_type:
              currentReminder.eventType,

            status:
              "already_sent",
          });

          continue;
        }

        /*
         * Email failed.
         */
        failed++;

        results.push({
          business_id:
            business.business_id,

          user_id:
            currentBusiness.user_id,

          email:
            user.email,

          reminder:
            currentReminder.key,

          event_type:
            currentReminder.eventType,

          status:
            "send_failed",

          reason:
            result.reason ||
            "Unknown email sending error.",
        });
      } catch (error) {
        /*
         * Do not stop processing all other businesses
         * because one business failed.
         */

        failed++;

        console.error(
          "[Subscription Reminder] Business processing error:",
          {
            business_id:
              business?.business_id,

            error:
              error?.message ||
              error,
          }
        );

        results.push({
          business_id:
            business?.business_id ||
            null,

          status:
            "processing_failed",

          reason:
            error?.message ||
            "Unknown processing error.",
        });
      }
    }

    /*
     * --------------------------------------------------------
     * 7. SUCCESS RESPONSE
     * --------------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      today,

      timezone:
        TIME_ZONE,

      checked,

      sent,

      skipped,

      failed,

      results,
    });
  } catch (error) {
    /*
     * --------------------------------------------------------
     * OUTER ERROR
     * --------------------------------------------------------
     */

    console.error(
      "[Subscription Reminder] Route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to process subscription reminders.",
      },
      {
        status: 500,
      }
    );
  }
}