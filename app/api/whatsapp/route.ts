import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  console.log(
    "WhatsApp Webhook:",
    JSON.stringify(payload, null, 2)
  );

  const event = payload.event;
  const instance = payload.instance;

  switch (event) {
    case "CONNECTION_UPDATE":
      // Update database:
      // whatsappConnected = true
      break;

    case "MESSAGES_UPSERT":
      // Run AI assistant
      break;
  }

  return NextResponse.json({ success: true });
}