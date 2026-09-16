import { NextResponse } from "next/server";
import { adminSupabase, requireBusinessOwner } from "@/lib/whatsapp/auth";
import { sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp/cloud-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { businessId, recipient, text, template } = body;

    const ownership = await requireBusinessOwner(request, businessId);
    if (ownership.error) {
      return NextResponse.json(
        { success: false, message: ownership.error },
        { status: ownership.status }
      );
    }

    if (!recipient || (!text && !template)) {
      return NextResponse.json(
        { success: false, message: "recipient and text/template are required." },
        { status: 400 }
      );
    }

    const db = adminSupabase();

    const { data: connection, error } = await db
      .from("whatsapp_connections")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "connected")
      .maybeSingle();

    if (error) throw error;
    if (!connection) {
      return NextResponse.json(
        { success: false, message: "WhatsApp is not connected." },
        { status: 409 }
      );
    }

    const result = template
      ? await sendWhatsAppTemplate({
          phoneNumberId: connection.phone_number_id,
          recipient,
          template,
          accessToken: connection.access_token,
        })
      : await sendWhatsAppText({
          phoneNumberId: connection.phone_number_id,
          recipient,
          text,
          accessToken: connection.access_token,
        });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[WhatsApp Send] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Unable to send WhatsApp message." },
      { status: error?.status || 500 }
    );
  }
}
