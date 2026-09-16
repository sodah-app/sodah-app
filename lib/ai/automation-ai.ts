import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not configured.");
}

const openai = new OpenAI({
  apiKey,
});

const MODEL =
  process.env.OPENAI_AUTOMATION_MODEL ||
  "gpt-5.5";

export type AutomationAIInput = {
  business_id: string;
  business_name?: string | null;
  channel: string;
  customer_id: string;
  customer_message: string;
};

export async function generateAutomationReply(
  input: AutomationAIInput,
): Promise<string> {
  const customerMessage =
    input.customer_message.trim();

  if (!customerMessage) {
    throw new Error(
      "Customer message is required.",
    );
  }

  const businessName =
    input.business_name?.trim() ||
    "the business";

  const response =
    await openai.responses.create({
      model: MODEL,

      store: false,

      instructions: `
You are the AI customer communication assistant for ${businessName}.

Your job is to respond naturally and helpfully to customers who contact the business.

Rules:
- Reply directly to the customer's message.
- Be professional, friendly, and concise.
- Do not mention that you are an AI unless the customer specifically asks.
- Do not invent business information.
- Do not claim that an appointment, order, payment, booking, or other action has been completed unless the system has actually completed that action.
- If the customer only greets you, greet them naturally and ask how you can help.
- Respond in the same language the customer uses whenever possible.
- Return only the message that should be sent to the customer.
`,

      input: `
Business: ${businessName}
Channel: ${input.channel}
Customer message:

${customerMessage}
`,
    });

  const reply =
    response.output_text?.trim();

  if (!reply) {
    throw new Error(
      "OpenAI returned an empty automation response.",
    );
  }

  return reply;
}