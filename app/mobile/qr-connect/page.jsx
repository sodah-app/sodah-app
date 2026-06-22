"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function QRConnectPage() {
  const router = useRouter();

  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const fetchQRCode = useCallback(async () => {
    try {
      const businessId = localStorage.getItem("business_id");

      if (!businessId) {
        console.error("No business_id found");
        setLoading(false);
        return;
      }

      setLoading(true);

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

      if (data.qr) {
        const formattedQR = data.qr.startsWith("data:")
          ? data.qr
          : `data:image/png;base64,${data.qr}`;

        setQrCode(formattedQR);
      } else {
        console.error("QR generation failed:", data);
      }
    } catch (error) {
      console.error("QR fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const businessId = localStorage.getItem("business_id");

      if (!businessId) return;

      const response = await fetch(
        `/api/whatsapp/status?businessId=${businessId}`
      );

      const data = await response.json();

      if (data.connected) {
        setConnected(true);

        setQrCode("");

        setTimeout(() => {
          router.replace("/welcome");
        }, 1500);
      }
    } catch (error) {
      console.error("Status check error:", error);
    }
  }, [router]);

  useEffect(() => {
    fetchQRCode();

    const interval = setInterval(() => {
      checkConnection();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchQRCode, checkConnection]);

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm bg-[#111827] rounded-3xl p-6 text-center shadow-2xl">

        <img
          src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
          alt="Sodah.io"
          className="w-14 h-14 mx-auto mb-4 rounded-xl"
        />

        <h1 className="text-2xl font-bold text-white mb-2">
          Connect WhatsApp
        </h1>

        <p className="text-sm text-gray-400 mb-6">
          Scan the QR code with WhatsApp to connect your AI assistant.
        </p>

        {connected ? (
          <div className="bg-green-500/20 border border-green-500 rounded-2xl py-4 px-4">
            <p className="text-green-300 font-medium">
              ✅ Connected successfully
            </p>

            <p className="text-green-400 text-sm mt-1">
              Redirecting...
            </p>
          </div>
        ) : loading ? (
          <div className="w-52 h-52 mx-auto rounded-2xl bg-[#1E293B] animate-pulse" />
        ) : qrCode ? (
          <div className="bg-white p-3 rounded-2xl inline-block">
            <img
              src={qrCode}
              alt="QR Code"
              className="w-52 h-52 object-contain"
            />
          </div>
        ) : (
          <div className="text-red-400 text-sm">
            Failed to load QR code
          </div>
        )}

        {!connected && (
          <div className="mt-5 text-sm text-gray-400">
            Waiting for QR scan...
          </div>
        )}
      </div>
    </div>
  );
}