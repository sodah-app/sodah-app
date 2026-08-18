import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN =
  process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

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

    for (const entry of body.entry) {
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

      const {
        data: connection,
        error: connectionError,
      } = await supabase
        .from(
          "instagram_connections"
        )
        .select(
          "user_id, instagram_user_id, instagram_username"
        )
        .eq(
          "instagram_user_id",
          instagramBusinessId
        )
        .eq(
          "webhook_subscribed",
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
          "No active Sodah Instagram connection found:",
          instagramBusinessId
        );

        continue;
      }

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

      const messagingEvents =
        Array.isArray(entry?.messaging)
          ? entry.messaging
          : [];

      for (
        const event of messagingEvents
      ) {
        if (!event?.message) {
          continue;
        }

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

        const instagramMessageId =
          event?.message?.mid
            ? String(
                event.message.mid
              )
            : null;

        const messageText =
          typeof event?.message?.text ===
          "string"
            ? event.message.text
            : null;

        const messageType =
          event?.message?.attachments
            ? "attachment"
            : "text";

        const messageTimestamp =
          event?.timestamp
            ? new Date(
                Number(
                  event.timestamp
                )
              ).toISOString()
            : new Date().toISOString();

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
      }
    }

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