import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    /*
     * Authenticate the request on the server.
     */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log(
      "[INBOX] USER:",
      user?.id ?? null
    );

    if (authError) {
      console.error(
        "[INBOX] AUTH ERROR:",
        authError
      );

      return NextResponse.json(
        {
          error: "Authentication error.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!user) {
      console.error(
        "[INBOX] No authenticated user."
      );

      return NextResponse.json(
        {
          error: "Auth session missing.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * Read search parameter.
     */
    const requestUrl = new URL(request.url);

    const search =
      requestUrl.searchParams.get("search")?.trim() ||
      "";

    /*
     * Find the business belonging to the
     * authenticated Supabase user.
     */
    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select("business_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (businessError) {
      console.error(
        "[INBOX] Business lookup error:",
        businessError
      );

      return NextResponse.json(
        {
          error:
            "Could not determine your business.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (!business?.business_id) {
      console.log(
        "[INBOX] No business found for user:",
        user.id
      );

      return NextResponse.json(
        {
          conversations: [],
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    /*
     * Only retrieve conversations belonging
     * to this user's business.
     */
    let query = supabase
      .from("conversations")
      .select("*")
      .eq(
        "business_id",
        business.business_id
      )
      .order("updated_at", {
        ascending: false,
      });

    /*
     * Optional search.
     */
    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,last_message.ilike.%${search}%`
      );
    }

    const {
      data: conversations,
      error: conversationError,
    } = await query;

    if (conversationError) {
      console.error(
        "[INBOX] Conversation database error:",
        conversationError
      );

      return NextResponse.json(
        {
          error:
            "Could not load conversations.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        conversations:
          conversations ?? [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[INBOX] Unexpected error:",
      error
    );

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