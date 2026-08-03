"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function QRConnectPage() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(
    "Preparing WhatsApp connection..."
  );
  const [error, setError] = useState("");

  // ==========================================
  // LOAD BUSINESS ID
  // ==========================================

useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  // 1. Try URL first (desktop behavior)
  let id = params.get("businessId");

  // 2. Fall back to localStorage (mobile behavior)
  if (!id) {
    id = localStorage.getItem("business_id");
  }

  if (!id) {
    setError("Business ID not found.");
    return;
  }

  // Keep localStorage synchronized
  localStorage.setItem("business_id", id);

  setBusinessId(id);
}, []);
  // ==========================================
  // GENERATE QR
  // ==========================================

  const generateQRCode = useCallback(
    async (id) => {
      if (!id) return;

      try {
        setLoading(true);
        setError("");
        setQrCode("");

        const response = await fetch(
          `/api/whatsapp/connect?businessId=${encodeURIComponent(
            id
          )}`,
          {
            method: "POST",
            cache: "no-store",
          }
        );

        const text =
          await response.text();

        let data = {};

        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(
              "Invalid server response."
            );
          }
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to generate QR."
          );
        }

        // already connected
        if (data.connected) {
          setConnected(true);

          setStatus(
            "WhatsApp already connected."
          );

          setTimeout(() => {
            router.replace(
              "/welcome"
            );
          }, 1000);

          return;
        }

        if (data.qrCode) {
          setQrCode(data.qrCode);

          setStatus(
            "Scan the QR code using WhatsApp."
          );

          return;
        }

        throw new Error(
          data.message ||
            "QR code not returned."
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate QR."
        );
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    if (!businessId) return;

    generateQRCode(businessId);
  }, [
    businessId,
    generateQRCode,
  ]);

  // ==========================================
  // CHECK STATUS
  // ==========================================

  useEffect(() => {
    if (!businessId) return;

    const interval = setInterval(
      async () => {
        try {
          const response =
            await fetch(
              `/api/whatsapp/status?businessId=${encodeURIComponent(
                businessId
              )}`,
              {
                cache:
                  "no-store",
              }
            );

          if (!response.ok)
            return;

          const data =
            await response.json();

          if (
            data.connected
          ) {
            clearInterval(
              interval
            );

            setConnected(
              true
            );

            setStatus(
              "✅ WhatsApp connected successfully."
            );

            // close QR page
            setTimeout(() => {
              router.replace(
                "/welcome"
              );
            }, 1500);
          }
        } catch (err) {
          console.error(
            err
          );
        }
      },
      3000
    );

    return () =>
      clearInterval(
        interval
      );
  }, [businessId, router]);

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-sm bg-[#111827] rounded-3xl p-6 shadow-2xl text-center">

        <img
          src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
          alt="Sodah.io"
          className="w-16 h-16 mx-auto mb-4 rounded-xl"
        />

        <h1 className="text-2xl font-bold mb-2">
          Connect WhatsApp
        </h1>

        <p className="text-gray-400 text-sm mb-6">
          Scan the QR code below
          using WhatsApp.
        </p>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500 bg-red-500/10 p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="w-52 h-52 mx-auto rounded-2xl bg-slate-700 animate-pulse" />
        ) : qrCode ? (
          <div className="bg-white p-3 rounded-2xl inline-block">
            <img
              src={qrCode}
              alt="QR Code"
              className="w-52 h-52 sm:w-60 sm:h-60"
            />
          </div>
        ) : (
          <button
            onClick={() =>
              generateQRCode(
                businessId
              )
            }
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl"
          >
            Generate QR Code
          </button>
        )}

        <div className="mt-6">
          {connected ? (
            <div className="border border-green-500 bg-green-500/10 text-green-300 py-3 rounded-xl">
              ✅ Connected
              <br />
              Redirecting...
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              {status}
            </div>
          )}
        </div>

        {businessId && (
          <div className="mt-5 text-[11px] text-gray-500 break-all">
            Business ID:
            <br />
            {businessId}
          </div>
        )}
      </div>
    </div>
  );
}