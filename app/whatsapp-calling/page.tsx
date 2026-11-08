"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (
        callback: (response: any) => void,
        options: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

/* ============================================================
   META CONFIGURATION
============================================================ */

const META_APP_ID =
  process.env.NEXT_PUBLIC_META_APP_ID ||
  "25897772649921478";

const META_CONFIG_ID =
  process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID ||
  "1763640678282514";

/* ============================================================
   FACEBOOK SDK
============================================================ */

function loadFacebookSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Browser only.")
    );
  }

  if (window.FB) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing =
      document.getElementById("facebook-jssdk");

    window.fbAsyncInit = () => {
      try {
        window.FB?.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: false,
          version:
            process.env.NEXT_PUBLIC_META_GRAPH_VERSION ||
            "v25.0",
        });

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    if (existing) {
      return;
    }

    const script =
      document.createElement("script");

    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src =
      "https://connect.facebook.net/en_US/sdk.js";

    script.onerror = () => {
      reject(
        new Error(
          "Unable to load Meta JavaScript SDK."
        )
      );
    };

    document.body.appendChild(script);
  });
}

/* ============================================================
   SUPABASE AUTH
   ------------------------------------------------------------
   IMPORTANT:
   Use the SAME shared Supabase client used by the
   rest of the Sodah application.

   Do not create a second browser client here.
============================================================ */

async function getAccessToken(): Promise<string> {
  /*
   * First attempt:
   * use the current persisted Supabase session.
   */
  const {
    data,
    error,
  } = await supabase.auth.getSession();

  if (
    !error &&
    data?.session?.access_token
  ) {
    return data.session.access_token;
  }

  /*
   * Supabase can still be restoring the session immediately
   * after navigation. Give it a short moment to finish.
   */
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await new Promise((resolve) =>
      setTimeout(resolve, 300)
    );

    const retry =
      await supabase.auth.getSession();

    if (
      !retry.error &&
      retry.data?.session?.access_token
    ) {
      return retry.data.session.access_token;
    }
  }

  throw new Error(
    "Authentication required. Please sign in again."
  );
}

/* ============================================================
   PAGE
============================================================ */

