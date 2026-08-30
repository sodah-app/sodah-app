import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function base64UrlDecode(value: string) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat(
      (4 - (normalized.length % 4)) % 4
    );

  return Buffer.from(
    padded,
    "base64"
  ).toString("utf8");
}

function signState(
  payload: string,
  secret: string
) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function redirectError(
  request: NextRequest,
  code: string,
  details?: string
) {
  const url =
    new URL(
      "/channels",
      request.url
    );

  url.searchParams.set(
    "tiktok_error",
    code
  );

  if (details) {
    url.searchParams.set(
      "tiktok_error_details",
      details
    );
  }

  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest
) {
  try {
    console.log(
      "=============================================="
    );
    console.log(
      "[TikTok Callback] START"
    );
    console.log(
      "=============================================="
    );

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    const clientKey =
      process.env.TIKTOK_CLIENT_KEY?.trim();

    const clientSecret =
      process.env.TIKTOK_CLIENT_SECRET?.trim();

    const redirectUri =
      process.env.TIKTOK_REDIRECT_URI?.trim();

    const stateSecret =
      process.env.TIKTOK_STATE_SECRET?.trim() ||
      serviceRoleKey;

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !clientKey ||
      !clientSecret ||
      !redirectUri ||
      !stateSecret
    ) {
      return redirectError(
        request,
        "tiktok_configuration_missing",
        "TikTok OAuth configuration is incomplete."
      );
    }

    const url =
      new URL(request.url);

    const code =
      url.searchParams.get("code");

    const returnedState =
      url.searchParams.get("state");

    const error =
      url.searchParams.get("error");

    const errorDescription =
      url.searchParams.get(
        "error_description"
      );

    console.log(
      "[TikTok Callback] Has code:",
      Boolean(code)
    );

    console.log(
      "[TikTok Callback] Has state:",
      Boolean(returnedState)
    );

    if (error) {
      return redirectError(
        request,
        "tiktok_authorization_denied",
        errorDescription ||
          error
      );
    }

    if (!code) {
      return redirectError(
        request,
        "tiktok_code_missing",
        "TikTok did not return an authorization code."
      );
    }

    if (!returnedState) {
      return redirectError(
        request,
        "tiktok_state_missing",
        "TikTok did not return OAuth state."
      );
    }

    /*
     * ----------------------------------------------------------
     * VERIFY STATE COOKIE
     * ----------------------------------------------------------
     */

    const cookieState =
      request.cookies.get(
        "tiktok_oauth_state"
      )?.value || "";

    if (
      !cookieState ||
      cookieState !== returnedState
    ) {
      console.error(
        "[TikTok Callback] State cookie mismatch."
      );

      return redirectError(
        request,
        "tiktok_state_invalid",
        "The TikTok OAuth session could not be verified."
      );
    }

    /*
     * ----------------------------------------------------------
     * VERIFY SIGNATURE
     * ----------------------------------------------------------
     */

    const stateParts =
      returnedState.split(".");

    if (stateParts.length !== 2) {
      return redirectError(
        request,
        "tiktok_state_malformed",
        "The TikTok OAuth state is malformed."
      );
    }

    const [
      encodedPayload,
      suppliedSignature,
    ] = stateParts;

    const expectedSignature =
      signState(
        encodedPayload,
        stateSecret
      );

    const suppliedBuffer =
      Buffer.from(
        suppliedSignature
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature
      );

    if (
      suppliedBuffer.length !==
        expectedBuffer.length ||
      !crypto.timingSafeEqual(
        suppliedBuffer,
        expectedBuffer
      )
    ) {
      return redirectError(
        request,
        "tiktok_state_signature_invalid",
        "TikTok OAuth state signature verification failed."
      );
    }

    /*
     * ----------------------------------------------------------
     * DECODE STATE
     * ----------------------------------------------------------
     */

    let statePayload: any;

    try {
      statePayload =
        JSON.parse(
          base64UrlDecode(
            encodedPayload
          )
        );
    } catch {
      return redirectError(
        request,
        "tiktok_state_decode_failed",
        "TikTok OAuth state could not be decoded."
      );
    }

    const stateUserId =
      String(
        statePayload?.userId || ""
      );

    const stateBusinessId =
      String(
        statePayload?.businessId || ""
      );

    const stateBusinessPublicId =
      String(
        statePayload?.businessPublicId || ""
      );

    const timestamp =
      Number(
        statePayload?.timestamp || 0
      );

    if (
      !stateUserId ||
      !stateBusinessId
    ) {
      return redirectError(
        request,
        "tiktok_state_payload_incomplete",
        "TikTok OAuth state is missing the Sodah user or business information."
      );
    }

    if (
      !timestamp ||
      Math.abs(
        Date.now() - timestamp
      ) > 10 * 60 * 1000
    ) {
      return redirectError(
        request,
        "tiktok_state_expired",
        "The TikTok OAuth session expired. Please start again."
      );
    }

    console.log(
      "[TikTok Callback] State verified:",
      {
        stateUserId,
        stateBusinessId,
        stateBusinessPublicId,
      }
    );

    /*
     * ----------------------------------------------------------
     * ADMIN CLIENT
     * ----------------------------------------------------------
     */

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
     * ----------------------------------------------------------
     * RESOLVE EXACT BUSINESS
     * ----------------------------------------------------------
     */

    let business: any = null;

    const firstLookup =
      await supabaseAdmin
        .from("businesses")
        .select(
          "id, business_id, user_id"
        )
        .eq(
          "id",
          stateBusinessId
        )
        .eq(
          "user_id",
          stateUserId
        )
        .maybeSingle();

    if (firstLookup.error) {
      console.error(
        "[TikTok Callback] Business lookup failed:",
        firstLookup.error
      );

      return redirectError(
        request,
        "tiktok_business_lookup_failed",
        firstLookup.error.message
      );
    }

    business =
      firstLookup.data;

    if (
      !business &&
      stateBusinessPublicId
    ) {
      const secondLookup =
        await supabaseAdmin
          .from("businesses")
          .select(
            "id, business_id, user_id"
          )
          .eq(
            "business_id",
            stateBusinessPublicId
          )
          .eq(
            "user_id",
            stateUserId
          )
          .maybeSingle();

      if (secondLookup.error) {
        return redirectError(
          request,
          "tiktok_business_lookup_failed",
          secondLookup.error.message
        );
      }

      business =
        secondLookup.data;
    }

    if (!business) {
      console.error(
        "[TikTok Callback] BUSINESS NOT RESOLVED",
        {
          stateUserId,
          stateBusinessId,
          stateBusinessPublicId,
        }
      );

      return redirectError(
        request,
        "tiktok_business_not_resolved",
        "Sodah could not identify the business that started the TikTok connection."
      );
    }

    /*
     * ----------------------------------------------------------
     * EXCHANGE CODE FOR TOKENS
     * ----------------------------------------------------------
     */

    const tokenResponse =
      await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
            "Cache-Control":
              "no-cache",
          },
          body:
            new URLSearchParams({
              client_key:
                clientKey,
              client_secret:
                clientSecret,
              code,
              grant_type:
                "authorization_code",
              redirect_uri:
                redirectUri,
            }).toString(),
          cache: "no-store",
        }
      );

    const tokenText =
      await tokenResponse.text();

    let tokenData: any = {};

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
        "[TikTok Callback] TOKEN EXCHANGE FAILED:",
        tokenData
      );

      return redirectError(
        request,
        "tiktok_token_exchange_failed",
        tokenData?.error_description ||
          tokenData?.message ||
          tokenData?.error ||
          `TikTok returned HTTP ${tokenResponse.status}.`
      );
    }

    const accessToken =
      String(
        tokenData?.access_token ||
          tokenData?.data?.access_token ||
          ""
      );

    const refreshToken =
      String(
        tokenData?.refresh_token ||
          tokenData?.data?.refresh_token ||
          ""
      );

    const openId =
      String(
        tokenData?.open_id ||
          tokenData?.data?.open_id ||
          ""
      );

    const expiresIn =
      Number(
        tokenData?.expires_in ||
          tokenData?.data?.expires_in ||
          0
      );

    const refreshExpiresIn =
      Number(
        tokenData?.refresh_expires_in ||
          tokenData?.data?.refresh_expires_in ||
          0
      );

    const scope =
      String(
        tokenData?.scope ||
          tokenData?.data?.scope ||
          ""
      );

    if (
      !accessToken ||
      !refreshToken ||
      !openId
    ) {
      console.error(
        "[TikTok Callback] TikTok token response incomplete:",
        tokenData
      );

      return redirectError(
        request,
        "tiktok_token_response_incomplete",
        "TikTok did not return the required access token, refresh token, or open ID."
      );
    }

    /*
     * ----------------------------------------------------------
     * VERIFY TIKTOK USER
     * ----------------------------------------------------------
     */

    const profileResponse =
      await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name",
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

    const profileText =
      await profileResponse.text();

    let profileData: any = {};

    try {
      profileData =
        JSON.parse(profileText);
    } catch {
      profileData = {
        raw: profileText,
      };
    }

    if (!profileResponse.ok) {
      return redirectError(
        request,
        "tiktok_profile_lookup_failed",
        profileData?.error?.message ||
          profileData?.message ||
          `TikTok profile request returned HTTP ${profileResponse.status}.`
      );
    }

    const tiktokUser =
      profileData?.data?.user ||
      {};

    const verifiedOpenId =
      String(
        tiktokUser?.open_id ||
          openId
      );

    if (
      verifiedOpenId !== openId
    ) {
      return redirectError(
        request,
        "tiktok_user_mismatch",
        "The TikTok user returned by the API did not match the authorized account."
      );
    }

    /*
     * ----------------------------------------------------------
     * SAVE CONNECTION TO THIS BUSINESS ONLY
     * ----------------------------------------------------------
     */

    const tokenExpiresAt =
      expiresIn > 0
        ? new Date(
            Date.now() +
              expiresIn * 1000
          ).toISOString()
        : null;

    const refreshExpiresAt =
      refreshExpiresIn > 0
        ? new Date(
            Date.now() +
              refreshExpiresIn * 1000
          ).toISOString()
        : null;

    const {
      error: saveError,
    } = await supabaseAdmin
      .from("businesses")
      .update({
        tiktok_connected: true,
        tiktok_access_token:
          accessToken,
        tiktok_refresh_token:
          refreshToken,
        tiktok_open_id:
          verifiedOpenId,
        tiktok_display_name:
          tiktokUser?.display_name ||
          null,
        tiktok_avatar_url:
          tiktokUser?.avatar_url ||
          null,
        tiktok_scope:
          scope || null,
        tiktok_token_expires_at:
          tokenExpiresAt,
        tiktok_refresh_expires_at:
          refreshExpiresAt,
        tiktok_connected_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        business.id
      )
      .eq(
        "user_id",
        stateUserId
      );

    if (saveError) {
      console.error(
        "[TikTok Callback] SAVE FAILED:",
        saveError
      );

      return redirectError(
        request,
        "tiktok_save_failed",
        saveError.message
      );
    }

    /*
     * ----------------------------------------------------------
     * SUCCESS
     * ----------------------------------------------------------
     */

    const successUrl =
      new URL(
        "/channels",
        request.url
      );

    successUrl.searchParams.set(
      "tiktok",
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

    response.cookies.set(
      "tiktok_oauth_state",
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
          ? { domain: ".sodah.io" }
          : {}),
      }
    );

    console.log(
      "=============================================="
    );
    console.log(
      "[TikTok Callback] TIKTOK CONNECTED SUCCESSFULLY"
    );
    console.log(
      "[TikTok Callback] Sodah User:",
      stateUserId
    );
    console.log(
      "[TikTok Callback] Business:",
      business.business_id ||
        business.id
    );
    console.log(
      "[TikTok Callback] TikTok Open ID:",
      verifiedOpenId
    );
    console.log(
      "=============================================="
    );

    return response;
  } catch (error) {
    console.error(
      "[TikTok Callback] UNEXPECTED ERROR:",
      error
    );

    return redirectError(
      request,
      "tiktok_callback_failed",
      error instanceof Error
        ? error.message
        : "Unexpected TikTok callback error."
    );
  }
}