import OpenAI from 'openai';

import {
  buildGeneratePrompt,
  buildImprovePrompt,
  buildTestImprovePrompt,
} from './campaign-prompts';

import type {
  CampaignAIResult,
  CampaignContext,
} from './campaign-types';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not configured.');
}

const openai = new OpenAI({
  apiKey,
});

const MODEL = process.env.OPENAI_CAMPAIGN_MODEL || 'gpt-5.5';

function cleanText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export async function generateCampaign(
  context: CampaignContext,
): Promise<CampaignAIResult> {
  const response = await openai.responses.create({
    model: MODEL,

    instructions: `
You are an expert WhatsApp campaign copywriter.

Return valid JSON only.

The JSON must contain:
{
  "message": "string",
  "intent": "string",
  "subject": "string",
  "audience": "string"
}
`,

    input: buildGeneratePrompt(context),
  });

  const raw = cleanText(response.output_text);

  if (!raw) {
    throw new Error('OpenAI returned an empty campaign response.');
  }

  let parsed: Partial<CampaignAIResult>;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'OpenAI returned invalid campaign JSON.'
    );
  }

  const message = cleanText(parsed.message);

  if (!message) {
    throw new Error(
      'OpenAI campaign response did not contain a message.'
    );
  }

  return {
    message,
    intent: cleanText(parsed.intent) || 'campaign',
    subject: cleanText(parsed.subject),
    audience: cleanText(parsed.audience),
  };
}

export async function improveCampaign(
  originalMessage: string,
  improvementInstruction: string,
  context?: CampaignContext,
): Promise<string> {
  if (!originalMessage.trim()) {
    throw new Error('Original campaign message is required.');
  }

  const response = await openai.responses.create({
    model: MODEL,

    instructions: `
You are an expert WhatsApp campaign copywriter.

Return only the improved message.
Do not explain your changes.
`,

    input: buildImprovePrompt(
      originalMessage,
      improvementInstruction,
      context,
    ),
  });

  const result = cleanText(response.output_text);

  if (!result) {
    throw new Error(
      'OpenAI returned an empty improved campaign message.'
    );
  }

  return result;
}

export async function testImproveCampaign(
  originalMessage: string,
  context?: CampaignContext,
): Promise<{
  professional: string;
  friendly: string;
  conversionFocused: string;
}> {
  if (!originalMessage.trim()) {
    throw new Error('Original campaign message is required.');
  }

  const response = await openai.responses.create({
    model: MODEL,

    instructions: `
You are an expert WhatsApp campaign copywriter.

Return valid JSON only.

Required structure:

{
  "professional": "string",
  "friendly": "string",
  "conversionFocused": "string"
}
`,

    input: buildTestImprovePrompt(
      originalMessage,
      context,
    ),
  });

  const raw = cleanText(response.output_text);

  if (!raw) {
    throw new Error(
      'OpenAI returned an empty test-improve response.'
    );
  }

  let parsed: {
    professional?: unknown;
    friendly?: unknown;
    conversionFocused?: unknown;
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'OpenAI returned invalid test-improve JSON.'
    );
  }

  const professional = cleanText(parsed.professional);
  const friendly = cleanText(parsed.friendly);
  const conversionFocused = cleanText(
    parsed.conversionFocused,
  );

  if (
    !professional ||
    !friendly ||
    !conversionFocused
  ) {
    throw new Error(
      'OpenAI did not return all three campaign variants.'
    );
  }

  return {
    professional,
    friendly,
    conversionFocused,
  };
}