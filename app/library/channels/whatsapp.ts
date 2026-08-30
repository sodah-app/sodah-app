import type {
  ChannelAdapter,
  SendMessageInput,
} from "./types";

type WhatsAppAdapterConfig = {
  send: (input: SendMessageInput) => Promise<{
    channel_message_id: string;
  }>;
};

/**
 * WhatsApp adapter.
 *
 * The actual WhatsApp transport is injected instead of being
 * hardcoded here. This keeps the new engine independent from
 * the existing WhatsApp QR/session implementation.
 */
export function createWhatsAppAdapter(
  config: WhatsAppAdapterConfig
): ChannelAdapter {
  return {
    channel: "whatsapp",

    async sendMessage(input) {
      if (input.channel !== "whatsapp") {
        throw new Error(
          "WhatsApp adapter received a non-WhatsApp message."
        );
      }

      const businessId = input.business_id.trim();
      const recipientId = input.recipient_id.trim();
      const text = input.text.trim();

      if (!businessId || !recipientId || !text) {
        throw new Error(
          "business_id, recipient_id, and text are required."
        );
      }

      return config.send({
        ...input,
        business_id: businessId,
        recipient_id: recipientId,
        text,
      });
    },
  };
}
