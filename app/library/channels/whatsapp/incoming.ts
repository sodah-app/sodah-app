import type { NormalizedIncomingMessage } from "../../automation/normalize";

type WhatsAppWebhookPayload = {
  body?: {
    event?: string;
    instance?: string;
    data?: {
      key?: {
        id?: string;
        remoteJid?: string;
        fromMe?: boolean;
      };
      message?: Record<string, unknown>;
    };
  };
};

function extractText(message?: Record<string, unknown>): string {
  if (!message) return "";

  const conversation = message.conversation;
  if (typeof conversation === "string") return conversation;

  const extended = message.extendedTextMessage;

  if (
    extended &&
    typeof extended === "object" &&
    "text" in extended &&
    typeof extended.text === "string"
  ) {
    return extended.text;
  }

  return "";
}

export function parseWhatsAppWebhook(
  payload: WhatsAppWebhookPayload
): NormalizedIncomingMessage | null {
  const body = payload.body;
  const data = body?.data;
  const key = data?.key;

  if (
    body?.event !== "messages.upsert" ||
    !body.instance ||
    !key?.id ||
    !key.remoteJid ||
    key.fromMe === true
  ) {
    return null;
  }

  const text = extractText(data?.message);

  if (!text.trim()) {
    return null;
  }

  return {
    business_id: body.instance.trim(),
    channel: "whatsapp",
    channel_message_id: key.id.trim(),
    customer_channel_id: key.remoteJid.trim(),
    text: text.trim(),
  };
}
