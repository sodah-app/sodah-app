import type {
  ChannelAdapter,
  SendMessageInput,
} from "./types";

type TikTokAdapterConfig = {
  send: (input: SendMessageInput) => Promise<{
    channel_message_id: string;
  }>;
};

/**
 * TikTok adapter.
 *
 * The transport is injected so TikTok credentials and API details
 * remain outside this channel adapter.
 */
export function createTikTokAdapter(
  config: TikTokAdapterConfig
): ChannelAdapter {
  return {
    channel: "tiktok",

    async sendMessage(input) {
      if (input.channel !== "tiktok") {
        throw new Error(
          "TikTok adapter received a non-TikTok message."
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
