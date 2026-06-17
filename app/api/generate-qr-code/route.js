import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// PRIMARY: New Evolution API
const PRIMARY_EVOLUTION_URL = "https://evolution.sodah.io";

// FALLBACK: Old Evolution API
const SECONDARY_EVOLUTION_URL = "http://89.167.127.70:8080";

const API_KEY =
  process.env.EVOLUTION_API_KEY || "sodah123";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function evolutionFetch(endpoint, options = {}) {
  const urls = [
    PRIMARY_EVOLUTION_URL,
    SECONDARY_EVOLUTION_URL,
  ];

  let lastError;

  for (const baseUrl of urls) {
    try {
      console.log(
        `[Evolution] Trying ${baseUrl}${endpoint}`
      );

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

      const text = await response.text();

      if (!response.ok) {
        console.error(
          `[Evolution] ${baseUrl} returned ${response.status}:`,
          text
        );

        throw new Error(
          `Evolution API returned ${response.status}`
        );
      }

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
        `[Evolution] Failed using ${baseUrl}`,
        error
      );

      lastError = error;
    }
  }

  throw lastError;
}

async function getBusiness(businessId) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("business_id", businessId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

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

function normalizeQr(qr) {
  if (!qr || typeof qr !== "string") {
    return null;
  }

  if (qr.startsWith("data:image")) {
    return qr;
  }

  return `data:image/png;base64,${qr}`;
}

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

async function ensureInstance(instanceName) {
  try {
    await evolutionFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
  } catch (error) {
    console.log(
      `Instance "${instanceName}" may already exist.`
    );
  }

  await sleep(3000);
}

async function configureWebhook(instanceName) {
  try {
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
            "QRCODE_UPDATED",
          ],
        }),
      }
    );
  } catch (error) {
    console.error(
      "Webhook configuration failed:",
      error
    );
  }
}

async function handleRequest(request) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId =
      searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          message: "businessId is required.",
        },
        { status: 400 }
      );
    }

    const business = await getBusiness(
      businessId
    );

    const instanceName =
      business.business_id;

    await ensureInstance(instanceName);

    await configureWebhook(instanceName);

    for (let attempt = 1; attempt <= 20; attempt++) {
      const result = await evolutionFetch(
        `/instance/connect/${instanceName}`,
        {
          method: "GET",
        }
      );

      if (isConnected(result)) {
        await supabase
          .from("businesses")
          .update({
            whatsapp_connected: true,
          })
          .eq("business_id", businessId);

        return NextResponse.json({
          success: true,
          connected: true,
          businessId,
          message:
            "WhatsApp connected successfully.",
        });
      }

      const qr = normalizeQr(
        extractQr(result)
      );

      if (qr) {
        return NextResponse.json({
          success: true,
          connected: false,
          businessId,
          qrCode: qr,
          message:
            "Scan the QR code with WhatsApp.",
        });
      }

      await sleep(3000);
    }

    return NextResponse.json(
      {
        success: false,
        connected: false,
        message:
          "QR code was not returned by Evolution API.",
      },
      {
        status: 404,
      }
    );
  } catch (error) {
    console.error(
      "Generate QR API Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        connected: false,
        message:
          error.message ||
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET(request) {
  return handleRequest(request);
}

export async function POST(request) {
  return handleRequest(request);
}