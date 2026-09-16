import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_API_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const to = String(
      body?.to || "dagbahs@gmail.com"
    ).trim();

    if (!to) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipient email is required.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "Sodah.io <hello@sodah.io>",
          to: [to],
          subject: "Sodah.io Email Test",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>Welcome to Sodah.io</h2>
              <p>This is a test email from the Sodah.io email system.</p>
              <p>Your Resend domain and API connection are working correctly.</p>
              <p>— Sodah.io</p>
            </div>
          `,
        }),
      }
    );

    const responseText = await response.text();

    let data = {};

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      data = {
        raw: responseText,
      };
    }

    if (!response.ok) {
      console.error(
        "[Test Email] Resend error:",
        data
      );

      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error ||
            "Resend email request failed.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully.",
      id: data?.id || null,
    });
  } catch (error) {
    console.error(
      "[Test Email] Route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to send test email.",
      },
      { status: 500 }
    );
  }
}