"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionPage() {
  const router = useRouter();

  // 📱 WhatsApp number
  const WHATSAPP_NUMBER = "971544027954";

  // 🔔 Notification state
  const [notification, setNotification] = useState(null);

  // =====================================================
  // CHECK SUBSCRIPTION STATUS
  // =====================================================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user.planExpiry) return;

    const now = new Date();
    const expiry = new Date(user.planExpiry);

    const diffMs = expiry.getTime() - now.getTime();

    const daysRemaining = Math.ceil(
      diffMs / (1000 * 60 * 60 * 24)
    );

    // EXPIRED
    if (daysRemaining <= 0) {
      user.subscription = "expired";

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");

      alert(
        "Your subscription has expired. Please renew to continue using SODAH."
      );

      router.replace("/subscription");

      return;
    }

    // REMINDERS
    if (daysRemaining === 3) {
      setNotification(
        "⚠️ Your subscription expires in 3 days. Renew now to avoid interruption."
      );
    } else if (daysRemaining === 1) {
      setNotification(
        "⏰ Your subscription expires tomorrow. Renew now to continue using SODAH."
      );
    } else if (daysRemaining === 0) {
      setNotification(
        "🚨 Your subscription expires today. Renew now to avoid losing access."
      );
    } else {
      setNotification(null);
    }
  }, [router]);

  // =====================================================
  // HANDLE PLAN
  // =====================================================
  const handleUpgrade = (plan) => {
    const now = new Date();

    // STARTER
    if (plan === "Starter") {
      const user = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const expiry = new Date();

      expiry.setDate(now.getDate() + 7);

      user.subscription = "active";
      user.plan = "Starter";
      user.planType = "trial";
      user.planStartDate = now.toISOString();
      user.planExpiry = expiry.toISOString();

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      router.push("/welcome");

      return;
    }

    // PRO
    if (plan === "Pro") {
      window.location.href =
        "https://www.paypal.com/ncp/payment/AH23RR8JBGTNN?plan=pro";

      return;
    }

    // PREMIUM
    if (plan === "Premium") {
      window.location.href =
        "https://www.paypal.com/ncp/payment/H87TGY5F8Z6EA?plan=premium";

      return;
    }

    // CUSTOM
    if (plan === "Custom Automation") {
      const message =
        "Hi, I want to fully customize my business automation with SODAH. Please provide more details about your custom automation service.";

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`;

      window.open(whatsappUrl, "_blank");

      return;
    }
  };

  // =====================================================
  // PLAN CARD
  // =====================================================
  const PlanCard = ({
    title,
    price,
    features,
    buttonText,
    buttonClass,
    borderClass,
    onClick,
    subtitle,
  }) => (
    <div
      className={`
        bg-white/5
        ${borderClass}
        border
        rounded-2xl
        px-5
        pt-5
        pb-4
        backdrop-blur-sm
        flex
        flex-col
        justify-between
        h-full
        transition
        hover:scale-[1.01]
      `}
    >
      {/* TOP CONTENT */}
      <div>
        <h3 className="text-xl font-semibold mb-2">
          {title}
        </h3>

        <p className="text-3xl font-bold mb-3">
          {price}
        </p>

        {subtitle && (
          <p className="text-sm text-purple-300 mb-3">
            {subtitle}
          </p>
        )}

        <ul className="text-sm text-gray-300 space-y-2">
          {features.map((feature, index) => (
            <li key={index}>✔ {feature}</li>
          ))}
        </ul>
      </div>

      {/* BUTTON */}
      <button
        onClick={onClick}
        className={`
          mt-6
          py-3
          rounded-xl
          font-semibold
          transition
          w-full
          ${buttonClass}
        `}
      >
        {buttonText}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#064e3b] to-[#020617] text-white px-4 py-5 flex flex-col">
      {/* NOTIFICATION */}
      {notification && (
        <div className="w-full max-w-6xl mx-auto mb-4 bg-yellow-500/20 border border-yellow-400 text-yellow-200 px-4 py-3 rounded-xl text-center text-sm">
          {notification}
        </div>
      )}

      {/* HEADER */}
      <div className="text-center mb-5">
        <h1 className="text-3xl md:text-5xl font-bold mb-2">
          Choose Your Plan 💰
        </h1>

        <p className="text-gray-300 text-sm md:text-base">
          Scale your business with powerful automation
        </p>
      </div>

      {/* PLANS */}
      <div
        className="
          w-full
          max-w-7xl
          mx-auto
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-4
          items-stretch
        "
      >
        {/* STARTER */}
        <PlanCard
          title="Starter"
          price="7 Days Free"
          features={[
            "0.5GB AI usage",
            "AI auto-reply",
            "Smart follow-up reminders",
            "Dashboard & analytics",
            "Customer management",
            "Inventory tracking",
            "Personal AI assistant",
            "Limited support",
          ]}
          buttonText="Start Free Trial"
          buttonClass="bg-white/10 hover:bg-white/20 text-white"
          borderClass="border-white/10"
          onClick={() => handleUpgrade("Starter")}
        />

        {/* PRO */}
        <PlanCard
          title="Pro"
          price="$29/mo"
          features={[
            "5.5GB AI usage",
            "AI auto-reply",
            "Smart follow-up reminders",
            "Dashboard & analytics",
            "Customer management",
            "Inventory tracking",
            "Appointment scheduling",
            "Personal AI assistant",
            "Priority support",
          ]}
          buttonText="Upgrade Now"
          buttonClass="bg-green-500 hover:bg-green-600 text-black"
          borderClass="border-green-400"
          onClick={() => handleUpgrade("Pro")}
        />

        {/* PREMIUM */}
        <PlanCard
          title="Premium"
          price="$79/mo"
          features={[
            "20GB AI usage",
            "Unlimited business automation",
            "AI auto-reply",
            "Smart follow-up reminders",
            "Advanced analytics",
            "Customer & inventory management",
            "Appointment scheduling",
            "Personal AI assistant",
            "Advanced integrations",
            "VIP priority support",
          ]}
          buttonText="Go Premium 🚀"
          buttonClass="bg-yellow-400 hover:bg-yellow-500 text-black"
          borderClass="border-yellow-400"
          onClick={() => handleUpgrade("Premium")}
        />

        {/* CUSTOM */}
        <PlanCard
          title="Custom Automation 🤖"
          price=""
          subtitle="Tailored for Your Business"
          features={[
            "Fully customized automation",
            "AI answers calls",
            "AI auto-reply",
            "Smart follow-ups",
            "Sales automation",
            "Inventory & operations management",
            "Personal AI assistant",
            "Dedicated onboarding",
            "Tailored to your business",
          ]}
          buttonText="Contact on WhatsApp 💬"
          buttonClass="bg-purple-500 hover:bg-purple-600 text-white"
          borderClass="border-purple-400"
          onClick={() =>
            handleUpgrade("Custom Automation")
          }
        />
      </div>

      {/* BACK BUTTON */}
      <div className="text-center mt-4">
        <button
          onClick={() => router.push("/welcome")}
          className="text-gray-400 hover:text-white transition text-sm"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}