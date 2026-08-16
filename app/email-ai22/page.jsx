"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmailAIPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrame;
    let start;

    const animate = (timestamp) => {
      if (!start) start = timestamp;

      const elapsed = (timestamp - start) % 3500;
      const cycle = elapsed / 3500;

      let value;

      if (cycle < 0.72) {
        value = (cycle / 0.72) * 72;
      } else {
        value = 72;
      }

      setProgress(value);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#061613] text-white">
      {/* ================= Background ================= */}

      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#0b4b3d_0%,transparent_40%),radial-gradient(circle_at_bottom_right,#083344_0%,transparent_40%),linear-gradient(135deg,#05110f,#071c17,#03100d)] animate-gradient" />

        {/* Glow Circles */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-[130px] animate-floatSlow" />

        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[140px] animate-floatReverse" />

        <div className="absolute left-1/2 top-1/3 h-80 w-80 rounded-full bg-green-500/10 blur-[120px] animate-floatMedium" />

        {/* Floating particles */}
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/20 animate-particle"
            style={{
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              left: `${(i * 7.7) % 100}%`,
              animationDuration: `${8 + (i % 7)}s`,
              animationDelay: `${i * 0.3}s`,
              top: `${(i * 13) % 100}%`,
            }}
          />
        ))}
      </div>

      {/* ================= Content ================= */}

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8">
        {/* ================= Top Bar ================= */}

        <div className="mb-12 flex items-center justify-between">
          <button
            onClick={() => router.push("/welcome")}
            className="group rounded-full border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-emerald-400/40 hover:bg-white/15"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="transition-transform group-hover:-translate-x-1">
                ←
              </span>
              Back
            </span>
          </button>

          <div className="text-right">
            <h2 className="text-lg font-semibold">Email AI</h2>
            <p className="text-sm text-emerald-400">Launching Soon</p>
          </div>
        </div>

        {/* ================= Hero ================= */}

        <section className="mx-auto max-w-4xl animate-fadeIn text-center">
          {/* Gmail Illustration */}

          <div className="mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-[40px] border border-white/10 bg-white/10 shadow-[0_0_80px_rgba(16,185,129,0.25)] backdrop-blur-2xl animate-float">
            <div className="text-[88px]">📧</div>
          </div>

          <h1 className="bg-gradient-to-r from-emerald-300 via-green-400 to-cyan-400 bg-clip-text text-5xl font-extrabold text-transparent md:text-7xl">
            Email AI
          </h1>

          <p className="mt-5 text-xl font-semibold text-white/90 md:text-2xl">
            The Future of AI-Powered Email Outreach
          </p>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/70">
            Email AI helps businesses generate personalized outreach emails,
            manage campaigns, automate follow-ups, and scale customer
            engagement using intelligent AI workflows.
          </p>

          {/* Progress */}

          <div className="mx-auto mt-12 max-w-xl">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-white/80">Development Progress</span>
              <span className="font-semibold text-emerald-400">
                {Math.round(progress)}%
              </span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-white/10 backdrop-blur">
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
              </div>
            </div>

            <p className="mt-5 text-lg font-semibold text-emerald-300">
              Currently Under Development
            </p>
          </div>
        </section>

        {/* ================= Status ================= */}

        <section className="mx-auto mt-16 max-w-5xl">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-2xl transition-all duration-300 hover:border-emerald-400/30 hover:shadow-[0_0_60px_rgba(16,185,129,0.18)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="h-4 w-4 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_18px_#22c55e]" />

              <h3 className="text-2xl font-bold">Status</h3>
            </div>

            <p className="text-lg leading-8 text-white/75">
              Our engineering team is completing Gmail integration, campaign
              management, AI personalization, human approval workflows, and
              automated follow-up scheduling.
            </p>
          </div>
        </section>

        {/* ================= Human / AI ================= */}

        <section className="mt-14 grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-2xl transition duration-300 hover:-translate-y-2 hover:border-emerald-400/30 hover:shadow-[0_0_60px_rgba(16,185,129,0.15)]">
            <div className="mb-5 text-5xl">👤</div>

            <h3 className="text-2xl font-bold">Human Assisted</h3>

            <p className="mt-4 leading-8 text-white/70">
              Generate AI-powered emails, review them, edit them, and approve
              every message before sending.
              <br />
              <br />
              Perfect for founders, sales teams, and agencies.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur-2xl transition duration-300 hover:-translate-y-2 hover:border-cyan-400/30 hover:shadow-[0_0_60px_rgba(34,211,238,0.18)]">
            <div className="mb-5 text-5xl">🤖</div>

            <h3 className="text-2xl font-bold">Fully Automated</h3>

            <p className="mt-4 leading-8 text-white/70">
              Generate, send and schedule intelligent follow-ups automatically
              while monitoring campaign performance.
            </p>
          </div>
        </section>

        {/* ================= Feature Grid ================= */}

        <section className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "📧",
              title: "AI Email Generation",
              text: "Generate highly personalized outreach emails.",
            },
            {
              icon: "🔁",
              title: "Daily Follow-ups",
              text: "Automatically send follow-ups every day until a reply is received.",
            },
            {
              icon: "🎯",
              title: "Lead Intelligence",
              text: "Personalize emails using company information.",
            },
            {
              icon: "📊",
              title: "Campaign Dashboard",
              text: "Manage multiple outreach campaigns.",
            },
            {
              icon: "🧠",
              title: "Smart AI",
              text: "Learns campaign context for better email quality.",
            },
            {
              icon: "🔒",
              title: "Secure Gmail Integration",
              text: "Send directly from your connected Gmail account.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-white/10 bg-white/10 p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-emerald-400/30 hover:shadow-[0_0_50px_rgba(16,185,129,0.18)]"
            >
              <div className="mb-5 text-4xl transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>

              <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>

              <p className="leading-7 text-white/70">{feature.text}</p>
            </div>
          ))}
        </section>

        {/* ================= Bottom ================= */}

        <section className="mt-20 mb-12">
          <div className="rounded-[36px] border border-white/10 bg-white/10 p-10 text-center backdrop-blur-3xl shadow-[0_0_80px_rgba(16,185,129,0.15)]">
            <h2 className="text-4xl font-bold">
              🚀 Something Amazing Is Coming
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/70">
              Email AI is one of Sodah's biggest upcoming features.
              <br />
              <br />
              Soon you'll be able to launch complete AI-powered outreach
              campaigns with both Human Assisted and Fully Automated modes.
              <br />
              <br />
              Thank you for your patience while we complete the final testing.
            </p>

            <button
              disabled
              className="relative mt-10 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-12 py-5 text-lg font-bold text-white opacity-90"
            >
              <span className="relative z-10">Launching Soon...</span>

              <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </button>
          </div>
        </section>
      </div>

      {/* ================= Animations ================= */}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.9s ease;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        @keyframes floatSlow {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(40px, -30px);
          }
        }

        .animate-floatSlow {
          animation: floatSlow 18s ease-in-out infinite;
        }

        @keyframes floatReverse {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-45px, 35px);
          }
        }

        .animate-floatReverse {
          animation: floatReverse 22s ease-in-out infinite;
        }

        @keyframes floatMedium {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-45px);
          }
        }

        .animate-floatMedium {
          animation: floatMedium 14s ease-in-out infinite;
        }

        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient {
          background-size: 300% 300%;
          animation: gradientMove 20s ease infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-150%);
          }
          100% {
            transform: translateX(250%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2.2s linear infinite;
        }

        @keyframes particle {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(-120vh);
            opacity: 0;
          }
        }

        .animate-particle {
          animation-name: particle;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
}