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
        webhook: {
          url: process.env.N8N_WEBHOOK_URL!,
          enabled: true,
          webhookByEvents: false,
          events: [
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "SEND_MESSAGE",
            "QRCODE_UPDATED",
          ],
        },
      }),
    }
  );

  const text = await response.text();

  console.log("Webhook configuration response:", text);

  let data: Record<string, any> = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      JSON.stringify(data)
    );
  }

  return data;
}