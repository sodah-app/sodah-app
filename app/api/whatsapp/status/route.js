import { NextResponse } from "next/server";

const WEBHOOK_EVENTS = [
  "APPLICATION_STARTUP",
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
];

async function configureWebhook(
  apiUrl,
  apiKey,
  instanceName,
  webhookUrl
) {
  const response = await fetch(
    `${apiUrl}/webhook/set/${instanceName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        webhook: {
          url: webhookUrl,
          enabled: true,
          events: WEBHOOK_EVENTS,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("Webhook setup failed:", text);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { connected: false },
        { status: 400 }
      );
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    const response = await fetch(
      `${apiUrl}/instance/connectionState/${businessId}`,
      {
        headers: {
          apikey: apiKey,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    const connected =
      data?.instance?.state === "open" ||
      data?.state === "open";

    if (connected && webhookUrl) {
      await configureWebhook(
        apiUrl,
        apiKey,
        businessId,
        webhookUrl
      );
    }

    return NextResponse.json({
      connected,
      state:
        data?.instance?.state ||
        data?.state ||
        "unknown",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        connected: false,
      },
      { status: 500 }
    );
  }
}