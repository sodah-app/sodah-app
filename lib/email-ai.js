import crypto from "crypto";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI?.trim();
const ENCRYPTION_KEY = process.env.EMAIL_TOKEN_ENCRYPTION_KEY?.trim();

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function db() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function encryptionKey() {
  if (!ENCRYPTION_KEY) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is missing.");
  }

  const key = Buffer.from(ENCRYPTION_KEY, "base64");

  if (key.length !== 32) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  }

  return key;
}

export function encryptToken(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptToken(value) {
  const [iv, tag, encrypted] = String(value || "").split(".");

  if (!iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted Gmail token.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64url")
  );

  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function authenticate(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();

  if (!token) throw new Error("Unauthorized.");

  const client = db();
  const { data, error } = await client.auth.getUser(token);

  if (error || !data?.user) {
    throw new Error("Unauthorized.");
  }

  return data.user;
}

export async function businessIdForUser(client, user) {
  for (const column of ["user_id", "owner_id"]) {
    const { data, error } = await client
      .from("businesses")
      .select("id,business_id")
      .eq(column, user.id)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return data.id || data.business_id;
    }
  }

  const metadataId =
    user?.user_metadata?.business_id ||
    user?.app_metadata?.business_id;

  if (metadataId) return metadataId;

  throw new Error("Unable to resolve your Sodah business.");
}

export function googleOAuthClient() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth environment variables are missing.");
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function gmailClientFromTokens(account) {
  const oauth2 = googleOAuthClient();

  oauth2.setCredentials({
    access_token: account.access_token_encrypted
      ? decryptToken(account.access_token_encrypted)
      : undefined,
    refresh_token: decryptToken(account.refresh_token_encrypted),
    expiry_date: account.token_expires_at
      ? new Date(account.token_expires_at).getTime()
      : undefined,
  });

  return google.gmail({ version: "v1", auth: oauth2 });
}

export function encodeBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function buildRawEmail({ from, to, subject, body }) {
  const safeSubject = String(subject || "").replace(/[\r\n]+/g, " ").trim();
  const safeFrom = String(from || "").replace(/[\r\n]+/g, " ").trim();
  const safeTo = String(to || "").replace(/[\r\n]+/g, " ").trim();

  const raw = [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    String(body || "").replace(/\r\n/g, "\n"),
  ].join("\r\n");

  return encodeBase64Url(raw);
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || "").trim()
  );
}
