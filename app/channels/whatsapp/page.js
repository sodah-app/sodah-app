"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WhatsAppEmbeddedSignup from "@/components/WhatsAppEmbeddedSignup";

const WHATSAPP_LOGO =
  "https://cdn.simpleicons.org/whatsapp/25D366";

function ConnectWhatsAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [businessId, setBusinessId] = useState("");
  const [connected, setConnected] = useState(false);

  const getActiveBusinessId = useCallback(() => {
    const urlBusinessId = searchParams.get("businessId");

    if (urlBusinessId) {
      localStorage.setItem("business_id", urlBusinessId);
      return urlBusinessId;
    }

    return localStorage.getItem("business_id") || "";
  }, [searchParams]);

  useEffect(() => {
    setBusinessId(getActiveBusinessId());
  }, [getActiveBusinessId]);

  const handleBack = () => {
    const id = getActiveBusinessId();
    router.push(
      id
        ? `/channels?businessId=${encodeURIComponent(id)}`
        : "/channels"
    );
  };

  const handleConnected = () => {
    setConnected(true);
  };

  if (connected) {
    return (
      <main className="min-h-screen bg-[#05070b] text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/[0.08] active:scale-95"
            >
              ← Back
            </button>

            <div className="text-sm font-black">
              Sodah<span className="text-cyan-400">.io</span>
            </div>
          </header>

          <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_30px_rgba(37,211,102,0.12)]">
              <img
                src={WHATSAPP_LOGO}
                alt="WhatsApp"
                className="h-11 w-11 object-contain"
              />
            </div>

            <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              WhatsApp Connected
            </p>

            <h1 className="text-3xl font-black leading-tight">
              WhatsApp is connected
            </h1>

            <p className="mt-4 text-sm leading-6 text-white/60">
              Your WhatsApp Business account is now connected to Sodah. Your
              WhatsApp automation can now work from your Sodah workspace.
            </p>

            <button
              type="button"
              onClick={handleBack}
              className="mt-8 w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-5 py-4 text-sm font-black text-[#041014] shadow-[0_0_35px_rgba(34,211,238,0.18)] transition hover:scale-[1.01] active:scale-[0.98]"
            >
              Continue to Channels
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/[0.08] active:scale-95"
          >
            ← Back
          </button>

          <div className="text-sm font-black">
            Sodah<span className="text-cyan-400">.io</span>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_30px_rgba(37,211,102,0.12)]">
            <img
              src={WHATSAPP_LOGO}
              alt="WhatsApp"
              className="h-11 w-11 object-contain"
            />
          </div>

          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
            WhatsApp Connection
          </p>

          <h1 className="text-3xl font-black leading-tight">
            Connect your WhatsApp
          </h1>

          <p className="mt-4 text-sm leading-6 text-white/60">
            Connect your WhatsApp Business account to Sodah and start managing
            customer conversations with your automation.
          </p>

          <div className="mt-8 w-full rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left">
            {[
              ["1", "Click Connect WhatsApp", "Start the secure WhatsApp connection."],
              ["2", "Continue with Meta", "Choose the WhatsApp Business account and phone number you want to connect."],
              ["3", "Finish setup", "Approve the connection and return to Sodah."],
            ].map(([number, title, text], index) => (
              <div key={number}>
                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-black text-cyan-300">
                    {number}
                  </div>
                  <div>
                    <h2 className="text-sm font-black">{title}</h2>
                    <p className="mt-1 text-xs leading-5 text-white/50">{text}</p>
                  </div>
                </div>

                {index < 2 ? (
                  <div className="my-4 ml-4 h-5 border-l border-dashed border-white/10" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-7 w-full">
            {businessId ? (
              <WhatsAppEmbeddedSignup
                businessId={businessId}
                onConnected={handleConnected}
                className="w-full"
              />
            ) : (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
                Your Sodah business could not be identified. Please return to
                Channels and try again.
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] text-white/35">
            Your connection is handled securely through Meta.
          </p>
        </section>
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070b] text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-5 text-center">
        <div className="text-sm font-bold text-white/80">
          Loading WhatsApp connection...
        </div>
        <div className="mt-2 text-xs text-white/40">
          Preparing your secure connection.
        </div>
      </div>
    </main>
  );
}

export default function ConnectWhatsAppLoadPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ConnectWhatsAppContent />
    </Suspense>
  );
}
