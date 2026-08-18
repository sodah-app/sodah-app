import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const INSTAGRAM_AUTHORIZE_URL =
  "https://www.instagram.com/oauth/authorize";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createSignedState(userId: string): Promise<string> {
  const secret =
    process.env.INSTAGRAM_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "Missing INSTAGRAM_STATE_SECRET or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const payload = {
    userId,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  };

  const payloadString = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadString);

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload)
  );

  const signature = Buffer.from(signatureBuffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${encodedPayload}.${signature}`;
}

export async function GET(request: NextRequest) {
  try {
    /*
     * ---------------------------------------------------------
     * INSTAGRAM CONFIGURATION
     * ---------------------------------------------------------
     */

    const clientId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error(
        "Instagram configuration missing:",
        {
          hasClientId: Boolean(clientId),
          hasRedirectUri: Boolean(redirectUri),
        }
      );

      return new NextResponse(
        "Instagram configuration is missing.",
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * GET CURRENT SODAH USER
     * ---------------------------------------------------------
     *
     * This identifies WHICH Sodah tenant is connecting Instagram.
     *
     * We do NOT send the user to the normal Inbox login page.
     */

    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error(
        "Unable to read Sodah authentication session:",
        error
      );
    }

    if (!user) {
      const loginUrl = new URL("/login", request.url);

      loginUrl.searchParams.set(
        "redirect",
        "/channels"
      );

      loginUrl.searchParams.set(
        "channel",
        "instagram"
      );

      return NextResponse.redirect(loginUrl);
    }

    /*
     * ---------------------------------------------------------
     * CREATE TENANT-SPECIFIC OAUTH STATE
     * ---------------------------------------------------------
     *
     * The user ID is cryptographically signed.
     *
     * This means the callback can determine exactly which
     * Sodah user/tenant initiated the Instagram connection.
     */

    const state = await createSignedState(user.id);

    /*
     * ---------------------------------------------------------
     * INSTAGRAM OAUTH
     * ---------------------------------------------------------
     */

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope:
        "instagram_business_basic,instagram_business_manage_messages",
      state,
    });

    const instagramUrl =
      `${INSTAGRAM_AUTHORIZE_URL}?${params.toString()}`;

    console.log(
      "Starting Instagram OAuth:",
      {
        userId: user.id,
        redirectUri,
      }
    );

    return NextResponse.redirect(instagramUrl);
  } catch (error) {
    console.error(
      "Instagram OAuth start error:",
      error
    );

    return new NextResponse(
      error instanceof Error
        ? error.message
        : "Instagram connection could not be started.",
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }
    );
  }
}