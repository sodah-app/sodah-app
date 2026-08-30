import type { SodahAIConfiguration } from "./aiConfiguration";

type GenerateAIResponseInput = {
  configuration: SodahAIConfiguration;
  customerMessage: string;
  businessContext?: string;
};

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();

  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return key;
}

function buildPrompt(
  configuration: SodahAIConfiguration,
  customerMessage: string,
  businessContext?: string
): string {
  const context = businessContext?.trim();

  return [
    configuration.system_prompt,
    context ? `Business context:\n${context}` : "",
    `Customer message:\n${customerMessage.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function generateAIResponse(
  input: GenerateAIResponseInput
): Promise<string> {
  const customerMessage = input.customerMessage.trim();

  if (!customerMessage) {
    throw new Error("customerMessage is required.");
  }

  if (!input.configuration.enabled) {
    throw new Error("AI configuration is disabled.");
  }

  const provider = input.configuration.provider.trim().toLowerCase();

  if (provider !== "openai") {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getOpenAIKey()}`,
      },
      body: JSON.stringify({
        model: input.configuration.model,
        messages: [
          {
            role: "system",
            content: buildPrompt(
              input.configuration,
              customerMessage,
              input.businessContext
            ),
          },
        ],
        temperature: input.configuration.temperature,
        max_tokens: input.configuration.max_tokens,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "[AUTOMATION][AI] Provider request failed:",
      errorText
    );

    throw new Error("AI provider request failed.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI provider returned an empty response.");
  }

  return content.trim();
}
