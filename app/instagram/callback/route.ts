import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const INSTAGRAM_TOKEN_URL =
  "https://api.instagram.com/oauth/access_token";

export async function GET(
  request: NextRequest
) {
  const requestUrl =
    new URL(request.url);

  /*
   * =========================================================
   * READ INSTAGRAM RESPONSE
   * =========================================================
   */

  const code =
    requestUrl.searchParams.get("code");

  const state =
    requestUrl.searchParams.get("state");

  const instagramError =
    requestUrl.searchParams.get("error");

  const instagramErrorDescription =
    requestUrl.searchParams.get(
      "error_description"
    );

  /*
   * =========================================================
   * INSTAGRAM RETURNED AN ERROR
   * =========================================================
   */

  if (instagramError) {
    console.error(
      "[Instagram Callback] Instagram returned an error:",
      {
        error: instagramError,
        description:
          instagramErrorDescription,
      }
    );

    return NextResponse.redirect(
      new URL(
        `/channels?instagram_error=${encodeURIComponent(
          instagramErrorDescription ||
            instagramError
        )}`,
        requestUrl.origin
      )
    );
  }

  /*
   * =========================================================
   * CODE + STATE ARE REQUIRED
   * =========================================================
   */

  if (!code || !state) {
    console.error(
      "[Instagram Callback] Missing code or state.",
      {
        hasCode: Boolean(code),
        hasState: Boolean(state),
      }
    );

    return NextResponse.redirect(
      new URL(
        "/channels?instagram_error=Missing+Instagram+authorization+code.",
        requestUrl.origin
      )
    );
  }

  /*
   * =========================================================
   * READ OAUTH COOKIES
   *
   * These are now domain cookies:
   *
   * .sodah.io
   *
   * so they work on:
   *
   * sodah.io
   * www.sodah.io
   * =========================================================
   */

  const storedState =
    request.cookies.get(
      "instagram_oauth_state_v2"
    )?.value;

  const sodahUserId =
    request.cookies.get(
      "instagram_oauth_user_v2"
    )?.value;

  console.log(
    "[Instagram Callback] OAuth session check:",
    {
      host:
        request.headers.get("host"),
      hasStoredState:
        Boolean(storedState),
      hasUserId:
        Boolean(sodahUserId),
      stateMatches:
        Boolean(
          storedState &&
            state === storedState
        ),
    }
  );

  /*
   * =========================================================
   * OAUTH SESSION MISSING
   * =========================================================
   */

  if (
    !storedState ||
    !sodahUserId
  ) {
    console.error(
      "[Instagram Callback] Instagram OAuth cookies are missing."
    );

    return NextResponse.redirect(
      new URL(
        "/channels?instagram_error=Instagram+OAuth+session+expired.+Please+start+the+connection+again.",
        requestUrl.origin
      )
    );
  }

  /*
   * =========================================================
   * VERIFY STATE
   * =========================================================
   */

  if (state !== storedState) {
    console.error(
      "[Instagram Callback] OAuth state mismatch."
    );

    return NextResponse.redirect(
      new URL(
        "/channels?instagram_error=Instagram+OAuth+state+mismatch.",
        requestUrl.origin
      )
    );
  }

  /*
   * =========================================================
   * INSTAGRAM ENVIRONMENT
   * =========================================================
   */

  const appId =
    process.env.INSTAGRAM_APP_ID?.trim();

  const appSecret =
    process.env.INSTAGRAM_APP_SECRET?.trim();

  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI?.trim();

  if (
    !appId ||
    !appSecret ||
    !redirectUri
  ) {
    console.error(
      "[Instagram Callback] Missing Instagram environment variables."
    );

    return NextResponse.redirect(
      new URL(
        "/channels?instagram_error=Instagram+OAuth+configuration+is+incomplete.",
        requestUrl.origin
      )
    );
  }

  /*
   * =========================================================
   * EXCHANGE AUTHORIZATION CODE
   * =========================================================
   */

  const tokenBody =
    new URLSearchParams();

  tokenBody.set(
    "client_id",
    appId
  );

  tokenBody.set(
    "client_secret",
    appSecret
  );

  tokenBody.set(
    "grant_type",
    "authorization_code"
  );

  tokenBody.set(
    "redirect_uri",
    redirectUri
  );

  tokenBody.set(
    "code",
    code
  );

  let tokenResponse: Response;

  try {
    tokenResponse =
      await fetch(
        INSTAGRAM_TOKEN_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body:
            tokenBody.toString(),
          cache: "no-store",
        }
      );
  } catch (error) {
    console.error(
      "[Instagram Callback] Token request failed:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/channels?instagram_error=Could+not+connect+to+Instagram.",
        requestUrl.origin
      )
    );
  }

  const tokenData =
    await tokenResponse.json();

  if (
    !tokenResponse.ok ||
    !tokenData.access_token
  ) {
    console.error(
      "[Instagram Callback] Token exchange failed:",
      tokenData
    );

    return NextResponse.redirect(
      new URL(
        `/channels?instagram_error=${encodeURIComponent(
          tokenData.error_message ||
            tokenData.error ||
            "Instagram authorization failed."
        )}`,
        requestUrl.origin
      )
    );
  }

  const accessToken =
    tokenData.access_token;

  const instagramUserId =
    tokenData.user_id;

  /*
   * =========================================================
   * GET INSTAGRAM PROFILE
   * =========================================================
   */

  const profileUrl =
    new URL(
      "https://graph.instagram.com/v25.0/me"
    );

  profileUrl.searchParams.set(
    "fields",
    "user_id,username,name,profile_picture_url"
  );

  profileUrl.searchParams.set(
    "access_token",
    accessToken
  );

  let profileResponse: Response;

  try {
    profileResponse =
      await fetch(
        profileUrl.toString(),
        {
          cache: "no-store",
        }
      );
  } catch (error) {
    console.error(
      "[Instagram Callback] Profile request failed:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/channels?instagram_error=Instagram+profile+could+not+be+loaded.",
        requestUrl.origin
      )
    );
  }

  const profileData =
    await profileResponse.json();

  if (!profileResponse.ok) {
    console.error(
      "[Instagram Callback] Profile request failed:",
      profileData
    );

    return NextResponse.redirect(
      new URL(
        "/channels?instagram_error=Instagram+profile+could+not+be+loaded.",
        requestUrl.origin
      )
    );
  }

  /*
   * =========================================================
   * SAVE INSTAGRAM CONNECTION
   *
   * This is ONLY the Instagram connection.
   * It does NOT control the channel card status endpoint.
   * =========================================================
   */

  const supabase =
    await createClient();

  const {
    error: saveError,
  } =
    await supabase
      .from("instagram_connections")
      .upsert(
        {
          user_id:
            sodahUserId,

          instagram_user_id:
            profileData.user_id ||
            instagramUserId,

          username:
            profileData.username ||
            null,

          access_token:
            accessToken,

          connected:
            true,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id",
        }
      );

  if (saveError) {
    console.error(
      "[Instagram Callback] Failed to save connection:",
      saveError
    );

    return NextResponse.redirect(
      new URL(
        "/channels?instagram_error=Instagram+connected+but+could+not+be+saved.",
        requestUrl.origin
      )
    );
  }

  /*
   * =========================================================
   * SUCCESS
   * =========================================================
   */

  console.log(
    "[Instagram Callback] Instagram connected successfully.",
    {
      sodahUserId,
      instagramUserId:
        profileData.user_id ||
        instagramUserId,
      username:
        profileData.username,
    }
  );

  const response =
    NextResponse.redirect(
      new URL(
        "/channels/instagram/success",
        requestUrl.origin
      )
    );

  /*
   * =========================================================
   * DELETE ONE-TIME OAUTH COOKIES
   * =========================================================
   */

  const deleteCookieOptions = {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(process.env.NODE_ENV === "production"
      ? {
          domain: ".sodah.io",
        }
      : {}),
  };

  response.cookies.set(
    "instagram_oauth_state_v2",
    "",
    {
      ...deleteCookieOptions,
      maxAge: 0,
    }
  );

  response.cookies.set(
    "instagram_oauth_user_v2",
    "",
    {
      ...deleteCookieOptions,
      maxAge: 0,
    }
  );

  return response;
}