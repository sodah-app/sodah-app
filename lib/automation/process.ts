import { createServiceClient } from "@/lib/supabase/service";
import type {
  ChannelAdapter,
  SodahChannel,
} from "@/app/library/channels/types";

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
};

export async function processIncomingMessage(
  message: IncomingMessage,
  adapter: ChannelAdapter
) {
  /*
   * Server-side automation uses the Supabase
   * service-role client.
   *
   * business_id is the Sodah tenant identifier.
   * business.id is the UUID used by UUID columns.
   * business.user_id is the Supabase Auth UUID.
   */
  const supabase = createServiceClient();

  /*
   * 1. Resolve the Sodah business.
   */
  const {
    data: rawBusiness,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(
      [
        "id",
        "business_id",
        "user_id",
        "business_name",
      ].join(",")
    )
    .eq(
      "business_id",
      message.business_id
    )
    .maybeSingle();

  if (businessError) {
    throw new Error(
      `Business lookup failed: ${businessError.message}`
    );
  }

  if (!rawBusiness) {
    throw new Error(
      `Business not found: ${message.business_id}`
    );
  }

  /*
   * Explicitly define the business shape because
   * the current Supabase generated types are not
   * correctly describing the selected columns.
   */
  const business =
    rawBusiness as unknown as BusinessRow;

  if (!business.id) {
    throw new Error(
      `Business UUID is missing for: ${message.business_id}`
    );
  }

  if (!business.user_id) {
    throw new Error(
      `Business owner UUID is missing for: ${message.business_id}`
    );
  }

  /*
   * 2. Find an existing customer.
   */
  let customerId: string | null = null;

  if (message.customer_phone) {
    const {
      data: rawExistingCustomer,
      error: customerLookupError,
    } = await supabase
      .from("customers")
      .select("id")
      .eq(
        "business_id",
        message.business_id
      )
      .eq(
        "phone",
        message.customer_phone
      )
      .maybeSingle();

    if (customerLookupError) {
      throw new Error(
        `Customer lookup failed: ${customerLookupError.message}`
      );
    }

    const existingCustomer =
      rawExistingCustomer as
        | { id: string }
        | null;

    if (existingCustomer?.id) {
      customerId =
        existingCustomer.id;
    }
  }

  /*
   * 3. Create the customer if necessary.
   */
  if (!customerId) {
    const {
      data: rawNewCustomer,
      error: customerError,
    } = await supabase
      .from("customers")
      .insert({
        business_id:
          message.business_id,

        name:
          message.customer_name ||
          "Customer",

        phone:
          message.customer_phone ||
          message.customer_channel_id,

        channel:
          message.channel,

        lead_status:
          "new",
      })
      .select("id")
      .single();

    if (customerError) {
      throw new Error(
        `Customer creation failed: ${customerError.message}`
      );
    }

    const newCustomer =
      rawNewCustomer as unknown as {
        id: string;
      };

    if (!newCustomer?.id) {
      throw new Error(
        "Customer creation returned no customer ID."
      );
    }

    customerId =
      newCustomer.id;
  }

  /*
   * 4. Generate the test reply.
   *
   * The test adapter does not send a real
   * WhatsApp message.
   */
  const reply =
    `Hello ${message.customer_name || "there"}! ` +
    `Your message was received successfully. ` +
    `This is the Sodah automation test.`;

  /*
   * 5. Send through the channel adapter.
   */
  const sendResult =
    await adapter.sendMessage({
      business_id:
        message.business_id,

      channel:
        message.channel,

      recipient_id:
        message.customer_channel_id,

      text:
        reply,
    });

  /*
   * 6. Save incoming message to Inbox.
   *
   * IMPORTANT:
   *
   * inbox.business_id is a UUID column.
   * Therefore use business.id here.
   *
   * inbox.user_id is also a UUID column.
   * Therefore use business.user_id here.
   *
   * The current inbox table does not contain
   * channel_message_id.
   */
  const {
    error: inboxError,
  } = await supabase
    .from("inbox")
    .insert({
      business_id:
        business.id,

      user_id:
        business.user_id,

      channel:
        message.channel,

      direction:
        "inbound",

      contact_id:
        message.customer_channel_id,

      contact_name:
        message.customer_name ||
        "Customer",

      contact_username:
        null,

      message_text:
        message.text,

      message_type:
        "text",

      status:
        "received",
    });

  if (inboxError) {
    console.error(
      "[AUTOMATION] Inbox save failed:",
      inboxError
    );

    throw new Error(
      `Inbox save failed: ${inboxError.message}`
    );
  }

  /*
   * 7. Save outgoing test reply to Inbox.
   */
  const {
    error: replyInboxError,
  } = await supabase
    .from("inbox")
    .insert({
      business_id:
        business.id,

      user_id:
        business.user_id,

      channel:
        message.channel,

      direction:
        "outbound",

      contact_id:
        message.customer_channel_id,

      contact_name:
        message.customer_name ||
        "Customer",

      contact_username:
        null,

      message_text:
        reply,

      message_type:
        "text",

      status:
        "sent",
    });

  if (replyInboxError) {
    console.error(
      "[AUTOMATION] Reply inbox save failed:",
      replyInboxError
    );

    throw new Error(
      `Reply inbox save failed: ${replyInboxError.message}`
    );
  }

  /*
   * 8. Automation completed successfully.
   */
  return {
    success: true,

    handled: true,

    business_id:
      message.business_id,

    customer_id:
      customerId,

    channel:
      message.channel,

    conversation_id:
      message.conversation_id ??
      null,

    reply,

    channel_message_id:
      sendResult.channel_message_id,
  };
}