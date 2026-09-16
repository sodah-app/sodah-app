import { NextResponse } from "next/server";
import { authenticate, db } from "@/lib/email-ai";
import { gmail, resolveAccount, fullMessage } from "../_lib/gmail-inbox";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await authenticate(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "Message id is required." }, { status: 400 });
    const admin = db();
    const { account } = await resolveAccount(admin, user);
    const api = gmail(account);
    const result = await api.users.messages.get({ userId: "me", id, format: "full" });
    return NextResponse.json({ success: true, message: fullMessage(result.data) });
  } catch (error) {
    console.error("[Inbox] Message error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Unable to load email." }, { status: 500 });
  }
}
