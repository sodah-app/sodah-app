import { NextResponse } from "next/server";

import {
  processIncomingMessage,
} from "@/lib/automation/process";

import {
  createTestAdapter,
} from "@/lib/automation/testAdapter";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const message = {
      business_id: String(
        body.business_id || ""
      ).trim(),

      channel:
        body.channel || "whatsapp",

      account_id: String(
        body.account_id ||
          body.business_id ||
          ""
      ).trim(),

      customer_channel_id:
        String(
          body.customer_channel_id ||
            ""
        ).trim(),

      customer_name:
        body.customer_name || null,

      customer_phone:
        body.customer_phone || null,

      conversation_id:
        body.conversation_id || null,

      channel_message_id:
        String(
          body.channel_message_id ||
            `test-${Date.now()}`
        ).trim(),

      text:
        String(
          body.text || ""
        ).trim(),
    };

    if (
      !message.business_id ||
      !message.customer_channel_id ||
      !message.text
    ) {
      return NextResponse.json(
        {
          error:
            "business_id, customer_channel_id, and text are required.",
        },
        {
          status: 400,
        }
      );
    }

    const adapter =
      createTestAdapter();

    const result =
      await processIncomingMessage(
        message,
        adapter
      );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "[AUTOMATION TEST] Failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Automation test failed.",
      },
      {
        status: 500,
      }
    );
  }
}