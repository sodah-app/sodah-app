import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RequestBody = {
  businessName?: string;
  prompt?: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY is not configured on the server.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as RequestBody;

    const businessName = body.businessName?.trim();
    const prompt = body.prompt?.trim();

    if (!businessName) {
      return NextResponse.json(
        {
          error: "Business name is required.",
        },
        { status: 400 },
      );
    }

    if (!prompt) {
      return NextResponse.json(
        {
          error: "Prompt is required.",
        },
        { status: 400 },
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5.5",
      instructions: `
You create WhatsApp marketing messages for businesses.

Business:
${businessName}

Write a concise, warm, useful WhatsApp campaign message.

Requirements:
- Sound natural and human.
- Do not claim facts that were not provided.
- Do not invent discounts, prices, dates, products, or guarantees.
- Keep the message suitable for WhatsApp.
- Avoid excessive emojis.
- Include a clear reason for the customer to return.
- Return only the message itself.
      `.trim(),
      input: prompt,
    });

    return NextResponse.json({
      message: response.output_text,
    });
  } catch (error) {
    console.error("OpenAI generation error:", error);

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: error.message,
          status: error.status,
          requestId: error.requestID,
        },
        {
          status: error.status ?? 500,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate the WhatsApp message.",
      },
      { status: 500 },
    );
  }
}