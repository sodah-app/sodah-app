import { NextResponse } from "next/server";

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

    const instanceName = businessId;
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Evolution API environment variables are missing.",
        },
        { status: 500 }
      );
    }

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
        return NextResponse.json(
          {
            success: false,
            message: `Evolution returned invalid JSON: ${text}`,
          },
          { status: 500 }
        );
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.message ||
            `Evolution API returned ${response.status}`,
          details: data,
        },
        { status: response.status }
      );
    }

    const qrCode =
      data?.base64 ||
      data?.qrcode?.base64 ||
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
    console.error("Connect WhatsApp Error:", error);

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