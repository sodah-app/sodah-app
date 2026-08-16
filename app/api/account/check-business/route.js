import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("businesses")
      .select("business_id, business_name, business_email")
      .ilike("business_email", email)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Supabase business lookup failed:", error);

      return NextResponse.json(
        {
          error: "Unable to check the business account.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      exists: !!data,
      business: data || null,
    });
  } catch (error) {
    console.error("Account check error:", error);

    return NextResponse.json(
      {
        error: "Unable to check your account.",
      },
      {
        status: 500,
      }
    );
  }
}