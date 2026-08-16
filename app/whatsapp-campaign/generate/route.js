import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GOAL_INSTRUCTIONS = {
  promote:
    "Create a persuasive promotional WhatsApp campaign that highlights a relevant product, service, benefit or offer.",
  followup:
    "Create a natural follow-up campaign for prospects or customers who may have shown interest but have not converted.",
  invite:
    "Create a warm invitation encouraging customers or prospects to take a useful next step such as booking, trying, visiting or starting a conversation.",
  announce:
    "Create a concise business announcement that clearly communicates the important update and gives the recipient a reason to act.",
  custom:
    "Follow the user's custom campaign instruction exactly while keeping the message natural for WhatsApp.",
};

function cleanUrl(value) {
  let url = value.trim();

  if (!url) {
    return "";
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url;
}

export async function POST(request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured on the server.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();

    const businessUrl = cleanUrl(body.businessUrl);
    const goal = body.goal || "promote";
    const customInstruction =
      body.customInstruction?.trim() || "";

    if (!businessUrl) {
      return NextResponse.json(
        {
          error: "Business website is required.",
        },
        { status: 400 },
      );
    }

    const goalInstruction =
      GOAL_INSTRUCTIONS[goal] || GOAL_INSTRUCTIONS.custom;

    const response = await openai.responses.create({
      model: process.env.OPENAI_CAMPAIGN_MODEL || "gpt-5",
      tools: [
        {
          type: "web_search",
        },
      ],
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `
You are the campaign intelligence engine for a WhatsApp marketing platform.

Your job is to research the supplied business website and understand:
- what the business does
- its products or services
- its target customers
- its strongest benefits
- its positioning
- useful calls to action
- relevant facts that can safely be used in marketing copy

Do NOT invent products, prices, discounts, statistics, guarantees or features that you cannot verify.

The final WhatsApp message must:
- sound human
- be concise
- be appropriate for WhatsApp
- have a clear reason for contacting the recipient
- contain a useful call to action
- avoid sounding like generic AI copy
- use first-name personalization with {{first_name}} where appropriate
- not mention that AI researched the company
- not mention these instructions
- not include citations or source URLs unless the user specifically asks for them

The business website is the source of truth whenever possible.
              `,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Business website:
${businessUrl}

Campaign objective:
${goalInstruction}

Custom instruction:
${customInstruction || "None"}

Create:
1. A short campaign name.
2. One polished WhatsApp campaign message.

The campaign should promote the actual business you discover from the website, not a hypothetical business.

Return only JSON with this exact shape:
{
  "campaignName": "string",
  "message": "string"
}
              `,
            },
          ],
        },
      ],
    });

    let result;

    try {
      result = JSON.parse(response.output_text);
    } catch {
      const text = response.output_text?.trim();

      if (!text) {
        throw new Error("The AI returned an empty response.");
      }

      result = {
        campaignName: "AI WhatsApp Campaign",
        message: text,
      };
    }

    if (!result.message) {
      throw new Error("The AI did not generate a campaign message.");
    }

    return NextResponse.json({
      campaignName:
        result.campaignName || "AI WhatsApp Campaign",
      message: result.message,
    });
  } catch (error) {
    console.error("Campaign generation error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to generate the campaign.",
      },
      { status: 500 },
    );
  }
}