import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PRIMARY_EVOLUTION_URL =
  process.env.EVOLUTION_API_URL ||
  "https://evolution.sodah.io";

const SECONDARY_EVOLUTION_URL =
  process.env.EVOLUTION_API_FALLBACK_URL ||
  "http://89.167.127.70:8080";

const API_KEY = process.env.EVOLUTION_API_KEY;
console.log("EVOLUTION_API_URL:", process.env.EVOLUTION_API_URL);
console.log("EVOLUTION_API_KEY exists:", !!process.env.EVOLUTION_API_KEY);
console.log("FALLBACK_URL:", process.env.EVOLUTION_API_FALLBACK_URL);

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

/**
 * Universal Evolution API helper
 */
async function evolutionFetch(endpoint, options = {}) {
  const urls = [
    PRIMARY_EVOLUTION_URL,
    SECONDARY_EVOLUTION_URL,
  ];

  let lastError;

  for (const baseUrl of urls) {
    try {
      const response = await fetch(
  `${baseUrl}${endpoint}`,
  {
    ...options,
    cache: "no-store",
    headers: {
      apikey: API_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  }
);

      if (!response.ok) {
        throw new Error(
          `Evolution API returned ${response.status}`
        );
      }

      const text = await response.text();

if (!text || text.trim() === "") {
  return {};
}

try {
  return JSON.parse(text);
} catch {
  return { raw: text };
}
    } catch (error) {
      console.error(
        `Evolution API failed: ${baseUrl}`,
        error
      );

      lastError = error;
    }
  }

  throw lastError;
}

/**
 * Get business from Supabase
 */
async function getBusiness(
  businessId
) {
  const { data, error } =
    await supabase
      .from("businesses")
      .select("*")
      .eq(
        "business_id",
        businessId
      )
      .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data;
}

/**
 * Create instance if missing
 */
async function ensureInstanceExists(
  instanceName
) {
  const result =
    await evolutionFetch(
      "/instance/create",
      {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration:
            "WHATSAPP-BAILEYS"
        })
      }
    );

  const message =
    result?.response?.message?.join(
      " "
    ) ||
    result?.message ||
    result?.raw ||
    "";

  if (
    String(message)
      .toLowerCase()
      .includes(
        "already in use"
      )
  ) {
    console.log(
      `Instance "${instanceName}" already exists.`
    );
  } else {
    console.log(
      `Instance "${instanceName}" created.`
    );
  }

  await sleep(3000);
}

/**
 * Configure webhook
 */
async function configureWebhook(
  instanceName
) {
  try {
    const result =
      await evolutionFetch(
        `/webhook/set/${instanceName}`,
        {
          method: "POST",
          body: JSON.stringify({
            enabled: true,

            url:
              "https://solomon-n8n.duckdns.org/webhook/app-chat",

            webhookByEvents: false,

            webhookBase64: false,

            events: [
              "CONNECTION_UPDATE",
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "SEND_MESSAGE",
              "QRCODE_UPDATED"
            ]
          })
        }
      );

    console.log(
      "Webhook configured:",
      result
    );

    return true;
  } catch (error) {
    console.error(
      "Webhook configuration failed:",
      error
    );

    return false;
  }
}

/**
 * Send welcome message
 */
async function sendWelcomeMessage(
  instanceName,
  phoneNumber
) {
  try {
    const message = `
🎉 Welcome to Sodah.io

Your AI Automation is now active.

✅ WhatsApp Connected
✅ AI Auto Reply Activated
✅ Automation Ready

You can now start receiving and replying to customers automatically.

Thank you for choosing Sodah.io 🚀
`;

    const result =
      await evolutionFetch(
        `/message/sendText/${instanceName}`,
        {
          method: "POST",
          body: JSON.stringify({
            number: phoneNumber,
            text: message
          })
        }
      );

    console.log(
      "Welcome message sent:",
      result
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to send welcome message:",
      error
    );

    return false;
  }
}

/**
 * Extract QR code
 */
function extractQr(data) {
  return (
    data?.base64 ||
    data?.qrcode?.base64 ||
    data?.qrcode ||
    data?.qrCode ||
    data?.qr ||
    data?.data?.base64 ||
    data?.data?.qrcode?.base64 ||
    data?.data?.qrcode ||
    data?.data?.qrCode ||
    data?.data?.qr ||
    null
  );
}

