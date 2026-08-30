import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedIncomingMessage } from "./normalize";
import type {
  AutomationRepository,
  CustomerRecord,
  ConversationRecord,
} from "./repository";

export function createSupabaseRepository(
  supabase: SupabaseClient
): AutomationRepository {
  return {
    async resolveCustomer(
      message: NormalizedIncomingMessage
    ): Promise<CustomerRecord> {
      const { data: existing, error: findError } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", message.business_id)
        .eq("channel", message.channel)
        .eq("channel_customer_id", message.customer_channel_id)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (existing) {
        return { customer_id: existing.id };
      }

      const { data: created, error: createError } = await supabase
        .from("customers")
        .insert({
          business_id: message.business_id,
          channel: message.channel,
          channel_customer_id: message.customer_channel_id,
          phone:
            message.channel === "whatsapp"
              ? message.customer_channel_id
              : null,
        })
        .select("id")
        .single();

      if (createError) {
        throw createError;
      }

      return { customer_id: created.id };
    },

    async resolveConversation(
      message: NormalizedIncomingMessage,
      customerId: string
    ): Promise<ConversationRecord> {
      const { data: existing, error: findError } = await supabase
        .from("conversations")
        .select("id")
        .eq("business_id", message.business_id)
        .eq("channel", message.channel)
        .eq("channel_conversation_id", message.customer_channel_id)
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (existing) {
        return { conversation_id: existing.id };
      }

      const { data: created, error: createError } = await supabase
        .from("conversations")
        .insert({
          business_id: message.business_id,
          customer_id: customerId,
          channel: message.channel,
          channel_conversation_id: message.customer_channel_id,
          status: "active",
        })
        .select("id")
        .single();

      if (createError) {
        throw createError;
      }

      return { conversation_id: created.id };
    },

    async saveIncomingMessage(
      message: NormalizedIncomingMessage,
      context
    ): Promise<void> {
      const { error } = await supabase.from("messages").insert({
        business_id: message.business_id,
        customer_phone: message.customer_channel_id,
        customer_message: message.text,
      });

      if (error) {
        throw error;
      }

      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", context.conversation_id);
    },
  };
}