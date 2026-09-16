/**
 * ================================================================
 * SODAH USER PLATFORM — INBOX EMAIL AI REPLY
 * ================================================================
 *
 * File:
 *   app/api/inbox-email-ai/ai-reply/route.js
 *
 * Supports:
 *   - Reply with AI
 *   - Interested
 *   - Not Interested
 *   - Improve with AI
 *
 * The selected intent is explicit. The AI must not infer a positive
 * or negative business decision when the user has not selected one.
 *
 * RESPONSE STANDARD
 * -----------------
 * AI replies must be professional, natural, complete, and
 * business-appropriate.
 *
 * Replies should normally contain enough context to feel like a
 * real business response, rather than a one-sentence/one-line reply.
 * ================================================================
 */

import { NextResponse } from "next/server";

import {
  db,
  authenticate,
  resolveAccount,
} from "@/lib/inbox-email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================================================================
   ERROR HELPERS
   ================================================================ */

function getErrorMessage(error) {
  return String(
    error?.response?.data?.error?.message ||
      error?.response?.data?.error_description ||
      error?.message ||
      ""
  ).trim();
}

function getErrorStatus(error) {
  return Number(
    error?.response?.status ||
      error?.code ||
      0
  );
}

/* ================================================================
   TEXT HELPERS
   ================================================================ */

function clean(value, max = 30000) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

/* ================================================================
   BUSINESS CONTEXT
   ================================================================ */

function getBusinessContext(business) {
  if (!business) {
    return "";
  }

  const fields = [
    ["Business name", business.business_name],
    ["Business type", business.business_type],
    ["Description", business.description],
    ["Website", business.website],
    ["Phone", business.phone],
    ["Email", business.email],
  ];

  return fields
    .filter(([, value]) => clean(value))
    .map(
      ([label, value]) =>
        `${label}: ${clean(value, 1000)}`
    )
    .join("\n");
}

/* ================================================================
   EMAIL CONTEXT
   ================================================================ */

