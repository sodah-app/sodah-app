import { createClient } from "@supabase/supabase-js";

export const PAYPAL_PLANS = {
  Starter: { id: "P-5WG4369928481762ANLF635A", price: 149 },
  Business: { id: "P-56A02153CM334043VNLF7HUI", price: 299 },
  Pro: { id: "P-3SC25600F59063111NLF7MLA", price: 499 },
};

export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY server configuration.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getBearerToken(request) {
  const value = request.headers.get("authorization") || "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function authenticateUser(request, admin) {
  const token = getBearerToken(request);
  if (!token) return { user: null, error: "Sign in is required." };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "Your session is invalid or expired. Please sign in again." };
  return { user: data.user, error: null };
}

export async function getOwnedBusiness(admin, userId, businessId) {
  let query = admin.from("businesses").select("business_id,user_id,subscription_status,subscription_plan,paypal_subscription_id,subscription_expires_at").eq("user_id", userId);
  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Business lookup failed: ${error.message}`);
  return data || null;
}

function paypalBaseUrl() {
  return (process.env.PAYPAL_ENVIRONMENT || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET on the server.");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new Error("PayPal server authentication failed. Check the configured PayPal environment and credentials.");
  return result.access_token;
}

export async function fetchPayPalSubscription(subscriptionId) {
  if (!subscriptionId || typeof subscriptionId !== "string" || subscriptionId.length > 128) {
    throw new Error("A valid PayPal subscription ID is required.");
  }
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  const subscription = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("PayPal could not confirm this subscription. Please try again or contact support.");
  return subscription;
}

export function getPlanNameFromPayPalId(planId) {
  return Object.entries(PAYPAL_PLANS).find(([, plan]) => plan.id === planId)?.[0] || null;
}

export async function saveSubscription(admin, businessId, subscription, planName) {
  const active = subscription.status === "ACTIVE";
  const nextBilling = subscription.billing_info?.next_billing_time || null;
  const patch = {
    subscription_status: active ? "active" : String(subscription.status || "unknown").toLowerCase(),
    subscription_plan: planName,
    paypal_subscription_id: subscription.id,
    subscription_expires_at: nextBilling,
    subscription_updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("businesses").update(patch).eq("business_id", businessId);
  if (error) throw new Error(`Subscription record could not be saved: ${error.message}`);
  return { active, plan: planName, status: patch.subscription_status, expiresAt: nextBilling, subscriptionId: subscription.id };
}
