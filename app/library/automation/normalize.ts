import type { SodahChannel } from "./types";

export type NormalizedIncomingMessage = {
  business_id: string;
  channel: SodahChannel;
  channel_message_id: string;
  customer_channel_id: string;
  text: string;
};

export function normalizeMessage(
  message: NormalizedIncomingMessage
): NormalizedIncomingMessage {
  const businessId = message.business_id.trim();
  const channelMessageId =
    message.channel_message_id.trim();
  const customerChannelId =
    message.customer_channel_id.trim();
  const text = message.text.trim();

  if (
    !businessId ||
    !channelMessageId ||
    !customerChannelId ||
    !text
  ) {
    throw new Error(
      "Invalid normalized message."
    );
  }

  return {
    business_id: businessId,
    channel: message.channel,
    channel_message_id: channelMessageId,
    customer_channel_id: customerChannelId,
    text,
  };
}