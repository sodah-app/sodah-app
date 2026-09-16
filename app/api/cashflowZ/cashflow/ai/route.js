import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL =
  process.env.OPENAI_CASHFLOW_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-5.6-luna";

async function getUser(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const invoice = body?.invoice || {};
    const ownerName = String(body?.owner_name || "").trim();
    const signature = String(body?.signature || "Best regards").trim();

    const currency = String(invoice.currency || "AED").toUpperCase();
    const amount = Number(invoice.amount || 0);
    const outstanding = Number(
      invoice.amount_due ?? invoice.amount ?? 0
    );

    const prompt = `
Create a concise, professional payment reminder for the invoice below.

Invoice:
Customer: ${invoice.customer_name || ""}
Invoice number: ${invoice.invoice_number || ""}
Invoice total: ${currency} ${amount.toFixed(2)}
Outstanding: ${currency} ${outstanding.toFixed(2)}
Due date: ${invoice.due_date || ""}
Status: ${invoice.status || ""}

Sender/owner name: ${ownerName || "the invoice owner"}
Signature: ${signature || "Best regards"}

Requirements:
- Address the customer naturally.
- Clearly mention the invoice number and outstanding amount.
- If overdue, politely mention that it is overdue.
- Do not invent payment methods or bank details.
- Do not mention SODAH Cashflow unless the sender asks for it.
- End with the supplied signature and sender name when provided.
- Return only the message text.
`.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "You write exact payment reminder messages for business owners. Never invent invoice facts.",
          },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
          `OpenAI returned HTTP ${response.status}.`
      );
    }

    let reply = String(
      data?.choices?.[0]?.message?.content || ""
    ).trim();

    if (!reply) throw new Error("AI returned an empty payment reminder.");

    return NextResponse.json({
      success: true,
      reply,
      analysis:
        invoice.status === "overdue"
          ? "This invoice is overdue and still has an outstanding balance."
          : "This invoice has an outstanding balance.",
    });
  } catch (error) {
    console.error("[Cashflow AI]", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to generate payment reminder.",
      },
      { status: 500 }
    );
  }
}
