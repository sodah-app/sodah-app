/**
 * ================================================================
 * 🔵 SODAH USER PLATFORM — INBOX EMAIL AI
 * ================================================================
 *
 * File:
 *   lib/inbox-email-ai.js
 *
 * IMPORTANT
 * ---------
 * This file is ONLY for Inbox Email AI.
 *
 * Existing Email AI remains in:
 *   lib/email-ai.js
 *
 * Inbox uses the existing Gmail connection and does not create
 * another Email AI system.
 * ================================================================
 */

import crypto from "crypto";
import { google } from "googleapis";

import {
  gmailClientFromTokens,
} from "@/lib/email-ai";

/* ================================================================
   DATABASE / AUTH HELPERS
   ================================================================ */

export {
  db,
  authenticate,
  businessIdForUser,
  googleOAuthClient,
  encryptToken,
  decryptToken,
  buildRawEmail,
} from "@/lib/email-ai";

/* ================================================================
   INBOX GOOGLE SCOPES
   ================================================================ */

export const INBOX_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

/* ================================================================
   HEADER NAMES
   ================================================================ */

const HEADER_NAMES = [
  "From",
  "To",
  "Cc",
  "Bcc",
  "Subject",
  "Date",
  "Message-ID",
  "References",
  "In-Reply-To",
];

/* ================================================================
   HEADER MAP
   ================================================================ */

export function headerMap(headers = []) {
  const map = {};

  for (const h of headers) {
    const key = String(
      h?.name || ""
    ).toLowerCase();

    if (
      HEADER_NAMES
        .map((x) => x.toLowerCase())
        .includes(key)
    ) {
      map[key] = h?.value || "";
    }
  }

  return map;
}

/* ================================================================
   BASE64URL DECODER
   ================================================================ */

function decodeBase64Url(value) {
  if (!value) return "";

  const normalized = String(value)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat(
      (4 - (normalized.length % 4)) % 4
    );

  return Buffer.from(
    padded,
    "base64"
  ).toString("utf8");
}

/* ================================================================
   HTML → TEXT
   ================================================================ */

function stripHtml(html) {
  return String(html || "")
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<br\s*\/?>/gi,
      "\n"
    )
    .replace(
      /<\/p>/gi,
      "\n\n"
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&#39;/gi,
      "'"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /\r/g,
      ""
    )
    .replace(
      /[ \t]+\n/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .replace(
      /[ \t]{2,}/g,
      " "
    )
    .trim();
}

/* ================================================================
   EMAIL BODY EXTRACTION
   ================================================================ */

export function extractBody(payload) {
  let plain = "";
  let html = "";

  const attachments = [];

  function walk(part) {
    if (!part) return;

    const filename =
      String(part.filename || "");

    const body =
      part.body || {};

    const data =
      body.data
        ? decodeBase64Url(body.data)
        : "";

    const mime =
      String(
        part.mimeType || ""
      ).toLowerCase();

    if (
      filename ||
      body.attachmentId
    ) {
      attachments.push({
        filename:
          filename || "Attachment",

        mimeType:
          part.mimeType ||
          "application/octet-stream",

        size:
          Number(
            body.size || 0
          ),

        attachmentId:
          body.attachmentId ||
          null,
      });
    }

    if (data) {
      if (
        mime === "text/plain"
      ) {
        plain +=
          `${
            plain
              ? "\n\n"
              : ""
          }${data}`;
      }

      if (
        mime === "text/html"
      ) {
        html +=
          `${
            html
              ? "\n"
              : ""
          }${data}`;
      }
    }

    for (
      const child
      of part.parts || []
    ) {
      walk(child);
    }
  }

  walk(payload);

  const text =
    plain.trim() ||
    stripHtml(html);

  return {
    text,
    html,
    attachments,
  };
}

/* ================================================================
   MESSAGE SUMMARY
   ================================================================ */

export function messageSummary(
  message
) {
  const headers =
    headerMap(
      message
        ?.payload
        ?.headers || []
    );

  const body =
    extractBody(
      message?.payload || {}
    );

  const labelIds =
    message?.labelIds || [];

  return {
    id:
      message?.id || null,

    threadId:
      message?.threadId || null,

    from:
      headers.from || "",

    to:
      headers.to || "",

    subject:
      headers.subject ||
      "(no subject)",

    date:
      headers.date || "",

    snippet:
      message?.snippet ||
      body.text.slice(0, 180),

    unread:
      labelIds.includes(
        "UNREAD"
      ),

    starred:
      labelIds.includes(
        "STARRED"
      ),

    important:
      labelIds.includes(
        "IMPORTANT"
      ),

    hasAttachment:
      body.attachments
        .length > 0,

    labels:
      labelIds,

    internalDate:
      message?.internalDate ||
      null,
  };
}

/* ================================================================
   FULL MESSAGE
   ================================================================ */

