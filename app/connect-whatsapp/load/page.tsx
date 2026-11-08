"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

type ConnectionState =
  | "idle"
  | "checking"
  | "missing_business"
  | "business_not_found"
  | "connected"
  | "error";

type Business = {
  business_id: string;
  business_name: string | null;
  whatsapp_connected: boolean | null;
};

function ConnectWhatsAppLoadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<ConnectionState>("idle");
  const [message, setMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const getBusinessId = useCallback(() => {
    const queryBusinessId = searchParams.get("businessId");

    if (queryBusinessId?.trim()) {
      const id = queryBusinessId.trim();

      try {
        localStorage.setItem("businessId", id);
      } catch {
        // Ignore localStorage errors.
      }

      return id;
    }

    try {
      const storedBusinessId = localStorage.getItem("businessId");

      if (storedBusinessId?.trim()) {
        return storedBusinessId.trim();
      }
    } catch {
      // Ignore localStorage errors.
    }

    return null;
  }, [searchParams]);

  const handleContinue = useCallback(async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    setState("checking");
    setMessage("");

    try {
      const businessId = getBusinessId();

      if (!businessId) {
        setState("missing_business");
        setMessage(
          "Your business could not be identified. Please return to your business dashboard and try again."
        );
        return;
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("business_id, business_name, whatsapp_connected")
        .eq("business_id", businessId)
        .maybeSingle<Business>();

      if (error) {
        console.error("WhatsApp business lookup failed:", error);

        setState("error");
        setMessage(
          "We could not verify your business right now. Please try again."
        );
        return;
      }

      if (!data) {
        setState("business_not_found");
        setMessage(
          "This business could not be found. Please return to your dashboard and try again."
        );
        return;
      }

      if (data.whatsapp_connected === true) {
        setState("connected");
        setMessage(
          data.business_name
            ? `${data.business_name} is already connected to WhatsApp.`
            : "This business is already connected to WhatsApp."
        );
        return;
      }

      const targetUrl = `/connect-whatsapp?businessId=${encodeURIComponent(
        businessId
      )}`;

      router.push(targetUrl);
    } catch (error) {
      console.error("WhatsApp connection check failed:", error);

      setState("error");
      setMessage(
        "Something went wrong while preparing WhatsApp connection. Please try again."
      );
    } finally {
      setIsConnecting(false);
    }
  }, [getBusinessId, isConnecting, router]);

  const handleBack = () => {
    const businessId = getBusinessId();

    if (businessId) {
      router.push(
        `/voice-settings?businessId=${encodeURIComponent(businessId)}`
      );
      return;
    }

    router.back();
  };

  const isChecking = state === "checking";

  return (
    <main className="min-h-screen bg-[#07100c] text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-[#0d1712] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-7 pb-5 text-center border-b border-white/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20">
              <img
                src="https://cdn.simpleicons.org/whatsapp/25D366"
                alt="WhatsApp"
                className="h-9 w-9"
              />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Connect WhatsApp
            </h1>

            <p className="mt-2 text-sm leading-6 text-white/55">
              Connect your WhatsApp account to start sending and receiving
              messages through Sodah.
            </p>
          </div>

          {/* Main content */}
          <div className="p-6">
            {state === "idle" && (
              <>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                      ✓
                    </div>

                    <div>
                      <p className="text-sm font-medium text-white">
                        Ready to connect
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/50">
                        The next screen will show the QR code. Scan it using
                        WhatsApp on your phone.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                    Important
                  </p>

                  <p className="mt-2 text-sm leading-6 text-white/65">
                    Make sure you are using the WhatsApp number you want to
                    connect to this business.
                  </p>
                </div>
              </>
            )}

            {state === "checking" && (
              <div className="py-8 text-center">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-[#25D366]" />

                <p className="mt-4 text-sm font-medium text-white">
                  Checking your business...
                </p>

                <p className="mt-1 text-xs text-white/45">
                  Please wait a moment.
                </p>
              </div>
            )}

            {state === "missing_business" && (
              <StatusBox
                type="warning"
                title="Business not identified"
                message={message}
              />
            )}

            {state === "business_not_found" && (
              <StatusBox
                type="warning"
                title="Business not found"
                message={message}
              />
            )}

            {state === "connected" && (
              <StatusBox
                type="success"
                title="WhatsApp already connected"
                message={message}
              />
            )}

            {state === "error" && (
              <StatusBox
                type="error"
                title="Connection check failed"
                message={message}
              />
            )}

            <div className="mt-6 flex flex-col gap-3">
              {state === "connected" ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.99]"
                >
                  Go Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={isChecking || isConnecting}
                  className="w-full rounded-2xl bg-[#25D366] px-4 py-3.5 text-sm font-semibold text-[#061008] transition hover:bg-[#20bd5a] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isChecking || isConnecting
                    ? "Checking..."
                    : state === "error" ||
                        state === "missing_business" ||
                        state === "business_not_found"
                      ? "Try Again"
                      : "Continue to QR Code"}
                </button>
              )}

              {state !== "idle" &&
                state !== "checking" &&
                state !== "connected" && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Go Back
                  </button>
                )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4 text-center">
            <p className="text-[11px] text-white/35">
              Sodah WhatsApp connection
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBox({
  type,
  title,
  message,
}: {
  type: "success" | "warning" | "error";
  title: string;
  message: string;
}) {
  const styles = {
    success: {
      wrapper: "border-[#25D366]/20 bg-[#25D366]/5",
      icon: "bg-[#25D366]/10 text-[#25D366]",
    },
    warning: {
      wrapper: "border-yellow-400/20 bg-yellow-400/5",
      icon: "bg-yellow-400/10 text-yellow-300",
    },
    error: {
      wrapper: "border-red-400/20 bg-red-400/5",
      icon: "bg-red-400/10 text-red-300",
    },
  };

  const style = styles[type];

  return (
    <div className={`rounded-2xl border p-4 ${style.wrapper}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${style.icon}`}
        >
          {type === "success" ? "✓" : type === "warning" ? "!" : "×"}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{title}</p>

          <p className="mt-1 text-xs leading-5 text-white/55">{message}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-[#07100c] flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-[#25D366]" />

        <p className="mt-4 text-sm text-white/50">
          Loading WhatsApp connection...
        </p>
      </div>
    </main>
  );
}

export default function ConnectWhatsAppLoadPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ConnectWhatsAppLoadContent />
    </Suspense>
  );
}