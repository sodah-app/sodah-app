"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const plan =
      searchParams.get("plan") || "Pro";

    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    const now = new Date();
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1); // 1 month subscription

    // Activate subscription
    user.subscription = "active";
    user.plan = plan;
    user.planType = "paid";
    user.planStartDate = now.toISOString();
    user.planExpiry = expiry.toISOString();

    localStorage.setItem("user", JSON.stringify(user));

    // Redirect to welcome page after 3 seconds
    const timer = setTimeout(() => {
      router.push("/welcome");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#064e3b] to-[#020617] text-white p-6">
      <div className="bg-white/5 border border-green-400 rounded-2xl p-10 max-w-xl w-full text-center backdrop-blur-sm">
        <h1 className="text-4xl font-bold text-green-400 mb-4">
          Payment Successful ✅
        </h1>

        <p className="text-gray-300 mb-4">
          Your subscription has been activated successfully.
        </p>

        <p className="text-sm text-gray-400">
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          Loading...
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}