import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const payload = await request.json();

    console.log(
      "Evolution webhook:",
      JSON.stringify(payload, null, 2)
    );

    const event = payload.event;

    if (event !== "MESSAGES_UPSERT") {
      return NextResponse.json({ success: true });
    }

    const instanceName = payload.instance;

    const number =
      payload.data?.key?.remoteJid
        ?.replace("@s.whatsapp.net", "")
        ?.replace("@g.us", "");

    const message =
      payload.data?.message?.conversation ||
      payload.data?.message?.extendedTextMessage?.text;

    if (!number || !message) {
      return NextResponse.json({ success: true });
    }

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      });

    const reply =
      completion.choices[0].message.content;

    await fetch(
      `${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          apikey: process.env.EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number,
          text: reply,
        }),
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}