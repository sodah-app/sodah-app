import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { randomBytes } from "crypto";

const FACEBOOK_OAUTH_URL =
  "https://www.facebook.com/v25.0/dialog/oauth";

export async function GET(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const facebookAppId =
    process.env.FACEBOOK_APP_ID?.trim();

  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI?.trim();

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !facebookAppId ||
    !redirectUri
  ) {
    console.error(
      "[Facebook Login] Missing required environment variables."
    );

    return NextResponse.json(
      {
        error:
          "Facebook OAuth configuration is incomplete.",
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
        "/login?error=facebook_login_required",
        request.url
      )
    );
  }

  /*
   * ---------------------------------------------------------
   * CREATE OAUTH STATE
   * ---------------------------------------------------------
   */

  const state = randomBytes(32).toString("hex");

  /*
   * ---------------------------------------------------------
   * FACEBOOK AUTHORIZATION URL
   * ---------------------------------------------------------
   */

  const facebookUrl = new URL(
    FACEBOOK_OAUTH_URL
  );

  facebookUrl.searchParams.set(
    "client_id",
    facebookAppId
  );

  facebookUrl.searchParams.set(
    "redirect_uri",
    redirectUri
  );

  facebookUrl.searchParams.set(
    "response_type",
    "code"
  );

  facebookUrl.searchParams.set(
    "state",
    state
  );

  facebookUrl.searchParams.set(
    "scope",
    [
      "pages_show_list",
      "pages_manage_metadata",
      "pages_messaging",
      "business_management",
    ].join(",")
  );

  /*
   * ---------------------------------------------------------
   * REDIRECT TO FACEBOOK
   * ---------------------------------------------------------
   */

  const response =
    NextResponse.redirect(
      facebookUrl
    );

  /*
   * Preserve Supabase cookies.
   */

  for (const cookie of cookiesToSet) {
    response.cookies.set(
      cookie.name,
      cookie.value,
      cookie.options
    );
  }

  /*
   * Store OAuth state.
   */

  response.cookies.set(
    "facebook_oauth_state",
    state,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    }
  );

  response.cookies.set(
    "facebook_oauth_user",
    user.id,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    }
  );

  console.log(
    "[Facebook Login] OAuth started.",
    {
      userId: user.id,
      redirectUri,
    }
  );

  return response;
}