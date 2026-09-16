import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER_URL =
  process.env.WHATSAPP_QR_PROVIDER_URL || "http://localhost:3001";

const PROVIDER_API_KEY =
  process.env.WHATSAPP_QR_PROVIDER_API_KEY || "";

function providerHeaders() {
  return {
    Authorization: `Bearer ${PROVIDER_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function providerRequest(path, options = {}) {
  const response = await fetch(`${PROVIDER_URL}${path}`, {
    ...options,
    headers: {
      ...providerHeaders(),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `QR provider returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `QR provider request failed (${response.status}).`
    );
  }

  return data;
}

/*
 * POST
 *
 * Creates a WhatsApp QR session.
 *
 * Body:
 * {
 *   businessId: "BIZ-1788298699579",
 *   sessionId: "optional"
 * }
 */
export async function POST(request) {
  try {
    if (!PROVIDER_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "WhatsApp QR provider API key is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const businessId = body?.businessId?.trim();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          message: "Business ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Use a stable session ID for each Sodah business.
     *
     * This prevents creating a completely different WhatsApp session
     * every time the user opens the page.
     */
    const sessionId =
      body?.sessionId?.trim() ||
      `sodah_${businessId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

    const result = await providerRequest("/session/create", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        businessId,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        provider: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Sodah QR Provider] POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Unable to create WhatsApp QR session.",
      },
      { status: 502 }
    );
  }
}

/*
 * GET
 *
 * Returns the current QR/session information.
 *
 * Example:
 * /api/whatsapp/qr-provider?sessionId=sodah_BIZ-123
 */
export async function GET(request) {
  try {
    if (!PROVIDER_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "WhatsApp QR provider API key is not configured.",
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId")?.trim();

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Session ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANT:
     *
     * We don't assume a provider endpoint here.
     *
     * The provider we already tested exposes session creation.
     * Once we inspect the provider's actual session/status route,
     * this GET handler can be pointed to that exact route.
     *
     * For now, return a clear application-level response rather
     * than generating a misleading 404.
     */

    return NextResponse.json({
      success: false,
      needsProviderStatusRoute: true,
      message:
        "The QR session was created successfully, but the provider status/QR retrieval route still needs to be connected.",
      sessionId,
    });
  } catch (error) {
    console.error("[Sodah QR Provider] GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Unable to retrieve WhatsApp QR session.",
      },
      { status: 502 }
    );
  }
}