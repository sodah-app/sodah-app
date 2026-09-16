/**
 * ================================================================
 * 🔵 SODAH USER PLATFORM — INBOX EMAIL AI
 * ================================================================
 *
 * File:
 *   lib/inbox-email-ai.js
 *
 * PURPOSE
 * -------
 * This is the Inbox-specific Email AI library.
 *
 * It is intentionally separate from:
 *
 *   lib/email-ai.js
 *
 * Existing Email AI remains unchanged.
 *
 * Inbox uses this file for:
 *   - Gmail inbox access
 *   - Gmail message parsing
 *   - Gmail account resolution
 *   - Inbox OAuth scopes
 *   - Gmail API client creation
 *   - Full MIME email information
 *   - Inline image / CID image detection
 *   - Attachment metadata
 *
 * IMPORTANT
 * ---------
 * Inbox uses the SAME Gmail connection already created by the
 * existing Sodah Email AI / Gmail connection when it exists in:
 *
 *   gmail_accounts
 *
 * It does NOT require the business owner to connect a second Gmail
 * account just to use Inbox.
 * ================================================================
 */

/*
 * Reuse the existing, already-tested server primitives from the
 * existing Email AI library.
 *
 * We intentionally DO NOT modify lib/email-ai.js.
 */
export {
  db,
  authenticate,
  businessIdForUser,
  googleOAuthClient,
  encryptToken,
  decryptToken,
  buildRawEmail,
} from "@/lib/email-ai";

import crypto from "crypto";
import { google } from "googleapis";

import {
  gmailClientFromTokens,
  googleOAuthClient,
} from "@/lib/email-ai";

/* ================================================================
   INBOX GOOGLE OAUTH SCOPES
   ================================================================ */

export const INBOX_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

/* ================================================================
   GMAIL HEADER HELPERS
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

export function headerMap(headers = []) {
  const map = {};

  const allowed = new Set(
    HEADER_NAMES.map((name) =>
      name.toLowerCase()
    )
  );

  for (const header of headers) {
    const key = String(
      header?.name || ""
    ).toLowerCase();

    if (!allowed.has(key)) {
      continue;
    }

    map[key] = String(
      header?.value || ""
    );
  }

  return map;
}

/* ================================================================
   BASE64 / HTML HELPERS
   ================================================================ */

function normalizeBase64Url(value) {
  return String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/\s+/g, "");
}

function decodeBase64Url(value) {
  if (!value) {
    return "";
  }

  const normalized =
    normalizeBase64Url(value);

  const padded =
    normalized +
    "=".repeat(
      (4 -
        (normalized.length % 4)) %
        4
    );

  return Buffer.from(
    padded,
    "base64"
  ).toString("utf8");
}

