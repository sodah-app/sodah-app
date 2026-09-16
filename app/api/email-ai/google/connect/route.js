import { NextResponse } from "next/server";
import { googleOAuthClient, GOOGLE_SCOPES, authenticate, db, businessIdForUser } from "@/lib/email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await authenticate(request);
    const client = db();
    const businessId = await businessIdForUser(client, user);

    const { data: existing } = await client
      .from("email_ai_gmail_accounts")
      .select("id,is_connected,gmail_email")
      .eq("business_id", businessId)
      .maybeSingle();

    const oauth2 = googleOAuthClient();

    const statePayload = Buffer.from(
      JSON.stringify({
        userId: user.id,
        businessId,
        timestamp: Date.now(),
        existingId: existing?.id || null,
      })
    ).toString("base64url");

    const url = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_SCOPES,
      state: statePayload,
      include_granted_scopes: true,
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("[Email AI] Google connect:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Unable to start Google connection." },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}
