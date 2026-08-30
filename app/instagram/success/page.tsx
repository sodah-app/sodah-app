"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function InstagramSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const businessId =
    searchParams.get("businessId")?.trim() || "";

  const [seconds, setSeconds] = useState(6);

  useEffect(() => {
    let remaining = 6;

    const interval = window.setInterval(() => {
      remaining -= 1;

      setSeconds(Math.max(remaining, 0));

      if (remaining <= 0) {
        window.clearInterval(interval);

        if (businessId) {
          router.replace(
            `/channels?instagram=connected&businessId=${encodeURIComponent(
              businessId
            )}`
          );
        } else {
          router.replace("/channels?instagram=connected");
        }
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [businessId, router]);

  const openChannels = () => {
    if (businessId) {
      router.replace(
        `/channels?instagram=connected&businessId=${encodeURIComponent(
          businessId
        )}`
      );
      return;
    }

    router.replace("/channels?instagram=connected");
  };

  return (
    <main className="min-h-screen bg-[#020806] px-5 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-green-400/20 bg-[#07110c]/90 p-7 text-center shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:p-10">

          {/* INSTAGRAM ICON */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-pink-400/25 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-orange-400/15 text-5xl shadow-[0_0_55px_rgba(228,64,95,.18)]">
            ◎
          </div>

          {/* STATUS */}
          <p className="mt-7 text-[10px] font-black uppercase tracking-[3px] text-green-300">
            Instagram Connected
          </p>

          {/* TITLE */}
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Your Instagram is now connected
          </h1>

          {/* DESCRIPTION */}
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-gray-400">
            Instagram has been successfully connected to your Sodah.io
            automation workspace. Your connection is now linked to the correct
            business.
          </p>

          {/* BUSINESS ID */}
          {businessId && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left">
              <p className="text-[9px] font-black uppercase tracking-[2px] text-gray-500">
                Business ID
              </p>

              <p className="mt-1 break-all font-mono text-xs text-green-300">
                {businessId}
              </p>
            </div>
          )}

          {/* CONTINUE BUTTON */}
          <button
            type="button"
            onClick={openChannels}
            className="mt-7 w-full rounded-2xl bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 px-5 py-4 text-sm font-black text-[#031109] shadow-[0_0_35px_rgba(34,211,238,.18)] transition hover:scale-[1.01] active:scale-[0.99]"
          >
            Continue to Channels →
          </button>

          {/* COUNTDOWN */}
          <p className="mt-4 text-[11px] text-gray-600">
            Returning to Channels in {seconds}s…
          </p>
        </section>
      </div>
    </main>
  );
}

function InstagramSuccessLoading() {
  return (
    <main className="min-h-screen bg-[#020806] px-5 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-green-400/20 bg-[#07110c]/90 p-10 text-center shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-2xl">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-white/10 border-t-green-400" />

          <p className="mt-6 text-sm font-bold text-gray-300">
            Confirming your Instagram connection…
          </p>

          <p className="mt-2 text-xs text-gray-600">
            Please wait.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function InstagramSuccessPage() {
  return (
    <Suspense fallback={<InstagramSuccessLoading />}>
      <InstagramSuccessContent />
    </Suspense>
  );
}