import { NextResponse } from "next/server";
import {
  exchangeEmbeddedSignupCode,
  getWhatsAppPhoneNumber,
  getWaba,
  subscribeWaba,
} from "@/lib/whatsapp/cloud-api";
import { adminSupabase, requireBusinessOwner } from "@/lib/whatsapp/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      code,
      businessId,
      wabaId,
      phoneNumberId,
      signupBusinessId,
    } = body;

    if (!code || !businessId || !wabaId || !phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing Embedded Signup data. code, businessId, wabaId and phoneNumberId are required.",
        },
        { status: 400 }
      );
    }

    const ownership = await requireBusinessOwner(request, businessId);
    if (ownership.error) {
      return NextResponse.json(
        { success: false, message: ownership.error },
        { status: ownership.status }
      );
    }

    const accessToken = await exchangeEmbeddedSignupCode(code);
    const [phone, waba] = await Promise.all([
      getWhatsAppPhoneNumber(phoneNumberId, accessToken),
      getWaba(wabaId, accessToken),
    ]);

    // Subscribe the app to WABA events. This is safe to retry.
    let subscription = null;
    try {
      subscription = await subscribeWaba(wabaId, accessToken);
    } catch (subscriptionError) {
      console.error("[WhatsApp Embedded Signup] WABA subscription failed:", subscriptionError);
      // Do not discard an otherwise valid connection. The UI will report the
      // connection as successful; webhook subscription can be retried.
    }

    const db = adminSupabase();

    const connection = {
      business_id: businessId,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      access_token: accessToken,
      display_phone_number: phone?.display_phone_number || null,
      verified_name: phone?.verified_name || null,
      quality_rating: phone?.quality_rating || null,
      waba_name: waba?.name || null,
      meta_business_id: signupBusinessId || null,
      status: "connected",
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await db
      .from("whatsapp_connections")
      .upsert(connection, { onConflict: "business_id" });

    if (upsertError) throw upsertError;

    const { error: businessError } = await db
      .from("businesses")
      .update({
        whatsapp_connected: true,
      })
      .eq("business_id", businessId);

    if (businessError) throw businessError;

    return NextResponse.json({
      success: true,
      connected: true,
      businessId,
      wabaId,
      phoneNumberId,
      displayPhoneNumber: phone?.display_phone_number || "",
      verifiedName: phone?.verified_name || "",
      subscription,
    });
  } catch (error) {
    console.error("[WhatsApp Embedded Signup] Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to connect WhatsApp.",
      },
      { status: error?.status || 500 }
    );
  }
}
