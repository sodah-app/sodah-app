import { NextRequest, NextResponse } from "next/server";
import {
  createClient as createSupabaseAdmin,
} from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const INSTAGRAM_GRAPH_URL =
  "https://graph.instagram.com/v25.0";

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

/*
 * --------------------------------------------------
 * VERIFY SIGNED OAUTH STATE
 * --------------------------------------------------
 */

function verifySignedState(
  state: string,
  secret: string
) {
  try {
    console.log(
      "[Instagram OAuth Callback] Starting state verification.",
      {
        stateReceived: Boolean(state),
        stateLength: state?.length ?? 0,
      }
    );

    const parts = state.split(".");

    if (parts.length !== 2) {
      console.error(
        "[Instagram OAuth Callback] STATE FORMAT INVALID.",
        {
          parts: parts.length,
        }
      );

      return null;
    }

    const [
      encodedPayload,
      providedSignature,
    ] = parts;

    const expectedSignature =
      createHmac(
        "sha256",
        secret
      )
        .update(encodedPayload)
        .digest("base64url");

    const providedBuffer =
      Buffer.from(
        providedSignature
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature
      );

    console.log(
      "[Instagram OAuth Callback] State signature check.",
      {
        providedSignatureLength:
          providedSignature.length,

        expectedSignatureLength:
          expectedSignature.length,

        signatureLengthMatches:
          providedBuffer.length ===
          expectedBuffer.length,
      }
    );

    if (
      providedBuffer.length !==
      expectedBuffer.length
    ) {
      console.error(
        "[Instagram OAuth Callback] STATE SIGNATURE LENGTH MISMATCH."
      );

      return null;
    }

    if (
      !timingSafeEqual(
        providedBuffer,
        expectedBuffer
      )
    ) {
      console.error(
        "[Instagram OAuth Callback] STATE SIGNATURE DOES NOT MATCH."
      );

      return null;
    }

    console.log(
      "[Instagram OAuth Callback] State signature is valid."
    );

    let payload: any;

    try {
      payload = JSON.parse(
        Buffer.from(
          encodedPayload,
          "base64url"
        ).toString("utf8")
      );
    } catch (error) {
      console.error(
        "[Instagram OAuth Callback] STATE PAYLOAD COULD NOT BE DECODED.",
        error
      );

      return null;
    }

    console.log(
      "[Instagram OAuth Callback] Decoded state payload.",
      {
        hasUserId: Boolean(
          payload?.userId
        ),

        hasTimestamp: Boolean(
          payload?.timestamp
        ),

        timestamp:
          payload?.timestamp ?? null,
      }
    );

    if (
      !payload?.userId ||
      !payload?.timestamp
    ) {
      console.error(
        "[Instagram OAuth Callback] STATE PAYLOAD IS MISSING USER ID OR TIMESTAMP."
      );

      return null;
    }

    const timestamp =
      Number(payload.timestamp);

    const age =
      Date.now() - timestamp;

    console.log(
      "[Instagram OAuth Callback] State age check.",
      {
        timestamp,

        currentTime:
          Date.now(),

        ageMilliseconds:
          age,

        ageMinutes:
          age / 1000 / 60,
      }
    );

    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age > 10 * 60 * 1000
    ) {
      console.error(
        "[Instagram OAuth Callback] STATE IS EXPIRED OR CLOCK IS INVALID.",
        {
          ageMilliseconds:
            age,
        }
      );

      return null;
    }

    console.log(
      "[Instagram OAuth Callback] STATE VERIFIED SUCCESSFULLY.",
      {
        userId:
          String(
            payload.userId
          ),
      }
    );

    return {
      userId:
        String(
          payload.userId
        ),
    };
  } catch (error) {
    console.error(
      "[Instagram OAuth Callback] State verification exception:",
      error
    );

    return null;
  }
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
   * --------------------------------------------------
   * ENVIRONMENT
   * --------------------------------------------------
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
      "[Instagram OAuth Callback] Missing environment variables."
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram OAuth configuration is incomplete."
    );
  }

  /*
   * --------------------------------------------------
   * INSTAGRAM RETURNED AN ERROR
   * --------------------------------------------------
   */

  if (instagramError) {
    console.error(
      "[Instagram OAuth Callback] Instagram returned an OAuth error.",
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

  /*
   * --------------------------------------------------
   * CHECK CODE
   * --------------------------------------------------
   */

  if (!code) {
    console.error(
      "[Instagram OAuth Callback] No authorization code received."
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram did not return an authorization code."
    );
  }

  /*
   * --------------------------------------------------
   * CHECK STATE
   * --------------------------------------------------
   */

  if (!state) {
    console.error(
      "[Instagram OAuth Callback] No OAuth state received."
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram OAuth state was missing."
    );
  }

  console.log(
    "[Instagram OAuth Callback] Callback received.",
    {
      hasCode:
        Boolean(code),

      hasState:
        Boolean(state),
    }
  );

  /*
   * --------------------------------------------------
   * VERIFY SIGNED STATE
   *
   * NO SUPABASE STATE TABLE.
   * --------------------------------------------------
   */

  const verifiedState =
    verifySignedState(
      state,
      instagramAppSecret
    );

  if (!verifiedState) {
    console.error(
      "[Instagram OAuth Callback] Invalid or expired OAuth state."
    );

    return redirectToChannels(
      request,
      "instagram_error",
      "Instagram OAuth session could not be verified. Please start the connection again."
    );
  }

  const userId =
    verifiedState.userId;

  console.log(
    "[Instagram OAuth Callback] OAuth state verified.",
    {
      userId,
    }
  );

  /*
   * --------------------------------------------------
   * SUPABASE ADMIN CLIENT
   * --------------------------------------------------
   */

  const supabaseAdmin =
    createSupabaseAdmin(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken:
            false,

          persistSession:
            false,
        },
      }
    );

  /*
   * --------------------------------------------------
   * EXCHANGE AUTHORIZATION CODE
   * --------------------------------------------------
   */

  const tokenResponse =
    await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept:
            "application/json",
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

        cache:
          "no-store",
      }
    );

  const tokenText =
    await tokenResponse.text();

  let tokenData: any = {};

  try {
    tokenData =
      JSON.parse(
        tokenText
      );
  } catch {
    tokenData = {
      raw:
        tokenText,
    };
  }

  if (
    !tokenResponse.ok ||
    typeof tokenData.access_token !==
      "string"
  ) {
    console.error(
      "[Instagram OAuth Callback] Authorization code exchange failed.",
      {
        status:
          tokenResponse.status,

        tokenData,
      }
    );

    return redirectToChannels(
      request,
      "instagram_error",
      tokenData.error_message ||
        tokenData.error?.message ||
        "Instagram authorization failed."
    );
  }

  const shortLivedToken =
    tokenData.access_token;

  console.log(
    "[Instagram OAuth Callback] Authorization code exchanged successfully."
  );

  /*
   * --------------------------------------------------
   * EXCHANGE FOR LONG-LIVED TOKEN
   * --------------------------------------------------
   */

  const longTokenUrl =
    new URL(
      `${INSTAGRAM_GRAPH_URL}/access_token`
    );

  longTokenUrl.searchParams.set(
    "grant_type",
    "ig_exchange_token"
  );

  longTokenUrl.searchParams.set(
    "client_secret",
    instagramAppSecret
  );

  longTokenUrl.searchParams.set(
    "access_token",
    shortLivedToken
  );

  const longTokenResponse =
    await fetch(
      longTokenUrl.toString(),
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",
        },

        cache:
          "no-store",
      }
    );

  const longTokenText =
    await longTokenResponse.text();

  let longTokenData: any = {};

  try {
    longTokenData =
      JSON.parse(
        longTokenText
      );
  } catch {
    longTokenData = {
      raw:
        longTokenText,
    };
  }

  if (
    !longTokenResponse.ok ||
    typeof longTokenData.access_token !==
      "string"
  ) {
    console.error(
      "[Instagram OAuth Callback] Long-lived token exchange failed.",
      {
        status:
          longTokenResponse.status,

        longTokenData,
      }
    );

    return redirectToChannels(
      request,
      "instagram_error",
      longTokenData.error_message ||
        longTokenData.error?.message ||
        "Could not create long-lived Instagram token."
    );
  }

  const instagramAccessToken =
    longTokenData.access_token;

  console.log(
    "[Instagram OAuth Callback] Long-lived Instagram token obtained."
  );

  /*
   * --------------------------------------------------
   * LOAD INSTAGRAM ACCOUNT
   * --------------------------------------------------
   */

  const instagramUserUrl =
    new URL(
      `${INSTAGRAM_GRAPH_URL}/me`
    );

  instagramUserUrl.searchParams.set(
    "fields",
    "id,username,account_type,profile_picture_url"
  );

  instagramUserUrl.searchParams.set(
    "access_token",
    instagramAccessToken
  );

  const instagramUserResponse =
    await fetch(
      instagramUserUrl.toString(),
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",
        },

        cache:
          "no-store",
      }
    );

  const instagramUserText =
    await instagramUserResponse.text();

  let instagramUser: any = {};

  try {
    instagramUser =
      JSON.parse(
        instagramUserText
      );
  } catch {
    instagramUser = {
      raw:
        instagramUserText,
    };
  }

  if (
    !instagramUserResponse.ok ||
    typeof instagramUser.id !==
      "string"
  ) {
    console.error(
      "[Instagram OAuth Callback] Instagram account lookup failed.",
      {
        status:
          instagramUserResponse.status,

        instagramUser,
      }
    );

    return redirectToChannels(
      request,
      "instagram_error",
      instagramUser.error_message ||
        instagramUser.error?.message ||
        "Instagram account could not be loaded."
    );
  }

  console.log(
    "[Instagram OAuth Callback] Instagram account loaded.",
    {
      userId,

      instagramUserId:
        instagramUser.id,

      username:
        instagramUser.username,
    }
  );

  /*
   * --------------------------------------------------
   * SAVE CONNECTION
   * --------------------------------------------------
   */

  const {
    data: savedConnection,
    error: upsertError,
  } =
    await supabaseAdmin
      .from(
        "instagram_connections"
      )
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
      "Instagram connected, but Sodah could not save the connection."
    );
  }

  /*
   * --------------------------------------------------
   * SUCCESS
   * --------------------------------------------------
   */

  console.log(
    "[Instagram OAuth Callback] INSTAGRAM CONNECTED SUCCESSFULLY.",
    {
      userId,

      instagramUserId:
        instagramUser.id,

      username:
        instagramUser.username,
    }
  );

  const successUrl =
    new URL(
      "/channels",
      request.url
    );

  successUrl.searchParams.set(
    "instagram_success",
    "true"
  );

  if (
    instagramUser.username
  ) {
    successUrl.searchParams.set(
      "username",
      instagramUser.username
    );
  }

  return NextResponse.redirect(
    successUrl
  );
}