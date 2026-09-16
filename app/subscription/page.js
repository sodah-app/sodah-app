"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SubscriptionPage() {
  const router = useRouter();

  const WHATSAPP_NUMBER = "971544027954";

  const [notification, setNotification] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [businessLoading, setBusinessLoading] = useState(true);

  // =====================================================
  // BUSINESS ID
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadBusinessId = async () => {
      try {
        setBusinessLoading(true);

        /*
         * 1. Get the authenticated Supabase session.
         */
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "[Subscription] Session error:",
            sessionError
          );
        }

        /*
         * 2. Get business ID from URL.
         *
         * Example:
         *
         * /subscription?businessId=223e4e9d-73a7-4d1f-aa79-34621d1eff30
         */
        const params = new URLSearchParams(
          window.location.search
        );

        const urlBusinessId =
          params.get("businessId");

        /*
         * 3. If authenticated, resolve the business
         * directly from the logged-in Supabase user.
         *
         * This is the primary source of truth.
         */
        if (session?.user?.id) {
          const { data, error } = await supabase
            .from("businesses")
            .select("business_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (error) {
            console.error(
              "[Subscription] Business lookup error:",
              error
            );
          }

          if (data?.business_id) {
            const activeBusinessId =
              data.business_id;

            if (mounted) {
              setBusinessId(
                activeBusinessId
              );
            }

            /*
             * Keep the business ID available
             * throughout the application.
             */
            localStorage.setItem(
              "business_id",
              activeBusinessId
            );

            setBusinessLoading(false);
            return;
          }
        }

        /*
         * 4. If the database lookup was not available,
         * use the business ID already supplied in the URL.
         */
        if (urlBusinessId) {
          if (mounted) {
            setBusinessId(urlBusinessId);
          }

          localStorage.setItem(
            "business_id",
            urlBusinessId
          );

          setBusinessLoading(false);
          return;
        }

        /*
         * 5. Last fallback: localStorage.
         */
        const storedBusinessId =
          localStorage.getItem(
            "business_id"
          );

        if (storedBusinessId) {
          if (mounted) {
            setBusinessId(
              storedBusinessId
            );
          }

          setBusinessLoading(false);
          return;
        }

        /*
         * No business could be resolved.
         */
        console.error(
          "[Subscription] Unable to determine active business."
        );

        setBusinessLoading(false);
      } catch (error) {
        console.error(
          "[Subscription] Business resolution error:",
          error
        );

        setBusinessLoading(false);
      }
    };

    loadBusinessId();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // HELPER
  // =====================================================

  const getBusinessQuery = () => {
    if (!businessId) {
      return "";
    }

    return `?businessId=${encodeURIComponent(
      businessId
    )}`;
  };

  const goToChannels = () => {
    if (businessId) {
      router.push(
        `/channels?businessId=${encodeURIComponent(
          businessId
        )}`
      );
    } else {
      router.push("/channels");
    }
  };

  const goToWelcome = () => {
    if (businessId) {
      router.push(
        `/welcome?businessId=${encodeURIComponent(
          businessId
        )}`
      );
    } else {
      router.push("/welcome");
    }
  };

  // =====================================================
  // SUBSCRIPTION CHECK
  // =====================================================

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return;
    }

    let user;

    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      console.error(
        "[Subscription] Invalid user data:",
        error
      );
      return;
    }

    if (!user?.planExpiry) {
      return;
    }

    const now = new Date();

    const expiry = new Date(
      user.planExpiry
    );

    if (Number.isNaN(expiry.getTime())) {
      return;
    }

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

      document.cookie =
        "blocked=true; path=/";

      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";

      setNotification(
        "Your subscription has expired. Please renew your plan."
      );

      return;
    }

    if (daysRemaining === 3) {
      setNotification(
        "⚠️ Your subscription expires in 3 days. Renew now to avoid interruption."
      );
    } else if (daysRemaining === 2) {
      setNotification(
        "⚠️ Your subscription expires in 2 days. Renew now to avoid interruption."
      );
    } else if (daysRemaining === 1) {
      setNotification(
        "⏰ Your subscription expires tomorrow. Renew now to continue using Sodah."
      );
    } else {
      setNotification(null);
    }
  }, []);

  // =====================================================
  // PLAN HANDLER
  // =====================================================

  const handleUpgrade = (plan) => {
    const now = new Date();

    /*
     * -----------------------------------------------------
     * STARTER
     * -----------------------------------------------------
     */

    if (plan === "Starter") {
      let user = {};

      try {
        user = JSON.parse(
          localStorage.getItem(
            "user"
          ) || "{}"
        );
      } catch (error) {
        console.error(
          "[Subscription] User data error:",
          error
        );
      }

      const expiry =
        new Date(now);

      expiry.setDate(
        now.getDate() + 7
      );

      user.subscription =
        "active";

      user.plan =
        "Starter";

      user.planType =
        "trial";

      user.planStartDate =
        now.toISOString();

      user.planExpiry =
        expiry.toISOString();

      user.aiUsageLimit =
        "500 AI Replies";

      /*
       * Always preserve the active business ID.
       */
      if (businessId) {
        user.business_id =
          businessId;

        localStorage.setItem(
          "business_id",
          businessId
        );
      }

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      goToWelcome();

      return;
    }

    /*
     * -----------------------------------------------------
     * PRO
     * -----------------------------------------------------
     */

    if (plan === "Pro") {
      window.location.href =
        "https://www.paypal.com/ncp/payment/AH23RR8JBGTNN?plan=pro";

      return;
    }

    /*
     * -----------------------------------------------------
     * PREMIUM
     * -----------------------------------------------------
     */

    if (plan === "Premium") {
      window.location.href =
        "https://www.paypal.com/ncp/payment/H87TGY5F8Z6EA?plan=premium";

      return;
    }

    /*
     * -----------------------------------------------------
     * ENTERPRISE
     * -----------------------------------------------------
     */

    if (
      plan ===
      "Custom Automation"
    ) {
      const message =
        businessId
          ? `Hi, I want a fully customized AI automation solution for my business. Business ID: ${businessId}`
          : "Hi, I want a fully customized AI automation solution for my business.";

      const whatsappUrl =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
          message
        )}`;

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }
  };

  // =====================================================
  // PLAN CARD
  // =====================================================

  function PlanCard({
    title,
    price,
    features,
    buttonText,
    buttonClass,
    borderClass,
    onClick,
    subtitle,
    badge,
    priceDescription,
  }) {
    return (
      <div
        className={`
          relative
          bg-white/[0.035]
          ${borderClass}
          border
          rounded-2xl
          px-4
          py-5
          backdrop-blur-xl
          flex
          flex-col
          justify-between
          h-full
          transition-all
          duration-300
          hover:-translate-y-1
          hover:bg-white/[0.055]
          shadow-[0_20px_60px_rgba(0,0,0,0.25)]
        `}
      >
        <div>
          {badge && (
            <div className="inline-flex mb-3 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/15 text-emerald-300 text-[10px] font-bold uppercase tracking-wide">
              {badge}
            </div>
          )}

          <h3 className="text-xl font-black mb-1">
            {title}
          </h3>

          {price && (
            <div className="mb-1">
              <p className="text-3xl font-black tracking-tight">
                {price}
              </p>

              {priceDescription && (
                <p className="text-[11px] text-white/45 mt-1">
                  {priceDescription}
                </p>
              )}
            </div>
          )}

          {subtitle && (
            <p className="text-xs text-purple-300 mb-4">
              {subtitle}
            </p>
          )}

          <ul className="text-[12px] text-gray-300 space-y-2">
            {features.map(
              (feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 text-[9px] font-black mt-[1px]">
                    ✓
                  </span>

                  <span className="leading-4">
                    {feature}
                  </span>
                </li>
              )
            )}
          </ul>
        </div>

        <button
          type="button"
          onClick={onClick}
          className={`
            mt-5
            mx-auto
            w-[92%]
            py-2
            px-3
            rounded-lg
            font-bold
            text-xs
            transition-all
            duration-300
            hover:scale-[1.01]
            active:scale-[0.98]
            ${buttonClass}
          `}
        >
          {buttonText}
        </button>
      </div>
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#064e3b] to-[#020617] text-white">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-5 backdrop-blur-xl shadow-2xl text-center">
          <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-white/10 border-t-emerald-400 animate-spin" />

          <p className="text-sm font-semibold">
            Loading your business...
          </p>

          <p className="mt-1 text-[11px] text-white/40">
            Preparing your subscription workspace
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#0f172a] via-[#064e3b] to-[#020617] text-white px-4 py-6 sm:px-6 lg:px-8">

      {/* =================================================
          TOP NAVIGATION
      ================================================= */}

      <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-7">

        <button
          type="button"
          onClick={goToChannels}
          className="
            rounded-xl
            border
            border-white/10
            bg-black/20
            px-3
            py-2
            text-xs
            font-bold
            text-white/75
            hover:text-white
            hover:bg-white/[0.06]
            transition
            backdrop-blur-xl
          "
        >
          ← Back to Channels
        </button>

        <div className="hidden sm:block text-center">
          <p className="text-sm font-black">
            Sodah
            <span className="text-cyan-400">
              .io
            </span>
          </p>

          <p className="text-[8px] uppercase tracking-[0.25em] text-white/35">
            AI Automation Platform
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-[9px] uppercase tracking-wider text-white/35">
              Active Business ID
            </p>

            <p className="text-[11px] font-mono font-bold text-emerald-300">
              {businessId ||
                "Not available"}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-400 text-[#04120e] text-xs font-black">
              B
            </span>

            <span className="max-w-[120px] truncate text-[10px] font-mono font-bold text-emerald-300">
              {businessId ||
                "No Business ID"}
            </span>
          </div>
        </div>
      </div>

      {/* =================================================
          NOTIFICATION
      ================================================= */}

      {notification && (
        <div className="w-full max-w-6xl mx-auto mb-5 bg-yellow-500/10 border border-yellow-400/30 text-yellow-200 px-4 py-3 rounded-xl text-center text-xs sm:text-sm backdrop-blur-xl">
          {notification}
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="text-center mb-7">

        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 font-black mb-2">
          Sodah Subscription
        </p>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 tracking-tight">
          Choose Your Plan
          <span className="ml-2">
            💎
          </span>
        </h1>

        <p className="text-white/55 text-sm md:text-base">
          Powerful AI automation without unnecessary complexity.
        </p>

        {businessId && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

            <span className="text-[10px] uppercase tracking-wider text-white/40">
              Business
            </span>

            <span className="font-mono text-[10px] font-bold text-emerald-300">
              {businessId}
            </span>
          </div>
        )}
      </div>

      {/* =================================================
          PLANS
      ================================================= */}

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

        {/* =================================================
            STARTER
        ================================================= */}

        <PlanCard
          title="Starter"
          badge="7-Day Free Trial"
          price="$0"
          priceDescription="7 days free"
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
          buttonClass="border border-white/15 bg-white/[0.05] hover:bg-white/[0.10] text-white"
          borderClass="border-white/10"
          onClick={() =>
            handleUpgrade("Starter")
          }
        />

        {/* =================================================
            PRO
        ================================================= */}

        <PlanCard
          title="Pro"
          badge="Most Popular"
          price="$29"
          priceDescription="/ month"
          subtitle="Advanced • Small Businesses"
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
          buttonText="Upgrade to Pro"
          buttonClass="bg-green-500 hover:bg-green-400 text-black shadow-[0_0_25px_rgba(34,197,94,0.18)]"
          borderClass="border-green-400/50"
          onClick={() =>
            handleUpgrade("Pro")
          }
        />

        {/* =================================================
            PREMIUM
        ================================================= */}

        <PlanCard
          title="Premium"
          badge="Best Value"
          price="$79"
          priceDescription="/ month"
          subtitle="Advanced • Growing Businesses"
          features={[
            "Unlimited AI Replies",
            "Everything in Pro",
            "Run WhatsApp Campaigns",
            "Unlimited WhatsApp Messages",
            "AI Chat in All Languages",
            "Smart Follow-Up Messages",
            "Reminder Messages",
            "Group Chat Automation",
            "Business Updates & Promotions Anytime",
            "VIP Priority Support",
          ]}
          buttonText="Go Premium 🚀"
          buttonClass="bg-yellow-400 hover:bg-yellow-300 text-black shadow-[0_0_25px_rgba(250,204,21,0.16)]"
          borderClass="border-yellow-400/50"
          onClick={() =>
            handleUpgrade("Premium")
          }
        />

        {/* =================================================
            ENTERPRISE
        ================================================= */}

        <PlanCard
          title="Enterprise"
          badge="Custom Solution"
          price="Custom"
          priceDescription="For Larger Businesses"
          subtitle="Tailored for your business"
          features={[
            "Unlimited AI Replies",
            "Everything in Premium",
            "Custom AI Workflows",
            "AI Voice Call Automation",
            "Dedicated Setup Team",
            "Business AI Training",
            "Sales & Operations Automation",
            "Enterprise Integrations",
            "Custom Reporting",
            "Dedicated Account Manager",
          ]}
          buttonText="Contact on WhatsApp 💬"
          buttonClass="bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_25px_rgba(168,85,247,0.18)]"
          borderClass="border-purple-400/50"
          onClick={() =>
            handleUpgrade(
              "Custom Automation"
            )
          }
        />
      </div>

      {/* =================================================
          TRUST SECTION
      ================================================= */}

      <div className="w-full max-w-7xl mx-auto mt-5">

        <div
          className="
            bg-black/20
            border
            border-white/10
            rounded-2xl
            p-5
            sm:p-6
            backdrop-blur-xl
            text-center
          "
        >

          <p className="text-[9px] uppercase tracking-[0.25em] text-emerald-300 font-black mb-2">
            Built for Business Growth
          </p>

          <h3 className="text-xl font-black mb-5">
            Why Businesses Choose Sodah.io 🚀
          </h3>

          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-3
              gap-5
              text-sm
              text-gray-300
            "
          >

            {/* 24/7 */}

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">

              <div className="text-2xl mb-2">
                🤖
              </div>

              <h4 className="font-bold text-white mb-1">
                24/7 AI Support
              </h4>

              <p className="text-xs leading-5 text-white/45">
                Instantly reply to customers and keep your business active around the clock.
              </p>

            </div>

            {/* REVENUE */}

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">

              <div className="text-2xl mb-2">
                📈
              </div>

              <h4 className="font-bold text-white mb-1">
                Increase Revenue
              </h4>

              <p className="text-xs leading-5 text-white/45">
                Automate conversations, qualify leads and convert more opportunities with less manual work.
              </p>

            </div>

            {/* SETUP */}

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">

              <div className="text-2xl mb-2">
                ⚡
              </div>

              <h4 className="font-bold text-white mb-1">
                Quick & Easy Setup
              </h4>

              <p className="text-xs leading-5 text-white/45">
                Connect WhatsApp in minutes and start automating your customer communication.
              </p>

            </div>

          </div>
        </div>
      </div>

      {/* =================================================
          BUSINESS ID / FLEXIBLE PLANS
      ================================================= */}

      <div className="w-full max-w-7xl mx-auto mt-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ACTIVE BUSINESS */}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-xl">

            <p className="text-[9px] uppercase tracking-[0.25em] text-white/35 font-black mb-3">
              Active Workspace
            </p>

            <h3 className="text-lg font-black mb-3">
              Active Business
            </h3>

            <div className="flex flex-col gap-2">

              <span className="text-xs text-white/40">
                Business ID
              </span>

              <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

                <span className="font-mono text-xs font-bold text-emerald-300 break-all">
                  {businessId ||
                    "Business ID unavailable"}
                </span>
              </div>

            </div>
          </div>

          {/* FLEXIBLE */}

          <div className="rounded-2xl border border-green-400/30 bg-green-400/[0.04] p-5 backdrop-blur-xl">

            <div className="flex gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-400/10 border border-green-400/20 text-2xl">
                🛡️
              </div>

              <div>

                <h3 className="font-black mb-2">
                  Flexible Plans
                </h3>

                <div className="space-y-1.5 text-xs text-white/55">

                  <p>
                    <span className="text-green-400">
                      ✓
                    </span>{" "}
                    Upgrade, downgrade or switch plans anytime.
                  </p>

                  <p>
                    <span className="text-green-400">
                      ✓
                    </span>{" "}
                    Plans continue receiving new features and improvements.
                  </p>

                  <p>
                    <span className="text-green-400">
                      ✓
                    </span>{" "}
                    Secure and built for business growth.
                  </p>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* =================================================
          BACK BUTTON
      ================================================= */}

      <div className="text-center mt-6">

        <button
          type="button"
          onClick={goToChannels}
          className="
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-white/10
            bg-white/[0.03]
            px-4
            py-2
            text-xs
            font-bold
            text-white/55
            hover:text-white
            hover:bg-white/[0.07]
            transition
          "
        >
          ← Back to Channels
        </button>

      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="w-full max-w-7xl mx-auto mt-8 pt-5 border-t border-white/5">

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-white/30">

          <div>
            © 2026 Sodah.io — AI Automation Platform
          </div>

          <div className="flex items-center gap-4">
            <span>
              🔒 Secure
            </span>

            <span>
              🤖 AI Powered
            </span>

            <span>
              ⚡ Fast Setup
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}