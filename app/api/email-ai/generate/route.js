import { NextResponse } from "next/server";
import { authenticate } from "@/lib/email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const templates = {
  promotion: "Create a professional promotional email announcing an offer, product, service, or special deal. Make it persuasive but not spammy.",
  followup: "Create a concise professional follow-up email for someone who has not responded to a previous conversation.",
  appointment: "Create a professional appointment reminder or booking invitation. Make the next step very clear.",
  introduction: "Create a warm professional introduction email for a business reaching out to a potential customer.",
  announcement: "Create a clear business announcement email that explains what is changing or what is new.",
  thankyou: "Create a professional thank-you email that feels personal and genuine.",
};

export async function POST(request) {
  try {
    await authenticate(request);

    const body = await request.json();
    const templateKey = String(body.templateKey || "").trim();
    const instruction = String(body.instruction || "").trim();
    const businessName = String(body.businessName || "the business").trim();

    if (!instruction && !templates[templateKey]) {
      return NextResponse.json(
        { success: false, message: "Choose a template or enter what you want the email to say." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const template = templates[templateKey] || "";
    const prompt = `
You are Sodah Email AI.

Create one ready-to-send business email.

Business:
${businessName}

Template:
${template || "No template. Follow the user's instruction."}

User instruction:
${instruction || "Use the selected template and create a strong general-purpose email."}

Return ONLY valid JSON:
{
  "subject": "short email subject",
  "body": "plain text email body"
}

Rules:
- Professional and natural.
- No fake claims.
- No excessive emojis.
- No spammy language.
- Do not include markdown.
- Keep it concise unless the user asks for detail.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "You generate polished business email copy.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message || "AI email generation failed."
      );
    }

    const content = data?.choices?.[0]?.message?.content || "";
    let generated;

    try {
      generated = JSON.parse(content);
    } catch {
      const cleaned = content
        .replace(/^```json\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      generated = JSON.parse(cleaned);
    }

    if (!generated?.subject || !generated?.body) {
      throw new Error("AI returned an incomplete email.");
    }

    return NextResponse.json({
      success: true,
      subject: String(generated.subject).trim(),
      body: String(generated.body).trim(),
      templateKey: templateKey || "custom",
    });
  } catch (error) {
    console.error("[Email AI] Generate:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Unable to generate email." },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}
