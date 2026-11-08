import { NextResponse } from "next/server";
import {
  authenticateUser,
  fetchPayPalSubscription,
  getAdminSupabase,
  getOwnedBusiness,
  getPlanNameFromPayPalId,
  saveSubscription,
} from "../../../../lib/server-subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const admin = getAdminSupabase();
    const { user, error: authError } = await authenticateUser(request, admin);
    if (!user) return NextResponse.json({ error: authError }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId")?.trim();
    if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });

    const business = await getOwnedBusiness(admin, user.id, businessId);
    if (!business) return NextResponse.json({ error: "Business not found for this account." }, { status: 403 });
    if (!business.paypal_subscription_id) {
      return NextResponse.json({ active: false, status: "missing", plan: null });
    }

    const subscription = await fetchPayPalSubscription(business.paypal_subscription_id);
    const planName = getPlanNameFromPayPalId(subscription.plan_id);
    if (!planName) {
      await admin.from("businesses").update({ subscription_status: "inactive", subscription_updated_at: new Date().toISOString() }).eq("business_id", businessId);
      return NextResponse.json({ active: false, status: "unrecognized_plan", plan: null });
    }
    const saved = await saveSubscription(admin, businessId, subscription, planName);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("[Subscription status]", error);
    return NextResponse.json({ error: error?.message || "Could not check subscription status." }, { status: 500 });
  }
}
