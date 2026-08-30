import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { connected: false, authenticated: false },
        { status: 401 }
      );
    }

    const requestedBusinessId =
      new URL(request.url).searchParams
        .get("businessId")
        ?.trim() || "";

    let query = supabase
      .from("businesses")
      .select(
        "id, business_id, user_id, instagram_connected, instagram_user_id, instagram_username"
      )
      .eq("user_id", user.id);

    if (requestedBusinessId) {
      query = query.or(
        `id.eq.${requestedBusinessId},business_id.eq.${requestedBusinessId}`
      );
    }

    const { data: business, error: businessError } =
      await query.maybeSingle();

    if (businessError) {
      console.error(
        "[Instagram Status] Business lookup failed:",
        businessError
      );

      return NextResponse.json(
        {
          connected: false,
          authenticated: true,
          error: "Could not resolve the business.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          connected: false,
          authenticated: true,
          error: "Business not found for this account.",
        },
        { status: 404 }
      );
    }

    const connected =
      business.instagram_connected === true ||
      Boolean(business.instagram_user_id);

    return NextResponse.json(
      {
        connected,
        authenticated: true,
        businessId:
          business.business_id || business.id,
        instagramUserId:
          business.instagram_user_id || null,
        instagramUsername:
          business.instagram_username || null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "[Instagram Status] Unexpected error:",
      error
    );

    return NextResponse.json(
      { connected: false, authenticated: false },
      { status: 500 }
    );
  }
}
