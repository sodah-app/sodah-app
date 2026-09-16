import { NextResponse } from "next/server";
import { processWhatsAppIncomingMessage } from "@/lib/automation/whatsapp-direct";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function internalToken() {
  return process.env.WHATSAPP_QR_INCOMING_TOKEN?.trim() || "";
}

function authorized(request) {
  const expected = internalToken();
  const received =
    request.headers.get("x-sodah-incoming-token")?.trim() || "";

  return Boolean(expected) && received === expected;
}

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "sodah-whatsapp-incoming",
    status: "ok",
  });
}

export async function POST(request) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = body?.data || {};
    const key = data?.key || {};
    const rawMessage = data?.message || {};

    const remoteJid = String(
      key?.remoteJid ||
        body?.remoteJid ||
        ""
    ).trim();

    const businessId = String(
      body?.business_id ||
        body?.instance ||
        body?.sessionId ||
        ""
    ).trim();

    const messageId = String(
      key?.id ||
        body?.message_id ||
        ""
    ).trim();

    const customerPhone = String(
      key?.senderPn ||
        (remoteJid.endsWith("@s.whatsapp.net")
          ? remoteJid.split("@")[0]
          : "") ||
        ""
    )
      .replace(/\D/g, "")
      .trim();

    const text =
      typeof rawMessage?.conversation === "string"
        ? rawMessage.conversation.trim()
        : typeof rawMessage?.extendedTextMessage?.text === "string"
        ? rawMessage.extendedTextMessage.text.trim()
        : typeof rawMessage?.imageMessage?.caption === "string"
        ? rawMessage.imageMessage.caption.trim()
        : typeof rawMessage?.videoMessage?.caption === "string"
        ? rawMessage.videoMessage.caption.trim()
        : "";

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          received: true,
          handled: false,
          reason: "missing_business_id",
        },
        { status: 400 }
      );
    }

    if (!remoteJid || !messageId) {
      return NextResponse.json({
        success: true,
        received: true,
        handled: false,
        reason: "not_a_customer_message",
      });
    }

    if (key?.fromMe === true) {
      return NextResponse.json({
        success: true,
        received: true,
        handled: false,
        reason: "from_me",
      });
    }

    if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) {
      return NextResponse.json({
        success: true,
        received: true,
        handled: false,
        reason: "group_or_broadcast_message",
      });
    }

    if (!text) {
      return NextResponse.json({
        success: true,
        received: true,
        handled: false,
        reason: "non_text_message",
      });
    }

    const result = await processWhatsAppIncomingMessage({
      business_id: businessId,
      customer_channel_id: remoteJid,
      customer_phone: customerPhone,
      customer_name: data?.pushName || body?.pushName || null,
      conversation_id: `${businessId}:whatsapp:${remoteJid}`,
      channel_message_id: messageId,
      message_type: data?.messageType || "text",
      timestamp:
        body?.timestamp ||
        data?.messageTimestamp ||
        new Date().toISOString(),
      text,
      raw: body,
    });

    return NextResponse.json({
      success: true,
      received: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "[WhatsApp Incoming] Processing failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        received: true,
        error:
          error instanceof Error
            ? error.message
            : "WhatsApp message processing failed.",
      },
      { status: 500 }
    );
  }
}
