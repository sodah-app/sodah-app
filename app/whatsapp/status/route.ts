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
      .select("id, business_id, user_id, whatsapp_connected")
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
        "[WhatsApp Status] Business lookup failed:",
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

    return NextResponse.json(
      {
        connected: business.whatsapp_connected === true,
        authenticated: true,
        businessId:
          business.business_id || business.id,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "[WhatsApp Status] Unexpected error:",
      error
    );

    return NextResponse.json(
      { connected: false, authenticated: false },
      { status: 500 }
    );
  }
}
