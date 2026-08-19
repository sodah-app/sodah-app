import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const INSTAGRAM_API_VERSION = "v19.0";

const INSTAGRAM_GRAPH_URL =
  `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`;

function redirectToChannels(
  request: NextRequest,
  parameter:
    | "instagram_error"
    | "instagram_warning",
  message: string
) {
  const url = new URL(
    "/channels",
    request.url
  );

  url.searchParams.set(
    parameter,
    message
  );

  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest
) {
  const { searchParams } =
    new URL(request.url);

  const code =
    searchParams.get("code");

  const state =
    searchParams.get("state");

  const instagramError =
    searchParams.get("error");

  const errorDescription =
    searchParams.get(
      "error_description"
    );

  /*
   * Instagram denied/cancelled authorization.
   */
  if (instagramError) {
    console.error(
      "[Instagram OAuth Callback] Instagram OAuth error:",
      {
        instagramError,
        errorDescription,
      }
    );

    return redirectToChannels(
      request,
      "instagram_error",
      errorDescription ||
        "Instagram authorization was cancelled."
    );
  }

  if (!code) {
    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram did not return an authorization code."
    );
  }

  if (!state) {
    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram OAuth state was missing."
    );
  }

  /*
   * ----------------------------------------------------
   * VERIFY OAUTH STATE
   * ----------------------------------------------------
   *
   * The login route stored this exact value in an
   * HttpOnly cookie before sending the user to Instagram.
   */
  const storedState =
    request.cookies.get(
      "instagram_oauth_state"
    )?.value;

  if (!storedState) {
    console.error(
      "[Instagram OAuth Callback] OAuth state cookie missing."
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram OAuth session expired or is invalid. Please start the connection again."
    );
  }

  if (storedState !== state) {
    console.error(
      "[Instagram OAuth Callback] OAuth state mismatch."
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram OAuth session expired or is invalid. Please start the connection again."
    );
  }

  /*
   * Environment.
   */
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const instagramAppId =
    process.env.INSTAGRAM_APP_ID?.trim();

  const instagramAppSecret =
    process.env.INSTAGRAM_APP_SECRET?.trim();

  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI?.trim();

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !instagramAppId ||
    !instagramAppSecret ||
    !redirectUri
  ) {
    console.error(
      "[Instagram OAuth Callback] OAuth configuration incomplete."
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram OAuth configuration is incomplete."
    );
  }

  const supabaseAdmin =
    createSupabaseAdmin(
      supabaseUrl,
      serviceRoleKey
    );

  /*
   * ----------------------------------------------------
   * IMPORTANT:
   * Resolve the authenticated Sodah user from Supabase,
   * NOT from the OAuth state.
   * ----------------------------------------------------
   */

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabaseAdmin.auth.getUser(
      request.cookies.get(
        "sb-access-token"
      )?.value || ""
    );

  /*
   * If your existing Supabase authentication middleware
   * already resolves the user differently, keep that
   * mechanism. The OAuth state itself must never be
   * trusted as the source of user identity.
   */

  if (userError || !user?.id) {
    console.error(
      "[Instagram OAuth Callback] Could not resolve authenticated Sodah user.",
      userError
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Your Sodah session expired. Please log in again and reconnect Instagram."
    );
  }

  const userId = user.id;

  /*
   * ----------------------------------------------------
   * STEP 1: Exchange authorization code.
   * ----------------------------------------------------
   */

  const tokenResponse =
    await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body:
          new URLSearchParams({
            client_id:
              instagramAppId,

            client_secret:
              instagramAppSecret,

            grant_type:
              "authorization_code",

            redirect_uri:
              redirectUri,

            code,
          }).toString(),

        cache: "no-store",
      }
    );

  const tokenData =
    await tokenResponse.json();

  if (
    !tokenResponse.ok ||
    typeof tokenData.access_token !==
      "string"
  ) {
    console.error(
      "[Instagram OAuth Callback] Authorization code exchange failed.",
      tokenData
    );

    return redirectToChannels(
      request,
      "instagram_error",
      tokenData.error_message ||
        "Instagram authorization failed."
    );
  }

  const shortLivedToken =
    tokenData.access_token;

  /*
   * ----------------------------------------------------
   * STEP 2: Exchange for long-lived token.
   * ----------------------------------------------------
   */

  const longTokenResponse =
    await fetch(
      `${INSTAGRAM_GRAPH_URL}/access_token?${new URLSearchParams(
        {
          grant_type:
            "ig_exchange_token",

          client_secret:
            instagramAppSecret,

          access_token:
            shortLivedToken,
        }
      ).toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

  const longTokenData =
    await longTokenResponse.json();

  if (
    !longTokenResponse.ok ||
    typeof longTokenData.access_token !==
      "string"
  ) {
    console.error(
      "[Instagram OAuth Callback] Long-lived token exchange failed.",
      longTokenData
    );

    return redirectToChannels(
      request,
      "instagram_error",
      longTokenData.error_message ||
        "Could not create long-lived Instagram token."
    );
  }

  const instagramAccessToken =
    longTokenData.access_token;

  /*
   * ----------------------------------------------------
   * STEP 3: Load Instagram account.
   * ----------------------------------------------------
   */

  const instagramUserResponse =
    await fetch(
      `${INSTAGRAM_GRAPH_URL}/me?fields=id,username,account_type,profile_picture_url&access_token=${encodeURIComponent(
        instagramAccessToken
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

  const instagramUser =
    await instagramUserResponse.json();

  if (
    !instagramUserResponse.ok ||
    typeof instagramUser.id !==
      "string"
  ) {
    console.error(
      "[Instagram OAuth Callback] Instagram account lookup failed.",
      instagramUser
    );

    return redirectToChannels(
      request,
      "instagram_error",
      instagramUser.error_message ||
        "Instagram account could not be loaded."
    );
  }

  /*
   * ----------------------------------------------------
   * STEP 4: Save connection.
   * ----------------------------------------------------
   */

  const {
    data: savedConnection,
    error: upsertError,
  } = await supabaseAdmin
    .from("instagram_connections")
    .upsert(
      {
        user_id:
          userId,

        instagram_user_id:
          instagramUser.id,

        instagram_username:
          instagramUser.username ||
          null,

        profile_picture_url:
          instagramUser.profile_picture_url ||
          null,

        access_token:
          instagramAccessToken,

        webhook_subscribed:
          false,

        webhook_fields:
          [],

        webhook_error:
          null,

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "user_id,instagram_user_id",
      }
    )
    .select()
    .single();

  if (
    upsertError ||
    !savedConnection
  ) {
    console.error(
      "[Instagram OAuth Callback] Failed to save Instagram connection.",
      upsertError
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram connected, but the connection could not be saved."
    );
  }

  /*
   * ----------------------------------------------------
   * SUCCESS
   * ----------------------------------------------------
   */

  const successUrl =
    new URL(
      "/channels",
      request.url
    );

  successUrl.searchParams.set(
    "instagram_success",
    "true"
  );

  if (instagramUser.username) {
    successUrl.searchParams.set(
      "username",
      instagramUser.username
    );
  }

  const successResponse =
    NextResponse.redirect(
      successUrl
    );

  /*
   * Delete OAuth state cookie.
   */
  successResponse.cookies.set(
    "instagram_oauth_state",
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );

  return successResponse;
}