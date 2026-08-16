import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN =
  process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

/* -------------------------------------------------------------------------- */
/* SUPABASE ADMIN                                                             */
/* -------------------------------------------------------------------------- */

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* -------------------------------------------------------------------------- */
/* META WEBHOOK VERIFICATION                                                  */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest
) {
  const { searchParams } =
    new URL(request.url);

  const mode =
    searchParams.get("hub.mode");

  const token =
    searchParams.get("hub.verify_token");

  const challenge =
    searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    VERIFY_TOKEN &&
    token === VERIFY_TOKEN
  ) {
    return new NextResponse(
      challenge,
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  }

  return NextResponse.json(
    {
      error:
        "Invalid verification request",
    },
    {
      status: 403,
    }
  );
}

/* -------------------------------------------------------------------------- */
/* INSTAGRAM WEBHOOK                                                          */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    console.log(
      "📩 INSTAGRAM WEBHOOK:",
      JSON.stringify(
        body,
        null,
        2
      )
    );

    /*
     * Instagram sends webhook events inside:
     *
     * body.entry[]
     *
     * Each entry represents the Instagram professional
     * account that received the event.
     */

    if (
      body?.object !== "instagram" ||
      !Array.isArray(body?.entry)
    ) {
      return NextResponse.json(
        {
          received: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    const supabase =
      getSupabaseAdmin();

    /* ---------------------------------------------------------------------- */
    /* PROCESS EVERY INSTAGRAM ENTRY                                          */
    /* ---------------------------------------------------------------------- */

    for (const entry of body.entry) {
      /*
       * This is the Instagram account ID that owns
       * the webhook event.
       */
      const instagramBusinessId =
        entry?.id
          ? String(entry.id)
          : null;

      if (!instagramBusinessId) {
        console.warn(
          "Instagram webhook entry has no account ID."
        );

        continue;
      }

      /*
       * ---------------------------------------------------------------
       * FIND THE SODAH TENANT
       * ---------------------------------------------------------------
       *
       * The Instagram account is already connected through
       * instagram_connections.
       *
       * We use that connection to determine which Sodah
       * business owns this Instagram account.
       */

      const {
        data: connection,
        error: connectionError,
      } = await supabase
        .from(
          "instagram_connections"
        )
        .select(
          "user_id, instagram_user_id, username"
        )
        .eq(
          "instagram_user_id",
          instagramBusinessId
        )
        .eq(
          "connected",
          true
        )
        .maybeSingle();

      if (connectionError) {
        console.error(
          "Instagram connection lookup failed:",
          connectionError
        );

        continue;
      }

      if (!connection) {
        console.warn(
          "No Sodah connection found for Instagram account:",
          instagramBusinessId
        );

        continue;
      }

      /*
       * ---------------------------------------------------------------
       * FIND BUSINESS / TENANT
       * ---------------------------------------------------------------
       */

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id")
        .eq(
          "user_id",
          connection.user_id
        )
        .maybeSingle();

      if (businessError) {
        console.error(
          "Business lookup failed:",
          businessError
        );

        continue;
      }

      if (!business) {
        console.warn(
          "No business found for Instagram connection:",
          connection.user_id
        );

        continue;
      }

      const businessId =
        business.id;

      /*
       * ---------------------------------------------------------------
       * PROCESS MESSAGING EVENTS
       * ---------------------------------------------------------------
       */

      const messagingEvents =
        Array.isArray(entry?.messaging)
          ? entry.messaging
          : [];

      for (
        const event of messagingEvents
      ) {
        /*
         * Ignore events that are not actual messages.
         *
         * This prevents delivery/read/etc. events from becoming
         * fake Inbox messages.
         */

        if (!event?.message) {
          continue;
        }

        /*
         * -------------------------------------------------------------
         * SENDER
         * -------------------------------------------------------------
         */

        const senderId =
          event?.sender?.id
            ? String(
                event.sender.id
              )
            : null;

        if (!senderId) {
          console.warn(
            "Instagram message has no sender ID."
          );

          continue;
        }

        /*
         * -------------------------------------------------------------
         * MESSAGE ID
         * -------------------------------------------------------------
         */

        const instagramMessageId =
          event?.message?.mid
            ? String(
                event.message.mid
              )
            : null;

        /*
         * -------------------------------------------------------------
         * MESSAGE TEXT
         * -------------------------------------------------------------
         */

        const messageText =
          typeof event?.message?.text ===
          "string"
            ? event.message.text
            : null;

        /*
         * -------------------------------------------------------------
         * MESSAGE TYPE
         * -------------------------------------------------------------
         */

        let messageType =
          "text";

        if (
          event?.message?.attachments
        ) {
          messageType =
            "attachment";
        }

        /*
         * -------------------------------------------------------------
         * TIMESTAMP
         * -------------------------------------------------------------
         */

        const messageTimestamp =
          event?.timestamp
            ? new Date(
                Number(
                  event.timestamp
                )
              ).toISOString()
            : new Date().toISOString();

        /*
         * -------------------------------------------------------------
         * DUPLICATE PROTECTION
         * -------------------------------------------------------------
         *
         * Meta can retry webhook events.
         *
         * Check whether this message already exists before
         * inserting it.
         */

        if (
          instagramMessageId
        ) {
          const {
            data: existingMessage,
            error: existingError,
          } = await supabase
            .from("inbox")
            .select("id")
            .eq(
              "business_id",
              businessId
            )
            .eq(
              "instagram_message_id",
              instagramMessageId
            )
            .maybeSingle();

          if (existingError) {
            console.error(
              "Inbox duplicate check failed:",
              existingError
            );

            continue;
          }

          if (existingMessage) {
            console.log(
              "Instagram message already exists:",
              instagramMessageId
            );

            continue;
          }
        }

        /*
         * -------------------------------------------------------------
         * SAVE TO MULTI-TENANT INBOX
         * -------------------------------------------------------------
         */

        const {
          error: inboxError,
        } = await supabase
          .from("inbox")
          .insert({
            business_id:
              businessId,

            user_id:
              connection.user_id,

            channel:
              "instagram",

            direction:
              "inbound",

            contact_id:
              senderId,

            instagram_user_id:
              senderId,

            instagram_message_id:
              instagramMessageId,

            message_type:
              messageType,

            message_text:
              messageText,

            status:
              "received",

            is_ai_generated:
              false,

            message_timestamp:
              messageTimestamp,
          });

        if (inboxError) {
          console.error(
            "Failed to save Instagram message to Inbox:",
            inboxError
          );

          continue;
        }

        console.log(
          "✅ Instagram message saved to Inbox",
          {
            businessId,
            senderId,
            instagramMessageId,
          }
        );

        /*
         * -------------------------------------------------------------
         * AI COMES NEXT
         * -------------------------------------------------------------
         *
         * DO NOT call the AI here yet.
         *
         * First we confirm that Instagram messages are correctly
         * reaching the correct tenant's Inbox.
         *
         * After this works, this exact message will be passed into
         * the existing AI workflow.
         */
      }
    }

    /*
     * ---------------------------------------------------------------
     * ALWAYS ACKNOWLEDGE META QUICKLY
     * ---------------------------------------------------------------
     *
     * Meta expects a successful response.
     */

    return NextResponse.json(
      {
        received: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Instagram webhook error:",
      error
    );

    /*
     * Even if our internal processing fails,
     * return a response instead of repeatedly crashing
     * the webhook request.
     */

    return NextResponse.json(
      {
        received: true,
      },
      {
        status: 200,
      }
    );
  }
}