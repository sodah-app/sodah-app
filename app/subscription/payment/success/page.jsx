
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const VERIFY_ENDPOINT = "/api/subscription/verify-payment";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState(
    "We are checking your payment with PayPal. Please keep this page open."
  );
  const [retrying, setRetrying] = useState(false);

  const verifyPayment = useCallback(async () => {
    setRetrying(true);
    setStatus("checking");
    setMessage("We are checking your payment with PayPal. Please keep this page open.");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token || !session.user?.id) {
        setStatus("needs-help");
        setMessage("Please sign in to the Sodah account used for this purchase, then retry verification.");
        return;
      }

      const params = Object.fromEntries(searchParams.entries());
      const businessId =
        String(
          params.businessId ||
          params.business_id ||
          (typeof window !== "undefined"
            ? window.localStorage.getItem("business_id")
            : "") ||
          ""
        ).trim();

      // Accept transaction ID parameters only. A PayPal subscription ID,
      // payment-link ID, or generic order token is not interchangeable.
      const paypalTransactionId = String(
        params.tx ||
        params.transaction_id ||
        params.transactionId ||
        params.paypalTransactionId ||
        ""
      ).trim();

      if (!businessId) {
        setStatus("needs-help");
        setMessage("We could not identify your Sodah business. Please sign in to the correct account and retry.");
        return;
      }

      if (!paypalTransactionId) {
        setStatus("pending");
        setMessage(
          "PayPal returned you to Sodah without a usable transaction ID. No plan has been activated. Check the PayPal receipt and the payment link's return settings, then retry."
        );
        return;
      }

      const response = await fetch(VERIFY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          businessId,
          paypalTransactionId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.verified !== true || result?.active !== true) {
        if (result?.pending === true || response.status === 202) {
          setStatus("pending");
          setMessage(
            result?.message ||
            "PayPal has not confirmed this transaction yet. Your plan remains unchanged. Please retry shortly."
          );
          return;
        }

        setStatus("not-confirmed");
        setMessage(
          result?.error ||
          result?.message ||
          "The payment has not been confirmed and your plan has not been activated. Do not pay again until you have checked your PayPal activity."
        );
        return;
      }

      setStatus("success");
      setMessage(
        result?.message ||
        "Your payment has been verified and your Sodah plan is active."
      );

      const verifiedBusinessId = String(result.businessId || businessId);

      window.setTimeout(() => {
        router.replace(
          `/channels?businessId=${encodeURIComponent(verifiedBusinessId)}`
        );
      }, 1800);
    } catch (error) {
      console.error("[Sodah payment success] Verification error:", error);
      setStatus("error");
      setMessage(
        error?.message ||
        "We could not reach the payment verification service. Your plan has not been activated. Please retry."
      );
    } finally {
      setRetrying(false);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void verifyPayment();
  }, [verifyPayment]);

  const icon =
    status === "success" ? "✓" :
    status === "checking" ? "…" :
    status === "pending" ? "◷" : "!";

  const iconClass =
    status === "success"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
      : status === "checking"
        ? "bg-cyan-500/15 text-cyan-200 ring-cyan-400/30"
        : status === "pending"
          ? "bg-amber-500/15 text-amber-200 ring-amber-400/30"
          : "bg-rose-500/15 text-rose-200 ring-rose-400/30";

  const heading =
    status === "success" ? "Payment confirmed" :
    status === "checking" ? "Verifying your payment" :
    status === "pending" ? "Payment confirmation pending" :
    status === "not-confirmed" ? "Payment not confirmed" :
    status === "needs-help" ? "Account details needed" :
    "We could not verify the payment";

  const canRetry = [
    "pending",
    "not-confirmed",
    "needs-help",
    "error",
  ].includes(status);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 py-12 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/20 sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-lg font-black text-[#07111f]">
            S
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">Sodah.io</p>
            <p className="text-xs text-slate-400">Secure payment confirmation</p>
          </div>
        </div>

        <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold ring-1 ${iconClass}`}>
          {status === "checking"
            ? <span className="inline-block animate-pulse">{icon}</span>
            : icon}
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {heading}
        </h1>

        <p className="mt-3 leading-7 text-slate-300" aria-live="polite">
          {message}
        </p>

        {status === "checking" && (
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-400" />
          </div>
        )}

        {status === "success" && (
          <p className="mt-5 text-sm text-emerald-200">
            Taking you to your Sodah workspace…
          </p>
        )}

        {canRetry && (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void verifyPayment()}
              disabled={retrying}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-[#062016] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? "Checking…" : "Retry verification"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/subscription")}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
            >
              Return to subscriptions
            </button>
          </div>
        )}

        <div className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-slate-500">
          Sodah activates paid access only after the server verifies the PayPal
          transaction and successfully updates your business subscription record.
          Returning to this page alone does not confirm payment.
        </div>
      </section>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">
          <p className="text-sm text-slate-300">
            Loading payment confirmation…
          </p>
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
