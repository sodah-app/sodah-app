import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  console.log("🔥🔥🔥 GET /api/campaign WORKS 🔥🔥🔥");

  return NextResponse.json({
    ok: true,
    route: "/api/campaign",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request) {
  console.log("");
  console.log("========================================");
  console.log("🔥🔥🔥 POST /api/campaign REACHED 🔥🔥🔥");
  console.log("========================================");

  try {
    const authorization = request.headers.get("authorization");

    console.log(
      "🔐 AUTH HEADER:",
      authorization ? "PRESENT" : "MISSING"
    );

    const body = await request.json();

    console.log("📦 BODY RECEIVED:");
    console.log(JSON.stringify(body, null, 2));

    const webhookUrl =
      process.env.N8N_CAMPAIGN_WEBHOOK_URL;

    console.log(
      "🌐 WEBHOOK ENV:",
      webhookUrl || "MISSING"
    );

    if (!webhookUrl) {
      console.error(
        "❌ N8N_CAMPAIGN_WEBHOOK_URL IS MISSING"
      );

      return NextResponse.json(
        {
          success: false,
          webhook_reached: false,
          error: "N8N_CAMPAIGN_WEBHOOK_URL is missing",
        },
        { status: 500 }
      );
    }

    const n8nPayload = {
      event: "whatsapp_campaign",

      user_id: body.user_id || null,

      campaign: {
        name: body.campaign_name || "",

        message_type:
          body.message_type || "ai",

        instructions:
          body.instructions || "",

        message:
          body.message || "",

        tone:
          body.tone || "Friendly",

        contacts:
          Array.isArray(body.contacts)
            ? body.contacts
            : [],

        total_contacts:
          Array.isArray(body.contacts)
            ? body.contacts.length
            : 0,

        schedule:
          body.schedule || {
            mode: "now",
            date: "",
            time: "",
          },
      },

      source: "sodah_whatsapp_campaign",

      created_at:
        body.created_at ||
        new Date().toISOString(),
    };

    console.log("");
    console.log("🚀🚀🚀 ABOUT TO CALL N8N 🚀🚀🚀");
    console.log("N8N URL:", webhookUrl);

    console.log("📤 N8N PAYLOAD:");
    console.log(
      JSON.stringify(n8nPayload, null, 2)
    );

    const n8nResponse = await fetch(
      webhookUrl,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",

          ...(authorization
            ? {
                Authorization: authorization,
              }
            : {}),
        },

        body: JSON.stringify(n8nPayload),

        cache: "no-store",
      }
    );

    console.log("");
    console.log(
      "📡 N8N HTTP STATUS:",
      n8nResponse.status
    );

    const n8nText =
      await n8nResponse.text();

    console.log(
      "📨 N8N RESPONSE:",
      n8nText
    );

    if (!n8nResponse.ok) {
      console.error(
        "❌ N8N REJECTED REQUEST"
      );

      return NextResponse.json(
        {
          success: false,
          webhook_reached: true,
          n8n_status: n8nResponse.status,
          n8n_response: n8nText,
        },
        { status: 502 }
      );
    }

    let n8nData = null;

    try {
      n8nData = n8nText
        ? JSON.parse(n8nText)
        : null;
    } catch {
      n8nData = n8nText;
    }

    console.log("");
    console.log(
      "🎉🎉🎉 N8N WEBHOOK REACHED 🎉🎉🎉"
    );

    return NextResponse.json({
      success: true,

      webhook_reached: true,

      n8n_status:
        n8nResponse.status,

      n8n_response:
        n8nData,

      business_id:
        n8nData &&
        typeof n8nData === "object"
          ? n8nData.business_id || null
          : null,

      ai_number:
        n8nData &&
        typeof n8nData === "object"
          ? n8nData.ai_number || null
          : null,
    });
  } catch (error) {
    console.error("");
    console.error(
      "🔥🔥🔥 /api/campaign ERROR 🔥🔥🔥"
    );

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        webhook_reached: false,
        error:
          error?.message ||
          "Campaign API failed.",
      },
      { status: 500 }
    );
  }
}