import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticate(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : "";

  if (!token) return null;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase authentication configuration is missing.");
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.getUser(token);

  if (error || !data?.user) return null;
  return data.user;
}

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return json(
        {
          success: false,
          message: "Your session has expired. Please sign in again.",
        },
        401
      );
    }

    const body = await request.json().catch(() => ({}));

    const type = clean(body.type, 40).toLowerCase();
    const subject = clean(body.subject, 160);
    const suggestion = clean(body.suggestion, 2000);

    const allowedTypes = new Set([
      "feature",
      "improvement",
      "bug",
      "other",
    ]);

    if (!allowedTypes.has(type)) {
      return json(
        { success: false, message: "Please select a valid suggestion type." },
        400
      );
    }

    if (!suggestion) {
      return json(
        { success: false, message: "Suggestion text is required." },
        400
      );
    }

    if (suggestion.length < 10) {
      return json(
        { success: false, message: "Please provide more detail." },
        400
      );
    }

    const admin = adminClient();

    const { data: business } = await admin
      .from("businesses")
      .select("business_id, business_name, email")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await admin
      .from("suggestions")
      .insert({
        user_id: user.id,
        business_id: business?.business_id || null,
        business_name: business?.business_name || null,
        user_email: user.email || business?.email || null,
        type,
        subject: subject || null,
        suggestion,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("[Suggestions API] Insert failed:", error);
      return json(
        {
          success: false,
          message: "Unable to save your suggestion right now.",
        },
        500
      );
    }

    return json({
      success: true,
      message: "Suggestion submitted successfully.",
      suggestion_id: data.id,
    });
  } catch (error) {
    console.error("[Suggestions API] Unexpected error:", error);
    return json(
      {
        success: false,
        message: "Unable to submit your suggestion.",
      },
      500
    );
  }
}
