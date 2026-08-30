import { createClient } from "@/lib/supabase/server";
import type { SodahChannel } from "./types";

export type SodahConversation = {
  id: string;
  business_id: string;
  channel: SodahChannel;
  channel_conversation_id: string;

  customer_name?: string | null;
  customer_phone?: string | null;
  last_message?: string | null;
  unread_count?: number | null;

  status?: string | null;
  intent?: string | null;
  last_message_at?: string | null;
  last_reply_at?: string | null;
  assigned_to?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FindOrCreateConversationInput = {
  business_id: string;
  channel: SodahChannel;
  channel_conversation_id: string;

  customer_name?: string | null;
  customer_phone?: string | null;
};

const CONVERSATION_COLUMNS = [
  "id",
  "business_id",
  "channel",
  "channel_conversation_id",
  "customer_name",
  "customer_phone",
  "last_message",
  "unread_count",
  "status",
  "intent",
  "last_message_at",
  "last_reply_at",
  "assigned_to",
  "created_at",
  "updated_at",
].join(",");

export async function findConversation(
  businessId: string,
  channel: SodahChannel,
  channelConversationId: string
): Promise<SodahConversation | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_COLUMNS)
    .eq("business_id", businessId)
    .eq("channel", channel)
    .eq("channel_conversation_id", channelConversationId)
    .maybeSingle();

  if (error) {
    console.error(
      "[AUTOMATION][CONVERSATION] Lookup failed:",
      error
    );
    throw new Error("Could not find conversation.");
  }

  return (data as SodahConversation | null) ?? null;
}

export async function findOrCreateConversation(
  input: FindOrCreateConversationInput
): Promise<SodahConversation> {
  const businessId = input.business_id.trim();
  const channelConversationId =
    input.channel_conversation_id.trim();

  if (!businessId || !channelConversationId) {
    throw new Error(
      "business_id and channel_conversation_id are required."
    );
  }

  const existing = await findConversation(
    businessId,
    input.channel,
    channelConversationId
  );

  if (existing) {
    return existing;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      business_id: businessId,
      channel: input.channel,
      channel_conversation_id: channelConversationId,
      customer_name: input.customer_name?.trim() || null,
      customer_phone: input.customer_phone?.trim() || null,
      status: "active",
    })
    .select(CONVERSATION_COLUMNS)
    .single();

  if (error) {
    console.error(
      "[AUTOMATION][CONVERSATION] Create failed:",
      error
    );
    throw new Error("Could not create conversation.");
  }

  return data as unknown as SodahConversation;
}
