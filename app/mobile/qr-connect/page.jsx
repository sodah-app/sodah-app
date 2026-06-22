"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function QRConnectPage() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  /* --------------------------------------------- */
  /* LOAD BUSINESS ID                             */
  /* --------------------------------------------- */

  useEffect(() => {
    const id = localStorage.getItem("business_id");

    if (!id) {
      setError("Business ID not found.");
      setLoading(false);
      return;
    }

    setBusinessId(id);
  }, []);

  /* --------------------------------------------- */
  /* FETCH QR CODE                                */
  /* --------------------------------------------- */

  const fetchQRCode = useCallback(async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      console.log("QR response:", data);

      if (data?.qr) {
        setQrCode(data.qr);
      } else {
        throw new Error(data?.message || "QR code not returned");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  /* --------------------------------------------- */
  /* CHECK CONNECTION STATUS                      */
  /* --------------------------------------------- */

  const checkConnection = useCallback(async () => {
    if (!businessId) return;

    try {
      const response = await fetch(
        `/api/whatsapp/status?businessId=${businessId}`
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data.connected) {
        setConnected(true);

        setTimeout(() => {
          router.push("/mobile/automation");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    }
  }, [businessId, router]);

  /* --------------------------------------------- */
  /* INIT                                          */
  /* --------------------------------------------- */

  useEffect(() => {
    if (!businessId) return;

    fetchQRCode();

    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, [businessId, fetchQRCode, checkConnection]);

  /* --------------------------------------------- */
  /* UI                                            */
  /* --------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-[#111827] rounded-3xl p-6 text-center shadow-2xl">
        <img
          src="https://res.cloudinary.com/djnjhphf5/image/upload/v1779814901/sodah.io_logo_z6xflv.png"
          alt="Sodah.io"
          className="w-20 h-20 mx-auto mb-5 rounded-2xl"
        />

        <h1 className="text-3xl font-bold mb-3">
          Connect WhatsApp
        </h1>

        <p className="text-gray-400 mb-8">
          Scan this QR code using WhatsApp to connect your AI assistant.
        </p>

        {loading ? (
          <div className="w-72 h-72 mx-auto rounded-2xl bg-[#1E293B] animate-pulse" />
        ) : qrCode ? (
          <div className="bg-white p-4 rounded-2xl inline-block">
            <img
              src={qrCode}
              alt="QR Code"
              className="w-72 h-72"
            />
          </div>
        ) : (
          <div className="text-red-400">
            {error || "Failed to load QR code"}
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
      </div>
    </div>
  );
}