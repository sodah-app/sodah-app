import type {
  SodahChannel,
} from "../automation/types";

export type { SodahChannel } from "../automation/types";

export type ChannelMessage = {
  business_id: string;

  channel: SodahChannel;

  channel_message_id: string;

  conversation_id: string;

  customer_id: string;

  customer_channel_id: string;

  text: string;
};

export type SendMessageInput = {
  business_id: string;

  channel: SodahChannel;

  recipient_id: string;

  text: string;
};

export type ChannelAdapter = {
  channel: SodahChannel;

  sendMessage(
    input: SendMessageInput
  ): Promise<{
    channel_message_id: string;
  }>;
};