function decodeBase64UrlBuffer(
  value
) {
  if (!value) {
    return Buffer.alloc(0);
  }

  const normalized =
    normalizeBase64Url(value);

  const padded =
    normalized +
    "=".repeat(
      (4 -
        (normalized.length % 4)) %
        4
    );

  return Buffer.from(
    padded,
    "base64"
  );
}

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
      /<head[\s\S]*?<\/head>/gi,
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
      /<\/div>/gi,
      "\n"
    )
    .replace(
      /<\/tr>/gi,
      "\n"
    )
    .replace(
      /<\/li>/gi,
      "\n"
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
      /&#x27;/gi,
      "'"
    )
    .replace(
      /&#x2F;/gi,
      "/"
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
   MIME HEADER HELPERS
   ================================================================ */

function partHeaderMap(
  part
) {
  const map = {};

  const headers =
    Array.isArray(
      part?.headers
    )
      ? part.headers
      : [];

  for (const header of headers) {
    const name = String(
      header?.name || ""
    )
      .trim()
      .toLowerCase();

    if (!name) {
      continue;
    }

    map[name] = String(
      header?.value || ""
    ).trim();
  }

  return map;
}

function normalizeContentId(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .replace(
      /^<|>$/g,
      ""
    )
    .trim();
}

function normalizeCidReference(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .replace(
      /^cid:/i,
      ""
    )
    .replace(
      /^<|>$/g,
      ""
    )
    .trim()
    .toLowerCase();
}

function isImageMimeType(
  mimeType
) {
  return String(
    mimeType || ""
  )
    .trim()
    .toLowerCase()
    .startsWith("image/");
}

function isTextMimeType(
  mimeType
) {
  const mime =
    String(
      mimeType || ""
    )
      .trim()
      .toLowerCase();

  return (
    mime ===
      "text/plain" ||
    mime ===
      "text/html"
  );
}

/* ================================================================
   GMAIL FULL MIME BODY PARSER
   ================================================================ */

/**
 * Recursively reads the COMPLETE Gmail MIME tree.
 *
 * Gmail messages can contain structures such as:
 *
 * multipart/mixed
 *   ├── multipart/alternative
 *   │    ├── text/plain
 *   │    └── text/html
 *   │
 *   ├── image/png
 *   ├── image/jpeg
 *   ├── application/pdf
 *   └── other attachments
 *
 * Inline images can also use:
 *
 *   Content-ID: <image001>
 *
 * with HTML:
 *
 *   <img src="cid:image001">
 *
 * Gmail may store the actual binary data in:
 *
 *   body.attachmentId
 *
 * rather than:
 *
 *   body.data
 *
 * Therefore this parser preserves:
 *
 *   - text/plain
 *   - text/html
 *   - inline images
 *   - CID references
 *   - attachment IDs
 *   - filenames
 *   - MIME types
 *   - sizes
 *   - content disposition
 *   - MIME part IDs
 *   - raw part data when Gmail provides it
 *
 * IMPORTANT
 * ---------
 * This function does NOT make network requests.
 *
 * It only parses the Gmail message that was already fetched.
 *
 * Attachment-backed binary content is intentionally represented
 * by attachment metadata so the API route can fetch it separately.
 */

export function extractBody(
  payload
) {
  let plain = "";
  let html = "";

  const attachments = [];
  const inlineImages = [];
  const mimeParts = [];

  /*
   * Prevent accidental duplicate records when unusual Gmail
   * messages contain repeated MIME references.
   */
  const seenAttachmentKeys =
    new Set();

  const seenInlineKeys =
    new Set();

  function appendPlain(
    value
  ) {
    const text =
      String(value || "");

    if (!text) {
      return;
    }

    plain +=
      `${plain ? "\n\n" : ""}${text}`;
  }

  function appendHtml(
    value
  ) {
    const valueString =
      String(value || "");

    if (!valueString) {
      return;
    }

    html +=
      `${html ? "\n" : ""}${valueString}`;
  }

  function walk(
    part,
    parentPartId = ""
  ) {
    if (!part) {
      return;
    }

    const partId =
      String(
        part?.partId ||
          parentPartId ||
          ""
      ).trim();

    const filename =
      String(
        part?.filename ||
          ""
      ).trim();

    const mimeType =
      String(
        part?.mimeType ||
          ""
      )
        .trim()
        .toLowerCase();

    const body =
      part?.body ||
      {};

    const headers =
      partHeaderMap(
        part
      );

    const contentId =
      normalizeContentId(
        headers[
          "content-id"
        ]
      );

    const contentDisposition =
      String(
        headers[
          "content-disposition"
        ] || ""
      )
        .trim()
        .toLowerCase();

    const contentLocation =
      String(
        headers[
          "content-location"
        ] || ""
      ).trim();

    const transferEncoding =
      String(
        headers[
          "content-transfer-encoding"
        ] || ""
      )
        .trim()
        .toLowerCase();

    const attachmentId =
      String(
        body?.attachmentId ||
          ""
      ).trim();

    const size =
      Number(
        body?.size || 0
      );

    const hasInlineData =
      Boolean(
        body?.data
      );

    let decodedText = "";

    /*
     * --------------------------------------------------------------
     * DECODE TEXT DATA
     * --------------------------------------------------------------
     */

    if (
      hasInlineData &&
      isTextMimeType(
        mimeType
      )
    ) {
      try {
        decodedText =
          decodeBase64Url(
            body.data
          );
      } catch (error) {
        console.warn(
          "[Inbox Email AI] MIME text decode failed:",
          {
            mimeType,
            partId,
            error:
              error?.message ||
              error,
          }
        );
      }
    }

    /*
     * --------------------------------------------------------------
     * RECORD MIME PART
     * --------------------------------------------------------------
     */

    /*
     * Do not expose actual binary data here.
     *
     * Text data is safe and useful for debugging/rendering.
     * Binary content remains available through attachmentId.
     */

    mimeParts.push({
      partId:
        partId ||
        null,

      mimeType:
        part?.mimeType ||
        "application/octet-stream",

      filename:
        filename ||
        null,

      size,

      attachmentId:
        attachmentId ||
        null,

      contentId:
        contentId ||
        null,

      contentLocation:
        contentLocation ||
        null,

      contentDisposition:
        contentDisposition ||
        null,

      transferEncoding:
        transferEncoding ||
        null,

      hasData:
        hasInlineData,

      isContainer:
        Array.isArray(
          part?.parts
        ) &&
        part.parts.length > 0,
    });

    /*
     * --------------------------------------------------------------
     * PLAIN TEXT
     * --------------------------------------------------------------
     */

    if (
      mimeType ===
      "text/plain"
    ) {
      if (decodedText) {
        appendPlain(
          decodedText
        );
      }
    }

    /*
     * --------------------------------------------------------------
     * HTML
     * --------------------------------------------------------------
     */

    if (
      mimeType ===
      "text/html"
    ) {
      if (decodedText) {
        appendHtml(
          decodedText
        );
      }
    }

    /*
     * --------------------------------------------------------------
     * INLINE IMAGE
     * --------------------------------------------------------------
     *
     * We recognize an image as inline when:
     *
     *   1. It has Content-ID
     *
     * OR
     *
     *   2. Content-Disposition is inline
     *
     * AND
     *
     *   3. It is an image MIME type.
     */

    const isInlineImage =
      isImageMimeType(
        mimeType
      ) &&
      Boolean(
        contentId ||
          contentDisposition.includes(
            "inline"
          )
      );

    if (
      isInlineImage
    ) {
      const inlineKey =
        [
          contentId ||
            "",
          attachmentId ||
            "",
          partId ||
            "",
          filename ||
            "",
        ].join("|");

      if (
        !seenInlineKeys.has(
          inlineKey
        )
      ) {
        seenInlineKeys.add(
          inlineKey
        );

        inlineImages.push({
          partId:
            partId ||
            null,

          contentId:
            contentId ||
            null,

          contentIdNormalized:
            contentId
              ? normalizeCidReference(
                  contentId
                )
              : null,

          filename:
            filename ||
            "inline-image",

          mimeType:
            part?.mimeType ||
            "application/octet-stream",

          size,

          attachmentId:
            attachmentId ||
            null,

          contentLocation:
            contentLocation ||
            null,

          disposition:
            contentDisposition ||
            "inline",

          data:
            hasInlineData
              ? body.data
              : null,

          hasInlineData:
            hasInlineData,

          /*
           * These are useful to the later rendering layer.
           */
          source:
            hasInlineData
              ? "inline-data"
              : attachmentId
                ? "gmail-attachment"
                : "unknown",
        });
      }
    }

    /*
     * --------------------------------------------------------------
     * NORMAL ATTACHMENTS
     * --------------------------------------------------------------
     */

    const isExplicitAttachment =
      contentDisposition.includes(
        "attachment"
      );

    const isNamedFile =
      Boolean(
        filename
      );

    const hasAttachmentId =
      Boolean(
        attachmentId
      );

    /*
     * A normal attachment can have:
     *
     *   filename
     *   attachmentId
     *   Content-Disposition: attachment
     *
     * We do NOT add inline CID images here because they already
     * belong to inlineImages.
     */

    const shouldAddAttachment =
      !isInlineImage &&
      (
        isExplicitAttachment ||
        isNamedFile ||
        (
          hasAttachmentId &&
          !isTextMimeType(
            mimeType
          )
        )
      );

    if (
      shouldAddAttachment
    ) {
      const attachmentKey =
        [
          attachmentId ||
            "",
          partId ||
            "",
          filename ||
            "",
          mimeType ||
            "",
        ].join("|");

      if (
        !seenAttachmentKeys.has(
          attachmentKey
        )
      ) {
        seenAttachmentKeys.add(
          attachmentKey
        );

        attachments.push({
          partId:
            partId ||
            null,

          filename:
            filename ||
            "Attachment",

          mimeType:
            part?.mimeType ||
            "application/octet-stream",

          size,

          attachmentId:
            attachmentId ||
            null,

          contentId:
            contentId ||
            null,

          contentLocation:
            contentLocation ||
            null,

          disposition:
            contentDisposition ||
            "attachment",

          hasInlineData:
            hasInlineData,

          data:
            hasInlineData
              ? body.data
              : null,
        });
      }
    }

    /*
     * --------------------------------------------------------------
     * CHILD MIME PARTS
     * --------------------------------------------------------------
     */

    if (
      Array.isArray(
        part?.parts
      )
    ) {
      for (
        const child of
          part.parts
      ) {
        walk(
          child,
          partId
        );
      }
    }
  }

  /*
   * --------------------------------------------------------------
   * START MIME WALK
   * --------------------------------------------------------------
   */

  walk(payload);

  /*
   * --------------------------------------------------------------
   * FINAL TEXT FALLBACK
   * --------------------------------------------------------------
   */

  const normalizedPlain =
    String(
      plain || ""
    ).trim();

  const normalizedHtml =
    String(
      html || ""
    ).trim();

  const text =
    normalizedPlain ||
    stripHtml(
      normalizedHtml
    );

  /*
   * --------------------------------------------------------------
   * RETURN COMPLETE PARSED BODY
   * --------------------------------------------------------------
   */

  return {
    text,

    html:
      normalizedHtml,

    attachments,

    inlineImages,

    mimeParts,

    /*
     * Useful counters.
     */
    attachmentCount:
      attachments.length,

    inlineImageCount:
      inlineImages.length,

    mimePartCount:
      mimeParts.length,

    /*
     * Indicates whether an HTML representation exists.
     */
    hasHtml:
      Boolean(
        normalizedHtml
      ),

    /*
     * Indicates whether inline images were detected.
     */
    hasInlineImages:
      inlineImages.length > 0,

    /*
     * Indicates whether Gmail supplied attachment-backed
     * content that needs a second API request.
     */
    hasAttachmentBackedContent:
      attachments.some(
        (item) =>
          Boolean(
            item?.attachmentId
          )
      ) ||
      inlineImages.some(
        (item) =>
          Boolean(
            item?.attachmentId
          )
      ),
  };
}

/* ================================================================
   MESSAGE NORMALIZATION
   ================================================================ */

export function messageSummary(
  message
) {
  const headers =
    headerMap(
      message?.payload
        ?.headers || []
    );

  const body =
    extractBody(
      message?.payload || {}
    );

  const labelIds =
    Array.isArray(
      message?.labelIds
    )
      ? message.labelIds
      : [];

  return {
    id:
      message?.id ||
      null,

    threadId:
      message?.threadId ||
      null,

    from:
      headers.from ||
      "",

    to:
      headers.to ||
      "",

    cc:
      headers.cc ||
      "",

    subject:
      headers.subject ||
      "(no subject)",

    date:
      headers.date ||
      "",

    snippet:
      message?.snippet ||
      body.text.slice(
        0,
        180
      ),

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

    hasInlineImages:
      body.inlineImages
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
      message?.payload
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

    /*
     * Gmail message identifiers.
     */
    messageId:
      message?.id ||
      null,

    gmailMessageId:
      message?.id ||
      null,

    threadId:
      message?.threadId ||
      null,

    /*
     * Readable body.
     */
    body:
      body.text,

    text:
      body.text,

    /*
     * Complete HTML representation.
     *
     * The frontend should prefer this when available.
     */
    html:
      body.html,

    hasHtml:
      body.hasHtml,

    /*
     * Inline image information.
     */
    inlineImages:
      body.inlineImages,

    inlineImageCount:
      body.inlineImageCount,

    hasInlineImages:
      body.hasInlineImages,

    /*
     * MIME information.
     */
    mimeParts:
      body.mimeParts,

    mimePartCount:
      body.mimePartCount,

    /*
     * Normal attachments.
     */
    attachments:
      body.attachments,

    attachmentCount:
      body.attachmentCount,

    hasAttachmentBackedContent:
      body.hasAttachmentBackedContent,

    /*
     * Message headers.
     */
    messageIdHeader:
      headers[
        "message-id"
      ] || "",

    references:
      headers.references ||
      "",

    inReplyTo:
      headers[
        "in-reply-to"
      ] || "",
  };
}

/* ================================================================
   INBOX OAUTH STATE
   ================================================================ */

function oauthStateSecret() {
  const secret =
    process.env.INBOX_EMAIL_AI_OAUTH_STATE_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "Inbox OAuth state secret is missing. Set INBOX_EMAIL_AI_OAUTH_STATE_SECRET or GOOGLE_CLIENT_SECRET."
    );
  }

  return secret;
}

