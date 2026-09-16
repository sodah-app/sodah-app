import { NextResponse } from "next/server";
import { authenticate, db, resolveAccount } from "@/lib/inbox-email-ai";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await authenticate(request);
    const admin = db();
    const { business, account } = await resolveAccount(admin, user);

    return NextResponse.json({
      success: true,
      business: {
        id: business?.id || null,
        business_id: business?.business_id || null,
        business_name: business?.business_name || null,
      },
      account: account
        ? {
            id: account.id || null,
            business_id: account.business_id || business?.id || null,
            gmail_email:
              account.gmail_email ||
              account.email ||
              account.google_email ||
              null,
            gmail_name:
              account.gmail_name ||
              account.name ||
              null,
            token_expires_at:
              account.token_expires_at ||
              account.expires_at ||
              account.expiry_date ||
              null,
            created_at: account.created_at || null,
            updated_at: account.updated_at || null,
          }
        : null,
    });
  } catch (error) {
    console.error("[Inbox Email AI] Account GET error:", error);

    const status = /Unauthorized/i.test(error?.message || "") ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to load Gmail account.",
      },
      { status }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await authenticate(request);
    const admin = db();
    const { business } = await resolveAccount(admin, user);

    const ids = [business?.id, business?.business_id]
      .filter(Boolean)
      .map(String);

    for (const id of ids) {
      const { error } = await admin
        .from("sodah_email_accounts")
        .delete()
        .eq("business_id", id);

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Inbox Gmail connection removed.",
    });
  } catch (error) {
    console.error("[Inbox Email AI] Account DELETE error:", error);

    const status = /Unauthorized/i.test(error?.message || "") ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to disconnect Gmail.",
      },
      { status }
    );
  }
}
