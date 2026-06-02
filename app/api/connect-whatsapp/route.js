import { NextResponse } from "next/server";

const EVOLUTION_URL =
  process.env.EVOLUTION_API_URL || "http://89.167.127.70:8080";

const INSTANCE_NAME =
  process.env.EVOLUTION_INSTANCE_NAME || "sodah-main";

const API_KEY =
  process.env.EVOLUTION_API_KEY || "sodah123";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Universal fetch helper
 */
async function evolutionFetch(endpoint, options = {}) {
  const response = await fetch(`${EVOLUTION_URL}${endpoint}`, {
    ...options,
    headers: {
      apikey: API_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();

  if (!text || text.trim() === "") {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Create instance if it does not already exist.
 */
async function ensureInstanceExists() {
  const result = await evolutionFetch("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: INSTANCE_NAME,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });

  const message =
    result?.response?.message?.join(" ") ||
    result?.message ||
    result?.raw ||
    "";

  if (
    String(message)
      .toLowerCase()
      .includes("already in use")
  ) {
    console.log(`Instance "${INSTANCE_NAME}" already exists.`);
  } else {
    console.log(`Instance "${INSTANCE_NAME}" created.`);
  }

  await sleep(3000);
}

/**
 * Extract QR code from all possible Evolution API response formats.
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
 * Convert raw base64 into a browser-friendly image source.
 */
function normalizeQr(qr) {
  if (!qr || typeof qr !== "string") {
    return null;
  }

  // Already a valid data URL
  if (qr.startsWith("data:image")) {
    return qr;
  }

  // Raw base64 string
  if (qr.length > 100) {
    return `data:image/png;base64,${qr}`;
  }

  return qr;
}

/**
 * Determine whether WhatsApp is connected.
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
    "authenticated",
  ].includes(String(status).toLowerCase());
}

/**
 * User instructions shown with the QR code.
 * Matches the WhatsApp Web wording.
 */
function getQrInstructions() {
  return {
    title: "Scan to log in",
    steps: [
      "Open WhatsApp on your phone.",
      "Tap Menu (⋮) on Android or Settings on iPhone.",
      "Tap Linked Devices.",
      "Tap Link a Device.",
      "Scan the QR code shown on this screen.",
    ],
    helpText:
      "Scan the QR code again if it expires before linking is complete.",
  };
}

/**
 * Main request handler.
 */
async function handleRequest() {
  try {
    console.log("======================================");
    console.log("Starting WhatsApp connection process");
    console.log("Instance:", INSTANCE_NAME);
    console.log("======================================");

    // 1. Ensure instance exists
    await ensureInstanceExists();

    // 2. Poll for QR code
    for (let attempt = 1; attempt <= 20; attempt++) {
      console.log(`Attempt ${attempt}/20`);

      const result = await evolutionFetch(
        `/instance/connect/${INSTANCE_NAME}`,
        {
          method: "GET",
        }
      );

      // Already connected
      if (isConnected(result)) {
        console.log("WhatsApp already connected.");

        return NextResponse.json({
          success: true,
          connected: true,
          message: "WhatsApp connected successfully.",
          redirectTo: "/automation",
          redirectDelay: 3000,
        });
      }

      // QR code available
      const qr = normalizeQr(extractQr(result));

      if (qr) {
        console.log("QR code generated successfully.");

        return NextResponse.json({
          success: true,
          connected: false,

          // QR image
          qrCode: qr,
          qr,

          // Display text for UI
          title: "Scan to log in",
          message:
            "Scan the QR code with WhatsApp on your phone.",

          // Step-by-step instructions
          instructions: getQrInstructions(),

          // Future redirect after successful scan
          redirectTo: "/automation",
          redirectDelay: 3000,
        });
      }

      console.log("QR not ready yet...");
      await sleep(3000);
    }

    // QR was not returned
    return NextResponse.json(
      {
        success: false,
        connected: false,
        title: "Failed to generate QR code",
        message:
          "QR code was not returned by Evolution API. Please try again.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Connect API Error:", error);

    return NextResponse.json(
      {
        success: false,
        connected: false,
        title: "Connection Error",
        message:
          error.message || "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return handleRequest();
}

export async function POST() {
  return handleRequest();
}