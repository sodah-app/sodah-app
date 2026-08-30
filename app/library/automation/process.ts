import { createServiceClient } from "@/lib/supabase/service";
import type {
  ChannelAdapter,
  SodahChannel,
} from "@/app/library/channels/types";
import {
  generateAIResponse,
} from "./ai";
import type {
  SodahAIConfiguration,
} from "./aiConfiguration";

type IncomingMessage = {
  business_id: string;
  channel: SodahChannel;
  account_id: string;
  customer_channel_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  conversation_id?: string | null;
  channel_message_id: string;
  text: string;
};

type BusinessRow = {
  id: string;
  business_id: string;
  user_id: string;

  business_name?: string | null;
  full_name?: string | null;
  industry?: string | null;
  email?: string | null;
  location?: string | null;
  price_range?: string | null;

  ai_number?: string | null;
  support_number?: string | null;

  working_days?: string | null;
  hours?: string | null;
  capabilities?: string | null;
  services_description?: string | null;
  personal_goal?: string | null;

  status?: string | null;
  ai_enabled?: boolean | null;
  automation_enabled?: boolean | null;

  subscription_status?: string | null;
  subscription_expiry?: string | null;

  instagram_connected?: boolean | null;
  instagram_access_token?: string | null;
  instagram_user_id?: string | null;
  instagram_username?: string | null;
};

type CustomerRow = {
  id: string;
  business_id: string;
  channel: string;
  channel_customer_id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  lead_status?: string | null;
};

type ConversationRow = {
  id: string;
  business_id: string;
  channel: string;
  channel_conversation_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  last_message?: string | null;
  unread_count?: number | null;
  status?: string | null;
  intent?: string | null;
  last_message_at?: string | null;
  last_reply_at?: string | null;
};

type AIConfigRow = {
  id: string;
  automation_id: string;
  provider: string;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
  business_id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

function clean(value?: string | null) {
  const result = value?.trim();
  return result ? result : null;
}

function buildConversationId(
  businessId: string,
  channel: string,
  customerId: string
) {
  return [
    businessId,
    channel,
    customerId,
  ].join(":");
}

async function loadBusiness(
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string
): Promise<BusinessRow> {
  const {
    data: rawBusiness,
    error,
  } = await supabase
    .from("businesses")
    .select(
      [
        "id",
        "business_id",
        "user_id",
        "business_name",
        "full_name",
        "industry",
        "email",
        "location",
        "price_range",
        "ai_number",
        "support_number",
        "working_days",
        "hours",
        "capabilities",
        "services_description",
        "personal_goal",
        "status",
        "ai_enabled",
        "automation_enabled",
        "subscription_status",
        "subscription_expiry",
        "instagram_connected",
        "instagram_access_token",
        "instagram_user_id",
        "instagram_username",
      ].join(",")
    )
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Business lookup failed: ${error.message}`
    );
  }

  if (!rawBusiness) {
    throw new Error(
      `Business not found: ${businessId}`
    );
  }

  return rawBusiness as unknown as BusinessRow;
}

async function findOrCreateCustomer(
  supabase: ReturnType<typeof createServiceClient>,
  message: IncomingMessage
): Promise<CustomerRow> {
  const {
    data: rawCustomer,
    error: lookupError,
  } = await supabase
    .from("customers")
    .select(
      [
        "id",
        "business_id",
        "channel",
        "channel_customer_id",
        "name",
        "phone",
        "email",
        "lead_status",
      ].join(",")
    )
    .eq(
      "business_id",
      message.business_id
    )
    .eq(
      "channel",
      message.channel
    )
    .eq(
      "channel_customer_id",
      message.customer_channel_id
    )
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Customer lookup failed: ${lookupError.message}`
    );
  }

  if (rawCustomer) {
    const customer =
      rawCustomer as unknown as CustomerRow;

    /*
     * If Meta later gives us a customer name,
     * fill it in without overwriting an existing name.
     */
    if (
      message.customer_name &&
      !customer.name
    ) {
      await supabase
        .from("customers")
        .update({
          name:
            message.customer_name,
        })
        .eq(
          "id",
          customer.id
        );

      customer.name =
        message.customer_name;
    }

    return customer;
  }

  const {
    data: rawNewCustomer,
    error: createError,
  } = await supabase
    .from("customers")
    .insert({
      business_id:
        message.business_id,

      channel:
        message.channel,

      channel_customer_id:
        message.customer_channel_id,

      name:
        clean(
          message.customer_name
        ),

      /*
       * Instagram does not provide a phone number
       * in the normal messaging webhook.
       *
       * Keep phone NULL.
       */
      phone:
        clean(
          message.customer_phone
        ),

      lead_status:
        "new",
    })
    .select(
      [
        "id",
        "business_id",
        "channel",
        "channel_customer_id",
        "name",
        "phone",
        "email",
        "lead_status",
      ].join(",")
    )
    .single();

  if (createError) {
    throw new Error(
      `Customer creation failed: ${createError.message}`
    );
  }

  return rawNewCustomer as unknown as CustomerRow;
}

