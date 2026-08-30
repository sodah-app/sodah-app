import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Facebook status configuration is incomplete." },
        { status: 500 }
      );
    }

    const supabase = createServerClient(
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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          connected: false,
          error: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const businessIdParam =
      new URL(request.url)
        .searchParams
        .get("businessId")
        ?.trim();

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

    // Resolve the business strictly through the authenticated user.
    // The optional businessId is only used as a consistency check; it
    // never determines which user's row may be returned.
    const {
      data: businesses,
      error: businessError,
    } = await supabaseAdmin
      .from("businesses")
      .select(
        "id, business_id, facebook_connected"
      )
      .eq("user_id", user.id)
      .limit(10);

    if (businessError) {
      console.error(
        "[Facebook Status] Business lookup failed:",
        businessError
      );

      return NextResponse.json(
        {
          connected: false,
          error: businessError.message,
        },
        { status: 500 }
      );
    }

    const rows = Array.isArray(businesses)
      ? businesses
      : [];

    const business =
      (businessIdParam
        ? rows.find(
            (row) =>
              String(row.business_id || "") ===
                businessIdParam ||
              String(row.id || "") ===
                businessIdParam
          )
        : rows[0]) ||
      rows[0] ||
      null;

    return NextResponse.json({
      connected:
        business?.facebook_connected === true,
      businessId:
        business?.business_id ||
        business?.id ||
        null,
    });
  } catch (error) {
    console.error(
      "[Facebook Status] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        connected: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Facebook status error.",
      },
      { status: 500 }
    );
  }
}
