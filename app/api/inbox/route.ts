import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .select("business_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (businessError) {
      console.error("[INBOX] Business lookup error:", businessError);

      return NextResponse.json(
        { error: "Could not determine your business." },
        { status: 500 }
      );
    }

    if (!business?.business_id) {
      return NextResponse.json({
        conversations: [],
      });
    }

    const requestUrl = new URL(request.url);
    const search =
      requestUrl.searchParams.get("search")?.trim() || "";

    let query = supabase
      .from("inbox")
      .select("*")
      .eq("business_id", business.business_id)
      .order("created_at", {
        ascending: false,
      });

    if (search) {
      query = query.or(
        `contact_name.ilike.%${search}%,contact_username.ilike.%${search}%,contact_id.ilike.%${search}%,message_text.ilike.%${search}%`
      );
    }

    const {
      data: messages,
      error: inboxError,
    } = await query;

    if (inboxError) {
      console.error("[INBOX] Database error:", inboxError);

      return NextResponse.json(
        { error: "Could not load inbox." },
        { status: 500 }
      );
    }

    const grouped = new Map<string, any>();

    for (const message of messages ?? []) {
      const conversationKey =
        `${message.channel || "unknown"}:${message.contact_id || ""}`;

      if (!grouped.has(conversationKey)) {
        grouped.set(conversationKey, {
          id: conversationKey,
          business_id: message.business_id,
          customer_name:
            message.contact_name ||
            message.contact_username ||
            message.contact_id ||
            "Customer",
          customer_phone:
            message.channel === "whatsapp"
              ? message.contact_id
              : null,
          last_message: message.message_text || "",
          last_message_at: message.created_at,
          unread_count: 0,
          channel: message.channel,
          updated_at: message.created_at,
        });
      }
    }

    return NextResponse.json(
      {
        conversations: Array.from(grouped.values()),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[INBOX] Unexpected error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load inbox.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}