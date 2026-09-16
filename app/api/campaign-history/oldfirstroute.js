import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getRequestSupabase(request) {
  try {
    const serverClient = await createServerClient();
    const serverAuth = await serverClient.auth.getUser();
    if (serverAuth?.data?.user) {
      return { supabase: serverClient, user: serverAuth.data.user };
    }
  } catch (error) {
    console.error("[Campaign History] Server auth check failed:", error);
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) return { supabase: null, user: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return { supabase: null, user: null };

  const tokenClient = createSupabaseClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await tokenClient.auth.getUser();

  if (error || !data?.user) return { supabase: null, user: null };

  return { supabase: tokenClient, user: data.user };
}

async function resolveBusiness(supabase, userId, requestedBusinessId = "") {
  const requestedId = String(requestedBusinessId || "").trim();

  let query = supabase
    .from("businesses")
    .select("business_id,business_name,whatsapp_connected,ai_number,created_at")
    .eq("user_id", userId);

  if (requestedId) {
    query = query.eq("business_id", requestedId);
  } else {
    query = query.order("created_at", { ascending: true }).limit(20);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Campaign History] Business lookup failed:", error);
    throw new Error("Unable to load your Sodah business.");
  }

  const businesses = data || [];

  if (requestedId) return businesses[0] || null;

  return (
    businesses.find((item) => item.whatsapp_connected === true) ||
    businesses[0] ||
    null
  );
}

const CAMPAIGN_COLUMNS = [
  "id",
  "user_id",
  "business_id",
  "campaign_name",
  "message",
  "message_type",
  "template",
  "tone",
  "contacts",
  "media",
  "schedule",
  "status",
  "created_at",
  "last_run_at",
  "next_run_at",
].join(",");

export async function GET(request) {
  try {
    const { supabase, user } = await getRequestSupabase(request);

    if (!supabase || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const requestedBusinessId = String(
      request.nextUrl?.searchParams?.get("businessId") ||
      request.nextUrl?.searchParams?.get("business_id") ||
      ""
    ).trim();

    const campaignId = String(
      request.nextUrl?.searchParams?.get("id") || ""
    ).trim();

    const business = await resolveBusiness(
      supabase,
      user.id,
      requestedBusinessId
    );

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error: requestedBusinessId
            ? "The supplied business ID is not associated with this account."
            : "No business is associated with this account.",
        },
        { status: 404 }
      );
    }

    if (campaignId) {
      const { data: campaign, error } = await supabase
        .from("whatsapp_campaigns")
        .select(CAMPAIGN_COLUMNS)
        .eq("id", campaignId)
        .eq("user_id", user.id)
        .eq("business_id", business.business_id)
        .maybeSingle();

      if (error) {
        console.error(
          "[Campaign History] Campaign detail lookup failed:",
          error
        );
        return NextResponse.json(
          { success: false, error: "Unable to load campaign details." },
          { status: 500 }
        );
      }

      if (!campaign) {
        return NextResponse.json(
          { success: false, error: "Campaign not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        business: {
          business_id: business.business_id,
          business_name: business.business_name,
        },
        campaign,
      });
    }

    const { data: campaigns, error } = await supabase
      .from("whatsapp_campaigns")
      .select(CAMPAIGN_COLUMNS)
      .eq("user_id", user.id)
      .eq("business_id", business.business_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "[Campaign History] Campaign list lookup failed:",
        error
      );
      return NextResponse.json(
        { success: false, error: "Unable to load campaign history." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      business: {
        business_id: business.business_id,
        business_name: business.business_name,
        whatsapp_connected: business.whatsapp_connected === true,
        ai_number: business.ai_number || null,
      },
      campaigns: campaigns || [],
    });
  } catch (error) {
    console.error("[Campaign History] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load campaign history.",
      },
      { status: 500 }
    );
  }
}
