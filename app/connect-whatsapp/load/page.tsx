"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const WHATSAPP_LOGO =
  "https://cdn.simpleicons.org/whatsapp/25D366";

function ConnectWhatsAppIntroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ======================================================
  // ACTIVE BUSINESS ID
  // ======================================================

  const getActiveBusinessId = useCallback(() => {
    const urlBusinessId =
      searchParams.get("businessId");

    if (urlBusinessId) {
      localStorage.setItem(
        "business_id",
        urlBusinessId
      );

      return urlBusinessId;
    }

    const storedBusinessId =
      localStorage.getItem("business_id");

    if (storedBusinessId) {
      return storedBusinessId;
    }

    return null;
  }, [searchParams]);

  // ======================================================
  // TENANT-AWARE NAVIGATION
  // ======================================================

  const navigateWithBusinessId =
    useCallback(
      (path: string) => {
        const businessId =
          getActiveBusinessId();

        if (!businessId) {
          console.error(
            "[WhatsApp Intro] Missing businessId."
          );

          return;
        }

        const url = new URL(
          path,
          window.location.origin
        );

        url.searchParams.set(
          "businessId",
          businessId
        );

        console.log(
          "[WhatsApp Intro] Navigating:",
          `${url.pathname}${url.search}`
        );

        router.push(
          `${url.pathname}${url.search}${url.hash}`
        );
      },
      [
        getActiveBusinessId,
        router,
      ]
    );

  // ======================================================
  // BACK TO CHANNELS
  // ======================================================

  const handleBack = () => {
    const businessId =
      getActiveBusinessId();

    if (!businessId) {
      console.error(
        "[WhatsApp Intro] Cannot return to Channels. Missing businessId."
      );

      router.push("/channels");
      return;
    }

    router.push(
      `/channels?businessId=${encodeURIComponent(
        businessId
      )}`
    );
  };

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="flex items-center justify-between">

          <button
            type="button"
            onClick={handleBack}
            className="
              rounded-xl
              border
              border-white/10
              bg-white/[0.04]
              px-3
              py-2
              text-xs
              font-bold
              text-white/80
              transition
              hover:bg-white/[0.08]
              active:scale-95
            "
          >
            ← Back
          </button>

          <div className="text-sm font-black">
            Sodah
            <span className="text-cyan-400">
              .io
            </span>
          </div>

        </header>

        {/* ==================================================
            MAIN CONTENT
        ================================================== */}

        <section className="flex flex-1 flex-col items-center justify-center py-12 text-center">

          {/* WHATSAPP LOGO */}

          <div
            className="
              mb-7
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-3xl
              border
              border-emerald-400/20
              bg-emerald-400/10
              shadow-[0_0_30px_rgba(37,211,102,0.12)]
            "
          >
            <img
              src={WHATSAPP_LOGO}
              alt="WhatsApp"
              className="h-11 w-11 object-contain"
            />
          </div>

          {/* LABEL */}

          <p
            className="
              mb-3
              text-xs
              font-black
              uppercase
              tracking-[0.22em]
              text-emerald-300
            "
          >
            WhatsApp Connection
          </p>

          {/* TITLE */}

          <h1 className="text-3xl font-black leading-tight">
            Connect your WhatsApp
          </h1>

          {/* DESCRIPTION */}

          <p className="mt-4 text-sm leading-6 text-white/60">
            You are about to connect your WhatsApp
            to Sodah.io automation. Open WhatsApp
            on your phone and get ready to scan the
            QR code.
          </p>

          {/* ==================================================
              STEPS
          ================================================== */}

          <div className="mt-8 w-full rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left">

            {[
              [
                "1",
                "Open WhatsApp",
                "Open WhatsApp on the phone you want to connect.",
              ],
              [
                "2",
                "Get ready to scan",
                "Open Linked Devices and get ready to scan the QR code.",
              ],
              [
                "3",
                "Scan the QR code",
                "Continue to the secure connection screen when you are ready to scan the code.",
              ],
            ].map(
              (
                [number, title, text],
                index
              ) => (
                <div key={number}>

                  <div className="flex gap-4">

                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-cyan-400/10
                        text-sm
                        font-black
                        text-cyan-300
                      "
                    >
                      {number}
                    </div>

                    <div>

                      <h2 className="text-sm font-black">
                        {title}
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-white/50">
                        {text}
                      </p>

                    </div>

                  </div>

                  {index < 2 && (
                    <div
                      className="
                        my-4
                        ml-4
                        h-5
                        border-l
                        border-dashed
                        border-white/10
                      "
                    />
                  )}

                </div>
              )
            )}

          </div>

          {/* ==================================================
              CONTINUE TO QR CONNECTION
          ================================================== */}

          <button
            type="button"
            onClick={() =>
              navigateWithBusinessId(
                "/connect-whatsapp"
              )
            }
            className="
              mt-7
              w-full
              rounded-2xl
              bg-gradient-to-r
              from-emerald-400
              via-cyan-400
              to-blue-500
              px-5
              py-4
              text-sm
              font-black
              text-[#041014]
              shadow-[0_0_35px_rgba(34,211,238,0.18)]
              transition
              hover:scale-[1.01]
              active:scale-[0.98]
            "
          >
            Ready to scan QR code
          </button>

          {/* NOTE */}

          <p className="mt-4 text-[11px] text-white/35">
            The QR code will appear on the next screen.
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
          Preparing your business connection.
        </div>
      </div>
    </main>
  );
}

export default function ConnectWhatsAppIntroPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ConnectWhatsAppIntroContent />
    </Suspense>
  );
}