async function findOrCreateConversation(
  supabase: ReturnType<typeof createServiceClient>,
  message: IncomingMessage,
  customer: CustomerRow
): Promise<ConversationRow> {
  const conversationId =
    message.conversation_id?.trim() ||
    buildConversationId(
      message.business_id,
      message.channel,
      message.customer_channel_id
    );

  const {
    data: rawConversation,
    error: lookupError,
  } = await supabase
    .from("conversations")
    .select(
      [
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
      ].join(",")
    )
    .eq(
      "business_id",
      message.business_id
    )
    .eq(
      "channel",
      message.channel
    )
    .eq(
      "channel_conversation_id",
      conversationId
    )
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Conversation lookup failed: ${lookupError.message}`
    );
  }

  if (rawConversation) {
    return rawConversation as unknown as ConversationRow;
  }

  const {
    data: rawNewConversation,
    error: createError,
  } = await supabase
    .from("conversations")
    .insert({
      business_id:
        message.business_id,

      channel:
        message.channel,

      channel_conversation_id:
        conversationId,

      customer_name:
        customer.name ||
        message.customer_name ||
        "Customer",

      customer_phone:
        customer.phone ||
        message.customer_phone ||
        null,

      last_message:
        message.text,

      unread_count:
        1,

      status:
        "active",

      last_message_at:
        new Date().toISOString(),
    })
    .select(
      [
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
      ].join(",")
    )
    .single();

  if (createError) {
    throw new Error(
      `Conversation creation failed: ${createError.message}`
    );
  }

  return rawNewConversation as unknown as ConversationRow;
}

async function updateConversationIncoming(
  supabase: ReturnType<typeof createServiceClient>,
  conversation: ConversationRow,
  message: IncomingMessage,
  customer: CustomerRow
) {
  const currentUnread =
    Number(
      conversation.unread_count || 0
    );

  await supabase
    .from("conversations")
    .update({
      customer_name:
        customer.name ||
        message.customer_name ||
        conversation.customer_name ||
        "Customer",

      customer_phone:
        customer.phone ||
        message.customer_phone ||
        conversation.customer_phone ||
        null,

      last_message:
        message.text,

      last_message_at:
        new Date().toISOString(),

      unread_count:
        currentUnread + 1,

      status:
        "active",
    })
    .eq(
      "id",
      conversation.id
    );
}

async function loadAIConfiguration(
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string
): Promise<SodahAIConfiguration> {
  const {
    data: rawConfig,
    error,
  } = await supabase
    .from("ai_configurations")
    .select(
      [
        "id",
        "automation_id",
        "provider",
        "model",
        "system_prompt",
        "temperature",
        "max_tokens",
        "enabled",
        "business_id",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .eq(
      "business_id",
      businessId
    )
    .eq(
      "enabled",
      true
    )
    .order(
      "updated_at",
      {
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `AI configuration lookup failed: ${error.message}`
    );
  }

  if (!rawConfig) {
    throw new Error(
      `No enabled AI configuration found for business: ${businessId}`
    );
  }

  return rawConfig as unknown as AIConfigRow;
}

async function loadRecentHistory(
  supabase: ReturnType<typeof createServiceClient>,
  businessId: string,
  conversationId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("messages")
    .select(
      [
        "customer_message",
        "ai_response",
        "created_at",
      ].join(",")
    )
    .eq(
      "business_id",
      businessId
    )
    .eq(
      "conversation_id",
      conversationId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(12);

  if (error) {
    console.warn(
      "[AUTOMATION] Conversation history lookup failed:",
      error.message
    );

    return [];
  }

  return Array.isArray(data)
    ? [...data].reverse()
    : [];
}

async function saveIncomingMessage(
  supabase: ReturnType<typeof createServiceClient>,
  message: IncomingMessage,
  conversationId: string
) {
  /*
   * Idempotency:
   * Meta can retry webhook deliveries.
   *
   * Never run the AI twice for the same
   * Instagram message ID.
   */
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("messages")
    .select("id")
    .eq(
      "business_id",
      message.business_id
    )
    .eq(
      "channel",
      message.channel
    )
    .eq(
      "channel_message_id",
      message.channel_message_id
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Message idempotency lookup failed: ${existingError.message}`
    );
  }

  if (existing) {
    return false;
  }

  const {
    error,
  } = await supabase
    .from("messages")
    .insert({
      business_id:
        message.business_id,

      conversation_id:
        conversationId,

      channel:
        message.channel,

      channel_message_id:
        message.channel_message_id,

      customer_phone:
        message.customer_phone ||
        null,

      customer_message:
        message.text,
    });

  if (error) {
    throw new Error(
      `Incoming message save failed: ${error.message}`
    );
  }

  return true;
}