function buildEmailContext({
  emailBody,
  sender,
  senderEmail,
  subject,
}) {
  return [
    `From: ${
      clean(sender, 500) ||
      "Unknown sender"
    }`,

    senderEmail
      ? `Sender email: ${clean(
          senderEmail,
          500
        )}`
      : "",

    `Subject: ${
      clean(subject, 1000) ||
      "(No subject)"
    }`,

    `Email:\n${
      clean(emailBody) ||
      "(No readable email body supplied)"
    }`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ================================================================
   PROMPT BUILDER
   ================================================================ */

function buildPrompt({
  mode,
  intent,
  emailBody,
  sender,
  senderEmail,
  subject,
  draft,
  businessContext,
}) {
  const business = businessContext
    ? `
BUSINESS CONTEXT:
${businessContext}
`
    : "";

  const email = buildEmailContext({
    emailBody,
    sender,
    senderEmail,
    subject,
  });

  /* ==============================================================
     IMPROVE MANUAL DRAFT
     ============================================================== */

  if (mode === "improve") {
    return `You are Sodah Email AI, a professional business email writing assistant.

TASK:
Improve the user's manually written email reply.

The user has already decided what they want to communicate. Your job is to make the message more professional, natural, clear, polished, and complete.

RESPONSE STANDARD:
- Write like a professional business representative.
- Preserve the user's exact intended meaning.
- Keep all important information from the user's draft.
- Improve grammar, sentence structure, tone, clarity, and professionalism.
- Make the reply feel naturally written by a real person.
- The result should normally be several well-formed sentences or short paragraphs when appropriate.
- Do not make the reply unnecessarily long.
- Do not reduce a meaningful draft to a single short sentence.
- Use a courteous opening when appropriate.
- Give the recipient enough context to understand the response.
- End professionally when appropriate.

STRICT RULES:
- Do not change an acceptance into a rejection.
- Do not change a rejection into an acceptance.
- Do not invent prices.
- Do not invent dates.
- Do not invent meetings.
- Do not invent agreements.
- Do not invent contracts.
- Do not invent promises.
- Do not invent company policies.
- Do not invent attachments.
- Do not invent facts.
- Do not add commitments that the user did not make.
- Do not mention that AI improved the message.
- Do not provide an explanation of your changes.
- Return ONLY the final improved email.
- Do not use quotation marks around the response.
- Do not add headings such as "Improved Reply".

${business}

ORIGINAL EMAIL:
${email}

USER'S DRAFT:
${clean(draft, 20000)}

Write the final professional reply now.
`;
  }

  /* ==============================================================
     INTERESTED
     ============================================================== */

  if (intent === "interested") {
    return `You are Sodah Email AI, preparing a professional business email reply for a real business.

TASK:
Write a professional reply that clearly communicates that the business is interested in the sender's offer.

The business has explicitly selected the INTERESTED option.

RESPONSE STANDARD:
- Sound like a real professional business representative.
- Clearly acknowledge the sender's message or offer.
- Communicate genuine interest.
- Refer naturally to the offer or opportunity described in the incoming email.
- Invite the sender to provide the appropriate next details, information, proposal, pricing, availability, or next step when appropriate.
- If the sender already provided a clear next step, respond naturally to that next step instead of unnecessarily requesting the same information.
- Make the reply complete enough that the recipient understands the business is interested.
- Normally write approximately 3–6 well-formed sentences or 1–3 short paragraphs, depending on the email.
- Keep it professional and reasonably concise.
- Do not produce a one-line response unless the incoming email genuinely requires only a one-line response.

STRICT RULES:
- The business has explicitly selected INTERESTED.
- Do not turn the response into a rejection.
- Do not say the business has accepted terms unless the incoming email establishes that.
- Do not claim that a purchase has been made.
- Do not claim that an agreement has been signed.
- Do not invent prices.
- Do not invent dates.
- Do not invent meetings.
- Do not invent contracts.
- Do not invent quantities.
- Do not invent services.
- Do not invent commitments.
- Do not invent facts that are not present in the email or business context.
- Do not make promises on behalf of the business.
- Do not overstate the level of commitment.
- Do not mention AI.
- Return ONLY the final reply.
- No explanation.
- No headings.
- No quotation marks around the reply.

${business}

INCOMING EMAIL:
${email}

Write the final professional interested reply now.
`;
  }

  /* ==============================================================
     NOT INTERESTED
     ============================================================== */

  if (intent === "not_interested") {
    return `You are Sodah Email AI, preparing a professional business email reply for a real business.

TASK:
Write a professional and courteous reply that communicates that the business is not interested in the sender's offer.

The business has explicitly selected the NOT INTERESTED option.

RESPONSE STANDARD:
- Sound like a real professional business representative.
- Acknowledge the sender's message or offer.
- Clearly but politely communicate that the business will not proceed with the offer.
- Maintain a respectful and positive professional tone.
- If appropriate, thank the sender for reaching out or for considering the business.
- If appropriate, leave the door open for future relevant opportunities without implying current interest.
- Normally write approximately 3–5 well-formed sentences or 1–2 short paragraphs, depending on the email.
- Keep it courteous and reasonably concise.
- Do not produce a blunt one-line rejection unless the incoming email genuinely requires only that.

STRICT RULES:
- The business has explicitly selected NOT INTERESTED.
- Do not turn the response into an acceptance.
- Do not suggest that the business wants to proceed.
- Do not request unnecessary additional information.
- Do not insult or criticize the sender.
- Do not invent a reason for declining unless the incoming email provides a reason that can safely be referenced.
- Do not claim that the business already discussed or decided something that is not shown.
- Do not invent company policies.
- Do not invent future commitments.
- Do not make promises.
- Do not mention AI.
- Return ONLY the final reply.
- No explanation.
- No headings.
- No quotation marks around the reply.

${business}

INCOMING EMAIL:
${email}

Write the final professional not-interested reply now.
`;
  }

  /* ==============================================================
     NORMAL REPLY WITH AI
     ============================================================== */

  return `You are Sodah Email AI, preparing a professional business email reply for a real business.

TASK:
Write a complete, natural, professional response to the incoming email.

IMPORTANT:
No positive or negative business decision has been explicitly selected.

Therefore:
- Do not automatically assume the business is interested.
- Do not automatically assume the business is not interested.
- Understand what the sender is asking or communicating.
- Respond appropriately to the actual content of the email.
- If the sender is asking for information that is not available, politely indicate what information is needed rather than inventing an answer.
- If the sender proposes an opportunity, acknowledge it professionally without accepting or rejecting it unless the email itself clearly establishes that decision.

RESPONSE STANDARD:
- Write like a professional business representative.
- Address the actual subject of the email.
- Acknowledge important points from the sender.
- Provide a useful response based only on available information.
- Ask a relevant follow-up question when necessary.
- If the sender expects a next step, address that next step.
- Make the response feel complete rather than abruptly ending after one sentence.
- Normally write approximately 3–6 well-formed sentences or 1–3 short paragraphs, depending on the complexity of the email.
- Use a professional greeting when appropriate.
- Maintain a natural business tone.
- Keep the response reasonably concise without being overly brief.
- Do not pad the response with unnecessary information.

STRICT RULES:
- Do not invent prices.
- Do not invent dates.
- Do not invent meetings.
- Do not invent contracts.
- Do not invent agreements.
- Do not invent policies.
- Do not invent services.
- Do not invent availability.
- Do not invent facts.
- Do not make promises on behalf of the business.
- Do not claim something has been approved when it has not.
- Do not claim an action has been completed when it has not.
- Do not assume acceptance or rejection unless clearly supported.
- Do not mention AI.
- Return ONLY the final reply.
- No explanation.
- No headings.
- No quotation marks around the reply.

${business}

INCOMING EMAIL:
${email}

Write the final professional business reply now.
`;
}

/* ================================================================
   POST
   ================================================================ */

export async function POST(request) {
  try {
    const body =
      await request.json();

    /* ============================================================
       REQUEST OPTIONS
       ============================================================ */

    const mode = clean(
      body?.mode ||
        "generate",
      40
    ).toLowerCase();

    const intentValue =
      clean(
        body?.intent ||
          "",
        40
      ).toLowerCase();

    const intent =
      intentValue ===
        "interested" ||
      intentValue ===
        "not_interested"
        ? intentValue
        : null;

    /* ============================================================
       VALIDATE MODE
       ============================================================ */

    if (
      mode !== "generate" &&
      mode !== "improve"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid AI reply mode.",
        },
        {
          status: 400,
        }
      );
    }

    /* ============================================================
       VALIDATE MANUAL DRAFT
       ============================================================ */

    if (
      mode === "improve" &&
      !clean(body?.draft)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A manual draft is required for Improve with AI.",
        },
        {
          status: 400,
        }
      );
    }

    /* ============================================================
       OPENAI KEY
       ============================================================ */

    if (
      !process.env.OPENAI_API_KEY?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OPENAI_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /* ============================================================
       AUTHENTICATE
       ============================================================ */

    const user =
      await authenticate(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your session has expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    /* ============================================================
       RESOLVE BUSINESS
       ============================================================ */

    const admin = db();

    const {
      business,
    } =
      await resolveAccount(
        admin,
        user
      );

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to resolve your Sodah business.",
        },
        {
          status: 404,
        }
      );
    }

    /* ============================================================
       EMAIL BODY
       ============================================================ */

    const emailBody =
      clean(
        body?.emailBody ||
          body?.body ||
          body?.text ||
          body?.message,
        40000
      );

    if (
      !emailBody &&
      mode !== "improve"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The email body is required before generating a reply.",
        },
        {
          status: 400,
        }
      );
    }

    /* ============================================================
       BUILD PROMPT
       ============================================================ */

    const prompt =
      buildPrompt({
        mode,
        intent,
        emailBody,
        sender:
          body?.sender,
        senderEmail:
          body?.senderEmail,
        subject:
          body?.subject,
        draft:
          body?.draft,
        businessContext:
          getBusinessContext(
            business
          ),
      });

    /* ============================================================
       OPENAI MODEL
       ============================================================ */

    const model =
      process.env
        .OPENAI_EMAIL_AI_MODEL
        ?.trim() ||
      process.env
        .OPENAI_MODEL
        ?.trim() ||
      "gpt-4o-mini";

    /* ============================================================
       OPENAI REQUEST
       ============================================================ */

    const response =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
          },

          body: JSON.stringify({
            model,

            messages: [
              {
                role:
                  "system",

                content:
                  prompt,
              },
            ],

            /*
             * Slightly higher temperature allows natural,
             * human business wording while keeping responses
             * controlled and reliable.
             */
            temperature:
              0.45,

            /*
             * Increased from 700 so a professional response
             * is never cut off simply because it needs more
             * context.
             */
            max_tokens:
              1000,
          }),
        }
      );

    /* ============================================================
       OPENAI ERROR
       ============================================================ */

    if (
      !response.ok
    ) {
      const providerText =
        await response.text();

      console.error(
        "[Inbox Email AI] OpenAI request failed:",
        providerText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "AI provider request failed.",
        },
        {
          status: 502,
        }
      );
    }

    /* ============================================================
       PARSE RESPONSE
       ============================================================ */

    const data =
      await response.json();

    const reply =
      clean(
        data?.choices?.[0]
          ?.message
          ?.content,
        12000
      );

    if (!reply) {
      return NextResponse.json(
        {
          success: false,
          message:
            "AI provider returned an empty reply.",
        },
        {
          status: 502,
        }
      );
    }

    /* ============================================================
       SUCCESS
       ============================================================ */

    return NextResponse.json({
      success: true,

      reply,

      mode,

      intent,
    });
  } catch (error) {
    const status =
      getErrorStatus(
        error
      );

    const message =
      getErrorMessage(
        error
      );

    console.error(
      "[Inbox Email AI] AI reply failed:",
      {
        status,
        message,
        error,
      }
    );

    return NextResponse.json(
      {
        success: false,

        message:
          message ||
          "Unable to prepare an AI reply.",
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