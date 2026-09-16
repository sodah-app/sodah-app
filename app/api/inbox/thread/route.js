import { NextResponse } from "next/server";
import { authenticate, db } from "@/lib/email-ai";
import { gmail, resolveAccount, fullMessage } from "../_lib/gmail-inbox";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await authenticate(request);
    const threadId = new URL(request.url).searchParams.get("id");
    if (!threadId) return NextResponse.json({ success: false, message: "Thread id is required." }, { status: 400 });
    const admin = db();
    const { account } = await resolveAccount(admin, user);
    const api = gmail(account);
    const result = await api.users.threads.get({ userId: "me", id: threadId, format: "full" });
    return NextResponse.json({ success: true, thread: { id: result.data.id, historyId: result.data.historyId || null, messages: (result.data.messages || []).map(fullMessage) } });
  } catch (error) {
    console.error("[Inbox] Thread error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Unable to load conversation." }, { status: 500 });
  }
}
