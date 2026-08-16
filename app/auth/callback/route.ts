import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");

  const next =
    requestUrl.searchParams.get("next") || "/welcome";

  /*
   * Never allow an external URL to be used as
   * the redirect destination.
   */
  const safeNext = next.startsWith("/")
    ? next
    : "/welcome";

  if (!code) {
    console.error(
      "[Auth Callback] Missing OAuth code."
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=missing_oauth_code",
        requestUrl.origin
      )
    );
  }

  const supabase = await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "[Auth Callback] Session exchange failed:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=oauth_session_failed",
        requestUrl.origin
      )
    );
  }

  if (!data.session || !data.user) {
    console.error(
      "[Auth Callback] No session/user returned."
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=no_session",
        requestUrl.origin
      )
    );
  }

  console.log(
    "[Auth Callback] User authenticated:",
    data.user.id
  );

  /*
   * At this point the Supabase server client has
   * written the authentication session into cookies.
   */

  return NextResponse.redirect(
    new URL(
      safeNext,
      requestUrl.origin
    )
  );
}