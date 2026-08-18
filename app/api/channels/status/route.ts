import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the authenticated user's business
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (businessError) {
      console.error("Business lookup error:", businessError);

      return NextResponse.json({
        whatsapp: { connected: false },
        instagram: { connected: false },
        facebook: { connected: false },
        tiktok: { connected: false },
      });
    }

    const businessId = business?.id;

    let instagramConnected = false;

    // Existing Instagram table
    if (businessId) {
      const { data: instagram } = await supabase
        .from("instagram_connections")
        .select("id")
        .eq("business_id", businessId)
        .limit(1)
        .maybeSingle();

      instagramConnected = !!instagram;
    }

    return NextResponse.json({
      whatsapp: {
        connected: Boolean(
          business?.whatsapp_connected ??
          business?.whatsapp_status === "connected"
        ),
      },
      instagram: {
        connected: instagramConnected,
      },
      facebook: {
        connected: Boolean(
          business?.facebook_connected ??
          business?.facebook_status === "connected"
        ),
      },
      tiktok: {
        connected: Boolean(
          business?.tiktok_connected ??
          business?.tiktok_status === "connected"
        ),
      },
    });
  } catch (error) {
    console.error("Channel status error:", error);

    return NextResponse.json({
      whatsapp: { connected: false },
      instagram: { connected: false },
      facebook: { connected: false },
      tiktok: { connected: false },
    });
  }
}