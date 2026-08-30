import type {
  ChannelAdapter,
  SendMessageInput,
} from "./types";

type FacebookAdapterConfig = {
  send: (input: SendMessageInput) => Promise<{
    channel_message_id: string;
  }>;
};

/**
 * Facebook adapter.
 *
 * The transport is injected so Page credentials and API details
 * remain outside this channel adapter.
 */
export function createFacebookAdapter(
  config: FacebookAdapterConfig
): ChannelAdapter {
  return {
    channel: "facebook",

    async sendMessage(input) {
      if (input.channel !== "facebook") {
        throw new Error(
          "Facebook adapter received a non-Facebook message."
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
