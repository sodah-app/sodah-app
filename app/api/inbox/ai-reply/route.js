import { NextResponse } from "next/server";
import { authenticate, db } from "@/lib/email-ai";
import { resolveAccount } from "../_lib/gmail-inbox";

export const runtime = "nodejs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

export async function POST(request) {
  try {
    const user = await authenticate(request);
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
    const body = await request.json().catch(() => ({}));
    const emailBody = String(body?.emailBody || "").trim();
    const sender = String(body?.sender || "").trim();
    const instruction = String(body?.instruction || "Write a professional, helpful reply.").trim();
    if (!emailBody) return NextResponse.json({ success: false, message: "The email content is required." }, { status: 400 });
    const admin = db();
    await resolveAccount(admin, user);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        messages: [
          { role: "system", content: "You are Sodah's business email assistant. Write concise, natural, professional replies. Never invent facts, prices, dates, promises, or policies. Return only the reply text." },
          { role: "user", content: `Sender: ${sender}\n\nIncoming email:\n${emailBody}\n\nInstruction:\n${instruction}` },
        ],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `AI service returned ${response.status}.`);
    const reply = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!reply) throw new Error("The AI did not return a reply.");
    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("[Inbox] AI reply error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Unable to generate an AI reply." }, { status: 500 });
  }
}
