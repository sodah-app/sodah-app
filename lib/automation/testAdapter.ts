import type {
  ChannelAdapter,
} from "@/app/library/channels/types";

export function createTestAdapter(): ChannelAdapter {
  return {
    channel: "whatsapp",

    async sendMessage(input) {
      console.log(
        "[AUTOMATION TEST] OUTGOING MESSAGE:",
        {
          business_id:
            input.business_id,

          channel:
            input.channel,

          recipient_id:
            input.recipient_id,

          text:
            input.text,
        }
      );

      return {
        channel_message_id:
          `test-reply-${Date.now()}`,
      };
    },
  };
}