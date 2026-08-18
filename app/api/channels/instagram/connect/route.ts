import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return new NextResponse(
        "Instagram configuration is missing.",
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * REQUIRE A LOGGED-IN SODAH USER
     * ---------------------------------------------------------
     */

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Instagram connect - Supabase user lookup failed:",
        userError
      );
    }

    if (!user) {
      const loginUrl = new URL("/login", request.url);

      loginUrl.searchParams.set(
        "redirect",
        "/channels"
      );

      return NextResponse.redirect(loginUrl);
    }

    /*
     * ---------------------------------------------------------
     * CREATE A UNIQUE OAUTH STATE
     * ---------------------------------------------------------
     *
     * This prevents Instagram connections from becoming
     * detached from the Sodah account that started the flow.
     */

    const state = crypto.randomBytes(32).toString("hex");

    /*
     * Store the OAuth state in a short-lived HTTP-only cookie.
     *
     * The callback will validate this exact value.
     */

    const response = NextResponse.redirect(
      `https://www.instagram.com/oauth/authorize?${new URLSearchParams(
        {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope:
            "instagram_business_basic,instagram_business_manage_messages",
          state,
        }
      ).toString()}`
    );

    response.cookies.set(
      "instagram_oauth_state",
      state,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      }
    );

    /*
     * Also store the Sodah user ID that initiated the flow.
     *
     * This is an additional tenant-safety check.
     */

    response.cookies.set(
      "instagram_oauth_user",
      user.id,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Instagram connect route error:",
      error
    );

    return new NextResponse(
      "Unable to start Instagram connection.",
      { status: 500 }
    );
  }
}