import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const INSTAGRAM_API_VERSION =
  process.env.INSTAGRAM_API_VERSION || "v24.0";

const INSTAGRAM_GRAPH_URL =
  `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`;

/**
 * Redirect back to the Channels page with a readable
 * Instagram connection result.
 */
function redirectToChannels(
  request: NextRequest,
  parameter: "instagram_error" | "instagram_warning",
  message: string
) {
  const url = new URL("/channels", request.url);

  url.searchParams.set(parameter, message);

  return NextResponse.redirect(url);
}

/**
 * Safely read an HTTP response.
 *
 * Instagram may sometimes return JSON, plain text, or another
 * response body. Calling response.json() blindly can produce:
 *
 *   Unexpected token 'E' ... is not valid JSON
 *
 * This helper prevents that.
 */
async function readResponseBody(
  response: Response
): Promise<{
  data: Record<string, unknown>;
  raw: string;
}> {
  const raw = await response.text();

  if (!raw) {
    return {
      data: {},
      raw: "",
    };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return {
        data: parsed as Record<string, unknown>,
        raw,
      };
    }

    return {
      data: {},
      raw,
    };
  } catch {
    return {
      data: {},
      raw,
    };
  }
}

/**
 * Extract a useful API error message from either JSON
 * or plain-text responses.
 */
function getApiErrorMessage(
  data: Record<string, unknown>,
  raw: string,
  fallback: string
): string {
  const error =
    data.error &&
    typeof data.error === "object"
      ? (data.error as Record<string, unknown>)
      : null;

  const message =
    typeof error?.message === "string"
      ? error.message
      : typeof data.error_message === "string"
      ? data.error_message
      : typeof data.error_description === "string"
      ? data.error_description
      : typeof data.message === "string"
      ? data.message
      : raw.trim();

  return message || fallback;
}

/**
 * Decode URL-safe Base64.
 */
function base64UrlDecode(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding =
    "=".repeat((4 - (normalized.length % 4)) % 4);

  return Buffer.from(
    normalized + padding,
    "base64"
  ).toString("utf8");
}

/**
 * Verify the signed OAuth state and recover the Sodah user ID.
 */