export function createOAuthState(
  payload = {}
) {
  const data = {
    ...payload,

    iat:
      Date.now(),

    nonce:
      crypto.randomBytes(
        16
      ).toString(
        "hex"
      ),
  };

  const encoded =
    Buffer
      .from(
        JSON.stringify(
          data
        ),
        "utf8"
      )
      .toString(
        "base64url"
      );

  const signature =
    crypto
      .createHmac(
        "sha256",
        oauthStateSecret()
      )
      .update(
        encoded
      )
      .digest(
        "base64url"
      );

  return `${encoded}.${signature}`;
}

export function verifyOAuthState(
  state
) {
  const [
    encoded,
    signature,
  ] =
    String(
      state || ""
    ).split(".");

  if (
    !encoded ||
    !signature
  ) {
    throw new Error(
      "Invalid Gmail OAuth state."
    );
  }

  const expected =
    crypto
      .createHmac(
        "sha256",
        oauthStateSecret()
      )
      .update(
        encoded
      )
      .digest(
        "base64url"
      );

  const expectedBuffer =
    Buffer.from(
      expected
    );

  const receivedBuffer =
    Buffer.from(
      signature
    );

  if (
    expectedBuffer.length !==
      receivedBuffer.length ||
    !crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    )
  ) {
    throw new Error(
      "Invalid Gmail OAuth state signature."
    );
  }

  let data;

  try {
    data =
      JSON.parse(
        Buffer.from(
          encoded,
          "base64url"
        ).toString(
          "utf8"
        )
      );
  } catch {
    throw new Error(
      "Invalid Gmail OAuth state payload."
    );
  }

  const issuedAt =
    Number(
      data?.iat || 0
    );

  if (
    !issuedAt ||
    Date.now() -
      issuedAt >
      10 * 60 * 1000
  ) {
    throw new Error(
      "Gmail OAuth state has expired."
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
  if (!admin) {
    throw new Error(
      "Inbox Email AI database client is missing."
    );
  }

  if (!user?.id) {
    throw new Error(
      "Unable to resolve your Sodah user."
    );
  }

  /*
   * PRIMARY:
   *
   * Current businesses schema uses user_id.
   *
   * DO NOT use owner_id.
   */
  const {
    data: byUser,
    error: byUserError,
  } = await admin
    .from(
      "businesses"
    )
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
    !byUserError &&
    byUser
  ) {
    return byUser;
  }

  if (byUserError) {
    console.error(
      "[Inbox Email AI] Business user lookup failed:",
      byUserError.message
    );
  }

  /*
   * METADATA FALLBACK
   */
  const metadataId =
    String(
      user?.user_metadata
        ?.business_id ||
        user?.app_metadata
          ?.business_id ||
        ""
    ).trim();

  if (metadataId) {
    /*
     * First try businesses.id.
     *
     * Only do this when the metadata value is a UUID.
     * This prevents BIZ-... from being sent to a UUID column.
     */
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        metadataId
      );

    if (isUuid) {
      const {
        data: byId,
        error: byIdError,
      } = await admin
        .from(
          "businesses"
        )
        .select(
          "id,business_id,user_id,business_name"
        )
        .eq(
          "id",
          metadataId
        )
        .limit(1)
        .maybeSingle();

      if (
        !byIdError &&
        byId
      ) {
        return byId;
      }

      if (byIdError) {
        console.error(
          "[Inbox Email AI] Business UUID lookup failed:",
          byIdError.message
        );
      }
    }

    /*
     * Then try the public business_id.
     *
     * This is intentionally separate from the UUID lookup.
     */
    const {
      data: byBusinessId,
      error:
        byBusinessIdError,
    } = await admin
      .from(
        "businesses"
      )
      .select(
        "id,business_id,user_id,business_name"
      )
      .eq(
        "business_id",
        metadataId
      )
      .limit(1)
      .maybeSingle();

    if (
      !byBusinessIdError &&
      byBusinessId
    ) {
      return byBusinessId;
    }

    if (byBusinessIdError) {
      console.error(
        "[Inbox Email AI] Business public ID lookup failed:",
        byBusinessIdError.message
      );
    }
  }

  throw new Error(
    "Unable to resolve your Sodah business."
  );
}

