import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { randomBytes } from "crypto";

const INSTAGRAM_AUTHORIZE_URL =
  "https://www.instagram.com/oauth/authorize";

export async function GET(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const instagramAppId =
    process.env.INSTAGRAM_APP_ID?.trim();

  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI?.trim();

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !instagramAppId ||
    !redirectUri
  ) {
    console.error(
      "[Instagram Login] Missing required environment variables."
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
    return NextResponse.redirect(
      new URL(
        "/login?error=instagram_login_required",
        request.url
      )
    );
  }

  /*
   * =========================================================
   * CREATE OAUTH STATE
   * =========================================================
   */

  const state = randomBytes(32).toString("hex");

  /*
   * =========================================================
   * BUILD INSTAGRAM AUTHORIZATION URL
   * =========================================================
   */

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

  /*
   * =========================================================
   * REDIRECT RESPONSE
   * =========================================================
   */

  const response =
    NextResponse.redirect(
      instagramUrl
    );

  /*
   * =========================================================
   * PRESERVE SUPABASE COOKIES
   * =========================================================
   */

  for (const cookie of cookiesToSet) {
    response.cookies.set(
      cookie.name,
      cookie.value,
      cookie.options
    );
  }

  /*
   * =========================================================
   * INSTAGRAM OAUTH COOKIE OPTIONS
   *
   * IMPORTANT:
   * .sodah.io allows both:
   *
   *   sodah.io
   *   www.sodah.io
   *
   * to use these cookies.
   * =========================================================
   */

  const oauthCookieOptions = {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,

    ...(process.env.NODE_ENV === "production"
      ? {
          domain: ".sodah.io",
        }
      : {}),
  };

  /*
   * =========================================================
   * STORE OAUTH STATE
   * =========================================================
   */

  response.cookies.set(
    "instagram_oauth_state_v2",
    state,
    oauthCookieOptions
  );

  /*
   * =========================================================
   * STORE SODAH USER ID
   * =========================================================
   */

  response.cookies.set(
    "instagram_oauth_user_v2",
    user.id,
    oauthCookieOptions
  );

  /*
   * =========================================================
   * LOG
   * =========================================================
   */

  console.log(
    "[Instagram Login] OAuth started.",
    {
      userId: user.id,
      redirectUri,
      host:
        request.headers.get("host"),
    }
  );

  return response;
}