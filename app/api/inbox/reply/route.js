import { NextResponse } from "next/server";
import { authenticate, db, buildRawEmail } from "@/lib/email-ai";
import { gmail, resolveAccount } from "../_lib/gmail-inbox";

export const runtime = "nodejs";

function addressFromHeader(value) {
  const match = String(value || "").match(/<([^>]+)>/);
  return match?.[1] || String(value || "").trim();
}

export async function POST(request) {
  try {
    const user = await authenticate(request);
    const body = await request.json().catch(() => ({}));
    const messageId = String(body?.messageId || "").trim();
    const text = String(body?.body || "").trim();
    if (!messageId || !text) return NextResponse.json({ success: false, message: "Message id and reply text are required." }, { status: 400 });
    const admin = db();
    const { account } = await resolveAccount(admin, user);
    const api = gmail(account);
    const original = await api.users.messages.get({ userId: "me", id: messageId, format: "full" });
    const headers = Object.fromEntries((original.data.payload?.headers || []).map((h) => [String(h.name || "").toLowerCase(), h.value || ""]));
    const from = addressFromHeader(headers.from);
    const subject = String(headers.subject || "");
    const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
    const refs = [headers.references, headers["message-id"]].filter(Boolean).join(" ");
    const raw = buildRawEmail({ from: account.gmail_email, to: from, subject: replySubject, body: text, inReplyTo: headers["message-id"], references: refs });
    const sent = await api.users.messages.send({ userId: "me", requestBody: { raw, threadId: original.data.threadId } });
    return NextResponse.json({ success: true, message: "Reply sent successfully.", sentId: sent.data.id || null, threadId: original.data.threadId });
  } catch (error) {
    console.error("[Inbox] Reply error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Unable to send reply." }, { status: 500 });
  }
}
