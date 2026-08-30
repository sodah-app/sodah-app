import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import crypto from "crypto";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
    .replace(/=+$/, "");
}

function errorRedirect(
  request: NextRequest,
  code: string,
  details: string
) {
  const url = new URL(
    "/channels",
    request.url
  );

  url.searchParams.set(
    "facebook_error",
    code
  );

  url.searchParams.set(
    "facebook_error_details",
    details
  );

  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest
) {
  try {
    console.log(
      "=================================================="
    );
    console.log(
      "[Facebook Login v2] START"
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
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      process.env.SUPABASE_URL?.trim();

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    const facebookAppId =
      process.env.FACEBOOK_APP_ID?.trim();

    const facebookRedirectUri =
      process.env.FACEBOOK_REDIRECT_URI?.trim();

    const stateSecret =
      process.env.FACEBOOK_STATE_SECRET?.trim() ||
      serviceRoleKey;

    const graphVersion =
      process.env.FACEBOOK_GRAPH_VERSION?.trim() ||
      "v25.0";

    if (!supabaseUrl) {
      return errorRedirect(
        request,
        "facebook_config_error",
        "NEXT_PUBLIC_SUPABASE_URL is missing."
      );
    }

    if (!serviceRoleKey) {
      return errorRedirect(
        request,
        "facebook_config_error",
        "SUPABASE_SERVICE_ROLE_KEY is missing."
      );
    }

    if (!facebookAppId) {
      return errorRedirect(
        request,
        "facebook_config_error",
        "FACEBOOK_APP_ID is missing."
      );
    }

    if (!facebookRedirectUri) {
      return errorRedirect(
        request,
        "facebook_config_error",
        "FACEBOOK_REDIRECT_URI is missing."
      );
    }

    if (!stateSecret) {
      return errorRedirect(
        request,
        "facebook_config_error",
        "FACEBOOK_STATE_SECRET is missing."
      );
    }

    /*
     * ==========================================================
     * 2. GET BUSINESS ID FROM THE FACEBOOK CONNECTION PAGE
     *
     * Expected:
     *
     * /api/auth/facebook/login?businessId=223e...
     * ==========================================================
     */

    const requestedBusinessId =
      request.nextUrl.searchParams
        .get("businessId")
        ?.trim() || "";

    console.log(
      "[Facebook Login v2] Requested businessId:",
      requestedBusinessId
    );

    if (!requestedBusinessId) {
      return errorRedirect(
        request,
        "facebook_business_id_missing",
        "No businessId was supplied when starting the Facebook connection."
      );
    }

    /*
     * ==========================================================
     * 3. SUPABASE ADMIN CLIENT
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
     * 4. RESOLVE BUSINESS
     *
     * The supplied value can be either:
     *
     * businesses.id
     *
     * OR
     *
     * businesses.business_id
     * ==========================================================
     */

    let business: {
      id: string;
      business_id: string | null;
      user_id: string | null;
    } | null = null;

    /*
     * ----------------------------------------------------------
     * FIRST: businesses.id
     * ----------------------------------------------------------
     */

    const {
      data: businessById,
      error: businessByIdError,
    } = await supabaseAdmin
      .from("businesses")
      .select(
        "id, business_id, user_id"
      )
      .eq(
        "id",
        requestedBusinessId
      )
      .maybeSingle();

    if (businessByIdError) {
      console.error(
        "[Facebook Login v2] UUID lookup error:",
        businessByIdError
      );

      return errorRedirect(
        request,
        "facebook_business_lookup_failed",
        businessByIdError.message
      );
    }

    if (businessById) {
      business = businessById;
    }

    /*
     * ----------------------------------------------------------
     * SECOND: businesses.business_id
     * ----------------------------------------------------------
     */

    if (!business) {
      const {
        data: businessByPublicId,
        error:
          businessByPublicIdError,
      } = await supabaseAdmin
        .from("businesses")
        .select(
          "id, business_id, user_id"
        )
        .eq(
          "business_id",
          requestedBusinessId
        )
        .maybeSingle();

      if (businessByPublicIdError) {
        console.error(
          "[Facebook Login v2] Public business ID lookup error:",
          businessByPublicIdError
        );

        return errorRedirect(
          request,
          "facebook_business_lookup_failed",
          businessByPublicIdError.message
        );
      }

      if (businessByPublicId) {
        business =
          businessByPublicId;
      }
    }

    /*
     * ==========================================================
     * 5. BUSINESS MUST EXIST
     * ==========================================================
     */

    if (!business) {
      console.error(
        "[Facebook Login v2] BUSINESS NOT FOUND:",
        requestedBusinessId
      );

      return errorRedirect(
        request,
        "facebook_business_not_found",
        `Business ${requestedBusinessId} could not be found in the businesses table.`
      );
    }

    /*
     * ==========================================================
     * 6. AUTHORITATIVE SODAH IDENTIFIERS
     * ==========================================================
     */

    const businessId =
      String(business.id).trim();

    const businessPublicId =
      String(
        business.business_id ||
          business.id
      ).trim();

    const userId =
      typeof business.user_id ===
      "string"
        ? business.user_id.trim()
        : "";

    console.log(
      "[Facebook Login v2] RESOLVED BUSINESS:",
      {
        requestedBusinessId,
        businessId,
        businessPublicId,
        userId,
      }
    );

    /*
     * ==========================================================
     * 7. USER MUST EXIST
     * ==========================================================
     */

    if (!userId) {
      console.error(
        "[Facebook Login v2] BUSINESS HAS NO USER:",
        {
          businessId,
          businessPublicId,
        }
      );

      return errorRedirect(
        request,
        "facebook_user_not_resolved",
        "The resolved Sodah business does not have a user_id."
      );
    }

    /*
     * ==========================================================
     * 8. CREATE SIGNED OAUTH STATE
     *
     * THIS IS THE IMPORTANT PART.
     *
     * There is NO Supabase browser session involved here.
     *
     * The business and user come directly from the
     * businesses table.
     * ==========================================================
     */

    const statePayload = {
      userId,
      businessId,
      businessPublicId,
      timestamp: Date.now(),
      nonce: randomUUID(),
    };

    const stateJson =
      JSON.stringify(
        statePayload
      );

    const encodedPayload =
      base64UrlEncode(
        stateJson
      );

    const signature =
      signState(
        encodedPayload,
        stateSecret
      );

    const state =
      `${encodedPayload}.${signature}`;

    /*
     * HARD SAFETY CHECK
     *
     * Never send a state containing null/empty identity.
     */

    if (
      !userId ||
      !businessId
    ) {
      console.error(
        "[Facebook Login v2] REFUSING TO CREATE INVALID STATE:",
        {
          userId,
          businessId,
        }
      );

      return errorRedirect(
        request,
        "facebook_invalid_oauth_identity",
        "Facebook OAuth could not start because the Sodah user or business identity is incomplete."
      );
    }

    console.log(
      "[Facebook Login v2] STATE CREATED:",
      {
        userId,
        businessId,
        businessPublicId,
        hasTimestamp:
          Boolean(
            statePayload.timestamp
          ),
        hasNonce:
          Boolean(
            statePayload.nonce
          ),
        stateLength:
          state.length,
      }
    );

    /*
     * ==========================================================
     * 9. BUILD FACEBOOK LOGIN URL
     * ==========================================================
     */

    const facebookUrl =
      new URL(
        `https://www.facebook.com/${graphVersion}/dialog/oauth`
      );

    facebookUrl.searchParams.set(
      "client_id",
      facebookAppId
    );

    facebookUrl.searchParams.set(
      "redirect_uri",
      facebookRedirectUri
    );

    facebookUrl.searchParams.set(
      "response_type",
      "code"
    );

    facebookUrl.searchParams.set(
      "scope",
      [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_metadata",
        "pages_messaging",
      ].join(",")
    );

    facebookUrl.searchParams.set(
      "state",
      state
    );

    console.log(
      "[Facebook Login v2] FACEBOOK URL READY:",
      {
        redirectUri:
          facebookRedirectUri,

        businessId,

        userId,

        statePresent:
          Boolean(
            facebookUrl.searchParams.get(
              "state"
            )
          ),

        stateContainsNull:
          state.includes(
            "null"
          ),
      }
    );

    /*
     * ==========================================================
     * 10. CREATE RESPONSE
     * ==========================================================
     */

    const response =
      NextResponse.redirect(
        facebookUrl
      );

    /*
     * ==========================================================
     * 11. OPTIONAL STATE COOKIE
     *
     * Callback does NOT depend on this cookie.
     * Signed state is the authoritative identity.
     * ==========================================================
     */

    response.cookies.set(
      "facebook_oauth_state",
      state,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      }
    );

    console.log(
      "[Facebook Login v2] REDIRECTING TO FACEBOOK"
    );

    console.log(
      "=================================================="
    );

    return response;
  } catch (error) {
    console.error(
      "=================================================="
    );

    console.error(
      "[Facebook Login v2] UNEXPECTED ERROR:",
      error
    );

    console.error(
      "=================================================="
    );

    return errorRedirect(
      request,
      "facebook_login_error",
      error instanceof Error
        ? error.message
        : "Unexpected Facebook login error."
    );
  }
}