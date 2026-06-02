"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppEntry() {
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    // ❌ Not logged in
    if (!user) {
      router.push("/login");
      return;
    }

    const subscription = user.subscription;
    const trialEnds = user.trialEnds;

    const now = new Date();

    // ❌ No subscription
    if (!subscription) {
      router.push("/subscription");
      return;
    }

    // ❌ Trial expired
    if (subscription === "trial" && new Date(trialEnds) < now) {
      router.push("/subscription?expired=true");
      return;
    }

    // ❌ Inactive
    if (subscription === "inactive") {
      router.push("/subscription?expired=true");
      return;
    }

    // ✅ Active user
    router.push("/dashboard");

  }, []);

  return <p style={{ padding: 20 }}>Loading...</p>;
}