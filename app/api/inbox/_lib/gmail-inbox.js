import { gmailClientFromTokens } from "@/lib/email-ai";

const HEADER_NAMES = ["From", "To", "Cc", "Bcc", "Subject", "Date", "Message-ID", "References", "In-Reply-To"];

export function headerMap(headers = []) {
  const map = {};
  for (const h of headers) {
    const key = String(h?.name || "").toLowerCase();
    if (HEADER_NAMES.map((x) => x.toLowerCase()).includes(key)) map[key] = h?.value || "";
  }
  return map;
}

function decodeBase64Url(value) {
  if (!value) return "";
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function extractBody(payload) {
  let plain = "";
  let html = "";
  const attachments = [];

  function walk(part) {
    if (!part) return;
    const filename = String(part.filename || "");
    const body = part.body || {};
    const data = body.data ? decodeBase64Url(body.data) : "";
    const mime = String(part.mimeType || "").toLowerCase();

    if (filename || body.attachmentId) {
      attachments.push({
        filename: filename || "Attachment",
        mimeType: part.mimeType || "application/octet-stream",
        size: Number(body.size || 0),
        attachmentId: body.attachmentId || null,
      });
    }

    if (data) {
      if (mime === "text/plain") plain += `${plain ? "\n\n" : ""}${data}`;
      if (mime === "text/html") html += `${html ? "\n" : ""}${data}`;
    }

    for (const child of part.parts || []) walk(child);
  }

  walk(payload);
  const text = plain.trim() || stripHtml(html);
  return { text, html, attachments };
}

export function messageSummary(message) {
  const headers = headerMap(message?.payload?.headers || []);
  const body = extractBody(message?.payload || {});
  const labelIds = message?.labelIds || [];
  return {
    id: message.id,
    threadId: message.threadId,
    from: headers.from || "",
    to: headers.to || "",
    subject: headers.subject || "(no subject)",
    date: headers.date || "",
    snippet: message.snippet || body.text.slice(0, 180),
    unread: labelIds.includes("UNREAD"),
    starred: labelIds.includes("STARRED"),
    important: labelIds.includes("IMPORTANT"),
    hasAttachment: body.attachments.length > 0,
    labels: labelIds,
    internalDate: message.internalDate || null,
  };
}

export function fullMessage(message) {
  const headers = headerMap(message?.payload?.headers || []);
  const body = extractBody(message?.payload || {});
  return {
    ...messageSummary(message),
    body: body.text,
    html: body.html,
    attachments: body.attachments,
    messageIdHeader: headers["message-id"] || "",
    references: headers.references || "",
    inReplyTo: headers["in-reply-to"] || "",
  };
}

export async function getAccount(admin, businessId) {
  const { data, error } = await admin.from("sodah_email_accounts").select("*").eq("business_id", businessId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Connect Gmail before using Inbox.");
  return data;
}

export function gmail(account) {
  return gmailClientFromTokens(account);
}

export async function resolveAccount(admin, user) {
  const { data: business, error: businessError } = await admin.from("businesses").select("id,business_id,user_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (businessError) throw businessError;
  if (!business) throw new Error("Unable to resolve your Sodah business.");
  const account = await getAccount(admin, business.id);
  return { business, account };
}
