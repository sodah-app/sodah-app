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
    data?.response?.base64 ||
    data?.response?.code ||
    data?.response?.qr ||
    data?.response?.qrCode ||
    data?.response?.qrcode ||
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
    const { searchParams } = new URL(request.url);

    const businessId =
      searchParams.get("businessId");

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

    const result = await evolutionFetch(
      `/instance/connect/${instanceName}`,
      {
        method: "GET",
      }
    );

    console.log(
      "Evolution response:",
      JSON.stringify(result, null, 2)
    );

    const qr = normalizeQr(
      extractQr(result)
    );

    return NextResponse.json({
      success: true,
      connected: isConnected(result),
      qrCode: qr,
      message: qr
        ? "Scan this QR code with WhatsApp."
        : "QR code not available.",
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
          error instanceof Error
            ? error.message
            : "Unable to connect WhatsApp.",
      },
      { status: 500 }
    );
  }
}