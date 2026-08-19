import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const INSTAGRAM_AUTHORIZE_URL =
  "https://www.instagram.com/oauth/authorize";

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createSignedState(
  userId: string,
  secret: string
) {
  const payload = {
    userId,
    timestamp: Date.now(),
  };

  const encodedPayload = base64UrlEncode(
    JSON.stringify(payload)
  );

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

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload)
  );

  const signatureBase64Url = Buffer.from(signature)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${encodedPayload}.${signatureBase64Url}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    const instagramAppId =
      process.env.INSTAGRAM_APP_ID?.trim();

    const redirectUri =
      process.env.INSTAGRAM_REDIRECT_URI?.trim();

    const stateSecret =
      process.env.INSTAGRAM_STATE_SECRET?.trim();

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !instagramAppId ||
      !redirectUri ||
      !stateSecret
    ) {
      console.error(
        "[Instagram Login] Missing OAuth configuration."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Instagram OAuth configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    let cookiesToSet: {
      name: string;
      value: string;
      options?: any;
    }[] = [];

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookies) {
            cookiesToSet = cookies;
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) {
      console.error(
        "[Instagram Login] User authentication failed.",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to connect Instagram.",
        },
        { status: 401 }
      );
    }

    const state = await createSignedState(
      user.id,
      stateSecret
    );

    const instagramUrl = new URL(
      INSTAGRAM_AUTHORIZE_URL
    );

    instagramUrl.searchParams.set(
      "client_id",
      instagramAppId
    );

    instagramUrl.searchParams.set(
      "redirect_uri",
      redirectUri
    );

    instagramUrl.searchParams.set(
      "response_type",
      "code"
    );

    instagramUrl.searchParams.set(
      "scope",
      [
        "instagram_business_basic",
        "instagram_business_manage_messages",
      ].join(",")
    );

    instagramUrl.searchParams.set(
      "state",
      state
    );

    const response =
      NextResponse.redirect(
        instagramUrl
      );

    for (const cookie of cookiesToSet) {
      response.cookies.set(
        cookie.name,
        cookie.value,
        cookie.options
      );
    }

    console.log(
      "[Instagram Login] Redirecting user to Instagram."
    );

    return response;
  } catch (error) {
    console.error(
      "[Instagram Login] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Instagram connection.",
      },
      { status: 500 }
    );
  }
}