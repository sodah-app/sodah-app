import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

function welcomeContent(fullName) {
  const name = String(fullName || "").trim();
  const greeting = name ? `Hi ${name},` : "Hi there,";

  return {
    subject:
      "Welcome to Sodah.io — Let's Get Your Automation Started",
    body: `${greeting}

Welcome to Sodah.io! 👋

Thanks for choosing Sodah.

Sodah helps your business automate WhatsApp communication, respond to customers instantly, capture leads, manage appointments, send campaigns and operate 24/7.

Getting started is simple:

1. Sign in to your Sodah account.
2. Complete your business details.
3. Connect your WhatsApp by scanning the QR code.

Once your WhatsApp is connected, your AI automation can start working immediately.

You can then manage your business communication, campaigns, appointments, follow-ups, analytics and more from your Sodah workspace.

Ready to get started?

Open your Sodah workspace and complete your setup:

${APP_URL}

— Sodah.io`,
  };
}

async function getAuthenticatedUser(request) {
  const serverClient = await createServerClient();
  const serverAuth = await serverClient.auth.getUser();

  if (serverAuth?.data?.user) {
    return { supabase: serverClient, user: serverAuth.data.user };
  }

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return { supabase: null, user: null };
  }

  const token = authorization.slice(7).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !url || !anonKey) {
    return { supabase: null, user: null };
  }

  const tokenClient = createSupabaseClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data, error } = await tokenClient.auth.getUser();

  if (error || !data?.user) {
    return { supabase: null, user: null };
  }

  return { supabase: tokenClient, user: data.user };
}

export async function POST(request) {
  try {
    const { supabase, user } =
      await getAuthenticatedUser(request);

    if (!supabase || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const resendApiKey =
      process.env.RESEND_API_KEY?.trim();

    const from =
      process.env.RESEND_FROM_EMAIL?.trim();

    if (!resendApiKey || !from) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email service is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env.local.",
        },
        { status: 500 }
      );
    }

    const email = String(user.email || "").trim();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account does not have an email address.",
        },
        { status: 400 }
      );
    }

    const existing = await supabase
      .from("email_queue")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("template_key", "welcome")
      .in("status", ["pending", "processing", "sent"])
      .limit(1)
      .maybeSingle();

    if (existing?.data) {
      return NextResponse.json({
        success: true,
        status: "already_processed",
      });
    }

    const body = await request.json().catch(() => ({}));
    const fullName = String(body?.full_name || "").trim();

    const { data: template } = await supabase
      .from("email_templates")
      .select("subject,body,enabled")
      .eq("template_key", "welcome")
      .maybeSingle();

    if (template?.enabled === false) {
      return NextResponse.json({
        success: true,
        status: "disabled",
      });
    }

    const fallback = welcomeContent(fullName);
    const subject = template?.subject || fallback.subject;

    const bodyText = (template?.body || fallback.body)
      .replace(/\{\{full_name\}\}/g, fullName || "there")
      .replace(/\{\{app_url\}\}/g, APP_URL);

    const { data: business } = await supabase
      .from("businesses")
      .select("business_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: queued, error: queueError } = await supabase
      .from("email_queue")
      .insert({
        user_id: user.id,
        business_id: business?.business_id || null,
        email,
        template_key: "welcome",
        subject,
        body: bodyText,
        email_type: "transactional",
        scheduled_for: new Date().toISOString(),
        status: "processing",
        attempts: 1,
      })
      .select("id")
      .single();

    if (queueError) {
      const duplicate = await supabase
        .from("email_queue")
        .select("id,status")
        .eq("user_id", user.id)
        .eq("template_key", "welcome")
        .limit(1)
        .maybeSingle();

      if (duplicate?.data) {
        return NextResponse.json({
          success: true,
          status: "already_processed",
        });
      }

      console.error("[Lifecycle Welcome] Queue error:", queueError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to queue the welcome email.",
        },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    const { data: sent, error: sendError } =
      await resend.emails.send({
        from,
        to: [email],
        subject,
        text: bodyText,
      });

    if (sendError) {
      console.error("[Lifecycle Welcome] Resend error:", sendError);

      await supabase
        .from("email_queue")
        .update({
          status: "failed",
          last_error:
            sendError.message || "Email provider failed.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", queued.id);

      return NextResponse.json(
        {
          success: false,
          error:
            sendError.message ||
            "Welcome email could not be sent.",
        },
        { status: 502 }
      );
    }

    await supabase
      .from("email_queue")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", queued.id);

    return NextResponse.json({
      success: true,
      status: "sent",
      provider_id: sent?.id || null,
    });
  } catch (error) {
    console.error("[Lifecycle Welcome] Route error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to send welcome email.",
      },
      { status: 500 }
    );
  }
}
