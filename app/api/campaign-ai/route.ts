import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const {
      businessContext,
      campaignObjective,
      tone,
      previousMessage,
    } = body;

    if (!campaignObjective?.trim()) {
      return NextResponse.json(
        {
          error:
            "A campaign objective is required.",
        },
        { status: 400 }
      );
    }

    const prompt = `
You are Sodah's WhatsApp campaign writer.

Write the EXACT WhatsApp message that should be sent to the customer.

Business/context:
${businessContext || "Not provided"}

Campaign objective:
${campaignObjective}

Tone:
${tone || "Friendly"}

Previous generated message:
${previousMessage || "None"}

Rules:

1. Return ONLY the final WhatsApp message.
2. Do NOT return explanations.
3. Do NOT return headings.
4. Do NOT return "here is your message".
5. Do NOT describe what the message should say.
6. Write the actual message that the customer will receive.
7. Keep it natural and appropriate for WhatsApp.
8. Do not invent discounts, prices, products, dates, guarantees,
   or offers that were not provided.
9. If the previous message exists, improve it rather than simply
   repeating it.
10. Preserve important business information supplied by the user.
`;

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You write concise, natural WhatsApp campaign messages.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

    const message =
      completion.choices[0]?.message?.content?.trim();

    if (!message) {
      return NextResponse.json(
        {
          error:
            "The AI returned an empty message.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message,
    });
  } catch (error: any) {
    console.error(
      "CAMPAIGN AI ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to generate the campaign message.",
      },
      { status: 500 }
    );
  }
}