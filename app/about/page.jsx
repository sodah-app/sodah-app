"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X,
  Zap,
} from "lucide-react";

export default function AboutPage() {
  const router = useRouter();
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/channels");
    }
  };

  const solutions = [
    {
      icon: MessageSquare,
      title: "WhatsApp Automation",
      text: "Automate customer conversations, lead capture, follow-ups and appointment interactions.",
    },
    {
      icon: Mail,
      title: "Email AI",
      text: "Organize incoming emails, understand conversations and prepare intelligent responses.",
    },
    {
      icon: Workflow,
      title: "Workflow Automation",
      text: "Connect repetitive business processes and let automation handle routine work.",
    },
    {
      icon: Bot,
      title: "AI Assistants",
      text: "Give your business an intelligent assistant that can support customers around the clock.",
    },
    {
      icon: Building2,
      title: "Business Operations",
      text: "Bring communication, customers and everyday business operations into one workspace.",
    },
    {
      icon: Globe2,
      title: "Connected Workspace",
      text: "Keep important business activity connected instead of moving between fragmented tools.",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      {/* =========================================================
          FIXED / STABLE WORKSPACE TOP BAR
          ========================================================= */}

      <header className="fixed inset-x-0 top-0 z-[100] h-[72px] border-b border-white/[0.08] bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-5 md:px-8 lg:px-10">
          {/* Brand */}
          <Link
            href="/channels"
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <span className="text-sm font-black">S</span>
            </div>

            <div className="min-w-0">
              <div className="text-[13px] font-black tracking-[2px]">
                SODAH<span className="text-white/40">.IO</span>
              </div>

              <div className="truncate text-[8px] font-bold uppercase tracking-[2px] text-white/35">
                AI Business Workspace
              </div>
            </div>
          </Link>

          {/* Back button and workspace navigation */}
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/75 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
              aria-label="Go back to the previous page"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <Link
              href="/channels"
              className="rounded-lg px-4 py-2 text-xs font-bold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/about"
              className="rounded-lg bg-white/[0.08] px-4 py-2 text-xs font-black text-white"
            >
              About Us
            </Link>
          </nav>
        </div>
      </header>

      {/* =========================================================
          PAGE BACKGROUND
          ========================================================= */}

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-15%] top-[-10%] h-[500px] w-[500px] rounded-full bg-white/[0.035] blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[450px] w-[450px] rounded-full bg-white/[0.025] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[35%] h-[500px] w-[500px] rounded-full bg-white/[0.02] blur-[140px]" />
      </div>

      {/* =========================================================
          HERO
          ========================================================= */}

      <section className="pt-[72px]">
        <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-20 md:px-8 md:pb-32 md:pt-28 lg:px-10">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                <span className="text-[9px] font-black uppercase tracking-[2.5px] text-white/55">
                  About Sodah.io
                </span>
              </div>

              <h1 className="max-w-[850px] text-5xl font-black leading-[0.96] tracking-[-3px] sm:text-6xl md:text-7xl lg:text-[82px]">
                We build technology
                <span className="block text-white/35">
                  that moves businesses
                </span>
                forward.
              </h1>

              <p className="mt-8 max-w-[650px] text-sm leading-7 text-white/50 md:text-base md:leading-8">
                Sodah.io helps businesses bring their conversations,
                customers, workflows and everyday operations into one
                intelligent workspace.
              </p>

              <p className="mt-4 max-w-[620px] text-sm font-semibold leading-7 text-white/75 md:text-base">
                Your business growth, our priority.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/channels"
                  className="group flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-black transition hover:bg-white/90"
                >
                  Go to Workspace
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <button
                  type="button"
                  onClick={() => setSolutionsOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-5 py-3 text-xs font-bold text-white/70 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                >
                  Explore Solutions
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* HERO VISUAL */}

            <div className="relative">
              <div className="absolute inset-0 rounded-[32px] bg-white/[0.035] blur-3xl" />

              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b0b] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:p-7">
                <div className="mb-7 flex items-center justify-between border-b border-white/[0.07] pb-5">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[2px] text-white/35">
                      SODAH WORKSPACE
                    </div>

                    <div className="mt-1 text-sm font-black">
                      Business Operations
                    </div>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <Sparkles className="h-4 w-4 text-white/60" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: MessageSquare,
                      title: "Conversations",
                      value: "Connected",
                    },
                    {
                      icon: Workflow,
                      title: "Automation",
                      value: "Running",
                    },
                    {
                      icon: Mail,
                      title: "Email AI",
                      value: "Active",
                    },
                    {
                      icon: Bot,
                      title: "AI Assistant",
                      value: "Online",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                            <Icon className="h-4 w-4 text-white/65" />
                          </div>

                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>

                        <div className="mt-5 text-[10px] font-bold text-white/35">
                          {item.title}
                        </div>

                        <div className="mt-1 text-sm font-black">
                          {item.value}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[2px] text-white/30">
                        Business activity
                      </div>

                      <div className="mt-1 text-lg font-black">
                        Everything connected.
                      </div>
                    </div>

                    <Zap className="h-5 w-5 text-white/50" />
                  </div>

                  <div className="mt-6 flex h-16 items-end gap-1.5">
                    {[25, 42, 31, 55, 48, 68, 58, 78, 70, 90, 82, 96].map(
                      (height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t-md bg-white/[0.13]"
                          style={{ height: `${height}%` }}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          INTRO
          ========================================================= */}

      <section className="border-y border-white/[0.07] bg-[#080808]">
        <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
          <div className="grid gap-12 md:grid-cols-[.7fr_1.3fr]">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[3px] text-white/30">
                Who we are
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-[-1.5px] md:text-5xl">
                Technology should make business simpler.
              </h2>
            </div>

            <div className="space-y-6 text-sm leading-8 text-white/50 md:text-base">
              <p>
                Businesses use many different tools every day. Messages
                arrive through WhatsApp. Customers send emails. Leads need
                follow-up. Appointments need to be managed. Teams need
                information. Repetitive tasks consume valuable time.
              </p>

              <p>
                Sodah.io brings these business activities together through
                intelligent automation, giving businesses a central place to
                manage conversations, customers and workflows.
              </p>

              <p className="font-semibold text-white/75">
                Our goal is simple: help businesses spend less time managing
                repetitive work and more time building relationships,
                serving customers and growing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SOLUTIONS
          ========================================================= */}

      <section
        id="solutions"
        className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28 lg:px-10"
      >
        <div className="max-w-[700px]">
          <div className="text-[9px] font-black uppercase tracking-[3px] text-white/30">
            Solutions
          </div>

          <h2 className="mt-4 text-4xl font-black tracking-[-2px] md:text-6xl">
            One intelligent layer
            <span className="text-white/30"> for your business.</span>
          </h2>

          <p className="mt-6 text-sm leading-7 text-white/45 md:text-base">
            Sodah combines AI, automation and business tools to help
            companies operate more efficiently.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.08] md:grid-cols-2 lg:grid-cols-3">
          {solutions.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group bg-[#080808] p-7 transition hover:bg-[#101010] md:p-8"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] transition group-hover:border-white/20 group-hover:bg-white/[0.07]">
                  <Icon className="h-5 w-5 text-white/65" />
                </div>

                <h3 className="mt-7 text-base font-black">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/40">
                  {item.text}
                </p>

                <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[2px] text-white/25">
                  Sodah.io
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          MISSION / VISION
          ========================================================= */}

      <section
        id="mission"
        className="border-y border-white/[0.07] bg-[#080808]"
      >
        <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-8 md:py-28 lg:px-10">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 md:p-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Target className="h-5 w-5 text-white/65" />
              </div>

              <div className="mt-8 text-[9px] font-black uppercase tracking-[3px] text-white/30">
                Our mission
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-[-1.5px] md:text-4xl">
                Make powerful business technology accessible.
              </h2>

              <p className="mt-5 text-sm leading-8 text-white/45">
                We believe businesses should be able to use intelligent
                technology without unnecessary complexity. Sodah focuses on
                practical automation that solves real business problems.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-7 md:p-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Sparkles className="h-5 w-5 text-white/65" />
              </div>

              <div className="mt-8 text-[9px] font-black uppercase tracking-[3px] text-white/30">
                Our vision
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-[-1.5px] md:text-4xl">
                A smarter way for businesses to operate.
              </h2>

              <p className="mt-5 text-sm leading-8 text-white/45">
                We are building toward a future where businesses can connect
                their communication, automation and operations through one
                intelligent digital environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PRINCIPLES
          ========================================================= */}

      <section className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-28">
        <div className="text-center">
          <div className="text-[9px] font-black uppercase tracking-[3px] text-white/30">
            What matters to us
          </div>

          <h2 className="mx-auto mt-4 max-w-[700px] text-4xl font-black tracking-[-2px] md:text-5xl">
            Built around the way businesses actually work.
          </h2>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Zap,
              title: "Efficiency",
              text: "Reduce repetitive work and give teams more time for meaningful tasks.",
            },
            {
              icon: ShieldCheck,
              title: "Reliability",
              text: "Create dependable systems that support everyday business operations.",
            },
            {
              icon: Clock3,
              title: "Always Available",
              text: "Automation can continue working beyond normal business hours.",
            },
            {
              icon: Globe2,
              title: "Accessibility",
              text: "Make advanced business technology easier to adopt and use.",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title}>
                <Icon className="h-5 w-5 text-white/55" />

                <h3 className="mt-5 text-sm font-black">
                  {item.title}
                </h3>

                <p className="mt-3 text-xs leading-6 text-white/40">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          BUSINESS PROMISE
          ========================================================= */}

      <section className="mx-auto max-w-[1400px] px-5 pb-20 md:px-8 md:pb-28 lg:px-10">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white p-8 text-black md:p-12 lg:p-16">
          <div className="absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-black/[0.04] blur-3xl" />

          <div className="relative max-w-[850px]">
            <div className="text-[9px] font-black uppercase tracking-[3px] text-black/40">
              The Sodah promise
            </div>

            <h2 className="mt-5 text-4xl font-black tracking-[-2px] md:text-6xl">
              Your business growth,
              <span className="block text-black/35">
                our priority.
              </span>
            </h2>

            <p className="mt-6 max-w-[700px] text-sm leading-7 text-black/55 md:text-base md:leading-8">
              Whether you are managing customer conversations, generating
              leads, following up with prospects, organizing emails or
              automating business processes, Sodah is designed to help you
              work smarter.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "Save time",
                "Automate work",
                "Serve customers",
                "Grow faster",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.035] px-4 py-3"
                >
                  <Check className="h-4 w-4" />
                  <span className="text-xs font-black">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          WORKSPACE CTA
          ========================================================= */}

      <section className="border-t border-white/[0.07]">
        <div className="mx-auto max-w-[1000px] px-5 py-24 text-center md:px-8 md:py-32">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
            <Bot className="h-5 w-5 text-white/65" />
          </div>

          <h2 className="mt-7 text-4xl font-black tracking-[-2px] md:text-6xl">
            Your workspace is already here.
          </h2>

          <p className="mx-auto mt-5 max-w-[600px] text-sm leading-7 text-white/40 md:text-base">
            Return to your Sodah workspace and continue managing your
            business from one connected environment.
          </p>

          <Link
            href="/channels"
            className="group mx-auto mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs font-black text-black transition hover:bg-white/90"
          >
            Open Workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* =========================================================
          FOOTER
          ========================================================= */}

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
          <div>
            <div className="text-xs font-black tracking-[2px]">
              SODAH<span className="text-white/35">.IO</span>
            </div>

            <div className="mt-1 text-[9px] font-bold uppercase tracking-[1.5px] text-white/25">
              Your business growth, our priority.
            </div>
          </div>

          <div className="flex items-center gap-5 text-[10px] font-semibold text-white/30">
            <Link
              href="/channels"
              className="transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/about"
              className="text-white/60"
            >
              About Us
            </Link>

            <button
              type="button"
              onClick={() => setSolutionsOpen(true)}
              className="transition hover:text-white"
            >
              Solutions
            </button>
          </div>
        </div>
      </footer>

      {/* =========================================================
          SOLUTIONS MODAL
          ========================================================= */}

      {solutionsOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-5 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSolutionsOpen(false);
            }
          }}
        >
          <div className="relative max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-[28px] border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.7)] md:p-8">
            <button
              type="button"
              aria-label="Close solutions"
              onClick={() => setSolutionsOpen(false)}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50 transition hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-12">
              <div className="text-[9px] font-black uppercase tracking-[3px] text-white/30">
                Sodah solutions
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-[-1.5px] md:text-4xl">
                Tools that connect your business.
              </h2>

              <p className="mt-4 max-w-[650px] text-sm leading-7 text-white/40">
                Explore the business communication, automation and AI
                capabilities available across your Sodah workspace.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {solutions.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                      <Icon className="h-4 w-4 text-white/65" />
                    </div>

                    <h3 className="mt-5 text-sm font-black">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-white/40">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 flex justify-end">
              <Link
                href="/channels"
                onClick={() => setSolutionsOpen(false)}
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-black"
              >
                Open Workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
