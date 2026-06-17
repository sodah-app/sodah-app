"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ConnectWhatsAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const businessId =
    searchParams?.get("businessId") || "";

  const [loading, setLoading] =
    useState(false);

  const [status, setStatus] =
    useState("Ready to generate QR code.");

  const [qrCode, setQrCode] =
    useState("");

  const [error, setError] =
    useState("");

  const generateQRCode = async () => {
    if (!businessId) {
      setError("Business ID missing.");
      return;
    }

    setLoading(true);
    setError("");
    setQrCode("");

    try {
      const response = await fetch(
        `/api/connect-whatsapp?businessId=${businessId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to connect WhatsApp."
        );
      }

      if (data.connected) {
        setStatus(
          "WhatsApp already connected."
        );

        setTimeout(() => {
          router.push("/automation");
        }, 2000);

        return;
      }

      if (data.qrCode) {
        setQrCode(data.qrCode);

        setStatus(
          "Scan this QR code with WhatsApp."
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Unexpected error."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (businessId) {
      generateQRCode();
    }
  }, [businessId]);

  return (
  <div className="min-h-screen flex flex-col items-center justify-center p-6">
    <h1 className="text-2xl font-bold mb-4">
      Connect WhatsApp
    </h1>

    <p className="mb-4">{status}</p>

    {loading && (
      <p>Generating QR code...</p>
    )}

    {error && (
      <div className="text-red-500 mb-4">
        {error}
      </div>
    )}

    {qrCode && (
      <img
        src={qrCode}
        alt="WhatsApp QR Code"
        className="w-72 h-72 border rounded-lg"
      />
    )}

    {!loading && !qrCode && (
      <button
        onClick={generateQRCode}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Generate QR Code
      </button>
    )}
  </div>
);
}

export default function ConnectWhatsAppPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConnectWhatsAppContent />
    </Suspense>
  );
}