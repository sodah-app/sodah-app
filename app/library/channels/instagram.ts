import type {
  ChannelAdapter,
  SendMessageInput,
} from "./types";

type InstagramAdapterConfig = {
  send: (input: SendMessageInput) => Promise<{
    channel_message_id: string;
  }>;
};

/**
 * Instagram adapter.
 *
 * The transport is injected so OAuth credentials and API details
 * remain outside this small channel adapter.
 */
export function createInstagramAdapter(
  config: InstagramAdapterConfig
): ChannelAdapter {
  return {
    channel: "instagram",

    async sendMessage(input) {
      if (input.channel !== "instagram") {
        throw new Error(
          "Instagram adapter received a non-Instagram message."
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