function WhatsAppCallingContent() {
  const searchParams =
    useSearchParams();

  const businessId = useMemo(
    () =>
      searchParams
        .get("businessId")
        ?.trim() || "",
    [searchParams]
  );

  const [status, setStatus] =
    useState<
      | "loading"
      | "not_connected"
      | "connected"
      | "error"
    >("loading");

  const [message, setMessage] =
    useState("");

  const [connecting, setConnecting] =
    useState(false);

  const [connection, setConnection] =
    useState<any>(null);

  const metaCodeRef =
    useRef<string>("");

  const signupResultRef =
    useRef<{
      wabaId: string;
      phoneNumberId: string;
    } | null>(null);

  const exchangeInProgressRef =
    useRef(false);

  /* ==========================================================
     LOAD CALLING STATUS
  ========================================================== */

  useEffect(() => {
    if (!businessId) {
      setStatus("error");
      setMessage(
        "Business ID is missing from this connection."
      );
      return;
    }

    let cancelled = false;

    async function loadCallingStatus() {
      try {
        setStatus("loading");
        setMessage("");

        /*
         * IMPORTANT:
         * Get the SAME authenticated Supabase session
         * used everywhere else in Sodah.
         */
        const token =
          await getAccessToken();

        if (cancelled) {
          return;
        }

        const response =
          await fetch(
            `/api/whatsapp-calling/status?businessId=${encodeURIComponent(
              businessId
            )}`,
            {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const result =
          await response
            .json()
            .catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Unable to load calling status."
          );
        }

        if (cancelled) {
          return;
        }

        setConnection(
          result?.connection || null
        );

        setStatus(
          result?.connected === true
            ? "connected"
            : "not_connected"
        );
      } catch (error: any) {
        if (cancelled) {
          return;
        }

        console.error(
          "[WhatsApp Calling] Status authentication failed:",
          error
        );

        setStatus("error");

        setMessage(
          error?.message ||
            "Unable to load calling status."
        );
      }
    }

    void loadCallingStatus();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  /* ==========================================================
     FINISH META CONNECTION
  ========================================================== */

  async function finishMetaConnection(
    wabaId: string,
    phoneNumberId: string
  ) {
    if (!businessId) {
      return;
    }

    signupResultRef.current = {
      wabaId,
      phoneNumberId,
    };

    if (
      exchangeInProgressRef.current ||
      !metaCodeRef.current
    ) {
      return;
    }

    exchangeInProgressRef.current = true;

    setMessage(
      "Meta signup completed. Finishing the secure connection..."
    );

    try {
      /*
       * Get the authenticated Sodah session again.
       * Never reuse a stale token.
       */
      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/whatsapp-calling/exchange",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              businessId,
              wabaId,
              phoneNumberId,
              code:
                metaCodeRef.current,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Meta connection could not be completed."
        );
      }

      setConnection(
        result?.connection || null
      );

      setStatus("connected");

      setMessage(
        "WhatsApp Calling connection completed."
      );

      metaCodeRef.current = "";

      signupResultRef.current = null;
    } catch (error: any) {
      console.error(
        "[WhatsApp Calling] Meta exchange failed:",
        error
      );

      setStatus("error");

      setMessage(
        error?.message ||
          "Unable to finish the Meta connection."
      );
    } finally {
      exchangeInProgressRef.current =
        false;

      setConnecting(false);
    }
  }

  /* ==========================================================
     META EMBEDDED SIGNUP MESSAGE
  ========================================================== */

  useEffect(() => {
    if (!businessId) {
      return;
    }

    const handleMessage =
      async (event: MessageEvent) => {
        /*
         * Meta can use different Facebook hosts.
         */
        if (
          !event.origin ||
          !event.origin.endsWith(
            "facebook.com"
          )
        ) {
          return;
        }

        let data: any =
          event.data;

        if (
          typeof data === "string"
        ) {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }

        if (
          !data ||
          data.type !==
            "WA_EMBEDDED_SIGNUP"
        ) {
          return;
        }

        /* -----------------------------
           CANCEL
        ----------------------------- */

        if (
          data.event === "CANCEL"
        ) {
          setConnecting(false);

          setMessage(
            "Meta connection was cancelled."
          );

          return;
        }

        /* -----------------------------
           ERROR
        ----------------------------- */

        if (
          data.event === "ERROR"
        ) {
          setConnecting(false);

          setStatus("error");

          setMessage(
            data?.data
              ?.error_message ||
              "Meta Embedded Signup returned an error."
          );

          return;
        }

        /* -----------------------------
           SUCCESS
        ----------------------------- */

        if (
          data.event === "FINISH" ||
          data.event ===
            "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
        ) {
          const wabaId =
            data?.data?.waba_id ||
            data?.data
              ?.whatsapp_business_account_id ||
            "";

          const phoneNumberId =
            data?.data
              ?.phone_number_id ||
            "";

          /*
           * Coexistence can sometimes return only
           * the WABA ID. The backend can discover the
           * phone number from Meta.
           */
          if (
            !wabaId &&
            !phoneNumberId
          ) {
            setConnecting(false);

            setStatus("error");

            setMessage(
              "Meta completed the flow but did not return the WhatsApp account identifiers. Check the Meta configuration and try again."
            );

            return;
          }

          await finishMetaConnection(
            wabaId,
            phoneNumberId
          );
        }
      };

    window.addEventListener(
      "message",
      handleMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, [businessId]);

  /* ==========================================================
     CONNECT META
  ========================================================== */

  async function connectMeta() {
    if (!businessId) {
      setStatus("error");
      setMessage(
        "Business ID is missing."
      );
      return;
    }

    if (!META_APP_ID) {
      setStatus("error");
      setMessage(
        "NEXT_PUBLIC_META_APP_ID is not configured."
      );
      return;
    }

    if (!META_CONFIG_ID) {
      setStatus("error");
      setMessage(
        "NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID is not configured."
      );
      return;
    }

    setConnecting(true);

    setMessage(
      "Opening Meta Embedded Signup for Sodah WhatsApp Connection..."
    );

    try {
      /*
       * IMPORTANT:
       * Verify the Sodah login session BEFORE opening Meta.
       *
       * This prevents Meta onboarding from starting when
       * the Sodah user session is missing.
       */
      await getAccessToken();

      await loadFacebookSdk();

      if (!window.FB) {
        throw new Error(
          "Meta JavaScript SDK is unavailable."
        );
      }

      window.FB.login(
        (response: any) => {
          if (
            response?.authResponse?.code
          ) {
            /*
             * Meta authorization code.
             */
            metaCodeRef.current =
              response.authResponse.code;

            setMessage(
              "Meta authorization received. Completing the WhatsApp onboarding..."
            );

            const signupResult =
              signupResultRef.current;

            if (signupResult) {
              void finishMetaConnection(
                signupResult.wabaId,
                signupResult.phoneNumberId
              );
            }
          } else {
            setConnecting(false);

            setMessage(
              "Meta login was cancelled or did not return an authorization code."
            );
          }
        },
        {
          config_id:
            META_CONFIG_ID,

          response_type:
            "code",

          override_default_response_type:
            true,

          extras: {
            setup: {},

            featureType:
              "whatsapp_business_app_onboarding",

            sessionInfoVersion: 3,
          },
        }
      );
    } catch (error: any) {
      console.error(
        "[WhatsApp Calling] Connect failed:",
        error
      );

      setConnecting(false);

      setStatus("error");

      setMessage(
        error?.message ||
          "Unable to open Meta Embedded Signup."
      );
    }
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#111827]">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
        <div className="flex h-[72px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366]">
              <span className="text-xl font-black text-white">
                ☎
              </span>
            </div>

            <div>
              <h1 className="text-lg font-black text-gray-900">
                WhatsApp Calling
              </h1>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                Meta Business Platform
              </p>
            </div>
          </div>

          <Link
  href={
    businessId
      ? `/channels?businessId=${encodeURIComponent(businessId)}`
      : "/channels"
  }
  className="hidden rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700 sm:block"
>
  ← Channels
</Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-10">
        <section className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.07)]">
          <div className="grid gap-10 p-7 lg:grid-cols-[1.15fr_0.85fr] lg:p-12">
            <div>
              <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-green-700">
                Meta Calling Connection
              </span>

              <h2 className="mt-6 text-4xl font-black leading-[1.05] tracking-[-0.035em] text-gray-950 lg:text-6xl">
                Connect WhatsApp
                <br />
                <span className="text-[#25D366]">
                  Calling
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-base leading-7 text-gray-500 lg:text-lg">
                Connect the business through Meta&apos;s
                WhatsApp Business Platform while keeping
                the existing Sodah QR messaging connection
                separate.
              </p>

              <div className="mt-8">
  <button
    type="button"
    disabled
    aria-disabled="true"
    className="inline-flex cursor-not-allowed items-center justify-center gap-3 rounded-2xl bg-gray-300 px-7 py-4 text-sm font-black text-gray-500 shadow-none"
  >
    <span className="text-base">🔒</span>
    WhatsApp Calling
  </button>

  <div className="mt-3 flex items-center gap-2">
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
      Coming Soon
    </span>

    <span className="text-xs font-semibold text-gray-400">
      WhatsApp Calling will be available soon.
    </span>
  </div>
</div>

              {message && (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    status === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5">
                <p className="text-sm font-black text-green-900">
                  Existing QR connection stays active
                </p>

                <p className="mt-1 text-sm leading-6 text-green-800/70">
                  This feature does not disconnect or
                  replace your existing WhatsApp QR provider.
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-full rounded-[26px] border border-gray-200 bg-[#f8fafb] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                  Connection status
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <h3 className="text-2xl font-black text-gray-900">
                    {status === "connected"
                      ? "Connected"
                      : status === "loading"
                      ? "Checking..."
                      : "Not Connected"}
                  </h3>

                  <span
                    className={`h-3 w-3 rounded-full ${
                      status === "connected"
                        ? "bg-green-500"
                        : status === "error"
                        ? "bg-red-500"
                        : "bg-gray-400"
                    }`}
                  />
                </div>

                <div className="mt-6 space-y-3">
                  <InfoRow
                    label="Meta Calling"
                    value={
                      status === "connected"
                        ? "Connected"
                        : "Not connected"
                    }
                  />

                  <InfoRow
                    label="WhatsApp Account"
                    value={
                      connection?.waba_id ||
                      "Waiting for Meta"
                    }
                  />

                  <InfoRow
                    label="Phone Number ID"
                    value={
                      connection?.phone_number_id ||
                      "Waiting for Meta"
                    }
                  />

                  <InfoRow
                    label="Business"
                    value={
                      businessId ||
                      "Not provided"
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card
            n="01"
            title="Meta onboarding"
            text="The business completes Meta's Embedded Signup flow."
          />

          <Card
            n="02"
            title="Calling connection"
            text="Sodah stores the Meta WhatsApp account and phone-number connection for this business."
          />

          <Card
            n="03"
            title="AI calling"
            text="The calling gateway can later use the same Sodah business AI and customer context."
          />
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   PAGE WRAPPER
   ------------------------------------------------------------
   Next.js 15 requires useSearchParams() to be rendered beneath
   a Suspense boundary during production prerendering.

   WhatsAppCallingContent contains the existing Meta/Supabase
   implementation and UI unchanged.
============================================================ */

export default function WhatsAppCallingPage() {
  return (
    <Suspense fallback={null}>
      <WhatsAppCallingContent />
    </Suspense>
  );
}

/* ============================================================
   INFO ROW
============================================================ */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-gray-700">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   CARD
============================================================ */

function Card({
  n,
  title,
  text,
}: {
  n: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-[10px] font-black text-gray-500">
        {n}
      </div>

      <h3 className="text-base font-black text-gray-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {text}
      </p>
    </div>
  );
}