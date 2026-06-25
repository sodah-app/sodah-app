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
  "500 AI Replies";

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
      rounded-xl
      px-4
      py-4
      backdrop-blur-sm
      flex
      flex-col
      justify-between
      h-full
      transition-all
      duration-300
      hover:scale-[1.02]
    `}
  >
    <div>

      {badge && (
        <div className="inline-flex mb-3 px-3 py-1 rounded-full bg-green-500/20 border border-green-400 text-green-300 text-[11px] font-semibold">
          {badge}
        </div>
      )}

      <h3 className="text-lg font-semibold mb-1">
        {title}
      </h3>

      {price && (
        <p className="text-2xl font-bold mb-2">
          {price}
        </p>
      )}

      {subtitle && (
        <p className="text-xs text-purple-300 mb-3">
          {subtitle}
        </p>
      )}

      <ul className="text-[13px] text-gray-300 space-y-1.5">

        {features.map((feature, index) => (

          <li
            key={index}
            className="flex items-start gap-2"
          >
            <span className="text-green-400 mt-[2px]">
              ✓
            </span>

            <span>
              {feature}
            </span>

          </li>

        ))}

      </ul>

    </div>

    <button
      onClick={onClick}
      className={`
        mt-4
        py-2.5
        rounded-lg
        font-semibold
        text-sm
        transition-all
        duration-300
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
          max-w-6xl
          mx-auto
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-3
          items-stretch
        "
      >

        {/* STARTER */}

        <PlanCard
          title="Starter"
          badge="7-Day Free Trial"
          price="Free"
          features={[
            "500 AI Replies / Month",
            "1 WhatsApp Connection",
            "AI Auto Replies",
            "Basic FAQ Responses",
            "Lead Capture",
            "Basic Dashboard",
            "Basic Analytics",
            "Community Support",
            "Email Support",
            "Upgrade Anytime",
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
            "5,000 AI Replies / Month",
            "Everything in Starter",
            "Appointment Scheduling",
            "Lead Management",
            "Customer Database",
            "Analytics Dashboard",
            "Inventory Tracking",
            "Priority Support",
            "Custom AI Responses",
            "Business Automation",
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
            "20,000 AI Replies / Month",
            "Everything in Pro",
            "Unlimited Business Automation",
            "Smart Follow-Up Messages",
            "Reminder Messages",
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
          badge="Enterprise"
          price="Contact Us"
          subtitle="Tailored For Your Business"
          features={[
            "Unlimited AI Replies",
            "Everything in Premium",
            "Custom AI Workflows",
            "AI Voice Call Automation",
            "Dedicated Setup Team",
            "Business AI Training",
            "Sales Automation",
            "Operations Automation",
            "Enterprise Integrations",
            "Dedicated Account Manager",
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

      <div className="w-full max-w-6xl mx-auto mt-4">

        <div
          className="
            bg-white/5
            border
            border-white/10
            rounded-xl
            p-4
            backdrop-blur-sm
            text-center
          "
        >

          <h3 className="text-lg font-semibold mb-4">
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

              <h4 className="font-semibold text-white mb-1">
                24/7 AI Support
              </h4>

              <p>
                Instantly reply to customers and never miss a sales opportunity.
              </p>

            </div>

            <div>

              <div className="text-2xl mb-2">
                📈
              </div>

              <h4 className="font-semibold text-white mb-1">
                Increase Sales
              </h4>

              <p>
                Automate conversations, qualify leads, and grow your business faster.
              </p>

            </div>

            <div>

              <div className="text-2xl mb-2">
                ⚡
              </div>

              <h4 className="font-semibold text-white mb-1">
                Quick Setup
              </h4>

              <p>
                Connect WhatsApp in minutes and start automating immediately.
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* BACK BUTTON */}

      <div className="text-center mt-4">

        <button
          onClick={() => router.push("/welcome")}
          className="
            text-sm
            text-gray-400
            hover:text-white
            transition
          "
        >
          ← Back
        </button>

      </div>

    </div>
  );
}