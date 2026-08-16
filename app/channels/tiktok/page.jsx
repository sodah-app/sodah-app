"use client";

import { useRouter } from "next/navigation";

export default function TikTokDeploymentPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen overflow-hidden bg-[#020b08] text-white">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,242,234,0.14),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,0,80,0.12),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(37,211,102,0.10),transparent_35%)]" />

        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/[0.05] blur-[120px]" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#020b08]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={() => router.push("/welcome")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-green-400 font-black text-black shadow-[0_0_25px_rgba(34,211,238,0.25)]">
              S
            </div>

            <div className="text-left">
              <p className="text-lg font-black tracking-tight">
                Sodah<span className="text-cyan-400">.io</span>
              </p>

              <p className="text-[8px] uppercase tracking-[2px] text-gray-500">
                AI Automation
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/channels")}
            className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-white"
          >
            ← Channels
          </button>
        </div>
      </header>

      <section className="flex min-h-screen items-center justify-center px-5 pb-10 pt-28">
        <div className="w-full max-w-2xl">
          <div className="relative overflow-hidden rounded-[32px] border border-cyan-400/20 bg-white/[0.035] p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-12">
            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-pink-500/10 blur-3xl" />

            <div className="relative">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-cyan-400/30 bg-black/30 shadow-[0_0_50px_rgba(0,242,234,0.14)]">
                <span className="text-5xl font-black text-white drop-shadow-[3px_3px_0_#00f2ea]">
                  ♪
                </span>
              </div>

              <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[2px] text-cyan-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                Integration Deployment
              </div>

              <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">
                TikTok is
                <br />
                <span className="bg-gradient-to-r from-cyan-300 via-white to-pink-400 bg-clip-text text-transparent">
                  coming soon.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
                We are currently deploying the TikTok integration for
                Sodah.io. The integration will eventually help businesses
                connect their TikTok presence and manage customer engagement
                through the Sodah workspace.
              </p>

              <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/10 bg-black/20 p-5 text-left">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
                  </div>

                  <div>
                    <p className="font-bold text-white">
                      Deployment in progress
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      TikTok connectivity is being prepared.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/channels")}
                  className="rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500 px-6 py-3 font-black text-white shadow-[0_0_30px_rgba(0,242,234,0.18)] transition hover:-translate-y-0.5"
                >
                  Back to Channels
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/welcome")}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3 font-semibold text-gray-300 transition hover:bg-white/[0.1] hover:text-white"
                >
                  Go to Home
                </button>
              </div>

              <p className="mt-8 text-[10px] uppercase tracking-[2px] text-gray-600">
                Sodah.io • AI Automation Platform
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}