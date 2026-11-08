import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  const mode =
    request.nextUrl.searchParams.get(
      "hub.mode"
    );

  const token =
    request.nextUrl.searchParams.get(
      "hub.verify_token"
    );

  const challenge =
    request.nextUrl.searchParams.get(
      "hub.challenge"
    );

  const expected =
    process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (
    mode === "subscribe" &&
    token &&
    expected &&
    token === expected
  ) {
    return new NextResponse(
      challenge || "",
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: "Webhook verification failed.",
    },
    { status: 403 }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const payload =
      await request.json();

    /*
     * Keep this endpoint deliberately non-destructive
     * until the Meta Calling webhook fields are configured
     * and tested in the dashboard.
     *
     * The raw event is acknowledged so Meta does not
     * repeatedly retry a valid HTTPS endpoint.
     */
    console.log(
      "[Sodah WhatsApp Calling webhook]",
      JSON.stringify(payload)
    );

    return NextResponse.json({
      success: true,
      received: true,
    });
  } catch (error: any) {
    console.error(
      "[Sodah WhatsApp Calling webhook]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Invalid webhook payload.",
      },
      { status: 400 }
    );
  }
}