/**
 * Normalize QR image
 */
function normalizeQr(qr) {
  if (
    !qr ||
    typeof qr !== "string"
  ) {
    return null;
  }

  if (
    qr.startsWith(
      "data:image"
    )
  ) {
    return qr;
  }

  if (qr.length > 100) {
    return `data:image/png;base64,${qr}`;
  }

  return qr;
}

/**
 * Check connection status
 */
function isConnected(data) {
  const status =
    data?.instance?.state ||
    data?.instance?.status ||
    data?.connectionStatus ||
    data?.status ||
    "";

  return [
    "open",
    "connected",
    "online",
    "ready",
    "authenticated"
  ].includes(
    String(status).toLowerCase()
  );
}

/**
 * QR Instructions
 */
function getQrInstructions() {
  return {
    title: "Scan to log in",

    steps: [
      "Open WhatsApp on your phone.",
      "Tap Menu (⋮) on Android or Settings on iPhone.",
      "Tap Linked Devices.",
      "Tap Link a Device.",
      "Scan the QR code shown on this screen."
    ],

    helpText:
      "Scan the QR code again if it expires before linking is complete."
  };
}

/**
 * Main request handler
 */
async function handleRequest(
  request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const businessId =
      searchParams.get(
        "businessId"
      );

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "businessId is required."
        },
        {
          status: 400
        }
      );
    }

    const business =
      await getBusiness(
        businessId
      );

    const instanceName =
      business.business_id;

    console.log(
      "======================================"
    );
    console.log(
      "Starting WhatsApp connection process"
    );
    console.log(
      "Business ID:",
      businessId
    );
    console.log(
      "Instance:",
      instanceName
    );
    console.log(
      "======================================"
    );

    // Create instance
    await ensureInstanceExists(
      instanceName
    );

    // Configure webhook
    await configureWebhook(
      instanceName
    );

    // Poll for QR
    for (
      let attempt = 1;
      attempt <= 20;
      attempt++
    ) {
      console.log(
        `Attempt ${attempt}/20`
      );

      const result =
        await evolutionFetch(
          `/instance/connect/${instanceName}`,
          {
            method: "GET"
          }
        );

      // Already connected
      if (
        isConnected(result)
      ) {
        console.log(
          "WhatsApp connected."
        );

        await configureWebhook(
          instanceName
        );

        await supabase
          .from("businesses")
          .update({
            whatsapp_connected: true
          })
          .eq(
            "business_id",
            businessId
          );

        if (
          business.ai_number
        ) {
          await sendWelcomeMessage(
            instanceName,
            business.ai_number
          );
        }

        return NextResponse.json(
          {
            success: true,
            connected: true,
            businessId,
            message:
              "WhatsApp connected successfully.",
            redirectTo:
              "/automation",
            redirectDelay: 3000
          }
        );
      }

      // QR Available
      const qr =
        normalizeQr(
          extractQr(
            result
          )
        );

      if (qr) {
        return NextResponse.json(
          {
            success: true,
            connected: false,
            businessId,

            qrCode: qr,
            qr,

            title:
              "Scan to log in",

            message:
              "Scan the QR code with WhatsApp on your phone.",

            instructions:
              getQrInstructions()
          }
        );
      }

      await sleep(3000);
    }

    return NextResponse.json(
      {
        success: false,
        connected: false,
        title:
          "Failed to generate QR code",
        message:
          "QR code was not returned by Evolution API."
      },
      {
        status: 404
      }
    );
  } catch (error) {
   console.error("Connect API Error:", {
  message: error.message,
  stack: error.stack,
  apiUrl: PRIMARY_EVOLUTION_URL,
  apiKeyExists: !!API_KEY
});

    return NextResponse.json(
      {
        success: false,
        connected: false,
        message:
          error.message ||
          "Unexpected server error."
      },
      {
        status: 500
      }
    );
  }
}

export async function GET(
  request
) {
  return handleRequest(
    request
  );
}

export async function POST(
  request
) {
  return handleRequest(
    request
  );
}