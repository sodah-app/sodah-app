import Link from "next/link";

export const metadata = {
  title: "Why Sodah? | Sodah.io",
  description:
    "Discover how Sodah helps businesses automate conversations, capture leads, manage customers, book appointments, and grow with AI.",
};

const reasons = [
  {
    number: "01",
    title: "One AI workspace",
    description:
      "Bring your customer conversations, automation, leads, appointments, campaigns, and business workflows together in one intelligent workspace.",
    icon: "✦",
  },
  {
    number: "02",
    title: "Built around conversations",
    description:
      "Sodah turns everyday customer conversations into opportunities by responding instantly, capturing information, following up, and helping move customers toward action.",
    icon: "◌",
  },
  {
    number: "03",
    title: "Automate the repetitive work",
    description:
      "Reduce repetitive manual tasks with AI-powered workflows for customer support, lead follow-up, appointments, reminders, campaigns, and business processes.",
    icon: "↗",
  },
  {
    number: "04",
    title: "Works across your business",
    description:
      "Connect communication channels and business processes so your team can manage more of the customer journey without constantly switching between disconnected tools.",
    icon: "◎",
  },
  {
    number: "05",
    title: "AI that feels human",
    description:
      "Sodah is designed around natural conversations, helping businesses communicate with customers in a warm, fast, professional way.",
    icon: "✧",
  },
  {
    number: "06",
    title: "Designed to scale",
    description:
      "Start with the automation you need today and expand into campaigns, AI assistants, CRM workflows, email, voice, and more as your business grows.",
    icon: "∞",
  },
];

const comparisons = [
  {
    traditional: "Multiple disconnected tools",
    sodah: "One connected AI workspace",
  },
  {
    traditional: "Manual customer follow-ups",
    sodah: "Automated follow-ups",
  },
  {
    traditional: "Slow responses",
    sodah: "Instant AI responses",
  },
  {
    traditional: "Leads scattered across platforms",
    sodah: "Centralized lead information",
  },
  {
    traditional: "Manual appointment handling",
    sodah: "Automated appointment workflows",
  },
  {
    traditional: "Generic automation",
    sodah: "Business-aware AI automation",
  },
];

