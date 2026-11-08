
import { NextResponse } from "next/server";
import {
  authenticateUser,
  getAdminSupabase,
  getPayPalAccessToken,
} from "../../../../lib/server-subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS = [
  { name: "Starter", amount: 40.99 },
  { name: "Business", amount: 81.99 },
  { name: "Pro", amount: 135.99 },
];

function paypalBaseUrl() {
  return (process.env.PAYPAL_ENVIRONMENT || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function fail(error, status) {
  return NextResponse.json({ verified: false, error }, { status });
}

async function findPayPalTransaction(transactionId) {
  const accessToken = await getPayPalAccessToken();

  // Search a bounded recent window. PayPal's reporting API searches
  // transactions belonging to the authenticated PayPal merchant account.
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    transaction_id: transactionId,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    fields: "transaction_info,payer_info",
    page_size: "100",
  });

  const response = await fetch(
    `${paypalBaseUrl()}/v1/reporting/transactions?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("[PayPal transaction search]", response.status, data);
    throw new Error(
      response.status === 403
        ? "PayPal transaction search is not enabled for these credentials. Enable the required reporting API permission or configure a PayPal payment notification integration."
        : "PayPal could not verify the transaction. Please retry later."
    );
  }

  const transactions = data?.transaction_details || [];

  return transactions.find(
    (item) => item?.transaction_info?.transaction_id === transactionId
  ) || null;
}

export async function POST(request) {
  try {
    const admin = getAdminSupabase();
    const { user, error: authError } = await authenticateUser(request, admin);

    if (!user) {
      return fail(authError || "Sign in is required.", 401);
    }

    const body = await request.json().catch(() => ({}));

    const businessId =
      typeof body.businessId === "string" ? body.businessId.trim() : "";

    // This must be the actual PayPal transaction ID, not a subscription ID,
    // plan name, payer ID, or payment-link ID.
    const transactionId =
      typeof body.paypalTransactionId === "string"
        ? body.paypalTransactionId.trim()
        : typeof body.paypalOrderId === "string"
          ? body.paypalOrderId.trim()
          : "";

    if (!businessId || !transactionId) {
      return fail(
        "businessId and a PayPal transaction ID are required.",
        400
      );
    }

    if (
      businessId.length > 256 ||
      !/^[A-Za-z0-9]{1,24}$/.test(transactionId)
    ) {
      return fail("Invalid business or transaction identifier.", 400);
    }

    // Check ownership using the server-side database, not browser state.
    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("business_id,user_id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (businessError) {
      console.error("[Payment verify] Business lookup failed:", businessError);
      return fail("Could not verify your Sodah business account.", 500);
    }

    if (!business) {
      return fail(
        "This business does not belong to the signed-in account.",
        403
      );
    }

    // Idempotent retry: an already recorded transaction must not extend
    // access again. It is successful only for the same business and user.
    const { data: existing, error: existingError } = await admin
      .from("paypal_payment_transactions")
      .select("business_id,user_id,plan,status")
      .eq("paypal_transaction_id", transactionId)
      .maybeSingle();

    if (existingError) {
      console.error("[Payment verify] Payment ledger lookup failed:", existingError);
      return fail("Could not check the payment record.", 500);
    }

    if (existing) {
      if (
        existing.business_id !== businessId ||
        existing.user_id !== user.id
      ) {
        return fail("This PayPal transaction has already been used.", 409);
      }

      const { data: currentBusiness, error: currentError } = await admin
        .from("businesses")
        .select("business_id,subscription_plan,subscription_status,subscription_expiry")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (currentError || !currentBusiness) {
        return fail("The payment was recorded, but the business status could not be read.", 500);
      }

      return NextResponse.json({
        verified: true,
        active: currentBusiness.subscription_status === "active",
        businessId,
        plan: currentBusiness.subscription_plan,
        status: currentBusiness.subscription_status,
        expiresAt: currentBusiness.subscription_expiry,
        alreadyProcessed: true,
        message: "This payment was already verified and recorded.",
      });
    }

    // The transaction must be found in the merchant's PayPal records.
    const transaction = await findPayPalTransaction(transactionId);

    if (!transaction) {
      return NextResponse.json(
        {
          verified: false,
          pending: true,
          message: "PayPal has not returned a matching transaction. No access has been activated.",
        },
        { status: 202 }
      );
    }

    const info = transaction.transaction_info || {};
    const paymentStatus = String(info.transaction_status || "").toUpperCase();

    if (paymentStatus !== "S") {
      return fail(
        `PayPal transaction status is ${paymentStatus || "unknown"}. Only completed payments can activate a plan.`,
        402
      );
    }

    const amount = Number(info.transaction_amount?.value);
    const currency = String(info.transaction_amount?.currency_code || "").toUpperCase();

    if (!Number.isFinite(amount) || currency !== "USD") {
      return fail("The PayPal transaction has an invalid amount or currency.", 402);
    }

    const plan = PLANS.find(
      (item) => Math.round(item.amount * 100) === Math.round(amount * 100)
    );

    if (!plan) {
      return fail(
        "The verified payment amount does not match a Sodah plan. No access has been activated.",
        402
      );
    }

    // Atomic database operation: save the unique transaction and update
    // businesses together. A duplicate transaction ID cannot grant another
    // 30 days.
    const { data: activation, error: activationError } = await admin.rpc(
      "activate_one_time_subscription",
      {
        p_business_id: businessId,
        p_user_id: user.id,
        p_transaction_id: transactionId,
        p_plan: plan.name,
        p_amount: amount,
        p_currency: currency,
        p_paid_at: info.transaction_initiation_date || new Date().toISOString(),
      }
    );

    if (activationError) {
      console.error("[Payment verify] Database activation failed:", activationError);

      if (/duplicate key|already exists|unique constraint/i.test(activationError.message || "")) {
        return fail("This PayPal transaction has already been used.", 409);
      }

      return fail(
        "PayPal confirmed the payment, but Sodah could not update the subscription record. Please retry verification or contact support.",
        500
      );
    }

    return NextResponse.json({
      ...activation,
      verified: true,
      active: true,
      message: "Payment verified. Your Sodah plan is now active for 30 days.",
    });
  } catch (error) {
    console.error("[Payment verify]", error);
    return fail(
      error?.message || "Payment verification failed. Please retry.",
      500
    );
  }
}
