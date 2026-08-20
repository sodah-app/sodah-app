import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createHmac, randomBytes } from "crypto";

const INSTAGRAM_AUTHORIZE_URL =
  "https://www.instagram.com/oauth/authorize";

function createSignedState(userId: string, secret: string) {
  const payload = {
    userId,
    nonce: randomBytes(16).toString("hex"),
    timestamp: Date.now(),
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  const signature = createHmac(
    "sha256",
    secret
  )
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export async function GET(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const instagramAppId =
    process.env.INSTAGRAM_APP_ID?.trim();

  const instagramAppSecret =
    process.env.INSTAGRAM_APP_SECRET?.trim();

  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI?.trim();

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !instagramAppId ||
    !instagramAppSecret ||
    !redirectUri
  ) {
    console.error(
      "[Instagram OAuth Login] Missing required environment variables."
    );

    return NextResponse.json(
      {
        error:
          "Instagram OAuth configuration is incomplete.",
      },
      { status: 500 }
    );
  }

  let cookiesToSet: {
    name: string;
    value: string;
    options?: Record<string, any>;
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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    console.error(
      "[Instagram OAuth Login] No authenticated Sodah user.",
      userError
    );

    return NextResponse.json(
      {
        error:
          "You must be logged in to connect Instagram.",
      },
      { status: 401 }
    );
  }

  const userId = user.id;

  /*
   * --------------------------------------------------
   * CREATE SIGNED OAUTH STATE
   *
   * We intentionally DO NOT store this in Supabase.
   * --------------------------------------------------
   */

  const state = createSignedState(
    userId,
    instagramAppSecret
  );

  const instagramUrl =
    new URL(INSTAGRAM_AUTHORIZE_URL);

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

  console.log(
    "[Instagram OAuth Login] Starting Instagram OAuth.",
    {
      userId,
      redirectUri,
    }
  );

  const response =
    NextResponse.redirect(
      instagramUrl
    );

  /*
   * Preserve any refreshed Supabase auth cookies.
   */

  for (const cookie of cookiesToSet) {
    response.cookies.set(
      cookie.name,
      cookie.value,
      cookie.options
    );
  }

  return response;
}