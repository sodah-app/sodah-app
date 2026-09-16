/**
 * ================================================================
 * 🔵 SODAH USER PLATFORM — INBOX EMAIL AI
 * ================================================================
 *
 * File:
 *   app/api/inbox-email-ai/ai-reply/route.js
 *
 * PURPOSE
 * -------
 * Real AI engine for Gmail Inbox replies.
 *
 * MODES
 * -----
 * generate
 *   Creates a new reply from the selected Gmail message.
 *
 * improve
 *   Improves the user's existing draft while preserving its meaning.
 *
 * IMPORTANT
 * ---------
 * This route intentionally does NOT import fullMessageFromGmail().
 *
 * The current Inbox Email AI library does not export that function.
 * We therefore read Gmail's full MIME message directly here.
 *
 * ================================================================
 */

import { NextResponse } from "next/server";

import {
  db,
  authenticate,
  resolveAccount,
  gmail,
} from "@/lib/inbox-email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ================================================================
 * ERROR HELPERS
 * ================================================================
 */

function errorMessage(error) {
  return String(
    error?.response?.data?.error?.message ||
      error?.response?.data?.error_description ||
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.cause?.message ||
      error?.message ||
      ""
  ).trim();
}

function errorStatus(error) {
  return Number(
    error?.response?.status ||
      error?.status ||
      error?.code ||
      error?.cause?.status ||
      0
  );
}

/*
 * ================================================================
 * TEXT HELPERS
 * ================================================================
 */

function cleanText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .trim();
}

/*
 * ================================================================
 * BASE64URL DECODER
 * ================================================================
 */

function decodeBase64Url(value) {
  if (!value) {
    return "";
  }

  try {
    const normalized =
      String(value)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

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
  } catch (error) {
    console.warn(
      "[Inbox Email AI] Failed to decode Gmail MIME data:",
      error
    );

    return "";
  }
}

/*
 * ================================================================
 * HTML ENTITY DECODER
 * ================================================================
 */

function decodeHtmlEntities(value) {
  return String(value || "")
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
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    );
}

/*
 * ================================================================
 * HTML → TEXT
 * ================================================================
 */

function htmlToText(html) {
  if (!html) {
    return "";
  }

  let value =
    String(html);

  value =
    value.replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    );

  value =
    value.replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    );

  value =
    value.replace(
      /<head[\s\S]*?<\/head>/gi,
      " "
    );

  value =
    value.replace(
      /<br\s*\/?>/gi,
      "\n"
    );

  value =
    value.replace(
      /<\/p>/gi,
      "\n\n"
    );

  value =
    value.replace(
      /<\/div>/gi,
      "\n"
    );

  value =
    value.replace(
      /<\/li>/gi,
      "\n"
    );

  value =
    value.replace(
      /<li[^>]*>/gi,
      "• "
    );

  value =
    value.replace(
      /<\/h[1-6]>/gi,
      "\n\n"
    );

  value =
    value.replace(
      /<[^>]+>/g,
      " "
    );

  value =
    decodeHtmlEntities(
      value
    );

  value =
    value.replace(
      /\r\n/g,
      "\n"
    );

  value =
    value.replace(
      /[ \t]+/g,
      " "
    );

  value =
    value.replace(
      /\n[ \t]+/g,
      "\n"
    );

  value =
    value.replace(
      /\n{3,}/g,
      "\n\n"
    );

  return cleanText(
    value
  );
}

/*
 * ================================================================
 * HEADER EXTRACTION
 * ================================================================
 */

function getHeaders(payload) {
  const headers =
    Array.isArray(
      payload?.headers
    )
      ? payload.headers
      : [];

  const result = {};

  for (
    const header of headers
  ) {
    const name =
      String(
        header?.name || ""
      )
        .trim()
        .toLowerCase();

    if (!name) {
      continue;
    }

    result[name] =
      String(
        header?.value || ""
      ).trim();
  }

  return result;
}

/*
 * ================================================================
 * MIME BODY EXTRACTION
 * ================================================================
 *
 * Gmail messages can contain:
 *
 * multipart/mixed
 * multipart/alternative
 * text/plain
 * text/html
 * images
 * PDFs
 * inline resources
 * nested MIME parts
 *
 * For AI reply generation we need the textual content.
 *
 * We recursively walk EVERY MIME part instead of assuming the
 * message has one simple body.
 * ================================================================
 */

