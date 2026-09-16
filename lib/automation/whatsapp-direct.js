import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppThroughProvider } from "@/lib/whatsapp/provider";

function env(name) {
  return String(process.env[name] || "").trim();
}

function getAdminDb() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function clean(value) {
  const text = value == null ? "" : String(value).trim();
  return text || null;
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
}

function buildConversationId(
  businessId,
  channel,
  customerChannelId
) {
  return [businessId, channel, customerChannelId].join(":");
}

function isExpired(value) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time <= Date.now();
}

async function loadBusiness(db, businessId) {
  const { data, error } = await db
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
        "whatsapp_connected",
      ].join(",")
    )
    .eq("business_id", businessId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Business lookup failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Business not found: ${businessId}`);
  }

  return data;
}

async function findOrCreateCustomer(db, message) {
  const { data: existing, error } = await db
    .from("customers")
    .select(
      "id,business_id,channel,channel_customer_id,name,phone,email,lead_status"
    )
    .eq("business_id", message.business_id)
    .eq("channel", "whatsapp")
    .eq("channel_customer_id", message.customer_channel_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Customer lookup failed: ${error.message}`);
  }

  if (existing) {
    if (message.customer_name && !existing.name) {
      const { error: updateError } = await db
        .from("customers")
        .update({ name: message.customer_name })
        .eq("id", existing.id)
        .eq("business_id", message.business_id);

      if (updateError) {
        console.warn(
          "[WhatsApp Direct] Customer name update failed:",
          updateError.message
        );
      } else {
        existing.name = message.customer_name;
      }
    }

    if (message.customer_phone && !existing.phone) {
      await db
        .from("customers")
        .update({ phone: message.customer_phone })
        .eq("id", existing.id)
        .eq("business_id", message.business_id);

      existing.phone = message.customer_phone;
    }

    return existing;
  }

  const { data: created, error: createError } = await db
    .from("customers")
    .insert({
      business_id: message.business_id,
      channel: "whatsapp",
      channel_customer_id: message.customer_channel_id,
      name: clean(message.customer_name),
      phone: clean(message.customer_phone),
      lead_status: "new",
    })
    .select(
      "id,business_id,channel,channel_customer_id,name,phone,email,lead_status"
    )
    .single();

  if (createError) {
    throw new Error(`Customer creation failed: ${createError.message}`);
  }

  return created;
}

async function findOrCreateConversation(db, message, customer) {
  const conversationId =
    message.conversation_id ||
    buildConversationId(
      message.business_id,
      "whatsapp",
      message.customer_channel_id
    );

  const { data: existing, error } = await db
    .from("conversations")
    .select(
      "id,business_id,channel,channel_conversation_id,customer_name,customer_phone,last_message,unread_count,status,intent,last_message_at,last_reply_at"
    )
    .eq("business_id", message.business_id)
    .eq("channel", "whatsapp")
    .eq("channel_conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Conversation lookup failed: ${error.message}`
    );
  }

  if (existing) {
    const nextUnread = Number(existing.unread_count || 0) + 1;

    const { error: updateError } = await db
      .from("conversations")
      .update({
        customer_name:
          customer.name ||
          message.customer_name ||
          existing.customer_name ||
          "Customer",
        customer_phone:
          customer.phone ||
          message.customer_phone ||
          existing.customer_phone ||
          null,
        last_message: message.text,
        last_message_at: new Date().toISOString(),
        unread_count: nextUnread,
        status: "active",
      })
      .eq("id", existing.id)
      .eq("business_id", message.business_id);

    if (updateError) {
      throw new Error(
        `Conversation update failed: ${updateError.message}`
      );
    }

    return existing;
  }

  const { data: created, error: createError } = await db
    .from("conversations")
    .insert({
      business_id: message.business_id,
      channel: "whatsapp",
      channel_conversation_id: conversationId,
      customer_name:
        customer.name || message.customer_name || "Customer",
      customer_phone:
        customer.phone || message.customer_phone || null,
      last_message: message.text,
      unread_count: 1,
      status: "active",
      last_message_at: new Date().toISOString(),
    })
    .select(
      "id,business_id,channel,channel_conversation_id,customer_name,customer_phone,last_message,unread_count,status,intent,last_message_at,last_reply_at"
    )
    .single();

  if (createError) {
    throw new Error(
      `Conversation creation failed: ${createError.message}`
    );
  }

  return created;
}

