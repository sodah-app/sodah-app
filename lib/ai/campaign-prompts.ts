import type { CampaignContext } from './campaign-types';

export function buildGeneratePrompt(context: CampaignContext): string {
  return `
Create a WhatsApp marketing campaign message.

BUSINESS
Name: ${context.businessName || 'Not provided'}
Type: ${context.businessType || 'Not provided'}
Location: ${context.location || 'Not provided'}
Website: ${context.website || 'Not provided'}

CAMPAIGN
Audience: ${context.audience || 'General business audience'}
Goal: ${context.goal || 'Generate interest'}
Tone: ${context.tone || 'Friendly and professional'}
Offer: ${context.offer || 'Not provided'}

ADDITIONAL INSTRUCTIONS
${context.additionalInstructions || 'None'}

REQUIREMENTS

1. Write a concise WhatsApp message.
2. Make it natural and human.
3. Do not make unsupported claims.
4. Do not invent discounts, prices, guarantees, statistics, or features.
5. Include a clear call to action.
6. Avoid excessive emojis.
7. Do not use markdown tables.
8. Do not mention that AI wrote the message.
9. Keep the message suitable for business outreach.
`;
}

export function buildImprovePrompt(
  originalMessage: string,
  improvementInstruction: string,
  context?: CampaignContext
): string {
  return `
Improve the following WhatsApp campaign message.

ORIGINAL MESSAGE
${originalMessage}

IMPROVEMENT REQUEST
${improvementInstruction || 'Improve clarity, persuasion, readability and conversion potential.'}

BUSINESS CONTEXT
Business: ${context?.businessName || 'Not provided'}
Audience: ${context?.audience || 'Not provided'}
Goal: ${context?.goal || 'Not provided'}
Tone: ${context?.tone || 'Friendly and professional'}

RULES

1. Preserve the original intent.
2. Do not invent facts.
3. Do not invent offers or prices.
4. Make the message sound human.
5. Keep it appropriate for WhatsApp.
6. Keep it concise.
7. Improve the opening hook.
8. Improve the call to action.
9. Do not explain the changes.
10. Return only the improved campaign message.
`;
}

export function buildTestImprovePrompt(
  originalMessage: string,
  context?: CampaignContext
): string {
  return `
Create three improved versions of this WhatsApp campaign.

ORIGINAL
${originalMessage}

BUSINESS
${context?.businessName || 'Not provided'}

AUDIENCE
${context?.audience || 'Not provided'}

GOAL
${context?.goal || 'Not provided'}

Create:

VERSION A
Professional and trustworthy.

VERSION B
Friendly and conversational.

VERSION C
Direct and conversion-focused.

Rules:

- Preserve factual accuracy.
- Do not invent claims.
- Do not invent prices or offers.
- Keep each version concise.
- Each version must have a clear call to action.
`;
}