export function fullMessage(
  message
) {
  const headers =
    headerMap(
      message
        ?.payload
        ?.headers || []
    );

  const body =
    extractBody(
      message?.payload || {}
    );

  return {
    ...messageSummary(
      message
    ),

    body:
      body.text,

    html:
      body.html,

    attachments:
      body.attachments,

    messageIdHeader:
      headers["message-id"] ||
      "",

    references:
      headers.references ||
      "",

    inReplyTo:
      headers["in-reply-to"] ||
      "",
  };
}

/* ================================================================
   UUID CHECK
   ================================================================ */

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

/* ================================================================
   EMAIL NORMALIZER
   ================================================================ */

function normalizeEmail(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

/* ================================================================
   OAUTH STATE SECRET
   ================================================================ */

function oauthStateSecret() {
  const secret =
    process.env.INBOX_OAUTH_STATE_SECRET ||
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!secret) {
    throw new Error(
      "Inbox OAuth state secret is not configured."
    );
  }

  return secret;
}

/* ================================================================
   CREATE INBOX OAUTH STATE
   ================================================================ */

export function createOAuthState(
  payload
) {
  const data = {
    userId:
      payload?.userId || null,

    businessId:
      payload?.businessId || null,

    businessPublicId:
      payload?.businessPublicId ||
      null,

    createdAt:
      Date.now(),
  };

  const encoded =
    Buffer.from(
      JSON.stringify(data),
      "utf8"
    ).toString(
      "base64url"
    );

  const signature =
    crypto
      .createHmac(
        "sha256",
        oauthStateSecret()
      )
      .update(encoded)
      .digest("base64url");

  return `${encoded}.${signature}`;
}

/* ================================================================
   VERIFY INBOX OAUTH STATE
   ================================================================ */

export function verifyOAuthState(
  state
) {
  if (
    !state ||
    typeof state !== "string"
  ) {
    throw new Error(
      "Invalid OAuth state."
    );
  }

  const parts =
    state.split(".");

  if (parts.length !== 2) {
    throw new Error(
      "Invalid OAuth state."
    );
  }

  const [
    encoded,
    providedSignature,
  ] = parts;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        oauthStateSecret()
      )
      .update(encoded)
      .digest("base64url");

  const providedBuffer =
    Buffer.from(
      providedSignature
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature
    );

  if (
    providedBuffer.length !==
    expectedBuffer.length ||
    !crypto.timingSafeEqual(
      providedBuffer,
      expectedBuffer
    )
  ) {
    throw new Error(
      "Invalid OAuth state signature."
    );
  }

  let data;

  try {
    data =
      JSON.parse(
        Buffer.from(
          encoded,
          "base64url"
        ).toString("utf8")
      );
  } catch {
    throw new Error(
      "Invalid OAuth state payload."
    );
  }

  /*
   * OAuth state is intentionally short-lived.
   */
  const maxAge =
    15 * 60 * 1000;

  if (
    !data?.createdAt ||
    Date.now() -
      Number(data.createdAt) >
      maxAge
  ) {
    throw new Error(
      "OAuth state has expired."
    );
  }

  if (!data?.userId) {
    throw new Error(
      "OAuth state has no user."
    );
  }

  return data;
}

/* ================================================================
   BUSINESS RESOLUTION
   ================================================================ */

export async function businessRecordForUser(
  admin,
  user
) {
  if (!user?.id) {
    throw new Error(
      "Unable to resolve your Sodah business."
    );
  }

  /*
   * Primary lookup:
   * businesses.user_id
   *
   * IMPORTANT:
   * Do NOT use owner_id.
   */
  const {
    data,
    error,
  } = await admin
    .from("businesses")
    .select(
      "id,business_id,user_id,business_name"
    )
    .eq(
      "user_id",
      user.id
    )
    .limit(1)
    .maybeSingle();

  if (
    !error &&
    data
  ) {
    return data;
  }

  if (error) {
    console.error(
      "[Inbox Email AI] Business lookup failed:",
      error
    );
  }

  /*
   * Fallback:
   * If the authenticated user's metadata contains a business_id,
   * resolve that public business ID.
   */
  const metadata =
    user?.user_metadata ||
    {};

  const metadataBusinessId =
    metadata.business_id ||
    metadata.businessId ||
    null;

  if (
    metadataBusinessId
  ) {
    const {
      data: metadataBusiness,
      error:
        metadataError,
    } = await admin
      .from("businesses")
      .select(
        "id,business_id,user_id,business_name"
      )
      .eq(
        "business_id",
        metadataBusinessId
      )
      .limit(1)
      .maybeSingle();

    if (
      metadataError
    ) {
      console.error(
        "[Inbox Email AI] Business metadata lookup failed:",
        metadataError
      );
    } else if (
      metadataBusiness
    ) {
      /*
       * If the row already has an owner,
       * make sure it is the current user.
       */
      if (
        metadataBusiness.user_id &&
        String(
          metadataBusiness.user_id
        ) !==
          String(user.id)
      ) {
        throw new Error(
          "This business does not belong to the authenticated user."
        );
      }

      return metadataBusiness;
    }
  }

  throw new Error(
    "Unable to resolve your Sodah business."
  );
}