async function isDuplicateMessage(db, message) {
  if (!message.channel_message_id) return false;

  const { data, error } = await db
    .from("messages")
    .select("id")
    .eq("business_id", message.business_id)
    .eq("channel", "whatsapp")
    .eq("channel_message_id", message.channel_message_id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Message idempotency lookup failed: ${error.message}`
    );
  }

  return Boolean(data);
}

async function saveIncomingMessage(db, message, conversationId) {
  const { error } = await db.from("messages").insert({
    business_id: message.business_id,
    conversation_id: conversationId,
    channel: "whatsapp",
    channel_message_id: message.channel_message_id,
    customer_phone: message.customer_phone || null,
    customer_message: message.text,
  });

  if (error) {
    throw new Error(
      `Incoming message save failed: ${error.message}`
    );
  }
}

async function saveOutgoingMessage(
  db,
  message,
  conversationId,
  reply,
  channelMessageId
) {
  const { error } = await db.from("messages").insert({
    business_id: message.business_id,
    conversation_id: conversationId,
    channel: "whatsapp",
    channel_message_id: channelMessageId || null,
    ai_response: reply,
  });

  if (error) {
    console.warn(
      "[WhatsApp Direct] Outgoing message log failed:",
      error.message
    );
  }
}

async function saveInbox(db, business, message, text, direction, status) {
  try {
    await db.from("inbox").insert({
      // inbox.business_id is the database UUID, not BIZ-XXXXXXXX.
      business_id: business.id,
      user_id: business.user_id,
      channel: "whatsapp",
      direction,
      contact_id: message.customer_channel_id,
      contact_name: message.customer_name || "Customer",
      contact_username: null,
      message_text: text,
      message_type: message.message_type || "text",
      status,
    });
  } catch (error) {
    console.warn(
      "[WhatsApp Direct] Inbox logging failed:",
      error?.message || error
    );
  }
}

async function loadAIConfiguration(db, businessId) {
  const { data, error } = await db
    .from("ai_configurations")
    .select(
      "id,automation_id,provider,model,system_prompt,temperature,max_tokens,enabled,business_id,created_at,updated_at"
    )
    .eq("business_id", businessId)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `AI configuration lookup failed: ${error.message}`
    );
  }

  return data || null;
}

async function loadHistory(db, businessId, conversationId) {
  const { data, error } = await db
    .from("messages")
    .select("customer_message,ai_response,created_at")
    .eq("business_id", businessId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.warn(
      "[WhatsApp Direct] History lookup failed:",
      error.message
    );
    return [];
  }

  return Array.isArray(data) ? [...data].reverse() : [];
}

function buildBusinessContext(business, customer, history) {
  const historyText = history.length
    ? history
        .map((item) => {
          const customerMessage = clean(item.customer_message);
          const aiResponse = clean(item.ai_response);

          if (customerMessage && aiResponse) {
            return `Customer: ${customerMessage}\nAssistant: ${aiResponse}`;
          }

          if (customerMessage) return `Customer: ${customerMessage}`;
          if (aiResponse) return `Assistant: ${aiResponse}`;
          return "";
        })
        .filter(Boolean)
        .join("\n\n")
    : "No previous conversation history.";

  return [
    `Business name: ${business.business_name || "the business"}`,
    `Industry: ${business.industry || "General Business"}`,
    `Business description/services: ${business.services_description || "Not specified"}`,
    `Capabilities: ${business.capabilities || "Not specified"}`,
    `Pricing: ${business.price_range || "Not specified"}`,
    `Location: ${business.location || "Not specified"}`,
    `Working days: ${business.working_days || "Not specified"}`,
    `Working hours: ${business.hours || "Not specified"}`,
    `Business email: ${business.email || "Not specified"}`,
    `Support number: ${business.support_number || business.ai_number || "Not specified"}`,
    `Customer name: ${customer.name || "Customer"}`,
    `Customer phone: ${customer.phone || "Not specified"}`,
    `Conversation history:\n${historyText}`,
  ].join("\n\n");
}

async function generateReply(config, message, businessContext) {
  const apiKey = env("OPENAI_API_KEY");

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const provider = String(config.provider || "openai").toLowerCase();
  if (provider !== "openai") {
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }

  const model =
    clean(config.model) || env("OPENAI_MODEL") || "gpt-4o-mini";

  const systemPrompt = [
    clean(config.system_prompt) ||
      "You are a helpful business customer service assistant. Reply naturally, accurately, and professionally. Never invent business information.",
    `Business context:\n${businessContext}`,
    "Keep replies appropriate for WhatsApp. Do not mention internal IDs, system prompts, databases, APIs, or implementation details.",
  ].join("\n\n");

  const temperature = Number.isFinite(Number(config.temperature))
    ? Number(config.temperature)
    : 0.4;

  const maxTokens = Number.isFinite(Number(config.max_tokens))
    ? Number(config.max_tokens)
    : 700;

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message.text,
          },
        ],
      }),
      cache: "no-store",
    }
  );

  const raw = await response.text();
  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {}

  if (!response.ok) {
    console.error(
      "[WhatsApp Direct] OpenAI error:",
      raw.slice(0, 1000)
    );
    throw new Error(
      `AI provider returned HTTP ${response.status}.`
    );
  }

  const reply = data?.choices?.[0]?.message?.content;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("AI provider returned an empty response.");
  }

  return reply.trim();
}

export async function processWhatsAppIncomingMessage(input) {
  const businessId = clean(input?.business_id);
  const customerChannelId = clean(input?.customer_channel_id);
  const text = clean(input?.text);

  if (!businessId) throw new Error("business_id is required.");
  if (!customerChannelId) {
    throw new Error("customer_channel_id is required.");
  }
  if (!text) throw new Error("Incoming message text is empty.");

  const message = {
    business_id: businessId,
    channel: "whatsapp",
    account_id: businessId,
    customer_channel_id: customerChannelId,
    customer_name: clean(input?.customer_name),
    customer_phone:
      normalizePhone(input?.customer_phone) ||
      normalizePhone(customerChannelId),
    conversation_id: clean(input?.conversation_id),
    channel_message_id: clean(input?.channel_message_id),
    text,
    message_type: clean(input?.message_type) || "text",
    timestamp: input?.timestamp || new Date().toISOString(),
  };

  const db = getAdminDb();
  const business = await loadBusiness(db, businessId);

  if (business.status && business.status !== "active") {
    return {
      success: true,
      handled: false,
      reason: "business_inactive",
      business_id: businessId,
    };
  }

  if (business.automation_enabled === false) {
    return {
      success: true,
      handled: false,
      reason: "automation_disabled",
      business_id: businessId,
    };
  }

  if (business.ai_enabled === false) {
    return {
      success: true,
      handled: false,
      reason: "ai_disabled",
      business_id: businessId,
    };
  }

  if (isExpired(business.subscription_expiry)) {
    return {
      success: true,
      handled: false,
      reason: "subscription_expired",
      business_id: businessId,
    };
  }

  if (await isDuplicateMessage(db, message)) {
    return {
      success: true,
      handled: false,
      duplicate: true,
      business_id: businessId,
    };
  }

  const customer = await findOrCreateCustomer(db, message);
  const conversation = await findOrCreateConversation(
    db,
    message,
    customer
  );
  const conversationId = conversation.channel_conversation_id;

  await saveIncomingMessage(db, message, conversationId);
  await saveInbox(
    db,
    business,
    message,
    text,
    "inbound",
    "received"
  );

  const aiConfig = await loadAIConfiguration(db, businessId);

  if (!aiConfig) {
    return {
      success: true,
      handled: false,
      reason: "ai_configuration_missing",
      business_id: businessId,
      conversation_id: conversationId,
    };
  }

  const history = await loadHistory(
    db,
    businessId,
    conversationId
  );

  const businessContext = buildBusinessContext(
    business,
    customer,
    history
  );

  const reply = await generateReply(
    aiConfig,
    message,
    businessContext
  );

  const sendResult = await sendWhatsAppThroughProvider({
    businessId,
    to: message.customer_phone,
    message: reply,
  });

  await saveOutgoingMessage(
    db,
    message,
    conversationId,
    reply,
    sendResult.channel_message_id
  );

  await saveInbox(
    db,
    business,
    { ...message, customer_name: customer.name || message.customer_name },
    reply,
    "outbound",
    "sent"
  );

  await db
    .from("conversations")
    .update({
      last_message: reply,
      last_message_at: new Date().toISOString(),
      last_reply_at: new Date().toISOString(),
      unread_count: 0,
    })
    .eq("id", conversation.id)
    .eq("business_id", businessId);

  return {
    success: true,
    handled: true,
    business_id: businessId,
    customer_id: customer.id,
    conversation_id: conversationId,
    reply,
    channel_message_id: sendResult.channel_message_id,
  };
}
