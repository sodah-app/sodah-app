import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function jsonError(error, status) {
  return NextResponse.json({ error }, { status });
}

function isValidFutureDate(value, now = Date.now()) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > now;
}

function isTrialPlan(value) {
  return /trial/i.test(String(value || ""));
}

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return jsonError("Sign in is required to start a free trial.", 401);

    const admin = getAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(match[1]);
    if (authError || !authData?.user) {
      return jsonError("Your session is invalid or expired. Please sign in again.", 401);
    }

    const body = await request.json().catch(() => ({}));
    const businessId = typeof body.businessId === "string" ? body.businessId.trim() : "";
    if (!businessId) return jsonError("businessId is required.", 400);

    const { data: business, error: lookupError } = await admin
      .from("businesses")
      .select("business_id,user_id,subscription_plan,subscription_status,subscription_start,subscription_expiry,trial_used_at")
      .eq("business_id", businessId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    if (!business) return jsonError("This business does not belong to the signed-in account.", 403);

    const status = String(business.subscription_status || "").toLowerCase();
    const plan = String(business.subscription_plan || "").trim();
    const trialPlan = isTrialPlan(plan);
    const expiryIsFuture = isValidFutureDate(business.subscription_expiry);

    // Signup currently creates a seven-day trial immediately. Treat its fresh, unexpired
    // dates as an active trial, not as a previously used trial that must be locked.
    if (trialPlan && status === "active" && expiryIsFuture) {
      return NextResponse.json({
        active: true,
        alreadyActive: true,
        plan: plan || "Free Trial",
        startedAt: business.subscription_start || null,
        expiresAt: business.subscription_expiry,
        message: "Your free trial is active.",
      });
    }

    // Never restart a trial that has expired or was previously claimed.
    if (trialPlan || business.trial_used_at) {
      return jsonError(
        "This business has already used its free trial and the trial period has expired. Choose a paid plan to continue.",
        409
      );
    }

    // Never overwrite another currently active plan.
    if (status === "active" && expiryIsFuture) {
      return jsonError("This business already has an active subscription.", 409);
    }

    const now = new Date();
    const end = new Date(now.getTime() + 7 * DAY_MS);
    const { data: updatedRows, error: updateError } = await admin
      .from("businesses")
      .update({
        subscription_plan: "Free Trial",
        subscription_status: "active",
        subscription_start: now.toISOString(),
        subscription_expiry: end.toISOString(),
        renewal_date: end.toISOString(),
        trial_used_at: now.toISOString(),
      })
      .eq("business_id", businessId)
      .eq("user_id", authData.user.id)
      .is("trial_used_at", null)
      .select("business_id");
    if (updateError) throw new Error(updateError.message);

    // Conditional update prevents two concurrent requests from claiming a trial twice.
    if (!updatedRows || updatedRows.length === 0) {
      const { data: latest, error: latestError } = await admin
        .from("businesses")
        .select("subscription_plan,subscription_status,subscription_start,subscription_expiry,trial_used_at")
        .eq("business_id", businessId)
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (latestError) throw new Error(latestError.message);

      if (latest && isTrialPlan(latest.subscription_plan) &&
          String(latest.subscription_status || "").toLowerCase() === "active" &&
          isValidFutureDate(latest.subscription_expiry)) {
        return NextResponse.json({
          active: true,
          alreadyActive: true,
          plan: latest.subscription_plan || "Free Trial",
          startedAt: latest.subscription_start || null,
          expiresAt: latest.subscription_expiry,
          message: "Your free trial is active.",
        });
      }
      return jsonError("This business has already used its free trial. Choose a paid plan to continue.", 409);
    }

    return NextResponse.json({
      active: true,
      alreadyActive: false,
      plan: "Free Trial",
      startedAt: now.toISOString(),
      expiresAt: end.toISOString(),
    });
  } catch (error) {
    console.error("[Start free trial]", error);
    const message = error?.message || "Could not start the free trial.";
    return NextResponse.json({
      error: message.includes("trial_used_at")
        ? "The businesses table is missing trial_used_at. Apply the required SQL migration before enabling trials."
        : "The free trial could not be started. Please try again or contact support.",
    }, { status: 500 });
  }
}
