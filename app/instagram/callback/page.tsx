"use client";

import { useEffect, useState } from "react";

export default function InstagramCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const success = params.get("success");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      return;
    }

    if (success === "true") {
      setStatus("success");

      const timer = window.setTimeout(() => {
        window.location.replace("/channels");
      }, 2500);

      return () => window.clearTimeout(timer);
    }

    // If the page is opened without a callback result,
    // don't leave the user stuck here.
    const timer = window.setTimeout(() => {
      window.location.replace("/channels");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, []);

  if (status === "error") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
            <span className="text-3xl font-bold text-red-400">!</span>
          </div>

          <h1 className="text-3xl font-bold">
            Instagram Connection Failed
          </h1>

          <p className="mt-4 text-white/60">
            We could not complete your Instagram connection.
          </p>

          <button
            onClick={() => window.location.replace("/channels")}
            className="mt-8 w-full rounded-2xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-white/90"
          >
            Back to Channels
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">

        {/* Instagram Icon */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 shadow-2xl">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-12 w-12 text-white"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="5"
            />

            <circle
              cx="12"
              cy="12"
              r="4"
            />

            <circle
              cx="17.5"
              cy="6.5"
              r="1"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </div>

        {status === "loading" && (
          <>
            <div className="mx-auto mb-7 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-white" />

            <h1 className="text-3xl font-bold">
              Connecting Instagram
            </h1>

            <p className="mt-4 leading-7 text-white/60">
              Please wait while we securely connect your Instagram account
              to Sodah.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            {/* Success Icon */}
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-green-400/20 bg-green-400/10">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-green-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12l4 4L19 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold">
              Instagram Connected
            </h1>

            <p className="mt-4 leading-7 text-white/60">
              Your Instagram account has been successfully connected to
              Sodah.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />

                <span className="text-sm font-medium text-white/80">
                  Instagram automation is active
                </span>
              </div>

              <p className="mt-3 text-xs text-white/40">
                Redirecting you to Channels...
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}