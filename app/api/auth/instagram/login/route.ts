import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
      "[Instagram OAuth Login] Missing OAuth environment variables."
    );

    return NextResponse.json(
      {
        error: "Instagram OAuth configuration is incomplete.",
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
      "[Instagram OAuth Login] No authenticated user.",
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

  /*
   * Use one cryptographically random OAuth state.
   *
   * The same value is stored in an HttpOnly cookie and
   * sent to Instagram as the OAuth state parameter.
   *
   * The callback will require an exact match.
   */
  const state = crypto.randomUUID();

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

  const redirectResponse =
    NextResponse.redirect(instagramUrl);

  // Preserve Supabase cookies.
  for (const cookie of cookiesToSet) {
    redirectResponse.cookies.set(
      cookie.name,
      cookie.value,
      cookie.options
    );
  }

  // Store the exact OAuth state.
  redirectResponse.cookies.set(
    "instagram_oauth_state",
    state,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    }
  );

  console.log(
    "[Instagram OAuth Login] OAuth state created."
  );

  return redirectResponse;
}