export default function WhySodahPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050807] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-260px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute right-[-200px] top-[45%] h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[130px]" />
        <div className="absolute left-[-250px] top-[65%] h-[500px] w-[500px] rounded-full bg-emerald-400/5 blur-[130px]" />
      </div>

      {/* Navigation */}
      <header className="relative z-20 border-b border-white/[0.07] bg-[#050807]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-lg font-black text-emerald-300 transition group-hover:bg-emerald-400/15">
              S
            </div>

            <span className="text-xl font-black tracking-tight">
              sodah<span className="text-emerald-400">.io</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              aria-label="Go back to the home page"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white/75 transition hover:border-emerald-400/25 hover:bg-emerald-400/10 hover:text-white sm:px-4"
            >
              <span aria-hidden="true" className="text-base leading-none">←</span>
              <span>Back</span>
            </Link>

            <Link
              href="/"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/[0.05] hover:text-white sm:block"
            >
              Home
            </Link>

            <Link
              href="/"
              className="rounded-xl border border-emerald-300/20 bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#03100a] shadow-[0_8px_30px_rgba(52,211,153,0.15)] transition hover:bg-emerald-300"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              Why Sodah
            </div>

            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-[86px]">
              Your business has
              <span className="block bg-gradient-to-r from-white via-white to-emerald-300 bg-clip-text text-transparent">
                better things to do.
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-white/55 sm:text-lg sm:leading-8">
              Sodah gives your business an AI-powered workspace that handles
              repetitive conversations, captures opportunities, automates
              follow-ups, and keeps your customer operations moving.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/"
                className="w-full rounded-2xl bg-emerald-400 px-7 py-4 text-center text-sm font-black text-[#03100a] shadow-[0_15px_45px_rgba(52,211,153,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-300 sm:w-auto"
              >
                Start with Sodah
              </Link>

              <Link
                href="/"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 text-center text-sm font-bold text-white transition hover:bg-white/[0.07] sm:w-auto"
              >
                Explore the platform
              </Link>
            </div>
          </div>

          {/* Hero visual */}
          <div className="mx-auto mt-20 max-w-5xl">
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#09100e] p-2 shadow-[0_35px_100px_rgba(0,0,0,0.5)]">
              <div className="rounded-[24px] border border-white/[0.06] bg-[#07100d] p-6 sm:p-8">
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                      Sodah AI Workspace
                    </p>
                    <h2 className="mt-1 text-lg font-bold">
                      Everything moving together.
                    </h2>
                  </div>

                  <div className="hidden items-center gap-2 sm:flex">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-semibold text-white/40">
                      AI active
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 pt-5 sm:grid-cols-3">
                  {[
                    ["WhatsApp", "24/7 conversations", "↗"],
                    ["Leads", "Automatically captured", "◎"],
                    ["Appointments", "Always moving forward", "✓"],
                  ].map(([title, text, icon]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
                    >
                      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                        {icon}
                      </div>

                      <p className="text-sm font-bold">{title}</p>
                      <p className="mt-1 text-xs text-white/40">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
              The idea behind Sodah
            </p>

            <h2 className="mt-4 max-w-lg text-3xl font-black tracking-tight sm:text-5xl">
              Stop managing tools.
              <span className="block text-white/40">
                Start running your business.
              </span>
            </h2>
          </div>

          <div className="max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
            <p>
              Modern businesses communicate with customers across multiple
              channels while also managing leads, appointments, campaigns,
              support, and internal processes.
            </p>

            <p className="mt-6">
              Sodah brings these workflows together with AI and automation so
              your team can spend less time repeating tasks and more time
              focusing on customers and growth.
            </p>
          </div>
        </div>
      </section>

      {/* Reasons */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
              Why businesses use Sodah
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
              Built for the work
              <span className="text-white/35"> behind the conversation.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason) => (
              <article
                key={reason.number}
                className="group relative min-h-[280px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-7 transition duration-300 hover:-translate-y-1 hover:border-emerald-400/20 hover:bg-white/[0.04]"
              >
                <div className="absolute right-[-30px] top-[-40px] h-32 w-32 rounded-full bg-emerald-400/[0.04] blur-2xl transition group-hover:bg-emerald-400/[0.08]" />

                <div className="relative flex items-start justify-between">
                  <span className="text-xs font-black tracking-[0.15em] text-white/20">
                    {reason.number}
                  </span>

                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300">
                    {reason.icon}
                  </span>
                </div>

                <h3 className="relative mt-16 text-xl font-black">
                  {reason.title}
                </h3>

                <p className="relative mt-3 text-sm leading-6 text-white/45">
                  {reason.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
              A different approach
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
              Less fragmentation.
              <span className="block text-white/35">
                More connected automation.
              </span>
            </h2>
          </div>

          <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#07100d]">
            <div className="grid grid-cols-2 border-b border-white/[0.08]">
              <div className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-white/30 sm:px-7">
                Traditional setup
              </div>

              <div className="border-l border-white/[0.08] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-emerald-400 sm:px-7">
                With Sodah
              </div>
            </div>

            {comparisons.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-2 border-b border-white/[0.06] last:border-b-0"
              >
                <div className="px-5 py-5 text-sm text-white/40 sm:px-7">
                  {item.traditional}
                </div>

                <div className="flex items-center gap-3 border-l border-white/[0.08] px-5 py-5 text-sm font-semibold text-white sm:px-7">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-xs text-emerald-300">
                    ✓
                  </span>
                  {item.sodah}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-32">
          <div className="relative overflow-hidden rounded-[32px] border border-emerald-300/15 bg-gradient-to-br from-emerald-400/[0.13] via-[#0b1713] to-[#07100d] px-6 py-16 text-center sm:px-12">
            <div className="absolute left-1/2 top-[-180px] h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[100px]" />

            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                Ready when you are
              </p>

              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
                Give your business an AI advantage.
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/45 sm:text-base">
                Start automating the conversations and workflows that take
                time away from your team.
              </p>

              <div className="mt-9">
                <Link
                  href="/"
                  className="inline-flex rounded-2xl bg-emerald-400 px-8 py-4 text-sm font-black text-[#03100a] shadow-[0_15px_50px_rgba(52,211,153,0.2)] transition hover:-translate-y-0.5 hover:bg-emerald-300"
                >
                  Start with Sodah
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-white/35 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="font-black text-white">
            sodah<span className="text-emerald-400">.io</span>
          </Link>

          <div className="flex flex-wrap gap-5">
            <Link href="/why-sodah" className="hover:text-white">
              Why Sodah
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}