async function verifySignedState(
  state: string
): Promise<string | null> {
  try {
    const secret =
      process.env.INSTAGRAM_STATE_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret) {
      throw new Error(
        "Missing INSTAGRAM_STATE_SECRET or SUPABASE_SERVICE_ROLE_KEY."
      );
    }

    const parts = state.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [
      encodedPayload,
      suppliedSignature,
    ] = parts;

    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    const signatureBuffer =
      await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(encodedPayload)
      );

    const expectedSignature =
      Buffer.from(signatureBuffer)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

    if (
      suppliedSignature.length !==
      expectedSignature.length
    ) {
      return null;
    }

    let difference = 0;

    for (
      let i = 0;
      i < expectedSignature.length;
      i++
    ) {
      difference |=
        suppliedSignature.charCodeAt(i) ^
        expectedSignature.charCodeAt(i);
    }

    if (difference !== 0) {
      return null;
    }

    const payloadString =
      base64UrlDecode(encodedPayload);

    const payload = JSON.parse(payloadString) as {
      userId?: string;
      timestamp?: number;
      nonce?: string;
    };

    if (
      !payload.userId ||
      !payload.timestamp ||
      !payload.nonce
    ) {
      return null;
    }

    const maxAge = 10 * 60 * 1000;

    const stateAge =
      Date.now() - payload.timestamp;

    if (
      stateAge < 0 ||
      stateAge > maxAge
    ) {
      console.error(
        "Instagram OAuth state expired."
      );

      return null;
    }

    return payload.userId;
  } catch (error) {
    console.error(
      "Instagram OAuth state verification failed:",
      error
    );

    return null;
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    const instagramError =
      searchParams.get("error");

    const errorDescription =
      searchParams.get("error_description");

    /*
     * ---------------------------------------------------------
     * INSTAGRAM DENIED / CANCELLED
     * ---------------------------------------------------------
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
     * ---------------------------------------------------------
     * REQUIRE CODE
     * ---------------------------------------------------------
     */

    if (!code) {
      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram did not return an authorization code."
      );
    }

    /*
     * ---------------------------------------------------------
     * REQUIRE STATE
     * ---------------------------------------------------------
     */

    if (!state) {
      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram OAuth state was missing. Please start the Instagram connection again."
      );
    }

    /*
     * ---------------------------------------------------------
     * VERIFY STATE
     * ---------------------------------------------------------
     */

    const userId =
      await verifySignedState(state);

    if (!userId) {
      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram connection could not be verified. Please start the connection again."
      );
    }

    console.log(
      "[Instagram OAuth] Callback belongs to Sodah user:",
      userId
    );

    /*
     * ---------------------------------------------------------
     * ENVIRONMENT
     * ---------------------------------------------------------
     */

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    const instagramAppId =
      process.env.INSTAGRAM_APP_ID;

    const instagramAppSecret =
      process.env.INSTAGRAM_APP_SECRET;

    const redirectUri =
      process.env.INSTAGRAM_REDIRECT_URI;

    const requiredEnv: Record<
      string,
      string | undefined
    > = {
      NEXT_PUBLIC_SUPABASE_URL:
        supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY:
        supabaseServiceRoleKey,
      INSTAGRAM_APP_ID:
        instagramAppId,
      INSTAGRAM_APP_SECRET:
        instagramAppSecret,
      INSTAGRAM_REDIRECT_URI:
        redirectUri,
    };

    const missingEnv =
      Object.entries(requiredEnv)
        .filter(([, value]) => !value)
        .map(([name]) => name);

    if (missingEnv.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingEnv.join(
          ", "
        )}`
      );
    }

    /*
     * ---------------------------------------------------------
     * SUPABASE ADMIN CLIENT
     * ---------------------------------------------------------
     */

    const supabaseAdmin =
      createSupabaseAdmin(
        supabaseUrl!,
        supabaseServiceRoleKey!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * ---------------------------------------------------------
     * EXCHANGE AUTHORIZATION CODE
     * ---------------------------------------------------------
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
          body: new URLSearchParams({
            client_id:
              instagramAppId!,
            client_secret:
              instagramAppSecret!,
            grant_type:
              "authorization_code",
            redirect_uri:
              redirectUri!,
            code,
          }).toString(),
          cache: "no-store",
        }
      );

    const {
      data: tokenData,
      raw: tokenRaw,
    } = await readResponseBody(
      tokenResponse
    );

    if (
      !tokenResponse.ok ||
      typeof tokenData.access_token !==
        "string"
    ) {
      const message =
        getApiErrorMessage(
          tokenData,
          tokenRaw,
          "Instagram authorization could not be completed."
        );

      console.error(
        "[Instagram OAuth] Authorization-code exchange failed:",
        {
          status: tokenResponse.status,
          statusText:
            tokenResponse.statusText,
          response: tokenData,
          raw: tokenRaw,
        }
      );

      return redirectToChannels(
        request,
        "instagram_error",
        message
      );
    }

    const shortLivedToken =
      tokenData.access_token;

    /*
     * ---------------------------------------------------------
     * LONG-LIVED TOKEN
     * ---------------------------------------------------------
     */

    const longTokenParams =
      new URLSearchParams({
        grant_type:
          "ig_exchange_token",
        client_secret:
          instagramAppSecret!,
        access_token:
          shortLivedToken,
      });

    const longTokenResponse =
      await fetch(
        `${INSTAGRAM_GRAPH_URL}/access_token?${longTokenParams.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

    const {
      data: longTokenData,
      raw: longTokenRaw,
    } = await readResponseBody(
      longTokenResponse
    );

    if (
      !longTokenResponse.ok ||
      typeof longTokenData.access_token !==
        "string"
    ) {
      const message =
        getApiErrorMessage(
          longTokenData,
          longTokenRaw,
          "Instagram authorization succeeded, but the long-lived Instagram token could not be created."
        );

      console.error(
        "[Instagram OAuth] Long-lived token exchange failed:",
        {
          status:
            longTokenResponse.status,
          statusText:
            longTokenResponse.statusText,
          response: longTokenData,
          raw: longTokenRaw,
        }
      );

      return redirectToChannels(
        request,
        "instagram_error",
        message
      );
    }

    const instagramAccessToken =
      longTokenData.access_token;

    /*
     * ---------------------------------------------------------
     * LOAD INSTAGRAM ACCOUNT
     * ---------------------------------------------------------
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

    const {
      data: instagramUser,
      raw: instagramUserRaw,
    } = await readResponseBody(
      instagramUserResponse
    );

    if (
      !instagramUserResponse.ok ||
      typeof instagramUser.id !== "string"
    ) {
      const message =
        getApiErrorMessage(
          instagramUser,
          instagramUserRaw,
          "Instagram authorization succeeded, but the Instagram account could not be loaded."
        );

      console.error(
        "[Instagram OAuth] Instagram account lookup failed:",
        {
          status:
            instagramUserResponse.status,
          response:
            instagramUser,
          raw:
            instagramUserRaw,
        }
      );

      return redirectToChannels(
        request,
        "instagram_error",
        message
      );
    }

    const instagramUserId =
      String(instagramUser.id);

    const instagramUsername =
      typeof instagramUser.username ===
      "string"
        ? instagramUser.username
        : null;

    const profilePictureUrl =
      typeof instagramUser.profile_picture_url ===
      "string"
        ? instagramUser.profile_picture_url
        : null;

    /*
     * ---------------------------------------------------------
     * SAVE CONNECTION
     * ---------------------------------------------------------
     */

    const {
      data: savedConnection,
      error: upsertError,
    } = await supabaseAdmin
      .from("instagram_connections")
      .upsert(
        {
          user_id: userId,
          instagram_user_id:
            instagramUserId,
          instagram_username:
            instagramUsername,
          profile_picture_url:
            profilePictureUrl,
          access_token:
            instagramAccessToken,
          webhook_subscribed:
            false,
          webhook_fields: [],
          webhook_error: null,
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
        "[Instagram OAuth] Connection save failed:",
        upsertError
      );

      return redirectToChannels(
        request,
        "instagram_error",
        "Instagram authorization succeeded, but the Instagram connection could not be saved."
      );
    }

    /*
     * ---------------------------------------------------------
     * SUBSCRIBE WEBHOOKS
     * ---------------------------------------------------------
     */

    const webhookParams =
      new URLSearchParams({
        subscribed_fields:
          "messages,messaging_postbacks",
        access_token:
          instagramAccessToken,
      });

    const webhookResponse =
      await fetch(
        `${INSTAGRAM_GRAPH_URL}/${encodeURIComponent(
          instagramUserId
        )}/subscribed_apps?${webhookParams.toString()}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

    const {
      data: webhookData,
      raw: webhookRaw,
    } = await readResponseBody(
      webhookResponse
    );

    console.log(
      "[Instagram OAuth] Webhook subscription:",
      {
        status:
          webhookResponse.status,
        ok:
          webhookResponse.ok,
        sodahUserId:
          userId,
        instagramUserId,
        webhookData,
        webhookRaw,
      }
    );

    if (
      !webhookResponse.ok ||
      webhookData.success !== true
    ) {
      const webhookError =
        getApiErrorMessage(
          webhookData,
          webhookRaw,
          "Instagram webhook subscription failed."
        );

      await supabaseAdmin
        .from("instagram_connections")
        .update({
          webhook_subscribed:
            false,
          webhook_fields: [],
          webhook_error:
            webhookError,
        })
        .eq(
          "id",
          savedConnection.id
        );

      return redirectToChannels(
        request,
        "instagram_warning",
        `Instagram account connected, but messaging webhook subscription failed: ${webhookError}`
      );
    }

    /*
     * ---------------------------------------------------------
     * VERIFY WEBHOOK
     * ---------------------------------------------------------
     */

    const verifyParams =
      new URLSearchParams({
        access_token:
          instagramAccessToken,
      });

    const verifyResponse =
      await fetch(
        `${INSTAGRAM_GRAPH_URL}/${encodeURIComponent(
          instagramUserId
        )}/subscribed_apps?${verifyParams.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

    const {
      data: verifyData,
      raw: verifyRaw,
    } = await readResponseBody(
      verifyResponse
    );

    console.log(
      "[Instagram OAuth] Webhook verification:",
      {
        status:
          verifyResponse.status,
        ok:
          verifyResponse.ok,
        sodahUserId:
          userId,
        instagramUserId,
        verifyData,
        verifyRaw,
      }
    );

    const subscriptions =
      Array.isArray(
        verifyData.data
      )
        ? verifyData.data
        : [];

    const subscribedFields =
      subscriptions.flatMap(
        (
          subscription: {
            subscribed_fields?: unknown;
          }
        ) =>
          Array.isArray(
            subscription.subscribed_fields
          )
            ? subscription.subscribed_fields.filter(
                (
                  field
                ): field is string =>
                  typeof field ===
                  "string"
              )
            : []
      );

    const uniqueFields =
      [...new Set(
        subscribedFields
      )];

    const messagesSubscribed =
      uniqueFields.includes(
        "messages"
      );

    if (
      !verifyResponse.ok ||
      !messagesSubscribed
    ) {
      const verificationError =
        "Instagram webhook subscription was not confirmed. The messages webhook is not active.";

      console.error(
        verificationError,
        {
          verifyData,
          verifyRaw,
        }
      );

      await supabaseAdmin
        .from(
          "instagram_connections"
        )
        .update({
          webhook_subscribed:
            false,
          webhook_fields:
            uniqueFields,
          webhook_error:
            verificationError,
        })
        .eq(
          "id",
          savedConnection.id
        );

      return redirectToChannels(
        request,
        "instagram_warning",
        verificationError
      );
    }

    /*
     * ---------------------------------------------------------
     * MARK CONNECTION AS FULLY ACTIVE
     * ---------------------------------------------------------
     */

    const {
      error: finalUpdateError,
    } = await supabaseAdmin
      .from(
        "instagram_connections"
      )
      .update({
        webhook_subscribed:
          true,
        webhook_fields:
          uniqueFields,
        webhook_error:
          null,
      })
      .eq(
        "id",
        savedConnection.id
      );

    if (finalUpdateError) {
      console.error(
        "[Instagram OAuth] Final connection update failed:",
        finalUpdateError
      );

      return redirectToChannels(
        request,
        "instagram_warning",
        "Instagram connected, but the connection status could not be updated."
      );
    }

    /*
     * ---------------------------------------------------------
     * SUCCESS
     * ---------------------------------------------------------
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

    if (instagramUsername) {
      successUrl.searchParams.set(
        "username",
        instagramUsername
      );
    }

    successUrl.searchParams.set(
      "webhook",
      "connected"
    );

    return NextResponse.redirect(
      successUrl
    );
  } catch (error) {
    console.error(
      "[Instagram OAuth] Callback error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Instagram connection failed.";

    return redirectToChannels(
      request,
      "instagram_error",
      message
    );
  }
}