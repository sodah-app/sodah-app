import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

type BusinessRow = {
  id: string;
  business_id: string;
  user_id: string;
  instagram_connected: boolean | null;
  instagram_user_id: string | null;
  instagram_access_token: string | null;
};

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ------------------------------------------------------------
     * 1. CHECK SUPABASE CONFIGURATION
     * ------------------------------------------------------------
     */

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonError(
        "Instagram refresh is not configured.",
        500
      );
    }

    /*
     * ------------------------------------------------------------
     * 2. READ REQUEST
     * ------------------------------------------------------------
     */

    const body =
      await request.json().catch(
        () => ({})
      );

    /*
     * businessId is the Sodah public business ID:
     *
     * BIZ-1785669021522
     *
     * It is NOT businesses.id.
     */

    const businessId =
      typeof body?.businessId === "string"
        ? body.businessId.trim()
        : "";

    if (!businessId) {
      return jsonError(
        "businessId is required."
      );
    }

    /*
     * ------------------------------------------------------------
     * 3. CREATE SUPABASE ADMIN CLIENT
     * ------------------------------------------------------------
     */

    const supabase =
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

    /*
     * ------------------------------------------------------------
     * 4. FIND BUSINESS
     * ------------------------------------------------------------
     *
     * IMPORTANT:
     *
     * businesses.id
     * = UUID
     *
     * businesses.business_id
     * = BIZ-XXXXXXXX
     *
     * The request contains business_id.
     */

    const {
      data: rawBusiness,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select(
        [
          "id",
          "business_id",
          "user_id",
          "instagram_connected",
          "instagram_user_id",
          "instagram_access_token",
        ].join(",")
      )
      .eq(
        "business_id",
        businessId
      )
      .maybeSingle();

    if (businessError) {
      console.error(
        "[Instagram Refresh] Business lookup failed:",
        businessError
      );

      return jsonError(
        `Unable to load the business connection: ${businessError.message}`,
        500
      );
    }

    if (!rawBusiness) {
      console.error(
        "[Instagram Refresh] Business not found:",
        businessId
      );

      return jsonError(
        `Business not found: ${businessId}`,
        404
      );
    }

    /*
     * Supabase's generated type is currently
     * resolving this query incorrectly.
     *
     * Explicitly define the shape returned by
     * the select above.
     */

    const business =
      rawBusiness as unknown as BusinessRow;

    /*
     * ------------------------------------------------------------
     * 5. VERIFY INSTAGRAM CONNECTION
     * ------------------------------------------------------------
     */

    if (
      business.instagram_connected !== true
    ) {
      return jsonError(
        `Instagram is not connected for business: ${businessId}`,
        400
      );
    }

    /*
     * ------------------------------------------------------------
     * 6. VERIFY ACCESS TOKEN
     * ------------------------------------------------------------
     */

    const currentToken =
      business.instagram_access_token;

    if (
      typeof currentToken !== "string" ||
      !currentToken.trim()
    ) {
      return jsonError(
        "No Instagram access token is stored for this business.",
        404
      );
    }

    /*
     * ------------------------------------------------------------
     * 7. REFRESH INSTAGRAM TOKEN
     * ------------------------------------------------------------
     */

   const refreshUrl =
  new URL(
    "https://graph.instagram.com/refresh_access_token"
  );

    refreshUrl.searchParams.set(
      "grant_type",
      "ig_refresh_token"
    );

    refreshUrl.searchParams.set(
      "access_token",
      currentToken.trim()
    );

    console.log(
      "[Instagram Refresh] Refreshing Instagram token:",
      {
        businessId:
          business.business_id,

        databaseBusinessUuid:
          business.id,

        userId:
          business.user_id,

        instagramUserId:
          business.instagram_user_id,

        hasToken:
          true,
      }
    );

    const refreshResponse =
      await fetch(
        refreshUrl.toString(),
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },

          cache: "no-store",
        }
      );

    const refreshText =
      await refreshResponse.text();

    /*
     * ------------------------------------------------------------
     * 8. PARSE META RESPONSE
     * ------------------------------------------------------------
     */

    let refreshData: any = null;

    try {
      refreshData =
        JSON.parse(refreshText);
    } catch {
      refreshData = {
        raw: refreshText,
      };
    }

    /*
     * ------------------------------------------------------------
     * 9. HANDLE META ERROR
     * ------------------------------------------------------------
     */

    if (
      !refreshResponse.ok ||
      !refreshData?.access_token
    ) {
      console.error(
        "[Instagram Refresh] Meta refresh failed:",
        {
          status:
            refreshResponse.status,

          error:
            refreshData?.error,

          errorType:
            refreshData?.error?.type ||
            refreshData?.error_type,

          errorCode:
            refreshData?.error?.code,

          errorSubcode:
            refreshData?.error?.error_subcode,

          errorMessage:
            refreshData?.error?.message ||
            refreshData?.error_message,

          traceId:
            refreshData?.error?.fbtrace_id,
        }
      );

      return NextResponse.json(
        {
          success: false,

          error:
            refreshData?.error?.message ||
            refreshData?.error_message ||
            refreshData?.raw ||
            "Instagram token refresh failed.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * ------------------------------------------------------------
     * 10. GET NEW TOKEN
     * ------------------------------------------------------------
     */

    const newToken =
      refreshData.access_token;

    const expiresIn =
      Number.isFinite(
        Number(
          refreshData?.expires_in
        )
      )
        ? Number(
            refreshData.expires_in
          )
        : null;

    const expiresAt =
      expiresIn !== null
        ? new Date(
            Date.now() +
              expiresIn * 1000
          ).toISOString()
        : null;

    /*
     * ------------------------------------------------------------
     * 11. SAVE NEW TOKEN
     * ------------------------------------------------------------
     */

    const {
      error: updateError,
    } = await supabase
      .from("businesses")
      .update({
        instagram_access_token:
          newToken,
      })
      .eq(
        "business_id",
        businessId
      );

    if (updateError) {
      console.error(
        "[Instagram Refresh] Token save failed:",
        updateError
      );

      return jsonError(
        `Instagram token refreshed but could not be saved: ${updateError.message}`,
        500
      );
    }

    /*
     * ------------------------------------------------------------
     * 12. SUCCESS
     * ------------------------------------------------------------
     */

    console.log(
      "[Instagram Refresh] Instagram token refreshed successfully:",
      {
        businessId:
          business.business_id,

        databaseBusinessUuid:
          business.id,

        userId:
          business.user_id,

        instagramUserId:
          business.instagram_user_id,

        expiresIn,

        expiresAt,
      }
    );

    return NextResponse.json({
      success: true,

      businessId:
        business.business_id,

      userId:
        business.user_id,

      instagramUserId:
        business.instagram_user_id,

      expiresIn,

      expiresAt,
    });
  } catch (error) {
    console.error(
      "[Instagram Refresh] Unexpected error:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Unexpected Instagram token refresh error.",
      500
    );
  }
}