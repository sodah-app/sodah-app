import { NextResponse } from "next/server";

const VERIFY_TOKEN =
  process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const tokenMatches =
      !!VERIFY_TOKEN && token === VERIFY_TOKEN;

    console.log("INSTAGRAM WEBHOOK VERIFY:", {
      mode,
      tokenReceived: !!token,
      tokenMatches,
      challenge,
      envTokenExists: !!VERIFY_TOKEN,
    });

    /*
     * Meta webhook verification.
     *
     * Meta expects the challenge value to be returned
     * as plain text when the verification token matches.
     */
    if (
      mode === "subscribe" &&
      tokenMatches &&
      challenge
    ) {
      return new Response(challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    return NextResponse.json(
      {
        error: "Webhook verification failed.",
        mode,
        tokenReceived: !!token,
        tokenMatches,
        envTokenExists: !!VERIFY_TOKEN,
      },
      { status: 403 }
    );
  } catch (error) {
    console.error(
      "Instagram webhook verification error:",
      error
    );

    return NextResponse.json(
      {
        error: "Webhook verification failed.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    console.log(
      "INSTAGRAM WEBHOOK:",
      JSON.stringify(body, null, 2)
    );

    /*
     * We acknowledge the webhook immediately.
     *
     * Instagram/Meta expects a successful HTTP response.
     */
    return NextResponse.json(
      { received: true },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Instagram webhook error:",
      error
    );

    return NextResponse.json(
      {
        received: false,
        error: "Invalid webhook payload.",
      },
      { status: 400 }
    );
  }
}