import { NextResponse } from "next/server";

const PRIMARY_EVOLUTION_URL = (
  process.env.EVOLUTION_API_URL ||
  "https://evolution.sodah.io"
).replace(/\/$/, "");

const SECONDARY_EVOLUTION_URL = (
  process.env.EVOLUTION_API_FALLBACK_URL ||
  "http://89.167.127.70:8080"
).replace(/\/$/, "");

const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY;

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function evolutionFetch(
  endpoint,
  options = {}
) {
  const urls = [
    PRIMARY_EVOLUTION_URL,
    SECONDARY_EVOLUTION_URL,
  ];

  let lastError;

  for (const baseUrl of urls) {
    const url = `${baseUrl}${endpoint}`;

    try {
      console.log(
        `[Evolution] ${options.method || "GET"} ${url}`
      );

      const response = await fetch(url, {
        ...options,
        cache: "no-store",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

      const text = await response.text();

      console.log(
        `[Evolution] Status: ${response.status}`
      );

      let data = {};

      if (text?.trim()) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
      }

      if (!response.ok) {
        throw new Error(
          `Evolution API returned ${response.status}: ${text}`
        );
      }

      return data;
    } catch (error) {
      console.error(
        `[Evolution] Failed: ${url}`,
        error.message
      );

      lastError = error;
    }
  }

  throw lastError;
}

function extractQr(data) {
  return (
    data?.base64 ||
    data?.code ||
    data?.qr ||
    data?.qrCode ||
    data?.qrcode ||
    data?.qrcode?.base64 ||
    data?.qrcode?.code ||
    data?.data?.base64 ||
    data?.data?.code ||
    data?.data?.qr ||
    data?.data?.qrCode ||
    data?.data?.qrcode ||
    data?.data?.qrcode?.base64 ||
    data?.data?.qrcode?.code ||
    data?.response?.base64 ||
    data?.response?.code ||
    data?.response?.qr ||
    data?.response?.qrCode ||
    data?.response?.qrcode ||
    data?.response?.qrcode?.base64 ||
    data?.response?.qrcode?.code ||
    null
  );
}

function normalizeQr(qr) {
  if (!qr || typeof qr !== "string") {
    return null;
  }

  const value = qr.trim();

  if (value.startsWith("data:image")) {
    return value;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `data:image/png;base64,${value}`;
}

function isConnected(data) {
  const status = (
    data?.instance?.state ||
    data?.instance?.status ||
    data?.connectionStatus ||
    data?.state ||
    data?.status ||
    ""
  )
    .toString()
    .toLowerCase();

  return [
    "open",
    "connected",
    "online",
    "ready",
    "authenticated",
  ].includes(status);
}

export async function POST(request) {
  try {
    const body = await request.json();

    console.log("REQUEST BODY:", body);

    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing business ID",
        },
        { status: 400 }
      );
    }

    const instanceName = `sodah_${businessId}`;

    try {
      await evolutionFetch(
        "/instance/create",
        {
          method: "POST",
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration:
              "WHATSAPP-BAILEYS",
          }),
        }
      );

      await sleep(2000);
    } catch (error) {
      console.log(
        "Instance may already exist:",
        error.message
      );
    }

    const result = await evolutionFetch(
      `/instance/connect/${instanceName}`,
      {
        method: "GET",
      }
    );

    console.log(
      "CONNECT RESPONSE:",
      JSON.stringify(result, null, 2)
    );

    if (isConnected(result)) {
      return NextResponse.json({
        success: true,
        connected: true,
        message:
          "WhatsApp already connected.",
      });
    }

    const qr = normalizeQr(
      extractQr(result)
    );

    if (!qr) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          message:
            "QR code not generated.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connected: false,
      qr,
      message:
        "Scan this QR code with WhatsApp.",
    });
  } catch (error) {
    console.error(
      "Connect WhatsApp Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        connected: false,
        message:
          error.message ||
          "Failed to generate QR code.",
      },
      { status: 500 }
    );
  }
}