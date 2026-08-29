import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processIncomingMessage } from "@/lib/automation/process";
import { createInstagramAdapter } from "@/app/library/channels/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TOKEN =
  process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ||
  "sodah_instagram_webhook";

type InstagramBusiness = {
  id: string;
  business_id: string;
  user_id?: string | null;
  business_name?: string | null;
  instagram_access_token?: string | null;
  instagram_user_id?: string | null;
  instagram_connected?: boolean | null;
};

/*
 * ============================================================
 * META WEBHOOK VERIFICATION
 * ============================================================
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get("hub.mode");
    const verifyToken =
      searchParams.get("hub.verify_token");
    const challenge =
      searchParams.get("hub.challenge");

    console.log(
      "[Instagram Webhook] Verification request:",
      {
        mode,
        verifyTokenMatches:
          verifyToken === VERIFY_TOKEN,
        hasChallenge:
          Boolean(challenge),
      }
    );

    if (
      mode === "subscribe" &&
      verifyToken === VERIFY_TOKEN &&
      challenge
    ) {
      console.log(
        "[Instagram Webhook] Verification successful"
      );

      return new NextResponse(challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-store",
        },
      });
    }

    console.error(
      "[Instagram Webhook] Verification failed"
    );

    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error(
      "[Instagram Webhook] Verification error:",
      error
    );

    return new NextResponse("Forbidden", {
      status: 403,
    });
  }
}

/*
 * ============================================================
 * REAL INSTAGRAM SEND
 * ============================================================
 */

async function sendInstagramMessage(
  input: {
    business_id: string;
    channel: "instagram";
    recipient_id: string;
    text: string;
  }
) {
  const supabase = createServiceClient();

  const {
    data: rawBusiness,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(
      [
        "id",
        "business_id",
        "instagram_access_token",
        "instagram_user_id",
        "instagram_connected",
      ].join(",")
    )
    .eq(
      "business_id",
      input.business_id
    )
    .maybeSingle();

  if (businessError) {
    throw new Error(
      `Instagram business lookup failed: ${businessError.message}`
    );
  }

  if (!rawBusiness) {
    throw new Error(
      `Instagram business not found: ${input.business_id}`
    );
  }

  const business =
    rawBusiness as unknown as InstagramBusiness;

  if (
    business.instagram_connected !== true
  ) {
    throw new Error(
      `Instagram is not connected for business: ${input.business_id}`
    );
  }

  const accessToken =
    business.instagram_access_token;

  const instagramUserId =
    business.instagram_user_id;

  if (!accessToken) {
    throw new Error(
      `Instagram access token is missing for business: ${input.business_id}`
    );
  }

  if (!instagramUserId) {
    throw new Error(
      `Instagram user ID is missing for business: ${input.business_id}`
    );
  }

  const graphVersion =
    process.env.META_GRAPH_VERSION ||
    "v25.0";

  const url =
    `https://graph.facebook.com/${graphVersion}/` +
    `${instagramUserId}/messages`;

  console.log(
    "[Instagram] Sending message:",
    {
      business_id:
        input.business_id,

      instagram_user_id:
        instagramUserId,

      recipient_id:
        input.recipient_id,

      text:
        input.text,
    }
  );

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      recipient: {
        id:
          input.recipient_id,
      },

      message: {
        text:
          input.text,
      },

      access_token:
        accessToken,
    }),
  });

  const responseText =
    await response.text();

  console.log(
    "[Instagram] Send response:",
    {
      status:
        response.status,

      ok:
        response.ok,

      response:
        responseText,
    }
  );

  let data: any = {};

  if (responseText) {
    try {
      data =
        JSON.parse(
          responseText
        );
    } catch {
      data = {
        raw:
          responseText,
      };
    }
  }

  if (!response.ok) {
    throw new Error(
      `Instagram message failed: ${
        data?.error?.message ||
        responseText ||
        `HTTP ${response.status}`
      }`
    );
  }

  const channelMessageId =
    data?.message_id ||
    data?.id ||
    `instagram-${Date.now()}`;

  return {
    channel_message_id:
      channelMessageId,
  };
}

