import { NextResponse } from "next/server";

const PROVIDER_URL =
  process.env.WHATSAPP_QR_PROVIDER_URL ||
  "http://localhost:3002";

const PROVIDER_API_KEY =
  process.env.WHATSAPP_QR_PROVIDER_API_KEY ||
  "sodah-local-test-key-2026";

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
        { status: 400 }
      );
    }

    /*
     * Ask the provider for the current QR/session state.
     */
    const response = await fetch(
      `${PROVIDER_URL}/session/${encodeURIComponent(
        businessId
      )}/qr`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PROVIDER_API_KEY}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    console.log(
      "[connect-whatsapp/status] Provider status:",
      response.status
    );

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp provider returned an invalid response.",
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data.error ||
            data.message ||
            "Unable to retrieve WhatsApp status.",
          providerStatus: response.status,
        },
        { status: 502 }
      );
    }

    /*
     * Pass provider response directly to the frontend.
     */
    return NextResponse.json({
      success: true,
      sessionId:
        data.sessionId || businessId,
      businessId,
      status: data.status || "qr_pending",
      connected: data.connected === true,
      phoneNumber: data.phoneNumber || "",
      qrCode: data.qrCode || "",
      lastError: data.lastError || "",
      updatedAt: data.updatedAt || null,
    });
  } catch (error) {
    console.error(
      "[connect-whatsapp/status] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to connect to WhatsApp QR provider.",
      },
      { status: 500 }
    );
  }
}