import { NextRequest, NextResponse } from "next/server";
import {
  createClient as createSupabaseAdmin,
} from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signState(
  payload: string,
  secret: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function errorResponse(
  code: string,
  details: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: code,
      error_details: details,
    },
    { status }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    console.log(
      "=================================================="
    );
    console.log(
      "[TikTok Login] START"
    );
    console.log(
      "=================================================="
    );

    /*
     * ==========================================================
     * 1. ENVIRONMENT
     * ==========================================================
     */

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    const clientKey =
      process.env.TIKTOK_CLIENT_KEY?.trim();

    const redirectUri =
      process.env.TIKTOK_REDIRECT_URI?.trim();

    const stateSecret =
      process.env.TIKTOK_STATE_SECRET?.trim() ||
      serviceRoleKey;

    if (!supabaseUrl) {
      return errorResponse(
        "missing_supabase_url",
        "NEXT_PUBLIC_SUPABASE_URL is missing.",
        500
      );
    }

    if (!serviceRoleKey) {
      return errorResponse(
        "missing_service_role_key",
        "SUPABASE_SERVICE_ROLE_KEY is missing.",
        500
      );
    }

    if (!clientKey) {
      return errorResponse(
        "missing_tiktok_client_key",
        "TIKTOK_CLIENT_KEY is missing.",
        500
      );
    }

    if (!redirectUri) {
      return errorResponse(
        "missing_tiktok_redirect_uri",
        "TIKTOK_REDIRECT_URI is missing.",
        500
      );
    }

    if (!stateSecret) {
      return errorResponse(
        "missing_tiktok_state_secret",
        "TIKTOK_STATE_SECRET is missing.",
        500
      );
    }

    /*
     * ==========================================================
     * 2. READ REQUEST
     * ==========================================================
     */

    let body: {
      businessId?: string;
    };

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "invalid_request",
        "The TikTok login request body is invalid."
      );
    }

    const requestedBusinessId =
      String(
        body?.businessId || ""
      ).trim();

    console.log(
      "[TikTok Login] Requested businessId:",
      requestedBusinessId
    );

    if (!requestedBusinessId) {
      return errorResponse(
        "tiktok_business_id_missing",
        "No businessId was provided to start the TikTok connection."
      );
    }

    /*
     * ==========================================================
     * 3. GET SUPABASE ACCESS TOKEN
     *
     * The browser is already authenticated with Supabase.
     *
     * We deliberately receive the access token through the
     * Authorization header instead of expecting the server
     * request to contain a Supabase cookie.
     * ==========================================================
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (!authorization) {
      console.error(
        "[TikTok Login] Authorization header missing."
      );

      return errorResponse(
        "tiktok_auth_required",
        "Sodah authentication token was not provided. Please sign in again.",
        401
      );
    }

    const tokenMatch =
      authorization.match(
        /^Bearer\s+(.+)$/i
      );

    if (!tokenMatch) {
      console.error(
        "[TikTok Login] Invalid Authorization header."
      );

      return errorResponse(
        "tiktok_auth_required",
        "The Sodah authentication token is invalid.",
        401
      );
    }

    const accessToken =
      tokenMatch[1].trim();

    if (!accessToken) {
      return errorResponse(
        "tiktok_auth_required",
        "The Sodah authentication token is empty.",
        401
      );
    }

    /*
     * ==========================================================
     * 4. SUPABASE ADMIN CLIENT
     * ==========================================================
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
     * ==========================================================
     * 5. VERIFY THE REAL SODAH USER
     *
     * IMPORTANT:
     *
     * We do NOT trust:
     *
     * - businessId
     * - localStorage
     * - URL
     * - client-supplied userId
     *
     * The user comes from Supabase's verified access token.
     * ==========================================================
     */

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    console.log(
      "[TikTok Login] Authentication result:",
      {
        authenticated: Boolean(user),
        userId: user?.id || null,
        error: userError
          ? {
              message:
                userError.message,
              status:
                userError.status,
              name:
                userError.name,
            }
          : null,
      }
    );

    if (userError || !user) {
      console.error(
        "[TikTok Login] Supabase token could not be verified:",
        userError
      );

      return errorResponse(
        "tiktok_auth_required",
        "Sodah could not verify the logged-in user. Please sign in again.",
        401
      );
    }

    const userId =
      String(user.id);

    /*
     * ==========================================================
     * 6. RESOLVE BUSINESS FOR THIS USER
     *
     * The requested business MUST belong to the authenticated
     * Supabase user.
     *
     * This is the tenant security boundary.
     * ==========================================================
     */

    let business: {
      id: string;
      business_id: string | null;
      user_id: string;
    } | null = null;

    /*
     * ----------------------------------------------------------
     * FIRST: businesses.business_id
     *
     * Channels currently passes:
     *
     * 223e4e9d-73a7-4d1f-aa79-34621d1eff30
     * ----------------------------------------------------------
     */

    const {
      data: businessByPublicId,
      error:
        publicBusinessError,
    } =
      await supabaseAdmin
        .from("businesses")
        .select(
          "id, business_id, user_id"
        )
        .eq(
          "business_id",
          requestedBusinessId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (publicBusinessError) {
      console.error(
        "[TikTok Login] Public business lookup failed:",
        publicBusinessError
      );

      return errorResponse(
        "tiktok_business_lookup_failed",
        publicBusinessError.message,
        500
      );
    }

    business =
      businessByPublicId || null;

    /*
     * ----------------------------------------------------------
     * SECOND: businesses.id
     *
     * Supports callers that provide the internal UUID.
     * ----------------------------------------------------------
     */

    if (!business) {
      const {
        data: businessById,
        error: businessByIdError,
      } =
        await supabaseAdmin
          .from("businesses")
          .select(
            "id, business_id, user_id"
          )
          .eq(
            "id",
            requestedBusinessId
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

      if (businessByIdError) {
        console.error(
          "[TikTok Login] Internal business lookup failed:",
          businessByIdError
        );

        return errorResponse(
          "tiktok_business_lookup_failed",
          businessByIdError.message,
          500
        );
      }

      business =
        businessById || null;
    }

    /*
     * ----------------------------------------------------------
     * BUSINESS NOT FOUND
     * ----------------------------------------------------------
     */

    if (!business) {
      console.error(
        "[TikTok Login] Business does not belong to authenticated user:",
        {
          requestedBusinessId,
          userId,
        }
      );

      return errorResponse(
        "tiktok_business_not_resolved",
        "The selected Sodah business does not belong to the logged-in user.",
        403
      );
    }

    /*
     * ==========================================================
     * 7. AUTHORITATIVE TENANT VALUES
     * ==========================================================
     */

    const businessId =
      String(business.id);

    const businessPublicId =
      String(
        business.business_id ||
          business.id
      );

    console.log(
      "[TikTok Login] BUSINESS RESOLVED:",
      {
        requestedBusinessId,
        businessId,
        businessPublicId,
        userId,
      }
    );

    /*
     * ==========================================================
     * 8. CREATE SIGNED OAUTH STATE
     * ==========================================================
     */

    const statePayload = {
      userId,
      businessId,
      businessPublicId,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    };

    const encodedPayload =
      base64UrlEncode(
        JSON.stringify(
          statePayload
        )
      );

    const signature =
      signState(
        encodedPayload,
        stateSecret
      );

    const state =
      `${encodedPayload}.${signature}`;

    console.log(
      "[TikTok Login] Signed OAuth state created:",
      {
        userId,
        businessId,
        businessPublicId,
        hasState: Boolean(state),
      }
    );

    /*
     * ==========================================================
     * 9. BUILD TIKTOK AUTHORIZATION URL
     * ==========================================================
     */

    const tiktokUrl =
      new URL(
        "https://www.tiktok.com/v2/auth/authorize/"
      );

    tiktokUrl.searchParams.set(
      "client_key",
      clientKey
    );

    tiktokUrl.searchParams.set(
      "response_type",
      "code"
    );

    tiktokUrl.searchParams.set(
      "scope",
      "user.info.basic"
    );

    tiktokUrl.searchParams.set(
      "redirect_uri",
      redirectUri
    );

    tiktokUrl.searchParams.set(
      "state",
      state
    );

    /*
     * ==========================================================
     * 10. RESPONSE
     *
     * We return the URL to the browser instead of doing a
     * server redirect.
     *
     * This lets the browser keep its existing Supabase session
     * while starting TikTok OAuth.
     * ==========================================================
     */

    console.log(
      "[TikTok Login] Authorization URL prepared:",
      {
        redirectUri,
        scope: "user.info.basic",
        hasState: Boolean(state),
      }
    );

    return NextResponse.json({
      success: true,
      authorizationUrl:
        tiktokUrl.toString(),
    });
  } catch (error) {
    console.error(
      "[TikTok Login] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected TikTok login error.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * GET is intentionally disabled.
 *
 * OAuth initiation must come from the authenticated browser
 * session through POST + Bearer token.
 */

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error:
        "TikTok OAuth login must be started with POST from the authenticated Sodah browser session.",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}