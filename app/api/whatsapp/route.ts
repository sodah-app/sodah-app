import { NextRequest, NextResponse } from "next/server";

import { processIncomingMessage } from "@/lib/automation/process";
import type {
  ChannelAdapter,
  SodahChannel,
} from "@/app/library/channels/types";

type EvolutionMessagePayload = {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };

    pushName?: string;

    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
      imageMessage?: {
        caption?: string;
      };
      videoMessage?: {
        caption?: string;
      };
    };

    messageTimestamp?: number;
  };
};

function extractText(
  data: EvolutionMessagePayload["data"]
): string {
  return (
    data?.message?.conversation ??
    data?.message?.extendedTextMessage?.text ??
    data?.message?.imageMessage?.caption ??
    data?.message?.videoMessage?.caption ??
    ""
  ).trim();
}

function createWhatsAppAdapter(
  instanceName: string
): ChannelAdapter {
  const apiUrl =
    process.env.EVOLUTION_API_URL;

  const apiKey =
    process.env.EVOLUTION_API_KEY;

  if (!apiUrl) {
    throw new Error(
      "EVOLUTION_API_URL is not configured."
    );
  }

  if (!apiKey) {
    throw new Error(
      "EVOLUTION_API_KEY is not configured."
    );
  }

  return {
    channel: "whatsapp" as SodahChannel,

    async sendMessage(input) {
      const response = await fetch(
        `${apiUrl}/message/sendText/${encodeURIComponent(
          instanceName
        )}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            apikey: apiKey,
          },

          body: JSON.stringify({
            number:
              input.recipient_id,

            text:
              input.text,
          }),

          cache: "no-store",
        }
      );

      const responseText =
        await response.text();

      let responseData: unknown = null;

      try {
        responseData =
          responseText
            ? JSON.parse(responseText)
            : null;
      } catch {
        responseData =
          responseText;
      }

      if (!response.ok) {
        console.error(
          "[WHATSAPP][SEND] Failed:",
          responseData
        );

        throw new Error(
          `WhatsApp send failed: ${response.status}`
        );
      }

      const result =
        responseData as {
          key?: {
            id?: string;
          };
          messageId?: string;
          id?: string;
        };

      return {
        channel_message_id:
          result?.key?.id ??
          result?.messageId ??
          result?.id ??
          `whatsapp-${Date.now()}`,
      };
    },
  };
}

export async function POST(
  request: NextRequest
) {
  try {
    const payload =
      (await request.json()) as EvolutionMessagePayload;

    console.log(
      "[WHATSAPP][WEBHOOK]",
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    const event =
      String(
        payload.event ?? ""
      ).toUpperCase();

    const instance =
      String(
        payload.instance ?? ""
      ).trim();

    /*
     * We only process incoming messages.
     */
    if (
      event !==
      "MESSAGES_UPSERT"
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
        event,
      });
    }

    if (!instance) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp instance is missing.",
        },
        { status: 400 }
      );
    }

    const data =
      payload.data;

    const key =
      data?.key;

    if (!key) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason:
          "Message key missing.",
      });
    }

    /*
     * Do not process messages sent by
     * the business itself.
     */
    if (key.fromMe) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason:
          "Outgoing WhatsApp message.",
      });
    }

    const remoteJid =
      String(
        key.remoteJid ?? ""
      ).trim();

    if (!remoteJid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp customer ID is missing.",
        },
        { status: 400 }
      );
    }

    /*
     * Ignore WhatsApp groups for now.
     */
    if (
      remoteJid.endsWith(
        "@g.us"
      )
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason:
          "Group message.",
      });
    }

    /*
     * WhatsApp JID:
     *
     * 971501234567@s.whatsapp.net
     *
     * Convert it to the customer number.
     */
    const customerChannelId =
      remoteJid
        .replace(
          "@s.whatsapp.net",
          ""
        )
        .trim();

    const text =
      extractText(data);

    /*
     * Ignore messages that do not contain
     * text for this first real automation
     * implementation.
     */
    if (!text) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason:
          "No text message found.",
      });
    }

    /*
     * IMPORTANT:
     *
     * The Evolution instance name is our
     * current Sodah business_id.
     *
     * Example:
     *
     * instance =
     * BIZ-1785669021522
     */
    const businessId =
      instance;

    const adapter =
      createWhatsAppAdapter(
        instance
      );

    const result =
      await processIncomingMessage(
        {
          business_id:
            businessId,

          channel:
            "whatsapp",

          account_id:
            instance,

          customer_channel_id:
            customerChannelId,

          customer_name:
            data?.pushName ??
            null,

          customer_phone:
            customerChannelId,

          conversation_id:
            remoteJid,

          channel_message_id:
            key.id ??
            `whatsapp-${Date.now()}`,

          text,
        },

        adapter
      );

    console.log(
      "[WHATSAPP][AUTOMATION] Completed:",
      result
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP][AUTOMATION] Failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "WhatsApp automation failed.",
      },
      { status: 500 }
    );
  }
}