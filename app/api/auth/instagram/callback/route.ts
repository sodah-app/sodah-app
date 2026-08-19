import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const INSTAGRAM_API_VERSION =
  process.env.INSTAGRAM_API_VERSION?.trim() ||
  "v24.0";

const INSTAGRAM_GRAPH_URL =
  `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`;

function base64UrlDecode(value: string) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding =
    "=".repeat(
      (4 - (normalized.length % 4)) % 4
    );

  return Buffer.from(
    normalized + padding,
    "base64"
  ).toString("utf8");
}

async function verifySignedState(
  state: string,
  secret: string
): Promise<string | null> {
  try {
    const parts = state.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [
      encodedPayload,
      suppliedSignature,
    ] = parts;

    if (
      !encodedPayload ||
      !suppliedSignature
    ) {
      return null;
    }

    const encoder = new TextEncoder();

    const key =
      await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        {
          name: "HMAC",
          hash: "SHA-256",
        },
        false,
        ["verify"]
      );

    const normalizedSignature =
      suppliedSignature
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padding =
      "=".repeat(
        (4 -
          (normalizedSignature.length %
            4)) %
          4
      );

    const signatureBytes =
      Buffer.from(
        normalizedSignature + padding,
        "base64"
      );

    const valid =
      await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        encoder.encode(
          encodedPayload
        )
      );

    if (!valid) {
      console.error(
        "[Instagram Callback] State signature invalid."
      );

      return null;
    }

    const payload =
      JSON.parse(
        base64UrlDecode(
          encodedPayload
        )
      );

    if (
      typeof payload.userId !==
        "string" ||
      !payload.userId ||
      typeof payload.timestamp !==
        "number"
    ) {
      console.error(
        "[Instagram Callback] State payload invalid."
      );

      return null;
    }

    const age =
      Date.now() -
      payload.timestamp;

    if (
      age < 0 ||
      age >
        10 * 60 * 1000
    ) {
      console.error(
        "[Instagram Callback] State expired."
      );

      return null;
    }

    return payload.userId;
  } catch (error) {
    console.error(
      "[Instagram Callback] State verification error:",
      error
    );

    return null;
  }
}

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

  return NextResponse.redirect(
    url
  );
}

async function readJson(
  response: Response
) {
  const text =
    await response.text();

  try {
    return text
      ? JSON.parse(text)
      : {};
  } catch {
    return {
      error_message:
        text ||
        "Instagram returned an invalid response.",
    };
  }
}

export async function GET(
  request: NextRequest
) {
  try {
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
     * Instagram cancelled authorization.
     */

    if (instagramError) {
      return redirectToChannels(
        request,
        "instagram_error",
        errorDescription ||
          "Instagram authorization was cancelled."
      );
    }

    /*
     * Authorization code required.
     */

    if (!code) {
      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram did not return an authorization code."
      );
    }

    /*
     * State required.
     */

    if (!state) {
      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram OAuth state was missing."
      );
    }

    const stateSecret =
      process.env.INSTAGRAM_STATE_SECRET?.trim();

    if (!stateSecret) {
      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram OAuth state secret is not configured."
      );
    }

    /*
     * Verify the signed state.
     *
     * NO COOKIE.
     * NO NONCE.
     * NO INSTAGRAM_OAUTH_NONCE.
     */

    const userId =
      await verifySignedState(
        state,
        stateSecret
      );

    if (!userId) {
      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram OAuth state could not be verified. Please start the connection again."
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
      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram OAuth configuration is incomplete."
      );
    }

    const supabaseAdmin =
      createSupabaseAdmin(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * STEP 1
     * Exchange authorization code.
     */

    console.log(
      "[Instagram Callback] Exchanging authorization code."
    );

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

          cache: "no-store",
        }
      );

    const tokenData =
      await readJson(
        tokenResponse
      );

    if (
      !tokenResponse.ok ||
      typeof tokenData.access_token !==
        "string"
    ) {
      console.error(
        "[Instagram Callback] Token exchange failed.",
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
          tokenData.error_description ||
          "Instagram authorization failed."
      );
    }

    const shortLivedToken =
      tokenData.access_token;

    /*
     * STEP 2
     * Long-lived token.
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
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    const longTokenData =
      await readJson(
        longTokenResponse
      );

    if (
      !longTokenResponse.ok ||
      typeof longTokenData.access_token !==
        "string"
    ) {
      console.error(
        "[Instagram Callback] Long-lived token exchange failed.",
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
          longTokenData.error_description ||
          "Instagram token creation failed."
      );
    }

    const instagramAccessToken =
      longTokenData.access_token;

    /*
     * STEP 3
     * Load Instagram account.
     */

    const instagramUserResponse =
      await fetch(
        `${INSTAGRAM_GRAPH_URL}/me?fields=id,username,account_type,profile_picture_url&access_token=${encodeURIComponent(
          instagramAccessToken
        )}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    const instagramUser =
      await readJson(
        instagramUserResponse
      );

    if (
      !instagramUserResponse.ok ||
      typeof instagramUser.id !==
        "string"
    ) {
      console.error(
        "[Instagram Callback] Instagram account lookup failed.",
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
          instagramUser.error_description ||
          "Instagram account could not be loaded."
      );
    }

    /*
     * STEP 4
     * Save connection.
     *
     * IMPORTANT:
     * Authorization is already successful here.
     * We do NOT make webhook verification part
     * of the OAuth success/failure decision.
     */

    const {
      data: savedConnection,
      error: upsertError,
    } = await supabaseAdmin
      .from(
        "instagram_connections"
      )
      .upsert(
        {
          user_id:
            userId,

          instagram_user_id:
            String(
              instagramUser.id
            ),

          instagram_username:
            typeof instagramUser.username ===
            "string"
              ? instagramUser.username
              : null,

          profile_picture_url:
            typeof instagramUser.profile_picture_url ===
            "string"
              ? instagramUser.profile_picture_url
              : null,

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
        "[Instagram Callback] Supabase save failed.",
        upsertError
      );

      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram was authorized, but Sodah could not save the connection."
      );
    }

    /*
     * SUCCESS
     *
     * Do not run webhook verification here.
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

    if (
      typeof instagramUser.username ===
      "string"
    ) {
      successUrl.searchParams.set(
        "username",
        instagramUser.username
      );
    }

    successUrl.searchParams.set(
      "webhook",
      "pending"
    );

    console.log(
      "[Instagram Callback] Instagram connected successfully.",
      {
        userId,
        instagramUserId:
          instagramUser.id,
        username:
          instagramUser.username ||
          null,
      }
    );

    return NextResponse.redirect(
      successUrl
    );
  } catch (error) {
    console.error(
      "[Instagram Callback] Unexpected error:",
      error
    );

    return redirectToChannels(
      request,
      "instagram_error",
      error instanceof Error
        ? error.message
        : "Instagram connection failed."
    );
  }
}