/* ================================================================
   GMAIL ACCOUNT RESOLUTION
   ================================================================ */

export async function getAccount(
  admin,
  business,
  authenticatedUser = null
) {
  /*
   * --------------------------------------------------------------
   * 1. FIRST: current authenticated user's gmail_accounts row
   * --------------------------------------------------------------
   */
  if (
    authenticatedUser?.id
  ) {
    const {
      data,
      error,
    } = await admin
      .from("gmail_accounts")
      .select("*")
      .eq(
        "user_id",
        authenticatedUser.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "[Inbox Email AI] Gmail account lookup by user_id failed:",
        error
      );
    } else {
      console.log(
        "[Inbox Email AI] Gmail account lookup by user_id:",
        {
          user_id:
            authenticatedUser.id,

          found:
            data ? 1 : 0,

          error: null,
        }
      );

      if (data) {
        return data;
      }
    }
  }

  /*
   * --------------------------------------------------------------
   * 2. SECOND: authenticated user's email
   *
   * This handles an existing Email AI connection where the
   * gmail_accounts row was saved against the Gmail address but
   * not against the current Sodah user ID.
   * --------------------------------------------------------------
   */
  const authenticatedEmail =
    normalizeEmail(
      authenticatedUser?.email
    );

  if (
    authenticatedEmail
  ) {
    const {
      data,
      error,
    } = await admin
      .from("gmail_accounts")
      .select("*")
      .eq(
        "gmail_email",
        authenticatedEmail
      )
      .limit(1)
      .maybeSingle();

    console.log(
      "[Inbox Email AI] Gmail account lookup by authenticated email:",
      {
        email:
          authenticatedEmail,

        found:
          data ? 1 : 0,

        error:
          error || null,
      }
    );

    if (
      !error &&
      data
    ) {
      /*
       * Never take another user's Gmail connection.
       */
      if (
        data.user_id &&
        authenticatedUser?.id &&
        String(
          data.user_id
        ) !==
          String(
            authenticatedUser.id
          )
      ) {
        throw new Error(
          "This Gmail account is already connected to another Sodah account."
        );
      }

      console.log(
        "[Inbox Email AI] Existing Gmail connection resolved by authenticated email:",
        {
          email:
            data.gmail_email,

          account_id:
            data.id,
        }
      );

      return data;
    }
  }

  /*
   * --------------------------------------------------------------
   * 3. LEGACY sodah_email_accounts fallback
   * --------------------------------------------------------------
   *
   * Only use this when business.id is a real UUID.
   *
   * Public IDs such as:
   *   BIZ-1788298699579
   *
   * must NOT be passed into a UUID business_id column.
   * --------------------------------------------------------------
   */
  if (
    isUuid(
      business?.id
    )
  ) {
    const {
      data,
      error,
    } = await admin
      .from(
        "sodah_email_accounts"
      )
      .select("*")
      .eq(
        "business_id",
        business.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "[Inbox Email AI] Legacy Gmail account lookup failed:",
        error
      );
    } else if (data) {
      console.log(
        "[Inbox Email AI] Legacy Gmail account resolved:",
        {
          business_id:
            business.id,

          gmail:
            data.gmail_email ||
            data.email ||
            null,
        }
      );

      return data;
    }
  } else {
    console.log(
      "[Inbox Email AI] Skipping legacy lookup because business.id is not a UUID:",
      business?.id || null
    );
  }

  throw new Error(
    "Connect Gmail before using Inbox. The Inbox uses the same Gmail account connected to Email AI."
  );
}

/* ================================================================
   GMAIL CLIENT
   ================================================================ */

export function gmail(
  account
) {
  if (!account) {
    throw new Error(
      "Gmail account is not connected."
    );
  }

  return gmailClientFromTokens(
    account
  );
}

/* ================================================================
   RESOLVE BUSINESS + ACCOUNT
   ================================================================ */

export async function resolveAccount(
  admin,
  user
) {
  const business =
    await businessRecordForUser(
      admin,
      user
    );

  if (!business) {
    throw new Error(
      "Unable to resolve your Sodah business."
    );
  }

  const account =
    await getAccount(
      admin,
      business,
      user
    );

  console.log(
    "[Inbox Email AI] Account resolved:",
    {
      business_id:
        business.business_id ||
        business.id ||
        null,

      business_name:
        business.business_name ||
        null,

      gmail:
        account?.gmail_email ||
        account?.email ||
        account?.google_email ||
        null,

      source:
        account?.gmail_email
          ? "gmail_accounts"
          : "legacy",

      has_access_token:
        Boolean(
          account?.access_token
        ),

      has_refresh_token:
        Boolean(
          account?.refresh_token
        ),
    }
  );

  return {
    business,
    account,
  };
}