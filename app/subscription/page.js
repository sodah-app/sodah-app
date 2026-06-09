"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionPage() {
  const router = useRouter();

  const WHATSAPP_NUMBER =
    "971544027954";

  const [notification, setNotification] =
    useState(null);

  /* =====================================================
     SUBSCRIPTION CHECK
  ===================================================== */

  useEffect(() => {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    if (!user.planExpiry) return;

    const now = new Date();

    const expiry = new Date(
      user.planExpiry
    );

    const diffMs =
      expiry.getTime() -
      now.getTime();

    const daysRemaining =
      Math.ceil(
        diffMs /
          (1000 * 60 * 60 * 24)
      );

    if (daysRemaining <= 0) {
      user.subscription =
        "expired";

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "isLoggedIn"
      );

      alert(
        "Your subscription has expired. Please renew your plan."
      );

      router.replace(
        "/subscription"
      );

      return;
    }

    if (daysRemaining === 3) {
      setNotification(
        "⚠️ Your subscription expires in 3 days. Renew now to avoid interruption."
      );
    } else if (
      daysRemaining === 1
    ) {
      setNotification(
        "⏰ Your subscription expires tomorrow. Renew now to continue using Sodah."
      );
    } else {
      setNotification(null);
    }
  }, [router]);

  /* =====================================================
     PLAN HANDLER
  ===================================================== */

  const handleUpgrade = (
    plan
  ) => {
    const now = new Date();

    if (plan === "Starter") {
      const user = JSON.parse(
        localStorage.getItem(
          "user"
        ) || "{}"
      );

      const expiry =
        new Date();

      expiry.setDate(
        now.getDate() + 7
      );

      user.subscription =
        "active";

      user.plan = "Starter";

      user.planType =
        "trial";

      user.planStartDate =
        now.toISOString();

      user.planExpiry =
        expiry.toISOString();

      user.aiUsageLimit =
        "0.5GB";

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      router.push("/welcome");

      return;
    }

    if (plan === "Pro") {
      window.location.href =
        "https://www.paypal.com/ncp/payment/AH23RR8JBGTNN?plan=pro";

      return;
    }

    if (plan === "Premium") {
      window.location.href =
        "https://www.paypal.com/ncp/payment/H87TGY5F8Z6EA?plan=premium";

      return;
    }

    if (
      plan ===
      "Custom Automation"
    ) {
      const message =
        "Hi, I want a fully customized AI automation solution for my business.";

      const whatsappUrl =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
          message
        )}`;

      window.open(
        whatsappUrl,
        "_blank"
      );

      return;
    }
  };

  /* =====================================================
     PLAN CARD
  ===================================================== */

  const PlanCard = ({
    title,
    price,
    features,
    buttonText,
    buttonClass,
    borderClass,
    onClick,
    subtitle,
    badge,
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
      <div>
        {badge && (
          <div className="inline-block mb-3 px-3 py-1 rounded-full bg-green-500/20 border border-green-400 text-green-300 text-xs font-semibold">
            {badge}
          </div>
        )}

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
          {features.map(
            (feature, index) => (
              <li key={index}>
                ✔ {feature}
              </li>
            )
          )}
        </ul>
      </div>

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
          Scale your business with powerful AI automation
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
          badge="7 Day Free Trial"
          price="Free"
          features={[
            "0.5GB AI Usage",
            "WhatsApp Connection",
            "AI Auto Reply",
            "Basic Customer Support",
            "Basic FAQ Responses",
            "Limited Dashboard",
            "Limited Analytics",
            "Community Support",
            "No Appointment Scheduling",
            "No Follow-up Messages",
            "No Reminder Messages",
          ]}
          buttonText="Start Free Trial"
          buttonClass="bg-white/10 hover:bg-white/20 text-white"
          borderClass="border-white/10"
          onClick={() =>
            handleUpgrade("Starter")
          }
        />

        {/* PRO */}

        <PlanCard
          title="Pro"
          badge="Most Popular"
          price="$29/mo"
          features={[
            "5.5GB AI Usage",
            "AI Auto Reply",
            "Lead Capture",
            "Customer Support Automation",
            "Appointment Scheduling",
            "Dashboard Access",
            "Analytics Access",
            "Customer Management",
            "Inventory Tracking",
            "Priority Support",
            "No Follow-up Messages",
            "No Reminder Messages",
            "No Group Automation",
          ]}
          buttonText="Upgrade Now"
          buttonClass="bg-green-500 hover:bg-green-600 text-black"
          borderClass="border-green-400"
          onClick={() =>
            handleUpgrade("Pro")
          }
        />

        {/* PREMIUM */}

        <PlanCard
          title="Premium"
          badge="Best Value"
          price="$79/mo"
          features={[
            "20GB AI Usage",
            "Unlimited Business Automation",
            "AI Auto Reply",
            "Lead Capture",
            "Appointment Scheduling",
            "Customer Management",
            "Inventory Tracking",
            "Smart Follow-up Messages",
            "Reminder Messages",
            "Incomplete Chat Recovery",
            "Group Chat Automation",
            "Advanced Analytics",
            "Advanced Integrations",
            "Personal AI Assistant",
            "VIP Priority Support",
          ]}
          buttonText="Go Premium 🚀"
          buttonClass="bg-yellow-400 hover:bg-yellow-500 text-black"
          borderClass="border-yellow-400"
          onClick={() =>
            handleUpgrade("Premium")
          }
        />

        {/* CUSTOM */}

        <PlanCard
          title="Custom Automation 🤖"
          price=""
          subtitle="Tailored For Your Business"
          features={[
            "Everything In Premium",
            "Custom Workflows",
            "AI Voice Call Automation",
            "Dedicated Setup Team",
            "Dedicated Support",
            "Business-Specific AI Training",
            "Sales Automation",
            "Operations Automation",
            "Enterprise Integrations",
          ]}
          buttonText="Contact on WhatsApp 💬"
          buttonClass="bg-purple-500 hover:bg-purple-600 text-white"
          borderClass="border-purple-400"
          onClick={() =>
            handleUpgrade(
              "Custom Automation"
            )
          }
        />

      </div>

      {/* TRUST SECTION */}

      <div className="w-full max-w-7xl mx-auto mt-6">

        <div
          className="
            bg-white/5
            border
            border-white/10
            rounded-2xl
            p-5
            backdrop-blur-sm
            text-center
          "
        >

          <h3 className="text-xl font-semibold mb-3">
            Why Businesses Choose Sodah.io 🚀
          </h3>

          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-3
              gap-4
              text-sm
              text-gray-300
            "
          >

            <div>
              <div className="text-2xl mb-2">
                🤖
              </div>

              <p>
                AI automatically replies to customers
                24/7 without missing leads.
              </p>
            </div>

            <div>
              <div className="text-2xl mb-2">
                📈
              </div>

              <p>
                Increase conversions through smart
                automation and customer engagement.
              </p>
            </div>

            <div>
              <div className="text-2xl mb-2">
                ⚡
              </div>

              <p>
                Connect WhatsApp in minutes and start
                automating immediately.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* BACK BUTTON */}

      <div className="text-center mt-4">

        <button
          onClick={() =>
            router.push("/welcome")
          }
          className="
            text-gray-400
            hover:text-white
            transition
            text-sm
          "
        >
          ← Back
        </button>

      </div>

    </div>
  );
}