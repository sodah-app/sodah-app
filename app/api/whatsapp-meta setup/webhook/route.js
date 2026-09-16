import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/whatsapp/auth";
import { sendWhatsAppText } from "@/lib/whatsapp/cloud-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

 const expected =
  (
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    process.env.META_WEBHOOK_VERIFY_TOKEN
  )?.trim();

  if (
    mode === "subscribe" &&
    expected &&
    token === expected &&
    challenge
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { success: false, message: "Webhook verification failed." },
    { status: 403 }
  );
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const db = adminSupabase();

    // Meta can send account-level events that do not contain messages.
    if (payload?.object !== "whatsapp_business_account") {
      return NextResponse.json({ success: true });
    }

    for (const entry of payload.entry || []) {
      const wabaId = entry?.id;

      for (const change of entry?.changes || []) {
        const value = change?.value || {};
        const phoneNumberId = value?.metadata?.phone_number_id;

        if (!phoneNumberId) continue;

        const { data: connection, error: connectionError } = await db
          .from("whatsapp_connections")
          .select("*")
          .eq("phone_number_id", phoneNumberId)
          .eq("status", "connected")
          .maybeSingle();

        if (connectionError) {
          console.error("[WhatsApp Webhook] Connection lookup failed:", connectionError);
          continue;
        }

        if (!connection) continue;

        for (const message of value.messages || []) {
          const from = message?.from;
          const messageId = message?.id;
          const type = message?.type;

          if (!from || !messageId) continue;

          let body = "";
          if (type === "text") {
            body = message?.text?.body || "";
          } else if (type === "button") {
            body = message?.button?.text || "";
          } else if (type === "interactive") {
            body =
              message?.interactive?.button_reply?.title ||
              message?.interactive?.list_reply?.title ||
              "";
          }

          // Idempotency: ignore the same Meta message twice.
          const { error: insertError } = await db
            .from("whatsapp_messages")
            .insert({
              business_id: connection.business_id,
              connection_id: connection.id,
              phone_number_id: phoneNumberId,
              waba_id: wabaId || connection.waba_id,
              message_id: messageId,
              direction: "inbound",
              from_phone: from,
              to_phone: value?.metadata?.display_phone_number || null,
              message_type: type || "unknown",
              body,
              raw_payload: message,
              received_at: new Date().toISOString(),
            });

          if (insertError) {
            // Unique message_id means duplicate delivery is harmless.
            if (insertError.code !== "23505") {
              console.error("[WhatsApp Webhook] Message insert failed:", insertError);
            }
            continue;
          }

          /*
           * DIRECT CODED AUTOMATION
           *
           * This is intentionally isolated. Replace only the function below
           * when you connect your existing Sodah AI/business-agent logic.
           *
           * The webhook itself does NOT call n8n or Evolution API.
           */
          const reply = await generateSodahReply({
            businessId: connection.business_id,
            from,
            text: body,
            message,
            connection,
          });

          if (reply?.trim()) {
            await sendWhatsAppText({
              phoneNumberId,
              recipient: from,
              text: reply.trim(),
              accessToken: connection.access_token,
            });

            await db.from("whatsapp_messages").insert({
              business_id: connection.business_id,
              connection_id: connection.id,
              phone_number_id: phoneNumberId,
              waba_id: connection.waba_id,
              message_id: `outbound:${messageId}`,
              direction: "outbound",
              from_phone: value?.metadata?.display_phone_number || null,
              to_phone: from,
              message_type: "text",
              body: reply.trim(),
              raw_payload: null,
              received_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);

    // Always return 200 to Meta for malformed/non-critical deliveries after
    // logging; otherwise Meta may repeatedly retry the same webhook.
    return NextResponse.json(
      { success: false, message: "Webhook received." },
      { status: 200 }
    );
  }
}

async function generateSodahReply({ businessId, from, text }) {
  /*
   * SAFE STARTER BEHAVIOR
   *
   * We intentionally do not invent or overwrite your existing Sodah AI prompt.
   * Set WHATSAPP_AUTO_REPLY_MODE=off to disable this until your AI function is
   * wired in.
   *
   * For production, replace this function with your existing server-side AI
   * service. It receives businessId + sender + text so the business is always
   * tenant-scoped.
   */
  const mode = process.env.WHATSAPP_AUTO_REPLY_MODE?.trim().toLowerCase();

  if (mode !== "demo") return "";

  if (!text?.trim()) return "";
  return `Thanks for messaging us. Your message was received: "${text.trim()}"`;
}
