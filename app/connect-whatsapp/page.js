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
    <div>
      Connect WhatsApp Page
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