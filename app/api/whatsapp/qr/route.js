import { NextResponse } from "next/server";

const PROVIDER_URL =
  process.env.WHATSAPP_QR_PROVIDER_URL ||
  "http://localhost:3002";

const PROVIDER_API_KEY =
  process.env.WHATSAPP_QR_PROVIDER_API_KEY ||
  "sodah-local-test-key-2026";

/*
 * Get the QR directly from the WhatsApp QR provider.
 *
 * This uses the exact endpoint that has already been
 * confirmed to work from PowerShell:
 *
 * GET /session/:businessId/qr
 */

async function getWhatsAppQR(businessId) {
  const providerUrl =
    `${PROVIDER_URL}/session/${encodeURIComponent(
      businessId
    )}/qr`;

  console.log(
    "[connect-whatsapp] Calling provider:",
    providerUrl
  );

  const response = await fetch(providerUrl, {
    method: "GET",

    headers: {
      Authorization: `Bearer ${PROVIDER_API_KEY}`,
      Accept: "application/json",
    },

    cache: "no-store",
  });

  const text = await response.text();

  console.log(
    "[connect-whatsapp] Provider HTTP status:",
    response.status
  );

  /*
   * IMPORTANT:
   *
   * Do NOT blindly call response.json().
   *
   * If the provider or another service returns HTML,
   * we want to show the real response instead of getting:
   *
   * JSON.parse: unexpected character at line 1 column 1
   */
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    console.error(
      "[connect-whatsapp] Provider returned non-JSON:",
      text.substring(0, 1000)
    );

    return {
      ok: false,
      status: response.status,
      error:
        response.status === 404
          ? "WhatsApp QR provider endpoint was not found."
          : "WhatsApp QR provider returned an invalid response.",
      providerResponse: text.substring(0, 500),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error:
        data?.error ||
        data?.message ||
        "WhatsApp QR provider returned an error.",
      providerResponse: data,
    };
  }

  return {
    ok: true,
    status: response.status,
    data,
  };
}

/*
 * POST
 *
 * Used when the user opens the Connect WhatsApp page
 * or presses Try Again.
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "[connect-whatsapp] POST request:",
      businessId
    );

    const result = await getWhatsAppQR(businessId);

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          providerStatus: result.status,
          providerResponse: result.providerResponse || null,
        },
        {
          status: result.status >= 400
            ? 502
            : 500,
        }
      );
    }

    const data = result.data;

    return NextResponse.json({
      success: true,

      sessionId:
        data.sessionId ||
        businessId,

      businessId,

      status:
        data.status ||
        "qr_pending",

      connected:
        data.connected === true,

      phoneNumber:
        data.phoneNumber ||
        "",

      qrCode:
        data.qrCode ||
        "",
    });
  } catch (error) {
    console.error(
      "[connect-whatsapp] POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to connect to WhatsApp QR provider.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * GET
 *
 * Used for polling.
 *
 * The frontend can repeatedly call:
 *
 * /api/connect-whatsapp?businessId=...
 *
 * and this route will retrieve the current QR/session
 * directly from the working provider.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "Business ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "[connect-whatsapp] GET status request:",
      businessId
    );

    const result = await getWhatsAppQR(businessId);

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          providerStatus: result.status,
          providerResponse: result.providerResponse || null,
        },
        {
          status: 502,
        }
      );
    }

    const data = result.data;

    return NextResponse.json({
      success: true,

      sessionId:
        data.sessionId ||
        businessId,

      businessId,

      status:
        data.status ||
        "qr_pending",

      connected:
        data.connected === true,

      phoneNumber:
        data.phoneNumber ||
        "",

      qrCode:
        data.qrCode ||
        "",
    });
  } catch (error) {
    console.error(
      "[connect-whatsapp] GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to retrieve WhatsApp QR code.",
      },
      {
        status: 500,
      }
    );
  }
}