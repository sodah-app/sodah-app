import type { NormalizedIncomingMessage } from "./normalize";

export type CustomerRecord = {
  customer_id: string;
};

export type ConversationRecord = {
  conversation_id: string;
};

export type AutomationRepository = {
  resolveCustomer(
    message: NormalizedIncomingMessage
  ): Promise<CustomerRecord>;

  resolveConversation(
    message: NormalizedIncomingMessage,
    customerId: string
  ): Promise<ConversationRecord>;

  saveIncomingMessage(
    message: NormalizedIncomingMessage,
    context: {
      customer_id: string;
      conversation_id: string;
    }
  ): Promise<void>;
};