async function saveOutgoingMessage(
  supabase: ReturnType<typeof createServiceClient>,
  message: IncomingMessage,
  conversationId: string,
  reply: string,
  channelMessageId: string
) {
  const {
    error,
  } = await supabase
    .from("messages")
    .insert({
      business_id:
        message.business_id,

      conversation_id:
        conversationId,

      channel:
        message.channel,

      channel_message_id:
        channelMessageId,

      ai_response:
        reply,
    });

  if (error) {
    /*
     * Do not undo a successfully delivered Instagram reply
     * because database logging failed.
     */
    console.error(
      "[AUTOMATION] Outgoing message save failed:",
      error
    );
  }
}

async function saveInboxMessage(
  supabase: ReturnType<typeof createServiceClient>,
  business: BusinessRow,
  message: IncomingMessage,
  text: string,
  direction: "inbound" | "outbound",
  status: "received" | "sent"
) {
  try {
    await supabase
      .from("inbox")
      .insert({
        /*
         * IMPORTANT:
         * inbox.business_id is the database UUID.
         *
         * It is NOT BIZ-XXXXXXXX.
         */
        business_id:
          business.id,

        user_id:
          business.user_id,

        channel:
          message.channel,

        direction,

        contact_id:
          message.customer_channel_id,

        contact_name:
          message.customer_name ||
          "Customer",

        contact_username:
          null,

        message_text:
          text,

        message_type:
          "text",

        status,
      });
  } catch (error) {
    /*
     * Inbox is secondary logging.
     * It must never prevent the real Instagram reply.
     */
    console.warn(
      "[AUTOMATION] Inbox logging failed:",
      error
    );
  }
}

async function updateConversationOutgoing(
  supabase: ReturnType<typeof createServiceClient>,
  conversationId: string,
  reply: string
) {
  await supabase
    .from("conversations")
    .update({
      last_message:
        reply,

      last_message_at:
        new Date().toISOString(),

      last_reply_at:
        new Date().toISOString(),

      unread_count:
        0,
    })
    .eq(
      "id",
      conversationId
    );
}

function buildBusinessContext(
  business: BusinessRow,
  customer: CustomerRow,
  history: Array<{
    customer_message?: string | null;
    ai_response?: string | null;
    created_at?: string | null;
  }>
) {
  const historyText =
    history.length > 0
      ? history
          .map((item) => {
            const customerMessage =
              item.customer_message?.trim();

            const aiResponse =
              item.ai_response?.trim();

            if (
              customerMessage &&
              aiResponse
            ) {
              return (
                `Customer: ${customerMessage}\n` +
                `Assistant: ${aiResponse}`
              );
            }

            if (customerMessage) {
              return `Customer: ${customerMessage}`;
            }

            if (aiResponse) {
              return `Assistant: ${aiResponse}`;
            }

            return "";
          })
          .filter(Boolean)
          .join("\n\n")
      : "No previous conversation history.";

  return [
    `Business name: ${
      business.business_name ||
      "the business"
    }`,

    `Industry: ${
      business.industry ||
      "General Business"
    }`,

    `Business description/services: ${
      business.services_description ||
      "Not specified"
    }`,

    `Capabilities: ${
      business.capabilities ||
      "Not specified"
    }`,

    `Pricing: ${
      business.price_range ||
      "Not specified"
    }`,

    `Location: ${
      business.location ||
      "Not specified"
    }`,

    `Working days: ${
      business.working_days ||
      "Not specified"
    }`,

    `Working hours: ${
      business.hours ||
      "Not specified"
    }`,

    `Business email: ${
      business.email ||
      "Not specified"
    }`,

    `Support number: ${
      business.support_number ||
      business.ai_number ||
      "Not specified"
    }`,

    `Customer name: ${
      customer.name ||
      "Customer"
    }`,

    `Customer channel ID: ${
      customer.channel_customer_id
    }`,

    `Conversation history:\n${historyText}`,
  ].join("\n\n");
}

