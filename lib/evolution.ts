export function getInstanceName(businessId: string) {
  return businessId;
}

export async function createEvolutionInstance(
  instanceName: string
) {
  // existing code
}

export async function ensureEvolutionInstance(
  instanceName: string
) {
  // existing code
}

export async function configureInstanceWebhook(
  instanceName: string
) {
  const response = await fetch(
    `${process.env.EVOLUTION_API_URL}/webhook/set/${instanceName}`,
    {
      method: "POST",
      headers: {
        apikey: process.env.EVOLUTION_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: process.env.N8N_WEBHOOK_URL,
        enabled: true,
        webhookByEvents: false,
        events: [
          "CONNECTION_UPDATE",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "SEND_MESSAGE",
          "QRCODE_UPDATED",
        ],
      }),
    }
  );

  const text = await response.text();

  let data: Record<string, any> = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `Webhook configuration failed (${response.status})`
    );
  }

  return data;
}