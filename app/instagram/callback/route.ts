import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   HELPERS
============================================================ */

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signState(payload: string, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

function redirectWithError(
  request: NextRequest,
  error: string,
  details?: string
) {
  const url = new URL("/channels", request.url);

  url.searchParams.set("instagram_error", error);

  if (details) {
    url.searchParams.set(
      "instagram_error_details",
      details.slice(0, 500)
    );
  }

  return NextResponse.redirect(url);
}

/* ============================================================
   INSTAGRAM CALLBACK
============================================================ */

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);

    /* ==========================================================
       1. READ INSTAGRAM CALLBACK PARAMETERS
    ========================================================== */

    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");

    const error = requestUrl.searchParams.get("error");
    const errorReason =
      requestUrl.searchParams.get("error_reason");
    const errorDescription =
      requestUrl.searchParams.get("error_description");

    console.log("[Instagram Callback] Callback received:", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      error,
      errorReason,
      errorDescription,
    });

    /* ==========================================================
       2. HANDLE INSTAGRAM AUTHORIZATION ERROR
    ========================================================== */

    if (error) {
      console.error(
        "[Instagram Callback] Instagram authorization error:",
        {
          error,
          errorReason,
          errorDescription,
        }
      );

      return redirectWithError(
        request,
        "instagram_authorization_denied",
        errorDescription || errorReason || error
      );
    }

    /* ==========================================================
       3. REQUIRE CODE + STATE
    ========================================================== */

    if (!code) {
      console.error(
        "[Instagram Callback] Missing authorization code."
      );

      return redirectWithError(
        request,
        "missing_code"
      );
    }

    if (!state) {
      console.error(
        "[Instagram Callback] Missing OAuth state."
      );

      return redirectWithError(
        request,
        "missing_state"
      );
    }

    /* ==========================================================
       4. ENVIRONMENT VARIABLES
    ========================================================== */

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

    const stateSecret =
      process.env.INSTAGRAM_STATE_SECRET?.trim() ||
      serviceRoleKey;

    if (!supabaseUrl) {
      console.error(
        "[Instagram Callback] Missing NEXT_PUBLIC_SUPABASE_URL"
      );

      return redirectWithError(
        request,
        "missing_supabase_url"
      );
    }

    if (!serviceRoleKey) {
      console.error(
        "[Instagram Callback] Missing SUPABASE_SERVICE_ROLE_KEY"
      );

      return redirectWithError(
        request,
        "missing_service_role_key"
      );
    }

    if (!instagramAppId) {
      console.error(
        "[Instagram Callback] Missing INSTAGRAM_APP_ID"
      );

      return redirectWithError(
        request,
        "missing_instagram_app_id"
      );
    }

    if (!instagramAppSecret) {
      console.error(
        "[Instagram Callback] Missing INSTAGRAM_APP_SECRET"
      );

      return redirectWithError(
        request,
        "missing_instagram_app_secret"
      );
    }

    if (!redirectUri) {
      console.error(
        "[Instagram Callback] Missing INSTAGRAM_REDIRECT_URI"
      );

      return redirectWithError(
        request,
        "missing_redirect_uri"
      );
    }

    if (!stateSecret) {
      console.error(
        "[Instagram Callback] Missing INSTAGRAM_STATE_SECRET"
      );

      return redirectWithError(
        request,
        "missing_state_secret"
      );
    }

    const verifiedInstagramAppId: string =
      instagramAppId;

    const verifiedInstagramAppSecret: string =
      instagramAppSecret;

    const verifiedRedirectUri: string =
      redirectUri;

    console.log(
      "[Instagram Callback] OAuth redirect URI:",
      verifiedRedirectUri
    );

    /* ==========================================================
       5. OPTIONAL STATE COOKIE CHECK

       Signed state remains the authoritative CSRF check.

       Cookie:
       - missing = allowed
       - matching = allowed
       - mismatched = rejected
    ========================================================== */

    const stateCookie =
      request.cookies.get(
        "instagram_oauth_state"
      )?.value;

    if (stateCookie) {
      if (stateCookie !== state) {
        console.error(
          "[Instagram Callback] OAuth state cookie mismatch."
        );

        return redirectWithError(
          request,
          "invalid_state"
        );
      }

      console.log(
        "[Instagram Callback] OAuth state cookie verified."
      );
    } else {
      console.warn(
        "[Instagram Callback] OAuth state cookie was not returned. Continuing with signed state validation."
      );
    }

    /* ==========================================================
       6. VALIDATE SIGNED STATE
    ========================================================== */

    const stateParts = state.split(".");

    if (stateParts.length !== 2) {
      console.error(
        "[Instagram Callback] Invalid state format."
      );

      return redirectWithError(
        request,
        "invalid_state"
      );
    }

    const [
      encodedPayload,
      providedSignature,
    ] = stateParts;

    const expectedSignature =
      signState(
        encodedPayload,
        stateSecret
      );

    const providedBuffer =
      Buffer.from(
        providedSignature,
        "utf8"
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8"
      );

    if (
      providedBuffer.length !==
        expectedBuffer.length ||
      !crypto.timingSafeEqual(
        providedBuffer,
        expectedBuffer
      )
    ) {
      console.error(
        "[Instagram Callback] Invalid state signature."
      );

      return redirectWithError(
        request,
        "invalid_state_signature"
      );
    }

    /* ==========================================================
       7. DECODE + VALIDATE STATE PAYLOAD
    ========================================================== */

    let statePayload: {
      userId?: string;
      businessId?: string | number;
      businessPublicId?: string | number;
      timestamp?: number;
    };

    try {
      const decodedState =
        base64UrlDecode(
          encodedPayload
        );

      console.log(
        "[Instagram Callback] Decoded OAuth state:",
        decodedState
      );

      statePayload =
        JSON.parse(
          decodedState
        );
    } catch (stateDecodeError) {
      console.error(
        "[Instagram Callback] STATE DECODE FAILED:",
        stateDecodeError
      );

      return redirectWithError(
        request,
        "invalid_state_payload",
        stateDecodeError instanceof Error
          ? stateDecodeError.message
          : "Could not decode OAuth state payload."
      );
    }

    const userId =
      statePayload?.userId;

    const businessId =
      statePayload?.businessId;

    const businessPublicId =
      statePayload?.businessPublicId;

    const timestamp =
      statePayload?.timestamp;

    console.log(
      "[Instagram Callback] Parsed OAuth state:",
      {
        hasUserId:
          Boolean(userId),

        hasBusinessId:
          businessId !== undefined &&
          businessId !== null,

        hasBusinessPublicId:
          businessPublicId !== undefined &&
          businessPublicId !== null,

        hasTimestamp:
          timestamp !== undefined &&
          timestamp !== null,

        userId,
        businessId,
        businessPublicId,
        timestamp,
      }
    );

    if (
      !userId ||
      businessId === undefined ||
      businessId === null ||
      !timestamp
    ) {
      console.error(
        "[Instagram Callback] OAuth state payload is incomplete:",
        {
          userId,
          businessId,
          businessPublicId,
          timestamp,
          statePayload,
        }
      );

      return redirectWithError(
        request,
        "invalid_state_payload",
        "OAuth state is missing userId, businessId, or timestamp."
      );
    }

    /* ==========================================================
       8. CHECK STATE EXPIRATION
    ========================================================== */

    const stateAge =
      Date.now() -
      Number(timestamp);

    console.log(
      "[Instagram Callback] OAuth state age:",
      stateAge
    );

    if (
      !Number.isFinite(stateAge) ||
      stateAge < 0 ||
      stateAge > 10 * 60 * 1000
    ) {
      console.error(
        "[Instagram Callback] OAuth state expired or timestamp invalid:",
        {
          timestamp,
          stateAge,
        }
      );

      return redirectWithError(
        request,
        "expired_state"
      );
    }

    console.log(
      "[Instagram Callback] OAuth state fully validated:",
      {
        userId,
        businessId,
        businessPublicId,
      }
    );

    /* ==========================================================
       9. SUPABASE ADMIN CLIENT
    ========================================================== */

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

    /* ==========================================================
       10. VERIFY BUSINESS TENANT
    ========================================================== */

    const {
      data: business,
      error: businessError,
    } = await supabaseAdmin
      .from("businesses")
      .select(
        "id, business_id, user_id"
      )
      .eq(
        "id",
        businessId
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

    if (businessError) {
      console.error(
        "[Instagram Callback] Business lookup failed:",
        businessError
      );

      return redirectWithError(
        request,
        "business_lookup_failed",
        businessError.message
      );
    }

    if (!business) {
      console.error(
        "[Instagram Callback] Business does not belong to user:",
        {
          userId,
          businessId,
        }
      );

      return redirectWithError(
        request,
        "business_not_found"
      );
    }

    console.log(
      "[Instagram Callback] Tenant verified:",
      {
        databaseBusinessId:
          business.id,

        publicBusinessId:
          business.business_id,

        userId:
          business.user_id,
      }
    );

    /* ==========================================================
       11. EXCHANGE AUTHORIZATION CODE

       CODE
         ↓
       SHORT-LIVED INSTAGRAM USER ACCESS TOKEN
    ========================================================== */

    console.log(
      "[Instagram Callback] Exchanging authorization code..."
    );

    const tokenRequestBody =
      new URLSearchParams();

    tokenRequestBody.set(
      "client_id",
      verifiedInstagramAppId
    );

    tokenRequestBody.set(
      "client_secret",
      verifiedInstagramAppSecret
    );

    tokenRequestBody.set(
      "grant_type",
      "authorization_code"
    );

    tokenRequestBody.set(
      "redirect_uri",
      verifiedRedirectUri
    );

    tokenRequestBody.set(
      "code",
      code
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
            tokenRequestBody.toString(),
          cache: "no-store",
        }
      );

    const tokenText =
      await tokenResponse.text();

    let tokenData: any = null;

    try {
      tokenData =
        JSON.parse(tokenText);
    } catch {
      tokenData = {
        raw: tokenText,
      };
    }

    if (!tokenResponse.ok) {
      console.error(
        "[Instagram Callback] Authorization-code exchange failed:",
        {
          status:
            tokenResponse.status,

          error:
            tokenData?.error,

          errorType:
            tokenData?.error_type,

          errorMessage:
            tokenData?.error_message ||
            tokenData?.error?.message,

          traceId:
            tokenData?.error?.fbtrace_id,
        }
      );

      return redirectWithError(
        request,
        "instagram_code_exchange_failed",
        tokenData?.error_message ||
          tokenData?.error?.message ||
          tokenData?.error ||
          `Instagram returned HTTP ${tokenResponse.status}`
      );
    }

    const shortLivedAccessToken =
      tokenData?.access_token;

    const instagramUserId =
      tokenData?.user_id;

    if (!shortLivedAccessToken) {
      console.error(
        "[Instagram Callback] No Instagram access token was returned."
      );

      return redirectWithError(
        request,
        "instagram_token_missing"
      );
    }

    if (!instagramUserId) {
      console.error(
        "[Instagram Callback] No Instagram user ID was returned."
      );

      return redirectWithError(
        request,
        "instagram_user_id_missing"
      );
    }

    console.log(
      "[Instagram Callback] Short-lived token received:",
      {
        instagramUserId:
          String(instagramUserId),

        hasAccessToken:
          Boolean(shortLivedAccessToken),
      }
    );

    /* ==========================================================
       12. EXCHANGE SHORT-LIVED TOKEN FOR LONG-LIVED TOKEN

       IMPORTANT:

       We DO NOT save the short-lived token.

       The token saved in businesses.instagram_access_token
       must be the long-lived Instagram token.

       SHORT TOKEN
           ↓
       graph.instagram.com/access_token
           ↓
       LONG-LIVED TOKEN
    ========================================================== */

    console.log(
      "[Instagram Callback] Exchanging short-lived token for long-lived token..."
    );

    const longLivedTokenUrl =
      new URL(
        "https://graph.instagram.com/access_token"
      );

    longLivedTokenUrl.searchParams.set(
      "grant_type",
      "ig_exchange_token"
    );

    longLivedTokenUrl.searchParams.set(
      "client_secret",
      verifiedInstagramAppSecret
    );

    longLivedTokenUrl.searchParams.set(
      "access_token",
      shortLivedAccessToken
    );

    const longLivedResponse =
      await fetch(
        longLivedTokenUrl.toString(),
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    const longLivedText =
      await longLivedResponse.text();

    let longLivedData: any = null;

    try {
      longLivedData =
        JSON.parse(
          longLivedText
        );
    } catch {
      longLivedData = {
        raw: longLivedText,
      };
    }

    if (
      !longLivedResponse.ok ||
      !longLivedData?.access_token
    ) {
      console.error(
        "[Instagram Callback] Long-lived token exchange failed:",
        {
          status:
            longLivedResponse.status,

          error:
            longLivedData?.error,

          errorType:
            longLivedData?.error?.type ||
            longLivedData?.error_type,

          errorCode:
            longLivedData?.error?.code,

          errorSubcode:
            longLivedData?.error?.error_subcode,

          errorMessage:
            longLivedData?.error?.message ||
            longLivedData?.error_message,

          traceId:
            longLivedData?.error?.fbtrace_id,
        }
      );

      /*
       * IMPORTANT:
       *
       * Do NOT save the short-lived token if the
       * long-lived exchange failed.
       */
      return redirectWithError(
        request,
        "instagram_long_lived_token_exchange_failed",
        longLivedData?.error?.message ||
          longLivedData?.error_message ||
          longLivedData?.raw ||
          `Instagram long-lived token exchange returned HTTP ${longLivedResponse.status}`
      );
    }

    const longLivedAccessToken =
      longLivedData.access_token;

    const longLivedExpiresIn =
      Number.isFinite(
        Number(
          longLivedData?.expires_in
        )
      )
        ? Number(
            longLivedData.expires_in
          )
        : null;

    const longLivedExpiresAt =
      longLivedExpiresIn !== null
        ? new Date(
            Date.now() +
              longLivedExpiresIn *
                1000
          ).toISOString()
        : null;

    console.log(
      "[Instagram Callback] Long-lived Instagram token obtained:",
      {
        instagramUserId:
          String(instagramUserId),

        hasLongLivedToken:
          Boolean(
            longLivedAccessToken
          ),

        expiresIn:
          longLivedExpiresIn,

        expiresAt:
          longLivedExpiresAt,
      }
    );

    /* ==========================================================
       13. SAVE CONNECTION

       IMPORTANT:

       Save the LONG-LIVED token, NOT the short-lived token.
    ========================================================== */

    const connectedInstagramUserId =
      String(instagramUserId);

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("businesses")
      .update({
        instagram_connected:
          true,

        instagram_user_id:
          connectedInstagramUserId,

        instagram_username:
          null,

        instagram_access_token:
          longLivedAccessToken,
      })
      .eq(
        "id",
        business.id
      )
      .eq(
        "user_id",
        userId
      );

    if (updateError) {
      console.error(
        "[Instagram Callback] Failed to save Instagram connection:",
        updateError
      );

      return redirectWithError(
        request,
        "instagram_save_failed",
        updateError.message
      );
    }

    console.log(
      "[Instagram Callback] Instagram connection saved:",
      {
        userId,

        businessId:
          business.business_id ||
          business.id,

        instagramUserId:
          connectedInstagramUserId,

        username:
          null,

        tokenType:
          "long_lived",

        expiresIn:
          longLivedExpiresIn,

        expiresAt:
          longLivedExpiresAt,
      }
    );

    /* ==========================================================
       14. SUCCESS REDIRECT
    ========================================================== */

    const successUrl =
      new URL(
        "/instagram/success",
        request.url
      );

    successUrl.searchParams.set(
      "instagram",
      "connected"
    );

    successUrl.searchParams.set(
      "businessId",
      String(
        business.business_id ||
          business.id
      )
    );

    const response =
      NextResponse.redirect(
        successUrl
      );

    /* ==========================================================
       15. DELETE USED STATE COOKIE
    ========================================================== */

    response.cookies.set(
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

        ...(process.env.NODE_ENV ===
        "production"
          ? {
              domain: ".sodah.io",
            }
          : {}),
      }
    );

    /* ==========================================================
       16. SUCCESS LOGGING
    ========================================================== */

    console.log(
      "[Instagram Callback] ================================="
    );

    console.log(
      "[Instagram Callback] INSTAGRAM CONNECTED SUCCESSFULLY"
    );

    console.log(
      "[Instagram Callback] User:",
      userId
    );

    console.log(
      "[Instagram Callback] Business:",
      business.business_id ||
        business.id
    );

    console.log(
      "[Instagram Callback] Instagram User:",
      connectedInstagramUserId
    );

    console.log(
      "[Instagram Callback] Token:",
      "LONG-LIVED"
    );

    console.log(
      "[Instagram Callback] Token Expires In:",
      longLivedExpiresIn
    );

    console.log(
      "[Instagram Callback] ================================="
    );

    return response;
  } catch (error) {
    console.error(
      "[Instagram Callback] UNEXPECTED CALLBACK ERROR:",
      error
    );

    return redirectWithError(
      request,
      "instagram_callback_failed",
      error instanceof Error
        ? error.message
        : "Unexpected Instagram callback error."
    );
  }
}