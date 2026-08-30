/* ===============================================================
   HOW SODAH.IO WORKS
   ---------------------------------------------------------------
   Animated step-by-step onboarding demonstration
================================================================ */

"use client";

import { useEffect, useState } from "react";

function HowSodahWorks() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: "01",
      icon: "🚀",
      title: "Sign up for Sodah.io",
      description:
        "Create your Sodah.io account in just a few moments. No complicated setup.",
      visual: (
        <div className="flex flex-col items-center justify-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-400/20 bg-blue-500/10 text-4xl shadow-[0_0_40px_rgba(59,130,246,0.18)]">
            🚀
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4">
            <p className="text-xs font-bold uppercase tracking-[2px] text-gray-500">
              Welcome to
            </p>

            <p className="mt-1 text-2xl font-black text-white">
              Sodah<span className="text-blue-400">.io</span>
            </p>
          </div>
        </div>
      ),
    },

    {
      number: "02",
      icon: "🏢",
      title: "Tell us about your business",
      description:
        "Add your business information so Sodah.io can personalize your workspace and automation.",
      visual: (
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#081121] p-5 shadow-2xl">
          <p className="mb-4 text-sm font-bold text-white">
            Tell us about your business
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
              <p className="text-[9px] uppercase tracking-wider text-gray-500">
                Business name
              </p>

              <p className="mt-1 text-sm text-gray-200">
                Your Business
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
              <p className="text-[9px] uppercase tracking-wider text-gray-500">
                Business type
              </p>

              <p className="mt-1 text-sm text-gray-200">
                Select your business
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-center text-sm font-black text-white">
              Continue →
            </div>
          </div>
        </div>
      ),
    },

    {
      number: "03",
      icon: "🔗",
      title: "Choose your channel",
      description:
        "Connect the channels where your customers already talk to your business.",
      visual: (
        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          {[
            ["💬", "WhatsApp", "green"],
            ["◎", "Instagram", "pink"],
            ["f", "Facebook", "blue"],
            ["♪", "TikTok", "white"],
          ].map(([icon, name, color]) => (
            <div
              key={name}
              className={`rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition ${
                name === "WhatsApp"
                  ? "border-green-400/30 bg-green-400/[0.06]"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-lg">
                  {icon}
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    {name}
                  </p>

                  <p
                    className={`mt-0.5 text-[9px] ${
                      color === "green"
                        ? "text-green-400"
                        : "text-gray-500"
                    }`}
                  >
                    Connect
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },

    {
      number: "04",
      icon: "📱",
      title: "Connect your channel",
      description:
        "WhatsApp users can scan the QR code. Instagram, Facebook and TikTok users can connect directly.",
      visual: (
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="relative rounded-2xl bg-white p-4 shadow-[0_0_50px_rgba(37,211,102,0.18)]">
            <div className="grid h-44 w-44 grid-cols-9 gap-1 bg-white p-2">
              {Array.from({ length: 81 }).map((_, index) => (
                <span
                  key={index}
                  className={
                    (index * 17) % 7 < 3
                      ? "rounded-[1px] bg-black"
                      : "rounded-[1px] bg-white"
                  }
                />
              ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-2xl shadow-lg">
                💬
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm font-bold text-white">
            Scan QR code with WhatsApp
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Instagram, Facebook & TikTok can connect directly.
          </p>
        </div>
      ),
    },

    {
      number: "05",
      icon: "⚡",
      title: "Start instantly",
      description:
        "Once your channel is connected, your Sodah.io workspace is ready to start capturing and managing customer conversations.",
      visual: (
        <div className="flex flex-col items-center">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-green-400/30 bg-green-400/10 shadow-[0_0_60px_rgba(34,197,94,0.2)]">
            <div className="text-5xl">✓</div>

            <div className="absolute inset-0 animate-ping rounded-full border border-green-400/20" />
          </div>

          <p className="mt-6 text-xl font-black text-white">
            You're ready to go.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Your automation starts instantly.
          </p>
        </div>
      ),
    },

    {
      number: "06",
      icon: "🎁",
      title: "Enjoy 7 days free",
      description:
        "Start using Sodah.io immediately. No payment is required to get started.",
      visual: (
        <div className="w-full max-w-md rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.12] to-purple-500/[0.10] p-7 text-center shadow-[0_0_70px_rgba(79,70,229,0.15)]">
          <div className="text-5xl">🎁</div>

          <p className="mt-5 text-5xl font-black text-white">
            7 Days
          </p>

          <p className="mt-1 text-lg font-bold text-blue-300">
            FREE TRIAL
          </p>

          <div className="mx-auto mt-5 max-w-xs space-y-2 text-left text-xs text-gray-400">
            <p>✓ No payment required to start</p>
            <p>✓ Full access during your trial</p>
            <p>✓ Start instantly</p>
            <p>✓ Continue only when you're ready</p>
          </div>
        </div>
      ),
    },
  ];

  /*
   * Automatically move to the next step.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((current) => {
        return (current + 1) % steps.length;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [steps.length]);

  const current = steps[activeStep];

  return (
    <section className="relative overflow-hidden bg-[#020817] px-4 py-20 text-white sm:px-6 lg:py-28">

      {/* BACKGROUND GLOW */}

      <div className="pointer-events-none absolute left-1/2 top-20 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/[0.08] blur-[120px]" />

      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-purple-600/[0.06] blur-[100px]" />

      <div className="relative mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mx-auto max-w-3xl text-center">

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[2px] text-blue-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            Simple setup
          </div>

          <h2 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Get started with{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Sodah.io
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
            From sign up to your first automated customer conversation,
            getting started takes just a few simple steps.
          </p>
        </div>

        {/* STEP NAVIGATION */}

        <div className="mx-auto mt-12 flex max-w-5xl items-start justify-between">

          {steps.map((step, index) => {
            const active = index === activeStep;
            const completed = index < activeStep;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                className="group relative flex flex-1 flex-col items-center"
              >

                {/* CONNECTING LINE */}

                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 top-5 h-px w-full bg-white/10">
                    <div
                      className={`h-full transition-all duration-700 ${
                        completed
                          ? "w-full bg-blue-500"
                          : "w-0"
                      }`}
                    />
                  </div>
                )}

                {/* NUMBER */}

                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black transition-all duration-500 ${
                    active
                      ? "border-blue-400 bg-blue-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.45)] scale-110"
                      : completed
                      ? "border-blue-400/50 bg-blue-500/20 text-blue-300"
                      : "border-white/10 bg-[#07101f] text-gray-600"
                  }`}
                >
                  {completed ? "✓" : step.number}
                </div>

                {/* LABEL */}

                <span
                  className={`mt-3 hidden text-[9px] font-bold sm:block ${
                    active
                      ? "text-blue-300"
                      : "text-gray-600"
                  }`}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* DEMONSTRATION */}

        <div className="mt-12 grid items-center gap-10 rounded-[30px] border border-white/10 bg-white/[0.025] p-6 shadow-2xl backdrop-blur-xl md:grid-cols-[0.8fr_1.2fr] md:p-10">

          {/* LEFT TEXT */}

          <div
            key={`text-${activeStep}`}
            className="animate-[fadeIn_0.5s_ease-out]"
          >

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-2xl">
              {current.icon}
            </div>

            <p className="text-[10px] font-black uppercase tracking-[3px] text-blue-400">
              Step {current.number}
            </p>

            <h3 className="mt-3 text-2xl font-black sm:text-3xl">
              {current.title}
            </h3>

            <p className="mt-4 text-sm leading-7 text-gray-400">
              {current.description}
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              Simple. Fast. No complicated setup.
            </div>

          </div>

          {/* RIGHT ANIMATION */}

          <div
            key={`visual-${activeStep}`}
            className="flex min-h-[330px] items-center justify-center rounded-3xl border border-white/10 bg-[#030a16] p-6 animate-[fadeIn_0.6s_ease-out]"
          >
            {current.visual}
          </div>
        </div>

        {/* BOTTOM MESSAGE */}

        <div className="mx-auto mt-10 max-w-3xl text-center">

          <p className="text-lg font-bold text-white sm:text-xl">
            No complicated setup. No payment required to get started.
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Sign up, tell us about your business, connect your channel,
            and start using Sodah.io instantly with your{" "}
            <span className="font-bold text-blue-400">
              7-day free trial.
            </span>
          </p>

        </div>

        {/* CTA */}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/signup";
            }}
            className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 px-8 py-4 font-black text-white shadow-[0_0_40px_rgba(79,70,229,0.35)] transition hover:-translate-y-1 hover:shadow-[0_0_55px_rgba(79,70,229,0.5)]"
          >
            Start Your 7-Day Free Trial →
          </button>
        </div>

      </div>

      {/* ANIMATION */}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

export default HowSodahWorks;