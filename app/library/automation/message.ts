import { createClient } from "@/lib/supabase/server";
import type { SodahChannel } from "./types";

type BaseMessageInput = {
  business_id: string;
  channel: SodahChannel;
  conversation_id: string;
  channel_message_id?: string | null;
};

type IncomingMessageInput = BaseMessageInput & {
  customer_phone?: string | null;
  customer_message: string;
};

type OutgoingMessageInput = BaseMessageInput & {
  ai_response: string;
};

const MESSAGE_COLUMNS = [
  "id",
  "business_id",
  "customer_phone",
  "customer_message",
  "ai_response",
  "created_at",
  "channel",
  "channel_message_id",
  "conversation_id",
].join(",");

function validateBaseMessage(input: BaseMessageInput) {
  const businessId = input.business_id.trim();
  const conversationId = input.conversation_id.trim();

  if (!businessId || !conversationId) {
    throw new Error(
      "business_id and conversation_id are required."
    );
  }

  return { businessId, conversationId };
}

export async function saveIncomingMessage(
  input: IncomingMessageInput
) {
  const { businessId, conversationId } =
    validateBaseMessage(input);

  const message = input.customer_message.trim();

  if (!message) {
    throw new Error("customer_message is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      business_id: businessId,
      conversation_id: conversationId,
      channel: input.channel,
      channel_message_id:
        input.channel_message_id?.trim() || null,
      customer_phone: input.customer_phone?.trim() || null,
      customer_message: message,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) {
    console.error(
      "[AUTOMATION][MESSAGE] Incoming message save failed:",
      error
    );
    throw new Error("Could not save incoming message.");
  }

  return data;
}

export async function saveOutgoingMessage(
  input: OutgoingMessageInput
) {
  const { businessId, conversationId } =
    validateBaseMessage(input);

  const response = input.ai_response.trim();

  if (!response) {
    throw new Error("ai_response is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      business_id: businessId,
      conversation_id: conversationId,
      channel: input.channel,
      channel_message_id:
        input.channel_message_id?.trim() || null,
      ai_response: response,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) {
    console.error(
      "[AUTOMATION][MESSAGE] Outgoing message save failed:",
      error
    );
    throw new Error("Could not save outgoing message.");
  }

  return data;
}
