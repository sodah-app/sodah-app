import { NextResponse } from "next/server";
import { authenticate, db } from "@/lib/email-ai";
import { gmail, resolveAccount, messageSummary } from "../_lib/gmail-inbox";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const user = await authenticate(request);
    const admin = db();
    const { account } = await resolveAccount(admin, user);
    const url = new URL(request.url);
    const q = String(url.searchParams.get("q") || "").trim();
    const pageToken = String(url.searchParams.get("pageToken") || "").trim();
    const maxResults = Math.min(Math.max(Number(url.searchParams.get("limit") || 30), 1), 50);
    const gmailApi = gmail(account);
    const list = await gmailApi.users.messages.list({ userId: "me", q: q || "-in:trash", maxResults, pageToken: pageToken || undefined, includeSpamTrash: false });
    const ids = list.data.messages || [];
    const messages = [];
    for (let i = 0; i < ids.length; i += 8) {
      const batch = ids.slice(i, i + 8);
      const rows = await Promise.all(batch.map((item) => gmailApi.users.messages.get({ userId: "me", id: item.id, format: "metadata", metadataHeaders: ["From", "To", "Subject", "Date"] })));
      messages.push(...rows.map((r) => messageSummary(r.data)));
    }
    return NextResponse.json({ success: true, messages, nextPageToken: list.data.nextPageToken || null, resultSizeEstimate: list.data.resultSizeEstimate || messages.length });
  } catch (error) {
    console.error("[Inbox] Messages error:", error);
    const status = /Unauthorized/i.test(error?.message || "") ? 401 : 500;
    return NextResponse.json({ success: false, message: error?.message || "Unable to load inbox." }, { status });
  }
}
