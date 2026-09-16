import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function getAuthenticatedUser(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const authorization = request.headers.get("authorization") || "";

  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!url || !anonKey || !token) return null;

  const client = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await client.auth.getUser();

  return error ? null : data?.user || null;
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required."
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const userId = String(
      body?.user_id || user.id
    ).trim();

    const email = String(
      body?.email || user.email || ""
    ).trim();

    const fullName = String(
      body?.full_name ||
        user.user_metadata?.full_name ||
        ""
    ).trim();

    const businessNameFromRequest = String(
      body?.business_name || ""
    ).trim();

    const businessId = String(
      body?.business_id || ""
    ).trim();

    if (userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user."
        },
        { status: 403 }
      );
    }

    if (!email || !businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and business ID are required."
        },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured."
        },
        { status: 500 }
      );
    }

    /*
     * ------------------------------------------------------------
     * VERIFY BUSINESS BELONGS TO AUTHENTICATED USER
     * ------------------------------------------------------------
     */

    const {
      data: business,
      error: businessError
    } = await admin
      .from("businesses")
      .select(
        "business_id, user_id, business_name, ai_number, support_number"
      )
      .eq("business_id", businessId)
      .maybeSingle();

    if (businessError) {
      console.error(
        "[Welcome Email] Business lookup failed:",
        businessError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify the business workspace."
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error: "Business workspace not found."
        },
        { status: 404 }
      );
    }

    if (business.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This business workspace does not belong to your account."
        },
        { status: 403 }
      );
    }

    const businessName =
      businessNameFromRequest ||
      String(
        business.business_name ||
          "your business"
      ).trim();

    const whatsappNumber = String(
      business.ai_number ||
        business.support_number ||
        ""
    ).trim();

    /*
     * ------------------------------------------------------------
     * ONE COMPLETED SETUP = ONE WELCOME EMAIL
     * ------------------------------------------------------------
     */

    const {
      data: existing,
      error: existingError
    } = await admin
      .from("sodah_email_events")
      .select("id,status")
      .eq("user_id", user.id)
      .eq(
        "event_type",
        "setup_completed_welcome"
      )
      .maybeSingle();

    if (
      existingError &&
      existingError.code !== "PGRST116"
    ) {
      console.error(
        "[Welcome Email] Event lookup failed:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify welcome email status."
        },
        { status: 500 }
      );
    }

    if (existing?.status === "sent") {
      return NextResponse.json({
        success: true,
        already_sent: true,
        message:
          "Welcome email was already sent."
      });
    }

    /*
     * ------------------------------------------------------------
     * PERSONALIZED NAME
     * ------------------------------------------------------------
     */

    const firstName =
      fullName.split(/\s+/)[0] ||
      String(
        user.user_metadata?.full_name || ""
      )
        .trim()
        .split(/\s+/)[0] ||
      "there";

    /*
     * ------------------------------------------------------------
     * WORKSPACE URL
     * ------------------------------------------------------------
     */

    const setupUrl =
      `https://www.sodah.io/channels?businessId=${encodeURIComponent(
        businessId
      )}`;

    /*
     * ------------------------------------------------------------
     * WHATSAPP NUMBER BLOCK
     * ------------------------------------------------------------
     */

    const whatsappBlock = whatsappNumber
      ? `
        <div
          style="
            margin:24px 0;
            padding:20px;
            border-radius:16px;
            background:#f5fbf7;
            border:1px solid #d7f0df;
          "
        >
          <div
            style="
              font-weight:800;
              font-size:15px;
              color:#123c27;
              margin-bottom:8px;
            "
          >
            Your WhatsApp number
          </div>

          <div
            style="
              font-size:18px;
              font-weight:800;
              color:#102018;
            "
          >
            ${escapeHtml(whatsappNumber)}
          </div>

          <div
            style="
              margin-top:7px;
              font-size:13px;
              line-height:1.6;
              color:#68756f;
            "
          >
            This is the WhatsApp number saved for
            your Sodah business setup.
          </div>
        </div>
      `
      : "";

    /*
     * ------------------------------------------------------------
     * EMAIL HTML
     * ------------------------------------------------------------
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
        background:#fff;
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
              #052e1b,
              #0b6b3a
            );
        "
      >

        <div
          style="
            font-size:28px;
            font-weight:800;
            color:#fff;
          "
        >
          sodah<span style="color:#55e89a;">.io</span>
        </div>

        <div
          style="
            margin-top:8px;
            color:#c9f8dc;
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
            font-size:28px;
            color:#102018;
          "
        >
          Hi ${escapeHtml(firstName)},
          welcome to Sodah.io! 👋
        </h1>

        <p
          style="
            font-size:16px;
            line-height:1.7;
            color:#52605a;
          "
        >
          We are happy to have you with us.
        </p>

        <p
          style="
            font-size:16px;
            line-height:1.7;
            color:#52605a;
          "
        >
          Your workspace for
          <strong>
            ${escapeHtml(businessName)}
          </strong>
          is now ready.
          Sodah.io is built to help you manage
          your customer communication, automate
          repetitive work, and grow your business.
        </p>

        ${whatsappBlock}

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
            What you can do from your
            Sodah workspace
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
            — connect your WhatsApp and
            automate customer communication.

            <br />

            ✓
            <strong>
              WhatsApp Campaigns
            </strong>
            — create and launch campaigns
            for your customers and contacts.

            <br />

            ✓
            <strong>
              Business Update AI
            </strong>
            — update your business details,
            services, packages, promotions,
            working hours and other supported
            business information whenever
            you need to.

            <br />

            ✓
            <strong>
              Campaign History
            </strong>
            — review campaigns you have
            created and run.

            <br />

            ✓
            <strong>
              Business Workspace
            </strong>
            — manage your Sodah automation
            and business communication from
            one place.

          </div>

        </div>

        <!-- GETTING STARTED -->

        <div
          style="
            margin:26px 0;
            padding:20px;
            border-radius:16px;
            background:#fafcfb;
            border:1px solid #e7ece9;
          "
        >

          <div
            style="
              font-weight:800;
              font-size:15px;
              color:#123c27;
              margin-bottom:10px;
            "
          >
            Getting started
          </div>

          <div
            style="
              font-size:14px;
              line-height:1.9;
              color:#52605a;
            "
          >

            <strong>1.</strong>
            Open your Sodah workspace.

            <br />

            <strong>2.</strong>
            Open the WhatsApp connection
            section.

            <br />

            <strong>3.</strong>
            Scan the QR code using
            your WhatsApp.

            <br />

            <strong>4.</strong>
            Once WhatsApp is connected,
            your configured automation
            can begin working.

          </div>

        </div>

        <!-- CTA -->

        <div
          style="
            text-align:center;
            margin:30px 0;
          "
        >

          <a
            href="${setupUrl}"
            style="
              display:inline-block;
              padding:15px 26px;
              border-radius:12px;
              background:#19b95b;
              color:#fff;
              text-decoration:none;
              font-weight:800;
              font-size:15px;
            "
          >
            Open My Sodah Workspace
          </a>

        </div>

        <p
          style="
            font-size:14px;
            line-height:1.7;
            color:#68756f;
          "
        >
          Your workspace is the main place
          to manage your Sodah tools.
          You can return at any time to
          connect WhatsApp, launch campaigns,
          review campaign history, or update
          your business information.
        </p>

        <p
          style="
            font-size:14px;
            line-height:1.7;
            color:#68756f;
          "
        >
          If you need help, Sodah Support
          is available to guide you through
          the platform.
        </p>

        <p
          style="
            margin-top:30px;
            font-size:14px;
            color:#52605a;
          "
        >
          Welcome aboard,

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
     * ------------------------------------------------------------
     * RESEND
     * ------------------------------------------------------------
     */

    const apiKey =
      process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESEND_API_KEY is not configured."
        },
        { status: 500 }
      );
    }

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          from:
            "Sodah.io <hello@sodah.io>",

          to: [email],

          subject:
            `Welcome to Sodah.io, ${firstName} 👋`,

          html
        })
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

    if (!resendResponse.ok) {
      console.error(
        "[Welcome Email] Resend error:",
        resendData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            resendData?.message ||
            "Unable to send welcome email."
        },
        { status: 502 }
      );
    }

    /*
     * ------------------------------------------------------------
     * RECORD SUCCESSFUL EMAIL
     * ------------------------------------------------------------
     */

    const {
      error: eventError
    } = await admin
      .from("sodah_email_events")
      .upsert(
        {
          user_id: user.id,

          email,

          event_type:
            "setup_completed_welcome",

          business_id: businessId,

          status: "sent",

          sent_at:
            new Date().toISOString(),

          metadata: {
            resend_id:
              resendData?.id || null
          }
        },
        {
          onConflict:
            "user_id,event_type"
        }
      );

    if (eventError) {
      console.error(
        "[Welcome Email] Event save failed:",
        eventError
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Welcome email sent successfully.",

      id:
        resendData?.id || null
    });

  } catch (error) {

    console.error(
      "[Welcome Email] Route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to send welcome email."
      },
      { status: 500 }
    );
  }
}