/*
 * ============================================================
 * INSTAGRAM WEBHOOK
 * ============================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    /*
     * IMPORTANT:
     * Log the complete payload so we can see exactly
     * what Meta sends for each Instagram event.
     */
    console.log(
      "[Instagram Webhook] FULL PAYLOAD:",
      JSON.stringify(
        body,
        null,
        2
      )
    );

    console.log(
      "[Instagram Webhook] EVENT RECEIVED:",
      {
        object:
          body?.object,

        entryCount:
          Array.isArray(body?.entry)
            ? body.entry.length
            : 0,
      }
    );

    /*
     * ========================================================
     * VALIDATE OBJECT
     * ========================================================
     */

    if (
      body?.object !==
      "instagram"
    ) {
      console.log(
        "[Instagram Webhook] Ignoring non-Instagram event."
      );

      return NextResponse.json({
        success: true,
        received: true,
        ignored: true,
        reason:
          "non_instagram_event",
      });
    }

    const results: any[] = [];

    /*
     * ========================================================
     * PROCESS EVERY ENTRY
     * ========================================================
     */

    const entries =
      Array.isArray(body?.entry)
        ? body.entry
        : [];

    if (entries.length === 0) {
      console.warn(
        "[Instagram Webhook] No entry array found."
      );

      return NextResponse.json({
        success: true,
        received: true,
        processed: 0,
        results: [],
      });
    }

    for (const entry of entries) {
      /*
       * ======================================================
       * INSTAGRAM BUSINESS ACCOUNT ID
       * ======================================================
       */

      const instagramAccountId =
        String(
          entry?.id ||
            ""
        ).trim();

      console.log(
        "[Instagram Webhook] Entry:",
        {
          instagram_account_id:
            instagramAccountId,

          hasMessaging:
            Array.isArray(
              entry?.messaging
            ),

          messagingCount:
            Array.isArray(
              entry?.messaging
            )
              ? entry.messaging.length
              : 0,
        }
      );

      if (!instagramAccountId) {
        console.warn(
          "[Instagram Webhook] Entry has no Instagram account ID."
        );

        results.push({
          handled: false,
          reason:
            "missing_instagram_account_id",
        });

        continue;
      }

      /*
       * ======================================================
       * MESSAGING EVENTS
       * ======================================================
       */

      const messagingEvents =
        Array.isArray(
          entry?.messaging
        )
          ? entry.messaging
          : [];

      /*
       * This is important.
       *
       * Meta can send webhook events that are NOT customer
       * messages. For example:
       *
       * - comments
       * - live comments
       * - account events
       * - other subscribed fields
       *
       * Those events should not be sent into the AI engine.
       */

      if (
        messagingEvents.length === 0
      ) {
        console.log(
          "[Instagram Webhook] Entry contains no messaging events."
        );

        results.push({
          handled: false,
          reason:
            "no_messaging_events",

          instagram_account_id:
            instagramAccountId,
        });

        continue;
      }

      /*
       * ======================================================
       * PROCESS MESSAGING EVENTS
       * ======================================================
       */

      for (
        const messagingEvent of
        messagingEvents
      ) {
        /*
         * Log the individual messaging event.
         *
         * This makes the Vercel log much easier to debug.
         */
        console.log(
          "[Instagram Webhook] MESSAGING EVENT:",
          JSON.stringify(
            messagingEvent,
            null,
            2
          )
        );

        /*
         * ====================================================
         * SENDER
         * ====================================================
         */

        const senderId =
          String(
            messagingEvent
              ?.sender
              ?.id ||
              ""
          ).trim();

        /*
         * ====================================================
         * RECIPIENT
         * ====================================================
         */

        const recipientId =
          String(
            messagingEvent
              ?.recipient
              ?.id ||
              ""
          ).trim();

        /*
         * ====================================================
         * MESSAGE
         * ====================================================
         */

        const message =
          messagingEvent?.message;

        /*
         * If there is no sender, this is not a customer
         * message that our automation can process.
         */

        if (!senderId) {
          console.warn(
            "[Instagram Webhook] Messaging event has no sender ID.",
            {
              instagram_account_id:
                instagramAccountId,

              recipient_id:
                recipientId,

              event_keys:
                Object.keys(
                  messagingEvent || {}
                ),
            }
          );

          results.push({
            handled: false,

            reason:
              "missing_sender_id",

            instagram_account_id:
              instagramAccountId,
          });

          continue;
        }

        /*
         * ====================================================
         * IGNORE OUR OWN MESSAGE ECHO
         * ====================================================
         */

        if (
          message?.is_echo ===
          true
        ) {
          console.log(
            "[Instagram Webhook] Ignoring Instagram echo."
          );

          results.push({
            handled: false,

            reason:
              "message_echo",

            instagram_account_id:
              instagramAccountId,

            sender_id:
              senderId,
          });

          continue;
        }

        /*
         * ====================================================
         * TEXT
         * ====================================================
         */

        const text =
          message?.text;

        if (
          typeof text !==
            "string" ||
          !text.trim()
        ) {
          console.log(
            "[Instagram Webhook] Ignoring non-text event.",
            {
              instagram_account_id:
                instagramAccountId,

              sender_id:
                senderId,

              event_keys:
                Object.keys(
                  messagingEvent || {}
                ),

              message_keys:
                Object.keys(
                  message || {}
                ),
            }
          );

          results.push({
            handled: false,

            reason:
              "non_text_message",

            instagram_account_id:
              instagramAccountId,

            sender_id:
              senderId,
          });

          continue;
        }

        /*
         * ====================================================
         * MESSAGE ID
         * ====================================================
         */

        const messageId =
          String(
            message?.mid ||
              `instagram-${Date.now()}`
          );

        /*
         * ====================================================
         * CONVERSATION ID
         * ====================================================
         */

        const conversationId =
          message?.thread_id ||
          messagingEvent
            ?.conversation_id ||
          null;

        /*
         * ====================================================
         * RESOLVE SODAH TENANT
         * ====================================================
         *
         * Meta Instagram account ID:
         *
         *     instagram_user_id
         *
         * Sodah tenant ID:
         *
         *     BIZ-XXXXXXXX
         *
         * These are different identifiers.
         */

        const supabase =
          createServiceClient();

        const {
          data: rawBusiness,
          error:
            businessError,
        } = await supabase
          .from("businesses")
          .select(
            [
              "id",
              "business_id",
              "user_id",
              "business_name",
              "instagram_user_id",
              "instagram_connected",
            ].join(",")
          )
          .eq(
            "instagram_user_id",
            instagramAccountId
          )
          .maybeSingle();

        if (businessError) {
          throw new Error(
            `Instagram tenant lookup failed: ${businessError.message}`
          );
        }

        if (!rawBusiness) {
          console.warn(
            "[Instagram Webhook] No Sodah business found for Instagram account:",
            instagramAccountId
          );

          results.push({
            handled: false,

            reason:
              "instagram_account_not_connected",

            instagram_account_id:
              instagramAccountId,

            sender_id:
              senderId,
          });

          continue;
        }

        const business =
          rawBusiness as unknown as InstagramBusiness;

        /*
         * ====================================================
         * VERIFY CONNECTION
         * ====================================================
         */

        if (
          business.instagram_connected !==
          true
        ) {
          console.warn(
            "[Instagram Webhook] Instagram is not marked connected:",
            business.business_id
          );

          results.push({
            handled: false,

            reason:
              "instagram_not_connected",

            business_id:
              business.business_id,

            instagram_account_id:
              instagramAccountId,
          });

          continue;
        }

        /*
         * ====================================================
         * CREATE INSTAGRAM ADAPTER
         * ====================================================
         */

        const adapter =
          createInstagramAdapter({
            send:
              sendInstagramMessage,
          });

        /*
         * ====================================================
         * SEND INTO SODAH AUTOMATION ENGINE
         * ====================================================
         */

        console.log(
          "[Instagram Webhook] Processing message:",
          {
            business_id:
              business.business_id,

            instagram_account_id:
              instagramAccountId,

            customer_id:
              senderId,

            message_id:
              messageId,

            conversation_id:
              conversationId,

            text:
              text.trim(),
          }
        );

        const result =
          await processIncomingMessage(
            {
              business_id:
                business.business_id,

              channel:
                "instagram",

              account_id:
                instagramAccountId,

              customer_channel_id:
                senderId,

              customer_name:
                null,

              customer_phone:
                null,

              conversation_id:
                conversationId,

              channel_message_id:
                messageId,

              text:
                text.trim(),
            },

            adapter
          );

        results.push({
          ...result,

          instagram_account_id:
            instagramAccountId,

          sender_id:
            senderId,
        });

        console.log(
          "[Instagram Webhook] Automation completed:",
          result
        );
      }
    }

    /*
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return NextResponse.json({
      success: true,

      received: true,

      processed:
        results.filter(
          (item) =>
            item?.handled ===
            true
        ).length,

      events:
        results.length,

      results,
    });
  } catch (error) {
    console.error(
      "[Instagram Webhook] POST error:",
      error
    );

    /*
     * Always acknowledge Meta with HTTP 200.
     */
    return NextResponse.json(
      {
        success: false,

        received: true,

        error:
          error instanceof Error
            ? error.message
            : "Instagram webhook processing failed.",
      },
      {
        status: 200,
      }
    );
  }
}