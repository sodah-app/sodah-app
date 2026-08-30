import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    const clientKey =
      process.env.TIKTOK_CLIENT_KEY?.trim();

    const clientSecret =
      process.env.TIKTOK_CLIENT_SECRET?.trim();

    if (
      !supabaseUrl ||
      !publishableKey ||
      !serviceRoleKey ||
      !clientKey ||
      !clientSecret
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "TikTok refresh configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    const supabase =
      createServerClient(
        supabaseUrl,
        publishableKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {},
          },
        }
      );

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json().catch(
        () => ({})
      );

    const requestedBusinessId =
      String(
        body?.businessId || ""
      ).trim();

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

    const {
      data: businesses,
      error: businessError,
    } =
      await supabaseAdmin
        .from("businesses")
        .select(
          "id, business_id, tiktok_connected, tiktok_refresh_token"
        )
        .eq(
          "user_id",
          user.id
        )
        .limit(20);

    if (businessError) {
      return NextResponse.json(
        {
          success: false,
          error:
            businessError.message,
        },
        { status: 500 }
      );
    }

    const business =
      (businesses || []).find(
        (row) =>
          String(row.id) ===
            requestedBusinessId ||
          String(row.business_id) ===
            requestedBusinessId
      ) ||
      businesses?.[0];

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error:
            "TikTok business could not be resolved.",
        },
        { status: 404 }
      );
    }

    if (
      !business.tiktok_refresh_token
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No TikTok refresh token is stored. Reconnect TikTok.",
        },
        { status: 400 }
      );
    }

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
              grant_type:
                "refresh_token",
              refresh_token:
                business.tiktok_refresh_token,
            }).toString(),
          cache: "no-store",
        }
      );

    const tokenData =
      await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "[TikTok Refresh] Failed:",
        tokenData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            tokenData?.error_description ||
            tokenData?.message ||
            tokenData?.error ||
            "TikTok token refresh failed.",
        },
        { status: 400 }
      );
    }

    const newAccessToken =
      tokenData?.access_token || "";

    const newRefreshToken =
      tokenData?.refresh_token ||
      business.tiktok_refresh_token;

    const expiresIn =
      Number(
        tokenData?.expires_in || 0
      );

    const refreshExpiresIn =
      Number(
        tokenData?.refresh_expires_in ||
          0
      );

    if (!newAccessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "TikTok did not return a new access token.",
        },
        { status: 400 }
      );
    }

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

    const { error: updateError } =
      await supabaseAdmin
        .from("businesses")
        .update({
          tiktok_access_token:
            newAccessToken,
          tiktok_refresh_token:
            newRefreshToken,
          tiktok_token_expires_at:
            tokenExpiresAt,
          tiktok_refresh_expires_at:
            refreshExpiresAt,
          tiktok_connected:
            true,
        })
        .eq(
          "id",
          business.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      businessId:
        business.business_id ||
        business.id,
    });
  } catch (error) {
    console.error(
      "[TikTok Refresh] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected TikTok refresh error.",
      },
      { status: 500 }
    );
  }
}