function extractMimeText(
  payload
) {
  let plainParts = [];
  let htmlParts = [];

  function walk(part) {
    if (!part) {
      return;
    }

    const mimeType =
      String(
        part?.mimeType || ""
      )
        .trim()
        .toLowerCase();

    const data =
      part?.body?.data ||
      "";

    /*
     * ------------------------------------------------------------
     * TEXT/PLAIN
     * ------------------------------------------------------------
     */

    if (
      mimeType ===
      "text/plain"
    ) {
      const decoded =
        decodeBase64Url(
          data
        );

      if (decoded) {
        plainParts.push(
          decoded
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * TEXT/HTML
     * ------------------------------------------------------------
     */

    if (
      mimeType ===
      "text/html"
    ) {
      const decoded =
        decodeBase64Url(
          data
        );

      if (decoded) {
        htmlParts.push(
          decoded
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * NESTED MIME PARTS
     * ------------------------------------------------------------
     */

    if (
      Array.isArray(
        part?.parts
      )
    ) {
      for (
        const child
        of part.parts
      ) {
        walk(child);
      }
    }
  }

  walk(payload);

  const plain =
    cleanText(
      plainParts.join(
        "\n\n"
      )
    );

  const html =
    cleanText(
      htmlParts.join(
        "\n"
      )
    );

  /*
   * Prefer the real plain-text version.
   *
   * If Gmail only supplied HTML, convert it to text.
   */

  const text =
    plain ||
    htmlToText(
      html
    );

  return {
    plain,
    html,
    text,
  };
}

/*
 * ================================================================
 * FALLBACK MESSAGE BODY
 * ================================================================
 */

function extractMessageContent(
  gmailMessage
) {
  const payload =
    gmailMessage?.payload ||
    {};

  const headers =
    getHeaders(
      payload
    );

  const mime =
    extractMimeText(
      payload
    );

  let body =
    cleanText(
      mime.text
    );

  /*
   * Gmail snippet is only a fallback.
   *
   * We NEVER use snippet when a real MIME body exists.
   */

  if (!body) {
    body =
      cleanText(
        gmailMessage?.snippet
      );
  }

  return {
    subject:
      cleanText(
        headers.subject
      ),

    sender:
      cleanText(
        headers.from
      ),

    to:
      cleanText(
        headers.to
      ),

    cc:
      cleanText(
        headers.cc
      ),

    date:
      cleanText(
        headers.date
      ),

    body,

    html:
      mime.html,

    plain:
      mime.plain,
  };
}

/*
 * ================================================================
 * REMOVE QUOTED HISTORY
 * ================================================================
 */

function removeQuotedHistory(
  text
) {
  let value =
    cleanText(
      text
    );

  if (!value) {
    return "";
  }

  /*
   * Gmail:
   *
   * On Monday, John wrote:
   */

  value =
    value.replace(
      /\nOn .{0,300}? wrote:\s*[\s\S]*$/i,
      ""
    );

  /*
   * Original Message
   */

  value =
    value.replace(
      /\n[-_ ]*Original Message[-_ ]*[\s\S]*$/i,
      ""
    );

  /*
   * Outlook-style history.
   */

  value =
    value.replace(
      /\nFrom:\s+.{0,500}\nSent:\s+.{0,500}\nTo:\s+.{0,500}\nSubject:\s+[\s\S]*$/i,
      ""
    );

  /*
   * Quoted lines.
   */

  const lines =
    value.split(
      "\n"
    );

  const filtered =
    lines.filter(
      (line) =>
        !line
          .trim()
          .startsWith(">")
    );

  return cleanText(
    filtered.join(
      "\n"
    )
  );
}

/*
 * ================================================================
 * LIMIT INPUT SIZE
 * ================================================================
 *
 * Prevent a huge newsletter/email thread from consuming the
 * entire AI request.
 * ================================================================
 */

function limitEmailBody(
  text
) {
  const value =
    cleanText(
      text
    );

  const MAX =
    30000;

  if (
    value.length <=
    MAX
  ) {
    return value;
  }

  const first =
    value.slice(
      0,
      24000
    );

  const last =
    value.slice(
      -5000
    );

  return (
    first +
    "\n\n[EMAIL CONTENT CONTINUES]\n\n" +
    last
  );
}

/*
 * ================================================================
 * CLEAN AI OUTPUT
 * ================================================================
 */

function cleanAIReply(
  value
) {
  let reply =
    cleanText(
      value
    );

  if (!reply) {
    return "";
  }

  /*
   * Remove accidental markdown fences.
   */

  reply =
    reply.replace(
      /^```(?:text|plaintext)?\s*/i,
      ""
    );

  reply =
    reply.replace(
      /\s*```$/i,
      ""
    );

  /*
   * Remove common AI introductions.
   */

  reply =
    reply.replace(
      /^Here(?:'s| is) (?:a|the) (?:professional|improved|suggested)?\s*(?:reply|response)\s*:?\s*/i,
      ""
    );

  reply =
    reply.replace(
      /^Sure[!,]?\s*(?:here(?:'s| is)[^:]*:\s*)?/i,
      ""
    );

  return cleanText(
    reply
  );
}

/*
 * ================================================================
 * OPENAI TEXT EXTRACTION
 * ================================================================
 */

function extractAIText(
  data
) {
  if (!data) {
    return "";
  }

  /*
   * Responses API convenience field.
   */

  if (
    typeof data.output_text ===
    "string"
  ) {
    return cleanText(
      data.output_text
    );
  }

  /*
   * Responses API output array.
   */

  if (
    Array.isArray(
      data.output
    )
  ) {
    const parts =
      [];

    for (
      const item
      of data.output
    ) {
      if (
        !Array.isArray(
          item?.content
        )
      ) {
        continue;
      }

      for (
        const content
        of item.content
      ) {
        if (
          typeof content?.text ===
          "string"
        ) {
          parts.push(
            content.text
          );
        }
      }
    }

    const combined =
      cleanText(
        parts.join(
          "\n"
        )
      );

    if (combined) {
      return combined;
    }
  }

  /*
   * Compatibility fallback.
   */

  const choice =
    data?.choices?.[0]
      ?.message?.content;

  if (
    typeof choice ===
    "string"
  ) {
    return cleanText(
      choice
    );
  }

  return "";
}

/*
 * ================================================================
 * CALL OPENAI
 * ================================================================
 */

async function generateWithAI({
  mode,
  email,
  draft,
}) {
  const apiKey =
    cleanText(
      process.env.OPENAI_API_KEY
    );

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured on the server."
    );
  }

  /*
   * Use an environment variable so the deployed Sodah system
   * controls which OpenAI model is used.
   *
   * IMPORTANT:
   * We do not hard-code a fictional/nonexistent model name here.
   */

  const model =
    cleanText(
      process.env.OPENAI_INBOX_MODEL ||
        process.env.OPENAI_MODEL ||
        "gpt-5"
    );

  /*
   * ============================================================
   * GENERATE
   * ============================================================
   */

  if (
    mode ===
    "generate"
  ) {
    const receivedBody =
      limitEmailBody(
        removeQuotedHistory(
          email.body
        )
      );

    const instructions = `
You are Sodah Inbox AI.

Generate a reply to the received email.

RULES:

1. Reply naturally and professionally.
2. Understand the actual email before replying.
3. Respond to the sender's purpose or questions.
4. Preserve the appropriate tone of the original email.
5. Do not invent facts.
6. Do not invent prices, dates, promises, appointments, policies, or commitments.
7. Do not claim that an action was completed unless the email context explicitly supports it.
8. Do not mention that you are an AI.
9. Do not explain your reasoning.
10. Do not write "Subject:".
11. Do not reproduce the original email.
12. Do not reproduce quoted history.
13. Return ONLY the reply text that should be placed into the email composer.

The reply should sound like a real person responding directly to the sender.
`;

    const input = `
RECEIVED EMAIL

From:
${email.sender || "(unknown sender)"}

To:
${email.to || "(unknown recipient)"}

Cc:
${email.cc || "(none)"}

Subject:
${email.subject || "(no subject)"}

Message:
${receivedBody || "(No readable message body was found.)"}
`;

    return requestOpenAI({
      apiKey,
      model,
      instructions,
      input,
    });
  }

  /*
   * ============================================================
   * IMPROVE
   * ============================================================
   */

  if (
    mode ===
    "improve"
  ) {
    const instructions = `
You are Sodah Inbox AI.

The user has already written an email reply.

Improve the draft while preserving its original meaning,
intention, facts, names, dates, prices, and commitments.

Improve:

- grammar
- spelling
- clarity
- professionalism
- readability
- natural wording
- appropriate tone

DO NOT:

- change the meaning
- invent information
- add commitments
- add promises
- add prices
- add dates
- add facts
- change names
- remove important information
- mention AI
- explain the changes

Return ONLY the improved email reply.
`;

    const input = `
EMAIL SUBJECT:
${email.subject || "(no subject)"}

ORIGINAL SENDER:
${email.sender || "(unknown sender)"}

USER DRAFT:
${draft}
`;

    return requestOpenAI({
      apiKey,
      model,
      instructions,
      input,
    });
  }

  throw new Error(
    "Invalid AI mode. Use 'generate' or 'improve'."
  );
}

/*
 * ================================================================
 * OPENAI REQUEST
 * ================================================================
 */

async function requestOpenAI({
  apiKey,
  model,
  instructions,
  input,
}) {
  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body:
          JSON.stringify({
            model,

            instructions,

            input,

            max_output_tokens:
              1200,
          }),
      }
    );

  let data =
    null;

  try {
    data =
      await response.json();
  } catch {
    data =
      null;
  }

  if (
    !response.ok
  ) {
    const providerError =
      cleanText(
        data?.error?.message ||
          data?.message
      );

    throw new Error(
      providerError ||
        `OpenAI request failed with status ${response.status}.`
    );
  }

  const result =
    cleanAIReply(
      extractAIText(
        data
      )
    );

  if (!result) {
    throw new Error(
      "Sodah AI returned an empty reply."
    );
  }

  return result;
}

/*
 * ================================================================
 * POST — AI REPLY
 * ================================================================
 */

export async function POST(
  request
) {
  try {
    /*
     * ============================================================
     * 1. AUTHENTICATE SODAH USER
     * ============================================================
     */

    const user =
      await authenticate(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,

          code:
            "UNAUTHORIZED",

          message:
            "Your Sodah session has expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ============================================================
     * 2. READ REQUEST BODY
     * ============================================================
     */

    const requestBody =
      await request.json();

    const messageId =
      cleanText(
        requestBody?.id ||
          requestBody?.message_id ||
          requestBody?.gmail_message_id
      );

    const businessId =
      cleanText(
        requestBody?.business_id
      );

    const requestedMode =
      cleanText(
        requestBody?.mode
      ).toLowerCase();

    const draft =
      cleanText(
        requestBody?.draft ||
          requestBody?.message ||
          requestBody?.reply
      );

    /*
     * If the frontend explicitly supplies a mode, respect it.
     *
     * Otherwise:
     *
     * empty composer → generate
     * existing draft  → improve
     */

    const mode =
      requestedMode ===
      "generate"
        ? "generate"
        : requestedMode ===
            "improve"
          ? "improve"
          : draft
            ? "improve"
            : "generate";

    /*
     * ============================================================
     * 3. VALIDATE MESSAGE ID
     * ============================================================
     */

    if (!messageId) {
      return NextResponse.json(
        {
          success: false,

          code:
            "GMAIL_MESSAGE_ID_REQUIRED",

          message:
            "A valid Gmail message ID is required before using Inbox AI.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * 4. IMPROVE REQUIRES A DRAFT
     * ============================================================
     */

    if (
      mode ===
        "improve" &&
      !draft
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "DRAFT_REQUIRED",

          message:
            "Write a reply first, then use Improve with AI.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * 5. RESOLVE BUSINESS + GMAIL
     * ============================================================
     */

    const admin =
      db();

    const {
      business,
      account,
    } =
      await resolveAccount(
        admin,
        user
      );

    if (!business) {
      return NextResponse.json(
        {
          success: false,

          code:
            "BUSINESS_NOT_FOUND",

          message:
            "Unable to resolve your Sodah business.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * The authenticated account is authoritative.
     *
     * We do not use business_id from the browser to choose another
     * tenant.
     */

    if (
      businessId &&
      String(
        business?.business_id ||
          business?.id ||
          ""
      ) !==
        String(
          businessId
        )
    ) {
      console.warn(
        "[Inbox Email AI] Supplied business_id does not match authenticated business.",
        {
          supplied:
            businessId,

          resolved:
            business?.business_id ||
            business?.id ||
            null,
        }
      );
    }

    if (!account) {
      return NextResponse.json(
        {
          success: false,

          code:
            "GMAIL_NOT_CONNECTED",

          message:
            "Connect Gmail before using Inbox AI.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * 6. LOAD THE SELECTED GMAIL MESSAGE
     * ============================================================
     *
     * This is the important correction.
     *
     * We do NOT call:
     *
     *   fullMessageFromGmail()
     *
     * because that function is not exported by the current library.
     *
     * We directly use Gmail's full message API response instead.
     */

    const client =
      gmail(
        account
      );

    const gmailResponse =
      await client.users.messages.get(
        {
          userId:
            "me",

          id:
            messageId,

          format:
            "full",
        }
      );

    const gmailMessage =
      gmailResponse?.data ||
      null;

    if (!gmailMessage) {
      return NextResponse.json(
        {
          success: false,

          code:
            "GMAIL_MESSAGE_EMPTY",

          message:
            "Gmail returned an empty message.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ============================================================
     * 7. READ FULL MIME CONTENT
     * ============================================================
     */

    const email =
      extractMessageContent(
        gmailMessage
      );

    console.log(
      "[Inbox Email AI] Gmail message loaded for AI:",
      {
        message_id:
          messageId,

        mode,

        subject:
          email.subject,

        sender:
          email.sender,

        body_length:
          email.body.length,

        has_html:
          Boolean(
            email.html
          ),

        has_plain:
          Boolean(
            email.plain
          ),
      }
    );

    /*
     * ============================================================
     * 8. GENERATE / IMPROVE
     * ============================================================
     */

    const reply =
      await generateWithAI({
        mode,

        email,

        draft,
      });

    /*
     * ============================================================
     * 9. RETURN AI REPLY
     * ============================================================
     */

    return NextResponse.json(
      {
        success: true,

        mode,

        reply,

        message:
          mode ===
          "improve"
            ? "Reply improved with AI. Review it before sending."
            : "AI reply generated. Review it before sending.",

        business_id:
          business?.business_id ||
          business?.id ||
          null,

        gmail:
          account?.gmail_email ||
          account?.email ||
          account?.google_email ||
          null,

        gmail_message_id:
          messageId,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    const status =
      errorStatus(
        error
      );

    const message =
      errorMessage(
        error
      );

    const lower =
      message.toLowerCase();

    console.error(
      "[Inbox Email AI] AI reply failed:",
      {
        status,

        message,

        error,
      }
    );

    /*
     * ============================================================
     * GMAIL AUTHENTICATION
     * ============================================================
     */

    if (
      status === 401 ||
      lower.includes(
        "invalid_grant"
      ) ||
      lower.includes(
        "invalid grant"
      ) ||
      lower.includes(
        "token has been expired or revoked"
      ) ||
      lower.includes(
        "invalid authentication credentials"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "GMAIL_REAUTH_REQUIRED",

          message:
            "Your Gmail authorization has expired or was revoked. Reconnect Gmail and try again.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ============================================================
     * GMAIL PERMISSIONS
     * ============================================================
     */

    if (
      status === 403 ||
      lower.includes(
        "insufficient permission"
      ) ||
      lower.includes(
        "insufficientpermissions"
      ) ||
      lower.includes(
        "permission denied"
      ) ||
      lower.includes(
        "insufficient authentication scopes"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "GMAIL_READ_PERMISSION_REQUIRED",

          message:
            "Sodah does not have permission to read this Gmail message. Reconnect Gmail with Inbox read permission.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * ============================================================
     * GMAIL MESSAGE NOT FOUND
     * ============================================================
     */

    if (
      status === 404
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "GMAIL_MESSAGE_NOT_FOUND",

          message:
            "The selected Gmail message could not be found. Refresh the Inbox and try again.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ============================================================
     * AI NOT CONFIGURED
     * ============================================================
     */

    if (
      lower.includes(
        "openai_api_key"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "AI_NOT_CONFIGURED",

          message:
            "Sodah AI is not configured. Add OPENAI_API_KEY to the server environment and restart the application.",
        },
        {
          status: 503,
        }
      );
    }

    /*
     * ============================================================
     * OPENAI ERROR
     * ============================================================
     */

    if (
      lower.includes(
        "openai"
      ) ||
      lower.includes(
        "model"
      ) ||
      lower.includes(
        "api key"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "AI_PROVIDER_ERROR",

          message:
            message ||
            "Sodah AI could not generate the reply. Please try again.",
        },
        {
          status:
            status >= 400 &&
            status < 600
              ? status
              : 502,
        }
      );
    }

    /*
     * ============================================================
     * GENERAL ERROR
     * ============================================================
     */

    return NextResponse.json(
      {
        success: false,

        code:
          "AI_REPLY_FAILED",

        message:
          message ||
          "Unable to generate or improve the email reply.",
      },
      {
        status:
          status >= 400 &&
          status < 600
            ? status
            : 500,
      }
    );
  }
}