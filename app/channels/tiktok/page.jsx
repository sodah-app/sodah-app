"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function TikTokPageContent() {
  const searchParams = useSearchParams();

  const businessId =
    searchParams.get("businessId")?.trim() || "";

  const [connected, setConnected] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [connecting, setConnecting] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ----------------------------------------------------------
   * CHECK TIKTOK CONNECTION
   * ----------------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (!businessId) {
        if (!cancelled) {
          setLoading(false);
          setError(
            "Business information is missing."
          );
        }

        return;
      }

      try {
        const response = await fetch(
          `/api/auth/tiktok/status?businessId=${encodeURIComponent(
            businessId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `TikTok status request failed: ${response.status}`
          );
        }

        if (!cancelled) {
          setConnected(
            data?.connected === true
          );
        }
      } catch (statusError) {
        console.error(
          "[TikTok Status]",
          statusError
        );

        if (!cancelled) {
          setConnected(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  /*
   * ----------------------------------------------------------
   * START TIKTOK OAUTH
   * ----------------------------------------------------------
   */

  const connectTikTok = async () => {
    if (!businessId) {
      setError(
        "Business information is missing. Please return to Channels and try again."
      );

      return;
    }

    if (connecting) {
      return;
    }

    setError("");
    setConnecting(true);

    try {
      /*
       * ------------------------------------------------------
       * GET CURRENT SODAH SESSION
       * ------------------------------------------------------
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log(
        "[TikTok Connect] Browser session:",
        {
          hasSession: Boolean(session),
          hasAccessToken: Boolean(
            session?.access_token
          ),
          userId:
            session?.user?.id || null,
        }
      );

      if (
        sessionError ||
        !session ||
        !session.access_token
      ) {
        console.error(
          "[TikTok Connect] Supabase session unavailable:",
          sessionError
        );

        setError(
          "Your Sodah session could not be verified. Please sign in again."
        );

        setConnecting(false);

        return;
      }

      /*
       * ------------------------------------------------------
       * ASK SERVER TO START OAUTH
       * ------------------------------------------------------
       */

      const response = await fetch(
        "/api/auth/tiktok/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          credentials: "include",

          body: JSON.stringify({
            businessId,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "[TikTok Connect] Login response:",
        {
          ok: response.ok,
          success:
            data?.success === true,
          error:
            data?.error || null,
        }
      );

      if (
        !response.ok ||
        data?.success !== true ||
        !data?.authorizationUrl
      ) {
        throw new Error(
          data?.error_details ||
            data?.error ||
            "Unable to start TikTok connection."
        );
      }

      /*
       * ------------------------------------------------------
       * SAVE ACTIVE BUSINESS CONTEXT
       * ------------------------------------------------------
       */

      try {
        localStorage.setItem(
          "business_id",
          businessId
        );
      } catch (storageError) {
        console.warn(
          "[TikTok Connect] Could not persist business_id:",
          storageError
        );
      }

      /*
       * ------------------------------------------------------
       * OPEN TIKTOK
       * ------------------------------------------------------
       */

      console.log(
        "[TikTok Connect] Redirecting to TikTok."
      );

      window.location.assign(
        data.authorizationUrl
      );
    } catch (connectError) {
      console.error(
        "[TikTok Connect] Failed:",
        connectError
      );

      setError(
        connectError instanceof Error
          ? connectError.message
          : "Unable to start TikTok connection."
      );

      setConnecting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">

          {/* HEADER */}

          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-3xl">
              ♪
            </div>

            <div>
              <h1 className="text-3xl font-black">
                TikTok
              </h1>

              <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
                Channel Connection
              </p>
            </div>
          </div>

          {/* TITLE */}

          <h2 className="text-4xl font-black">
            {connected
              ? "TikTok is connected."
              : "Connect TikTok"}
          </h2>

          <p className="mt-4 leading-7 text-gray-400">
            Connect your TikTok account to
            Sodah.io and manage your TikTok
            presence from your Sodah workspace.
          </p>

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
              <div className="font-bold text-red-400">
                TikTok connection error
              </div>

              <p className="mt-2 text-sm leading-6 text-gray-300">
                {error}
              </p>
            </div>
          )}

          {/* MISSING BUSINESS */}

          {!businessId && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-5">
              <div className="font-bold text-red-400">
                Business information missing
              </div>

              <p className="mt-2 text-sm text-gray-400">
                Sodah could not determine which
                business is starting this TikTok
                connection.
              </p>
            </div>
          )}

          {/* FLOW */}

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-sm font-bold text-cyan-300">
              What happens next
            </div>

            <div className="mt-3 space-y-2 text-sm text-gray-400">
              <div>
                ✓ TikTok opens securely
              </div>

              <div>
                ✓ Sign in to your TikTok account
              </div>

              <div>
                ✓ Review Sodah.io access
              </div>

              <div>
                ✓ Authorize the connection
              </div>

              <div>
                ✓ TikTok returns to Sodah
              </div>

              <div>
                ✓ Your TikTok connection is saved
                to this Sodah business
              </div>
            </div>
          </div>

          {/* CONNECT */}

          {!connected && (
            <button
              type="button"
              onClick={connectTikTok}
              disabled={
                loading ||
                !businessId ||
                connecting
              }
              className="mt-8 w-full rounded-2xl bg-white px-6 py-4 text-base font-black text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Checking connection..."
                : connecting
                ? "Opening TikTok..."
                : "Continue with TikTok →"}
            </button>
          )}

          {/* CONNECTED */}

          {connected && (
            <div className="mt-8 rounded-2xl border border-green-400/20 bg-green-400/10 p-5 text-center">
              <div className="text-lg font-black text-green-400">
                ✓ TikTok Connected
              </div>

              <p className="mt-2 text-sm text-gray-400">
                This TikTok account is connected
                to this Sodah business.
              </p>
            </div>
          )}

          {/* BACK */}

          <button
            type="button"
            onClick={() =>
              window.location.assign(
                "/channels"
              )
            }
            className="mt-5 w-full rounded-2xl border border-white/10 px-6 py-4 font-bold text-gray-300 transition hover:bg-white/[0.05]"
          >
            ← Back to Channels
          </button>
        </div>
      </div>
    </main>
  );
}

/*
 * ----------------------------------------------------------
 * SUSPENSE WRAPPER
 * ----------------------------------------------------------
 *
 * Required because TikTokPageContent uses
 * useSearchParams().
 *
 * This fixes the production prerender/build error.
 * ----------------------------------------------------------
 */

export default function TikTokPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#020617] px-6 py-16 text-white">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
              <div className="text-center">
                <div className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">
                  TikTok
                </div>

                <h1 className="mt-4 text-3xl font-black">
                  Loading connection...
                </h1>

                <p className="mt-3 text-gray-400">
                  Preparing your TikTok connection.
                </p>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <TikTokPageContent />
    </Suspense>
  );
}