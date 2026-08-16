import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    /*
     * ---------------------------------------------------------
     * INSTAGRAM CANCELLED / DENIED
     * ---------------------------------------------------------
     */
    if (error) {
      const message =
        errorDescription ||
        "Instagram authorization was cancelled.";

      return NextResponse.redirect(
        new URL(
          `/channels?instagram_error=${encodeURIComponent(message)}`,
          request.url
        )
      );
    }

    /*
     * ---------------------------------------------------------
     * NO CODE
     * ---------------------------------------------------------
     */
    if (!code) {
      return NextResponse.redirect(
        new URL(
          "/channels?instagram_error=No%20Instagram%20authorization%20code%20was%20received.",
          request.url
        )
      );
    }

    /*
     * ---------------------------------------------------------
     * ENVIRONMENT VARIABLES
     * ---------------------------------------------------------
     */
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const instagramAppId =
      process.env.INSTAGRAM_APP_ID;

    const instagramAppSecret =
      process.env.INSTAGRAM_APP_SECRET;

    const redirectUri =
      process.env.INSTAGRAM_REDIRECT_URI;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !instagramAppId ||
      !instagramAppSecret ||
      !redirectUri
    ) {
      throw new Error(
        "Instagram or Supabase environment variables are missing."
      );
    }

    /*
     * ---------------------------------------------------------
     * GET THE LOGGED-IN SODAH USER
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     * The Instagram callback does not normally contain an
     * Authorization header.
     *
     * Our Supabase SSR client reads the user's Supabase
     * authentication cookies from the browser.
     */
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "No authenticated Sodah user:",
        userError
      );

      return NextResponse.redirect(
        new URL(
          "/channels?instagram_error=Your%20Sodah%20session%20could%20not%20be%20found.%20Please%20log%20in%20again.",
          request.url
        )
      );
    }

    const userId = user.id;

    /*
     * ---------------------------------------------------------
     * SUPABASE ADMIN CLIENT
     * ---------------------------------------------------------
     */
    const supabaseAdmin = createSupabaseAdmin(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    /*
     * ---------------------------------------------------------
     * EXCHANGE INSTAGRAM CODE FOR SHORT-LIVED TOKEN
     * ---------------------------------------------------------
     */
    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: instagramAppId,
          client_secret: instagramAppSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }).toString(),
      }
    );

    const tokenData = await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        "Instagram authorization-code exchange failed:",
        tokenData
      );

      return NextResponse.redirect(
        new URL(
          `/channels?instagram_error=${encodeURIComponent(
            tokenData.error_message ||
              tokenData.error_description ||
              "Instagram authorization could not be completed."
          )}`,
          request.url
        )
      );
    }

    const shortLivedToken =
      tokenData.access_token;

    /*
     * ---------------------------------------------------------
     * EXCHANGE FOR LONG-LIVED TOKEN
     * ---------------------------------------------------------
     *
     * Instagram long-lived tokens are approximately 60 days.
     */
    const longTokenParams =
      new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: instagramAppSecret,
        access_token: shortLivedToken,
      });

    const longTokenResponse = await fetch(
      `https://graph.instagram.com/access_token?${longTokenParams.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const longTokenData =
      await longTokenResponse.json();

    if (
      !longTokenResponse.ok ||
      !longTokenData.access_token
    ) {
      console.error(
        "Instagram long-lived token exchange failed:",
        longTokenData
      );

      return NextResponse.redirect(
        new URL(
          `/channels?instagram_error=${encodeURIComponent(
            "Instagram connected, but the long-lived access token could not be created."
          )}`,
          request.url
        )
      );
    }

    const instagramAccessToken =
      longTokenData.access_token;

    /*
     * ---------------------------------------------------------
     * GET INSTAGRAM ACCOUNT
     * ---------------------------------------------------------
     */
    const instagramUserResponse =
      await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type,profile_picture_url&access_token=${encodeURIComponent(
          instagramAccessToken
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

    const instagramUser =
      await instagramUserResponse.json();

    if (
      !instagramUserResponse.ok ||
      !instagramUser.id
    ) {
      console.error(
        "Could not retrieve Instagram account:",
        instagramUser
      );

      return NextResponse.redirect(
        new URL(
          "/channels?instagram_error=Instagram%20account%20could%20not%20be%20loaded.",
          request.url
        )
      );
    }

    /*
     * ---------------------------------------------------------
     * SAVE INSTAGRAM CONNECTION
     * ---------------------------------------------------------
     *
     * MULTI-TENANT:
     *
     * The Instagram account is saved against the exact
     * Sodah user who clicked "Connect Instagram".
     */
    const { error: upsertError } =
      await supabaseAdmin
        .from("instagram_connections")
        .upsert(
          {
            user_id: userId,

            instagram_user_id:
              String(instagramUser.id),

            instagram_username:
              instagramUser.username || null,

            profile_picture_url:
              instagramUser.profile_picture_url ||
              null,

            access_token:
              instagramAccessToken,
          },
          {
            onConflict:
              "user_id,instagram_user_id",
          }
        );

    if (upsertError) {
      console.error(
        "Instagram connection save failed:",
        upsertError
      );

      return NextResponse.redirect(
        new URL(
          `/channels?instagram_error=${encodeURIComponent(
            "Instagram connected, but we could not save the connection."
          )}`,
          request.url
        )
      );
    }

    /*
     * ---------------------------------------------------------
     * SUBSCRIBE THIS INSTAGRAM ACCOUNT TO OUR WEBHOOK
     * ---------------------------------------------------------
     *
     * This is per Instagram account.
     *
     * Therefore every Sodah customer gets their own
     * Instagram webhook subscription.
     */
    const webhookResponse = await fetch(
      `https://graph.instagram.com/${encodeURIComponent(
        String(instagramUser.id)
      )}/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(
        instagramAccessToken
      )}`,
      {
        method: "POST",
        cache: "no-store",
      }
    );

    const webhookData =
      await webhookResponse.json();

    if (!webhookResponse.ok) {
      console.error(
        "Instagram webhook subscription failed:",
        webhookData
      );

      /*
       * The account itself is already saved.
       *
       * We tell the user that the connection was created,
       * but webhook subscription still needs attention.
       */
      return NextResponse.redirect(
        new URL(
          `/channels?instagram_warning=${encodeURIComponent(
            "Instagram account connected, but webhook subscription could not be completed."
          )}`,
          request.url
        )
      );
    }

    /*
     * ---------------------------------------------------------
     * SUCCESS
     * ---------------------------------------------------------
     */
    const successUrl = new URL(
      "/instagram/success",
      request.url
    );

    successUrl.searchParams.set(
      "username",
      instagramUser.username || ""
    );

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error(
      "Instagram callback error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Instagram connection failed.";

    return NextResponse.redirect(
      new URL(
        `/channels?instagram_error=${encodeURIComponent(message)}`,
        request.url
      )
    );
  }
}