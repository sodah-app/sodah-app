"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConnectWhatsAppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const businessId =
    searchParams.get("businessId") || "";

  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  async function fetchQRCode() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/whatsapp/connect",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            businessId,
          }),
        }
      );

      const data = await response.json();

      console.log("QR response:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to generate QR code"
        );
      }

      if (!data.qr) {
        throw new Error(
          "QR code not returned from API"
        );
      }

      setQrCode(data.qr);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkConnection() {
    try {
      const response = await fetch(
        `/api/whatsapp/status?businessId=${encodeURIComponent(
          businessId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      console.log("Status response:", data);

      if (data.connected) {
        setConnected(true);

        setTimeout(() => {
          router.push("/automation");
        }, 2000);
      }
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      setError("Business ID missing.");
      return;
    }

    fetchQRCode();

    const interval = setInterval(() => {
      checkConnection();
    }, 5000);

    return () => clearInterval(interval);
  }, [businessId]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] rounded-3xl p-8 text-center shadow-2xl">

        <img
          src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
          alt="Sodah.io"
          className="w-20 h-20 mx-auto mb-5 rounded-2xl"
        />

        <h1 className="text-3xl font-bold mb-3">
          Connect WhatsApp
        </h1>

        <p className="text-gray-400 mb-8">
          Scan this QR code using WhatsApp
          to connect your AI assistant.
        </p>

        {loading ? (
          <div className="w-72 h-72 mx-auto rounded-2xl bg-[#1E293B] animate-pulse" />
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 text-red-300">
            {error}
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl inline-block">
            <img
              src={qrCode}
              alt="QR Code"
              className="w-72 h-72"
            />
          </div>
        )}

        <div className="mt-6">
          {connected ? (
            <div className="bg-green-500/20 border border-green-500 text-green-300 py-3 rounded-xl">
              ✅ WhatsApp Connected Successfully
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Waiting for QR scan...
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Business ID: {businessId}
        </p>
      </div>
    </div>
  );
}