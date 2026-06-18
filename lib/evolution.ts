import { NextResponse } from "next/server";
import { configureWebhook } from "@/lib/evolution";

export async function POST(request) {
  try {
    const result = await configureWebhook(...);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

type EvolutionResponse = Record<string, any>;

const WEBHOOK_EVENTS = [
  "APPLICATION_STARTUP",
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
];
async function createInstance(apiUrl, apiKey, instanceName) {
  const response = await fetch(`${apiUrl}/instance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
    }),
  });

  const text = await response.text();

  console.log("Create instance response:", text);

  if (!response.ok) {
    throw new Error(`Failed to create instance: ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

export async function configureWebhook(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string
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
          enabled: true,
          url: webhookUrl,
          events: WEBHOOK_EVENTS,
        },
      }),
    }
  );

  const text = await response.text();

  console.log("Configure webhook response:", text);

  if (!response.ok) {
    throw new Error(`Failed to configure webhook: ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

async function getQrCode(apiUrl, apiKey, instanceName) {
  const response = await fetch(
    `${apiUrl}/instance/connect/${instanceName}`,
    {
      method: "GET",
      headers: {
        apikey: apiKey,
      },
      cache: "no-store",
    }
  );

  const text = await response.text();

  console.log("Evolution raw response:", text);

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Evolution returned invalid JSON: ${text}`
      );
    }
  }

  return { response, data };
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing businessId",
        },
        { status: 400 }
      );
    }

    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Evolution API environment variables are missing.",
        },
        { status: 500 }
      );
    }

    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "N8N_WEBHOOK_URL is missing.",
        },
        { status: 500 }
      );
    }

    const instanceName = businessId;

    let { response, data } = await getQrCode(
      apiUrl,
      apiKey,
      instanceName
    );

    if (response.status === 404) {
      console.log(
        `Instance ${instanceName} not found. Recreating...`
      );

      await createInstance(
        apiUrl,
        apiKey,
        instanceName
      );

      await configureWebhook(
        apiUrl,
        apiKey,
        instanceName,
        webhookUrl
      );

      await new Promise((resolve) =>
        setTimeout(resolve, 3000)
      );

      const retry = await getQrCode(
        apiUrl,
        apiKey,
        instanceName
      );

      response = retry.response;
      data = retry.data;
    } else {
      await configureWebhook(
        apiUrl,
        apiKey,
        instanceName,
        webhookUrl
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
          (data as any)?.message ||
            (data as any)?.response?.message?.[0] ||
            `Evolution API returned ${response.status}`,
          details: data,
        },
        { status: response.status }
      );
    }

    const qrCode =
      data?.base64 ||
      data?.qrcode?.base64 ||
      data?.qrcode?.code ||
      data?.qrCode ||
      data?.code ||
      "";

    const connected =
      data?.instance?.state === "open" ||
      data?.state === "open";

    return NextResponse.json({
      success: true,
      connected,
      qrCode,
      message: connected
        ? "WhatsApp already connected."
        : qrCode
          ? "Scan this QR code with WhatsApp."
          : "No QR code returned.",
    });
  } catch (error) {
    console.error(
      "Connect WhatsApp Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}