/* ================================================================
   GMAIL ACCOUNT NORMALIZER
   ================================================================ */

function normalizeGmailAccount(
  account
) {
  if (!account) {
    return null;
  }

  return {
    ...account,

    _source:
      "gmail_accounts",

    _tokenAccess:
      account.access_token ||
      account.google_access_token ||
      account.token ||
      null,

    _tokenRefresh:
      account.refresh_token ||
      account.google_refresh_token ||
      null,

    _tokenExpiry:
      account.expiry_date ||
      account.expires_at ||
      account.token_expires_at ||
      null,
  };
}

/* ================================================================
   EXISTING GMAIL ACCOUNT RESOLUTION
   ================================================================ */

/*
 * THIS IS THE IMPORTANT FIX.
 *
 * Inbox uses the SAME Gmail account already connected to Email AI.
 *
 * Resolution order:
 *
 * 1. gmail_accounts.user_id
 * 2. gmail_accounts.gmail_email using the authenticated user's
 *    own email
 * 3. legacy sodah_email_accounts using ONLY a real UUID
 *
 * We NEVER send:
 *
 *   BIZ-1788298699579
 *
 * into a UUID column.
 */

export async function getAccount(
  admin,
  business,
  authenticatedUser = null
) {
  if (!admin) {
    throw new Error(
      "Inbox Email AI database client is missing."
    );
  }

  /*
   * ============================================================
   * AUTHENTICATED USER
   * ============================================================
   */

  const userId =
    String(
      authenticatedUser?.id ||
        ""
    ).trim();

  const userEmail =
    String(
      authenticatedUser?.email ||
        ""
    )
      .trim()
      .toLowerCase();

  /*
   * ============================================================
   * 1. gmail_accounts BY AUTHENTICATED USER ID
   * ============================================================
   */

  if (userId) {
    const {
      data,
      error,
    } = await admin
      .from(
        "gmail_accounts"
      )
      .select("*")
      .eq(
        "user_id",
        userId
      )
      .limit(1);

    console.log(
      "[Inbox Email AI] Gmail account lookup by user_id:",
      {
        user_id:
          userId,

        found:
          Array.isArray(data)
            ? data.length
            : 0,

        error:
          error?.message ||
          null,
      }
    );

    if (
      !error &&
      Array.isArray(data) &&
      data.length > 0
    ) {
      return normalizeGmailAccount(
        data[0]
      );
    }

    if (error) {
      console.error(
        "[Inbox Email AI] gmail_accounts user_id lookup failed:",
        {
          user_id:
            userId,

          error:
            error.message,
        }
      );
    }
  }

  /*
   * ============================================================
   * 2. gmail_accounts BY AUTHENTICATED GMAIL EMAIL
   * ============================================================
   *
   * This is the recovery path for an existing Gmail connection
   * whose gmail_accounts row does not have the current Supabase
   * user_id populated.
   *
   * We use authenticatedUser.email.
   *
   * We do NOT accept an email address from the browser.
   */

  if (userEmail) {
    /*
     * First try the most likely column.
     */
    const {
      data,
      error,
    } = await admin
      .from(
        "gmail_accounts"
      )
      .select("*")
      .eq(
        "gmail_email",
        userEmail
      )
      .limit(1);

    console.log(
      "[Inbox Email AI] Gmail account lookup by authenticated email:",
      {
        email:
          userEmail,

        found:
          Array.isArray(data)
            ? data.length
            : 0,

        error:
          error?.message ||
          null,
      }
    );

    if (
      !error &&
      Array.isArray(data) &&
      data.length > 0
    ) {
      const account =
        normalizeGmailAccount(
          data[0]
        );

      console.log(
        "[Inbox Email AI] Existing Gmail connection resolved by authenticated email:",
        {
          email:
            userEmail,

          account_id:
            account?.id ||
            null,
        }
      );

      return account;
    }

    /*
     * Some older records may use email instead of gmail_email.
     *
     * Only try this if the first query did not find anything.
     */
    if (!data?.length) {
      const {
        data:
          byEmail,
        error:
          byEmailError,
      } = await admin
        .from(
          "gmail_accounts"
        )
        .select("*")
        .eq(
          "email",
          userEmail
        )
        .limit(1);

      console.log(
        "[Inbox Email AI] Gmail account lookup by email:",
        {
          email:
            userEmail,

          found:
            Array.isArray(
              byEmail
            )
              ? byEmail.length
              : 0,

          error:
            byEmailError?.message ||
            null,
        }
      );

      if (
        !byEmailError &&
        Array.isArray(
          byEmail
        ) &&
        byEmail.length > 0
      ) {
        const account =
          normalizeGmailAccount(
            byEmail[0]
          );

        console.log(
          "[Inbox Email AI] Existing Gmail connection resolved by email:",
          {
            email:
              userEmail,

            account_id:
              account?.id ||
              null,
          }
        );

        return account;
      }
    }

    if (error) {
      console.error(
        "[Inbox Email AI] gmail_email lookup failed:",
        {
          email:
            userEmail,

          error:
            error.message,
        }
      );
    }
  }

  /*
   * ============================================================
   * 3. LEGACY sodah_email_accounts
   * ============================================================
   *
   * IMPORTANT:
   *
   * business.business_id can be:
   *
   *   BIZ-1788298699579
   *
   * That is NOT a UUID.
   *
   * We therefore ONLY query the legacy table with business.id
   * when business.id is a valid UUID.
   */

  const databaseBusinessId =
    String(
      business?.id ||
        ""
    ).trim();

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      databaseBusinessId
    );

  if (isUuid) {
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
        databaseBusinessId
      )
      .limit(1);

    console.log(
      "[Inbox Email AI] Legacy Gmail account lookup:",
      {
        business_uuid:
          databaseBusinessId,

        found:
          Array.isArray(data)
            ? data.length
            : 0,

        error:
          error?.message ||
          null,
      }
    );

    if (
      !error &&
      Array.isArray(data) &&
      data.length > 0
    ) {
      const account =
        data[0];

      return {
        ...account,

        _source:
          "sodah_email_accounts",

        _tokenAccess:
          account.access_token_encrypted ||
          null,

        _tokenRefresh:
          account.refresh_token_encrypted ||
          null,

        _tokenExpiry:
          account.token_expires_at ||
          null,
      };
    }

    if (error) {
      console.error(
        "[Inbox Email AI] Legacy Gmail lookup failed:",
        {
          business_uuid:
            databaseBusinessId,

          error:
            error.message,
        }
      );
    }
  } else {
    console.log(
      "[Inbox Email AI] Skipping legacy lookup because business.id is not a UUID:",
      {
        business_id:
          business?.business_id ||
          databaseBusinessId ||
          null,
      }
    );
  }

  /*
   * ============================================================
   * NOTHING FOUND
   * ============================================================
   */

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
  /*
   * ============================================================
   * EXISTING gmail_accounts CONNECTION
   * ============================================================
   */

  if (
    account?._source ===
    "gmail_accounts"
  ) {
    const accessToken =
      account?._tokenAccess ||
      null;

    const refreshToken =
      account?._tokenRefresh ||
      null;

    if (
      accessToken ||
      refreshToken
    ) {
      const oauth2 =
        googleOAuthClient();

      oauth2.setCredentials({
        access_token:
          accessToken ||
          undefined,

        refresh_token:
          refreshToken ||
          undefined,

        expiry_date:
          account?._tokenExpiry
            ? new Date(
                account._tokenExpiry
              ).getTime()
            : undefined,
      });

      return google.gmail({
        version:
          "v1",

        auth:
          oauth2,
      });
    }

    throw new Error(
      "Your Gmail connection was found, but its Google authorization token is missing. Please reconnect Gmail."
    );
  }

  /*
   * ============================================================
   * LEGACY SODAH EMAIL ACCOUNT
   * ============================================================
   */

  return gmailClientFromTokens(
    account
  );
}

/* ================================================================
   RESOLVE ACCOUNT
   ================================================================ */

export async function resolveAccount(
  admin,
  user
) {
  /*
   * Resolve the authenticated user's Sodah business.
   */
  const business =
    await businessRecordForUser(
      admin,
      user
    );

  /*
   * Resolve the SAME Gmail connection used by Email AI.
   *
   * The authenticated user is passed explicitly.
   */
  const account =
    await getAccount(
      admin,
      business,
      user
    );

  return {
    business,
    account,
  };
}