export async function processIncomingMessage(
  message: IncomingMessage,
  adapter: ChannelAdapter
) {
  const supabase =
    createServiceClient();

  const businessId =
    message.business_id.trim();

  const customerChannelId =
    message.customer_channel_id.trim();

  const text =
    message.text.trim();

  if (!businessId) {
    throw new Error(
      "business_id is required."
    );
  }

  if (!customerChannelId) {
    throw new Error(
      "customer_channel_id is required."
    );
  }

  if (!text) {
    throw new Error(
      "Incoming message text is empty."
    );
  }

  /*
   * ============================================================
   * 1. RESOLVE TENANT
   * ============================================================
   */
  const business =
    await loadBusiness(
      supabase,
      businessId
    );

  console.log(
    "[AUTOMATION] Tenant resolved:",
    {
      business_id:
        business.business_id,

      database_business_uuid:
        business.id,

      user_id:
        business.user_id,

      channel:
        message.channel,

      account_id:
        message.account_id,
    }
  );

  if (
    business.status &&
    business.status !== "active"
  ) {
    return {
      success: true,
      handled: false,
      reason:
        "business_inactive",
      business_id:
        business.business_id,
    };
  }

  if (
    business.automation_enabled === false
  ) {
    return {
      success: true,
      handled: false,
      reason:
        "automation_disabled",
      business_id:
        business.business_id,
    };
  }

  if (
    business.ai_enabled === false
  ) {
    return {
      success: true,
      handled: false,
      reason:
        "ai_disabled",
      business_id:
        business.business_id,
    };
  }

  /*
   * ============================================================
   * 2. CUSTOMER
   * ============================================================
   */
  const customer =
    await findOrCreateCustomer(
      supabase,
      message
    );

  /*
   * ============================================================
   * 3. CONVERSATION
   * ============================================================
   */
  const conversation =
    await findOrCreateConversation(
      supabase,
      message,
      customer
    );

  const conversationId =
    conversation.channel_conversation_id;

  await updateConversationIncoming(
    supabase,
    conversation,
    message,
    customer
  );

  /*
   * ============================================================
   * 4. IDEMPOTENCY
   * ============================================================
   */
  const isNewMessage =
    await saveIncomingMessage(
      supabase,
      message,
      conversationId
    );

  if (!isNewMessage) {
    console.log(
      "[AUTOMATION] Duplicate Meta message ignored:",
      message.channel_message_id
    );

    return {
      success: true,
      handled: false,
      duplicate: true,
      business_id:
        business.business_id,
      customer_id:
        customer.id,
      conversation_id:
        conversationId,
    };
  }

  /*
   * ============================================================
   * 5. INBOX
   * ============================================================
   */
  await saveInboxMessage(
    supabase,
    business,
    message,
    text,
    "inbound",
    "received"
  );

  /*
   * ============================================================
   * 6. AI CONFIGURATION
   * ============================================================
   */
  const aiConfig =
    await loadAIConfiguration(
      supabase,
      business.business_id
    );

  /*
   * ============================================================
   * 7. CONVERSATION HISTORY
   * ============================================================
   */
  const history =
    await loadRecentHistory(
      supabase,
      business.business_id,
      conversationId
    );

  /*
   * ============================================================
   * 8. AI RESPONSE
   * ============================================================
   */
  const businessContext =
    buildBusinessContext(
      business,
      customer,
      history
    );

  console.log(
    "[AUTOMATION] Generating AI reply:",
    {
      business_id:
        business.business_id,

      channel:
        message.channel,

      customer_id:
        customerChannelId,

      conversation_id:
        conversationId,
    }
  );

  const reply =
    await generateAIResponse({
      configuration:
        aiConfig,

      customerMessage:
        text,

      businessContext,
    });

  if (!reply.trim()) {
    throw new Error(
      "AI returned an empty reply."
    );
  }

  /*
   * ============================================================
   * 9. SEND THROUGH CHANNEL ADAPTER
   * ============================================================
   */
  console.log(
    "[AUTOMATION] Sending Instagram reply:"
  );

  const sendResult =
    await adapter.sendMessage({
      business_id:
        business.business_id,

      channel:
        message.channel,

      recipient_id:
        customerChannelId,

      text:
        reply.trim(),
    });

  /*
   * ============================================================
   * 10. SAVE OUTGOING MESSAGE
   * ============================================================
   */
  await saveOutgoingMessage(
    supabase,
    message,
    conversationId,
    reply.trim(),
    sendResult.channel_message_id
  );

  /*
   * ============================================================
   * 11. OUTBOX / INBOX
   * ============================================================
   */
  await saveInboxMessage(
    supabase,
    business,
    {
      ...message,
      customer_name:
        customer.name ||
        message.customer_name,
    },
    reply.trim(),
    "outbound",
    "sent"
  );

  await updateConversationOutgoing(
    supabase,
    conversation.id,
    reply.trim()
  );

  /*
   * ============================================================
   * 12. DONE
   * ============================================================
   */
  console.log(
    "[AUTOMATION] Completed successfully:",
    {
      business_id:
        business.business_id,

      customer_id:
        customer.id,

      conversation_id:
        conversationId,

      channel_message_id:
        sendResult.channel_message_id,
    }
  );

  return {
    success: true,

    handled: true,

    business_id:
      business.business_id,

    customer_id:
      customer.id,

    channel:
      message.channel,

    conversation_id:
      conversationId,

    reply:
      reply.trim(),

    channel_message_id:
      sendResult.channel_message_id,
  };
}