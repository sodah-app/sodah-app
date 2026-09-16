import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

async function getUser(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The existing email sender is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const to = String(body?.to || "").trim();
    const subject = String(body?.subject || "").trim();
    const text = String(body?.message || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { success: false, message: "The invoice customer does not have a valid email address." },
        { status: 400 }
      );
    }
    if (!text) {
      return NextResponse.json(
        { success: false, message: "The payment reminder is empty." },
        { status: 400 }
      );
    }

    const html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#111827;white-space:pre-wrap">${escapeHtml(
      text
    )}</div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `sodah-cashflow-${user.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject: subject || "Payment reminder",
        html,
        text,
      }),
      cache: "no-store",
    });

    const responseText = await response.text();
    let data = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {}

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Email service returned HTTP ${response.status}.`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment reminder email sent successfully.",
      id: data?.id || null,
    });
  } catch (error) {
    console.error("[Cashflow Send Email]", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to send the payment reminder email.",
      },
      { status: 500 }
    );
  }
}
