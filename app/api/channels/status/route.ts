import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    /* =========================================================
       AUTHENTICATED USER
    ========================================================= */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          whatsapp: { connected: false },
          instagram: { connected: false },
          facebook: { connected: false },
          tiktok: { connected: false },
        },
        { status: 401 }
      );
    }

    /* =========================================================
       FIND BUSINESS
    ========================================================= */

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select(
        `
        id,
        user_id,
        whatsapp_connected,
        whatsapp_status,
        facebook_connected,
        facebook_status,
        tiktok_connected,
        tiktok_status
        `
      )
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

    /* =========================================================
       BUSINESS ID
    ========================================================= */

    const businessId = business?.id || null;

    /* =========================================================
       WHATSAPP
       ========================================================= */

    const whatsappConnected =
      business?.whatsapp_connected === true ||
      business?.whatsapp_status === "connected";

    /* =========================================================
       FACEBOOK
       ========================================================= */

    const facebookConnected =
      business?.facebook_connected === true ||
      business?.facebook_status === "connected";

    /* =========================================================
       TIKTOK
    ========================================================= */

    const tiktokConnected =
      business?.tiktok_connected === true ||
      business?.tiktok_status === "connected";

    /* =========================================================
       INSTAGRAM
       
       Instagram uses its own connection table.
       We only consider it connected when a connection exists
       for THIS authenticated user's business.
    ========================================================= */

    let instagramConnected = false;

    if (businessId) {
      const { data: instagramConnection, error: instagramError } =
        await supabase
          .from("instagram_connections")
          .select("id")
          .eq("business_id", businessId)
          .limit(1)
          .maybeSingle();

      if (instagramError) {
        console.error(
          "Instagram connection lookup error:",
          instagramError
        );
      } else {
        instagramConnected = Boolean(instagramConnection);
      }
    }

    /* =========================================================
       FINAL CHANNEL STATUS
       
       IMPORTANT:
       Keep this response structure consistent.
    ========================================================= */

    return NextResponse.json({
      whatsapp: {
        connected: whatsappConnected,
      },

      instagram: {
        connected: instagramConnected,
      },

      facebook: {
        connected: facebookConnected,
      },

      tiktok: {
        connected: tiktokConnected,
      },
    });
  } catch (error) {
    console.error("Channel status error:", error);

    return NextResponse.json({
      whatsapp: {
        connected: false,
      },

      instagram: {
        connected: false,
      },

      facebook: {
        connected: false,
      },

      tiktok: {
        connected: false,
      },
    });
  }
}