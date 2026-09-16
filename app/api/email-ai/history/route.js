import { NextResponse } from "next/server";
import { authenticate, businessIdForUser, db } from "@/lib/email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await authenticate(request);
    const client = db();
    const businessId = await businessIdForUser(client, user);

    const { data, error } = await client
      .from("email_ai_history")
      .select("*")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      history: data || [],
    });
  } catch (error) {
    console.error("[Email AI] History GET:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Unable to load email history." },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await authenticate(request);
    const client = db();
    const businessId = await businessIdForUser(client, user);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "History ID is required." }, { status: 400 });
    }

    const { error } = await client
      .from("email_ai_history")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Email history deleted permanently.",
    });
  } catch (error) {
    console.error("[Email AI] History DELETE:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Unable to delete email history." },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}
