"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConnectWhatsAppClient() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(
    "Ready to generate QR code."
  );
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const id = params.get("businessId") || "";

    setBusinessId(id);
  }, []);

  async function generateQRCode(id) {
    if (!id) {
      setError("Missing business ID.");
      return;
    }

    setLoading(true);
    setError("");
    setQrCode("");

    try {
      const response = await fetch(
        `/api/whatsapp/connect?businessId=${encodeURIComponent(
          id
        )}`,
        {
          method: "POST",
          cache: "no-store",
        }
      );
const text = await response.text();

console.log("Raw API response:", text);

let data = {};

try {
  data = text ? JSON.parse(text) : {};
} catch (error) {
  throw new Error(
    `Invalid API response: ${text || "empty response"}`
  );
}
      console.log("QR response:", data);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to connect WhatsApp."
        );
      }

      if (data.connected) {
        setStatus(
          data.message ||
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
          data.message ||
            "Scan this QR code with WhatsApp."
        );

        return;
      }

      setStatus(
        data.message || "QR code not available."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (businessId) {
      generateQRCode(businessId);
    }
  }, [businessId]);

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
          Scan this QR code using WhatsApp
          to connect your AI assistant.
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500 bg-red-500/10 p-4 text-red-300 text-sm break-words">
            {error}
          </div>
        )}

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
          <button
            onClick={() =>
              generateQRCode(businessId)
            }
            className="w-full rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700"
          >
            Generate QR Code
          </button>
        )}

        <div className="mt-6 text-sm text-gray-400">
          {status}
        </div>

        {businessId && (
          <p className="mt-4 text-xs text-gray-500">
            Business ID: {businessId}
          </p>
        )}
      </div>
    </div>
  );
}