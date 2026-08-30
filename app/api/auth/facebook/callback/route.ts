import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   ENVIRONMENT
========================================================= */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  process.env.SUPABASE_URL?.trim();

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const FACEBOOK_APP_ID =
  process.env.FACEBOOK_APP_ID?.trim();

const FACEBOOK_APP_SECRET =
  process.env.FACEBOOK_APP_SECRET?.trim();

const FACEBOOK_REDIRECT_URI =
  process.env.FACEBOOK_REDIRECT_URI?.trim();

const FACEBOOK_STATE_SECRET =
  process.env.FACEBOOK_STATE_SECRET?.trim() ||
  SUPABASE_SERVICE_ROLE_KEY;

const GRAPH_VERSION =
  process.env.FACEBOOK_GRAPH_VERSION?.trim() ||
  "v25.0";

/* =========================================================
   TYPES
========================================================= */

type BusinessRow = {
  id: string;
  business_id: string | null;
  user_id: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function base64UrlDecode(value: string): string {
  let base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (base64.length % 4 !== 0) {
    base64 += "=";
  }

  return Buffer.from(
    base64,
    "base64"
  ).toString("utf8");
}

function signState(
  payload: string,
  secret: string
): string {
  return crypto
    .createHmac(
      "sha256",
      secret
    )
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function safeEqual(
  first: string,
  second: string
): boolean {
  const firstBuffer =
    Buffer.from(first);

  const secondBuffer =
    Buffer.from(second);

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    firstBuffer,
    secondBuffer
  );
}

function redirectError(
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

function redirectSuccess(
  request: NextRequest
) {
  const url = new URL(
    "/channels",
    request.url
  );

  url.searchParams.set(
    "facebook",
    "connected"
  );

  return NextResponse.redirect(url);
}

/* =========================================================
   CALLBACK
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    console.log(
      "=============================================="
    );

    console.log(
      "[Facebook Callback] START"
    );

    console.log(
      "=============================================="
    );

    /* =====================================================
       1. CHECK ENVIRONMENT
    ===================================================== */

    if (!SUPABASE_URL) {
      return redirectError(
        request,
        "facebook_config_error",
        "NEXT_PUBLIC_SUPABASE_URL is missing."
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return redirectError(
        request,
        "facebook_config_error",
        "SUPABASE_SERVICE_ROLE_KEY is missing."
      );
    }

    if (!SUPABASE_ANON_KEY) {
      return redirectError(
        request,
        "facebook_config_error",
        "Supabase publishable/anon key is missing."
      );
    }

    if (!FACEBOOK_APP_ID) {
      return redirectError(
        request,
        "facebook_config_error",
        "FACEBOOK_APP_ID is missing."
      );
    }

    if (!FACEBOOK_APP_SECRET) {
      return redirectError(
        request,
        "facebook_config_error",
        "FACEBOOK_APP_SECRET is missing."
      );
    }

    if (!FACEBOOK_REDIRECT_URI) {
      return redirectError(
        request,
        "facebook_config_error",
        "FACEBOOK_REDIRECT_URI is missing."
      );
    }

    if (!FACEBOOK_STATE_SECRET) {
      return redirectError(
        request,
        "facebook_config_error",
        "FACEBOOK_STATE_SECRET is missing."
      );
    }

    /* =====================================================
       2. READ FACEBOOK RESPONSE
    ===================================================== */

    const code =
      request.nextUrl.searchParams.get(
        "code"
      );

    const state =
      request.nextUrl.searchParams.get(
        "state"
      );

    const facebookError =
      request.nextUrl.searchParams.get(
        "error"
      );

    const facebookErrorDescription =
      request.nextUrl.searchParams.get(
        "error_description"
      );

    console.log(
      "[Facebook Callback] Has code:",
      Boolean(code)
    );

    console.log(
      "[Facebook Callback] Has state:",
      Boolean(state)
    );

    /* =====================================================
       3. FACEBOOK USER DENIED / ERROR
    ===================================================== */

    if (facebookError) {
      console.error(
        "[Facebook Callback] Facebook returned an error:",
        {
          error: facebookError,
          description:
            facebookErrorDescription,
        }
      );

      return redirectError(
        request,
        "facebook_authorization_failed",
        facebookErrorDescription ||
          facebookError
      );
    }

    /* =====================================================
       4. CODE REQUIRED
    ===================================================== */

    if (!code) {
      return redirectError(
        request,
        "facebook_missing_code",
        "Facebook did not return an authorization code."
      );
    }

    /* =====================================================
       5. STATE REQUIRED
    ===================================================== */

    if (!state) {
      return redirectError(
        request,
        "facebook_missing_state",
        "Facebook did not return the OAuth state."
      );
    }

    /* =====================================================
       6. VERIFY STATE FORMAT
    ===================================================== */

    const stateParts =
      state.split(".");

    if (
      stateParts.length !== 2 ||
      !stateParts[0] ||
      !stateParts[1]
    ) {
      console.error(
        "[Facebook Callback] Invalid state format."
      );

      return redirectError(
        request,
        "facebook_invalid_state",
        "Facebook OAuth state has an invalid format."
      );
    }

    const encodedPayload =
      stateParts[0];

    const receivedSignature =
      stateParts[1];

    /* =====================================================
       7. VERIFY STATE SIGNATURE
    ===================================================== */

    const expectedSignature =
      signState(
        encodedPayload,
        FACEBOOK_STATE_SECRET
      );

    if (
      !safeEqual(
        receivedSignature,
        expectedSignature
      )
    ) {
      console.error(
        "[Facebook Callback] State signature mismatch."
      );

      return redirectError(
        request,
        "facebook_invalid_state_signature",
        "Facebook OAuth state signature is invalid."
      );
    }

    console.log(
      "[Facebook Callback] State signature verified."
    );

    /* =====================================================
       8. DECODE STATE
    ===================================================== */

    let statePayload: any;

    try {
      const decoded =
        base64UrlDecode(
          encodedPayload
        );

      console.log(
        "[Facebook Callback] Decoded state:",
        decoded
      );

      statePayload =
        JSON.parse(decoded);
    } catch (error) {
      console.error(
        "[Facebook Callback] State decode failed:",
        error
      );

      return redirectError(
        request,
        "facebook_invalid_state_payload",
        "Facebook OAuth state could not be decoded."
      );
    }

    /* =====================================================
       9. EXTRACT ALL POSSIBLE IDENTIFIERS
    ===================================================== */

    let stateUserId =
      typeof statePayload?.userId ===
      "string"
        ? statePayload.userId.trim()
        : "";

    let stateBusinessId =
      typeof statePayload?.businessId ===
      "string"
        ? statePayload.businessId.trim()
        : "";

    let stateBusinessPublicId =
      typeof statePayload?.businessPublicId ===
      "string"
        ? statePayload.businessPublicId.trim()
        : "";

    console.log(
      "[Facebook Callback] OAuth identity:",
      {
        stateUserId:
          stateUserId || null,

        stateBusinessId:
          stateBusinessId || null,

        stateBusinessPublicId:
          stateBusinessPublicId || null,
      }
    );

    /* =====================================================
       10. STATE TIMESTAMP
    ===================================================== */

    if (
      statePayload?.timestamp !==
      undefined
    ) {
      const timestamp =
        Number(
          statePayload.timestamp
        );

      if (
        !Number.isFinite(timestamp)
      ) {
        return redirectError(
          request,
          "facebook_invalid_state_timestamp",
          "Facebook OAuth state timestamp is invalid."
        );
      }

      const age =
        Date.now() - timestamp;

      if (
        age < 0 ||
        age > 10 * 60 * 1000
      ) {
        return redirectError(
          request,
          "facebook_state_expired",
          "The Facebook connection request has expired. Please connect Facebook again."
        );
      }
    }

    /* =====================================================
       11. CREATE ADMIN SUPABASE CLIENT
    ===================================================== */

    const supabaseAdmin =
      createSupabaseAdmin(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /* =====================================================
       12. RESOLVE BUSINESS
       
       IMPORTANT:
       We DO NOT require userId first.

       Business is the tenant anchor.

       Priority:
       1. business UUID
       2. public business_id
       3. userId
       4. current Supabase session
    ===================================================== */

    let business:
      | BusinessRow
      | null = null;

    /* -----------------------------------------------------
       A. BUSINESS UUID FROM STATE
    ----------------------------------------------------- */

    if (stateBusinessId) {
      console.log(
        "[Facebook Callback] Looking up business by UUID:",
        stateBusinessId
      );

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from("businesses")
          .select(
            "id, business_id, user_id"
          )
          .eq(
            "id",
            stateBusinessId
          )
          .maybeSingle();

      if (error) {
        console.error(
          "[Facebook Callback] UUID business lookup failed:",
          error
        );
      } else if (data) {
        business =
          data as BusinessRow;
      }
    }

    /* -----------------------------------------------------
       B. PUBLIC BUSINESS ID FROM STATE
    ----------------------------------------------------- */

    if (
      !business &&
      stateBusinessPublicId
    ) {
      console.log(
        "[Facebook Callback] Looking up business by business_id:",
        stateBusinessPublicId
      );

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from("businesses")
          .select(
            "id, business_id, user_id"
          )
          .eq(
            "business_id",
            stateBusinessPublicId
          )
          .maybeSingle();

      if (error) {
        console.error(
          "[Facebook Callback] Public business lookup failed:",
          error
        );
      } else if (data) {
        business =
          data as BusinessRow;
      }
    }

    /* -----------------------------------------------------
       C. USER ID FROM STATE
    ----------------------------------------------------- */

    if (
      !business &&
      stateUserId
    ) {
      console.log(
        "[Facebook Callback] Looking up business by state userId:",
        stateUserId
      );

      const {
        data,
        error,
      } =
        await supabaseAdmin
          .from("businesses")
          .select(
            "id, business_id, user_id"
          )
          .eq(
            "user_id",
            stateUserId
          )
          .limit(1)
          .maybeSingle();

      if (error) {
        console.error(
          "[Facebook Callback] User business lookup failed:",
          error
        );
      } else if (data) {
        business =
          data as BusinessRow;
      }
    }

    /* =====================================================
       13. LAST RESORT: SUPABASE SESSION
       
       Only used if state did not give us enough
       information.
    ===================================================== */

    if (!business) {
      console.log(
        "[Facebook Callback] State did not resolve business."
      );

      console.log(
        "[Facebook Callback] Attempting Supabase session fallback..."
      );

      try {
        const supabaseAuth =
          createServerClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            {
              cookies: {
                getAll() {
                  return request.cookies.getAll();
                },

                setAll() {
                  // Read-only callback.
                },
              },
            }
          );

        const {
          data: {
            user,
          },
          error: authError,
        } =
          await supabaseAuth.auth.getUser();

        if (
          !authError &&
          user?.id
        ) {
          stateUserId =
            user.id;

          console.log(
            "[Facebook Callback] Session user recovered:",
            stateUserId
          );

          const {
            data,
            error,
          } =
            await supabaseAdmin
              .from("businesses")
              .select(
                "id, business_id, user_id"
              )
              .eq(
                "user_id",
                stateUserId
              )
              .limit(1)
              .maybeSingle();

          if (
            !error &&
            data
          ) {
            business =
              data as BusinessRow;
          }
        }
      } catch (sessionError) {
        console.error(
          "[Facebook Callback] Session fallback failed:",
          sessionError
        );
      }
    }

    /* =====================================================
       14. BUSINESS MUST EXIST
    ===================================================== */

    if (!business) {
      console.error(
        "[Facebook Callback] BUSINESS NOT RESOLVED",
        {
          stateUserId:
            stateUserId || null,

          stateBusinessId:
            stateBusinessId || null,

          stateBusinessPublicId:
            stateBusinessPublicId || null,
        }
      );

      return redirectError(
        request,
        "facebook_business_not_resolved",
        "Sodah could not identify the business that started the Facebook connection."
      );
    }

    /* =====================================================
       15. GET USER FROM BUSINESS
       
       THIS SOLVES THE PREVIOUS
       facebook_user_not_resolved ERROR.
    ===================================================== */

    const userId =
      typeof business.user_id ===
      "string"
        ? business.user_id.trim()
        : "";

    const businessId =
      String(
        business.id
      );

    if (!userId) {
      console.error(
        "[Facebook Callback] Business exists but user_id is missing:",
        businessId
      );

      return redirectError(
        request,
        "facebook_business_user_missing",
        "The Sodah business does not have an associated user."
      );
    }

    console.log(
      "[Facebook Callback] FINAL SODAH IDENTITY:",
      {
        userId,
        businessId,
        businessPublicId:
          business.business_id,
      }
    );

    /* =====================================================
       16. EXCHANGE FACEBOOK AUTHORIZATION CODE
    ===================================================== */

    const tokenUrl =
      new URL(
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`
      );

    tokenUrl.searchParams.set(
      "client_id",
      FACEBOOK_APP_ID
    );

    tokenUrl.searchParams.set(
      "client_secret",
      FACEBOOK_APP_SECRET
    );

    tokenUrl.searchParams.set(
      "redirect_uri",
      FACEBOOK_REDIRECT_URI
    );

    tokenUrl.searchParams.set(
      "code",
      code
    );

    console.log(
      "[Facebook Callback] Exchanging Facebook code..."
    );

    const tokenResponse =
      await fetch(
        tokenUrl.toString(),
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    const tokenText =
      await tokenResponse.text();

    let tokenData: any;

    try {
      tokenData =
        JSON.parse(
          tokenText
        );
    } catch {
      tokenData = {
        raw: tokenText,
      };
    }

    if (
      !tokenResponse.ok ||
      !tokenData?.access_token
    ) {
      console.error(
        "[Facebook Callback] Token exchange failed:",
        {
          status:
            tokenResponse.status,

          error:
            tokenData?.error,

          message:
            tokenData?.error?.message,

          raw:
            tokenData?.raw,
        }
      );

      return redirectError(
        request,
        "facebook_token_exchange_failed",
        tokenData?.error?.message ||
          tokenData?.raw ||
          "Facebook authorization could not be completed."
      );
    }

    const facebookAccessToken =
      String(
        tokenData.access_token
      );

    console.log(
      "[Facebook Callback] Facebook access token received."
    );

    /* =====================================================
       17. READ BUSINESS COLUMNS
       
       We dynamically inspect the row so we don't try to
       write columns that do not exist in your current table.
    ===================================================== */

    const {
      data: currentBusiness,
      error: currentBusinessError,
    } =
      await supabaseAdmin
        .from("businesses")
        .select("*")
        .eq(
          "id",
          businessId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (
      currentBusinessError
    ) {
      console.error(
        "[Facebook Callback] Current business lookup failed:",
        currentBusinessError
      );

      return redirectError(
        request,
        "facebook_business_read_failed",
        currentBusinessError.message
      );
    }

    if (!currentBusiness) {
      return redirectError(
        request,
        "facebook_business_not_found",
        "The Sodah business could not be found."
      );
    }

    /* =====================================================
       18. PREPARE FACEBOOK CONNECTION UPDATE
    ===================================================== */

    const updatePayload:
      Record<
        string,
        unknown
      > = {};

    /*
     * This column definitely exists according to
     * your Supabase screenshot.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        currentBusiness,
        "facebook_connected"
      )
    ) {
      updatePayload.facebook_connected =
        true;
    }

    /*
     * Save token only if your table contains
     * this column.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        currentBusiness,
        "facebook_access_token"
      )
    ) {
      updatePayload.facebook_access_token =
        facebookAccessToken;
    }

    /*
     * Save Facebook user ID if the column exists
     * and Meta returned one.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        currentBusiness,
        "facebook_user_id"
      ) &&
      tokenData?.user_id
    ) {
      updatePayload.facebook_user_id =
        String(
          tokenData.user_id
        );
    }

    /* =====================================================
       19. FACEBOOK CONNECTED COLUMN MUST EXIST
    ===================================================== */

    if (
      !Object.prototype.hasOwnProperty.call(
        currentBusiness,
        "facebook_connected"
      )
    ) {
      return redirectError(
        request,
        "facebook_connection_column_missing",
        "The businesses table does not contain facebook_connected."
      );
    }

    /* =====================================================
       20. SAVE CONNECTION
    ===================================================== */

    console.log(
      "[Facebook Callback] Saving Facebook connection:",
      {
        businessId,
        userId,
        columns:
          Object.keys(
            updatePayload
          ),
      }
    );

    const {
      error: updateError,
    } =
      await supabaseAdmin
        .from("businesses")
        .update(
          updatePayload
        )
        .eq(
          "id",
          businessId
        )
        .eq(
          "user_id",
          userId
        );

    if (updateError) {
      console.error(
        "[Facebook Callback] Database update failed:",
        updateError
      );

      return redirectError(
        request,
        "facebook_connection_save_failed",
        updateError.message
      );
    }

    /* =====================================================
       21. VERIFY FACEBOOK CONNECTED
    ===================================================== */

    const {
      data: verification,
      error: verificationError,
    } =
      await supabaseAdmin
        .from("businesses")
        .select(
          "facebook_connected"
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

    if (
      verificationError
    ) {
      console.error(
        "[Facebook Callback] Verification failed:",
        verificationError
      );

      return redirectError(
        request,
        "facebook_connection_verification_failed",
        verificationError.message
      );
    }

    if (
      !verification ||
      verification.facebook_connected !==
        true
    ) {
      console.error(
        "[Facebook Callback] Facebook connection was not confirmed in database."
      );

      return redirectError(
        request,
        "facebook_connection_not_confirmed",
        "Facebook authorization succeeded, but Sodah could not confirm the Facebook connection."
      );
    }

    /* =====================================================
       22. SUCCESS
    ===================================================== */

    console.log(
      "=============================================="
    );

    console.log(
      "[Facebook Callback] FACEBOOK CONNECTION SUCCESS"
    );

    console.log(
      "[Facebook Callback] userId:",
      userId
    );

    console.log(
      "[Facebook Callback] businessId:",
      businessId
    );

    console.log(
      "[Facebook Callback] facebook_connected: TRUE"
    );

    console.log(
      "[Facebook Callback] Redirecting to /channels"
    );

    console.log(
      "=============================================="
    );

    const response =
      redirectSuccess(
        request
      );

    /*
     * Clean up OAuth state cookie if it exists.
     *
     * The callback does NOT depend on this cookie.
     */
    response.cookies.set(
      "facebook_oauth_state",
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

    return response;
  } catch (error) {
    console.error(
      "=============================================="
    );

    console.error(
      "[Facebook Callback] UNEXPECTED ERROR:",
      error
    );

    console.error(
      "=============================================="
    );

    return redirectError(
      request,
      "facebook_callback_error",
      error instanceof Error
        ? error.message
        : "Unexpected Facebook callback error."
    );
  }
}