import { NextResponse } from "next/server";
import { authenticate, db } from "@/lib/email-ai";
import { gmail, resolveAccount } from "../_lib/gmail-inbox";

export const runtime = "nodejs";

const allowed = new Set(["read", "unread", "star", "unstar", "important", "unimportant", "archive", "trash"]);

export async function POST(request) {
  try {
    const user = await authenticate(request);
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const action = String(body?.action || "").trim();
    if (!id || !allowed.has(action)) return NextResponse.json({ success: false, message: "A valid message id and action are required." }, { status: 400 });
    const admin = db();
    const { account } = await resolveAccount(admin, user);
    const api = gmail(account);
    const map = {
      read: { addLabelIds: [], removeLabelIds: ["UNREAD"] },
      unread: { addLabelIds: ["UNREAD"], removeLabelIds: [] },
      star: { addLabelIds: ["STARRED"], removeLabelIds: [] },
      unstar: { addLabelIds: [], removeLabelIds: ["STARRED"] },
      important: { addLabelIds: ["IMPORTANT"], removeLabelIds: [] },
      unimportant: { addLabelIds: [], removeLabelIds: ["IMPORTANT"] },
      archive: { addLabelIds: [], removeLabelIds: ["INBOX"] },
      trash: { addLabelIds: ["TRASH"], removeLabelIds: ["INBOX"] },
    };
    await api.users.messages.modify({ userId: "me", id, requestBody: map[action] });
    return NextResponse.json({ success: true, action, id });
  } catch (error) {
    console.error("[Inbox] Action error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Unable to update email." }, { status: 500 });
  }
}
