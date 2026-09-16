import { NextResponse } from "next/server";
import { authenticate, businessIdForUser, db } from "@/lib/email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await authenticate(request);
    const client = db();
    const businessId = await businessIdForUser(client, user);

    const { data, error } = await client
      .from("email_ai_gmail_accounts")
      .select("id,gmail_email,gmail_name,is_connected,last_error,last_tested_at:updated_at,created_at,updated_at")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      account: data || null,
    });
  } catch (error) {
    console.error("[Email AI] Account:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Unable to load Gmail account." },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await authenticate(request);
    const client = db();
    const businessId = await businessIdForUser(client, user);

    const { error } = await client
      .from("email_ai_gmail_accounts")
      .delete()
      .eq("business_id", businessId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Gmail disconnected.",
    });
  } catch (error) {
    console.error("[Email AI] Disconnect:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Unable to disconnect Gmail." },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}
