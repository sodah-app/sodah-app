import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const GRAPH_VERSION =
  "v25.0";

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
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonError(
        "Instagram refresh is not configured.",
        500
      );
    }

    const body =
      await request.json().catch(
        () => ({})
      );

    const businessId =
      typeof body?.businessId === "string"
        ? body.businessId.trim()
        : "";

    if (!businessId) {
      return jsonError(
        "businessId is required."
      );
    }

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
     * Fetch the business-scoped Instagram connection.
     * The exact column names below match the existing callback's
     * businesses/channel storage pattern.
     */
    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select(
        "id, instagram_access_token"
      )
      .eq("id", businessId)
      .maybeSingle();

    if (businessError) {
      console.error(
        "[Instagram Refresh] Business lookup failed:",
        businessError
      );

      return jsonError(
        "Unable to load the business connection.",
        500
      );
    }

    if (!business) {
      return jsonError(
        "Business not found.",
        404
      );
    }

    const currentToken =
      business.instagram_access_token;

    if (
      typeof currentToken !== "string" ||
      !currentToken
    ) {
      return jsonError(
        "No Instagram access token is stored for this business.",
        404
      );
    }

    /*
     * Meta's Instagram long-lived-token refresh endpoint:
     *
     * GET graph.instagram.com/refresh_access_token
     *   ?grant_type=ig_refresh_token
     *   &access_token=LONG_LIVED_TOKEN
     *
     * This route is deliberately separate from the OAuth callback.
     */
    const refreshUrl =
      new URL(
        `https://graph.instagram.com/${GRAPH_VERSION}/refresh_access_token`
      );

    refreshUrl.searchParams.set(
      "grant_type",
      "ig_refresh_token"
    );

    refreshUrl.searchParams.set(
      "access_token",
      currentToken
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

    let refreshData: any = null;

    try {
      refreshData =
        JSON.parse(refreshText);
    } catch {
      refreshData = {
        raw: refreshText,
      };
    }

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

    const updatePayload: Record<
      string,
      unknown
    > = {
      instagram_access_token:
        newToken,
    };

    /*
     * Do not assume a token-expiry column exists.
     * The token itself is always updated; expiry can be added to
     * the schema later if desired.
     */

    const {
      error: updateError,
    } = await supabase
      .from("businesses")
      .update(updatePayload)
      .eq("id", businessId);

    if (updateError) {
      console.error(
        "[Instagram Refresh] Token save failed:",
        updateError
      );

      return jsonError(
        "Instagram token refreshed but could not be saved.",
        500
      );
    }

    console.log(
      "[Instagram Refresh] Instagram token refreshed:",
      {
        businessId,
        expiresIn,
        expiresAt,
      }
    );

    return NextResponse.json({
      success: true,
      businessId,
      expiresIn,
      expiresAt,
    });
  } catch (error) {
    console.error(
      "[Instagram Refresh] Unexpected error:",
      error
    );

    return jsonError(
      "Unexpected Instagram token refresh error.",
      500
    );
  }
}
