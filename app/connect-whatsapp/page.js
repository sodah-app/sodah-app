"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConnectWhatsAppPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready to generate QR code.");
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");

  const generateQRCode = async () => {
    setLoading(true);
    setError("");
    setQrCode("");
    setStatus("Generating secure QR code...");

    try {
      const response = await fetch("/api/connect-whatsapp", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to connect to WhatsApp.");
      }

      // Already connected
      if (data.connected) {
        setStatus("✅ WhatsApp already connected.");

        setTimeout(() => {
          router.push("/automation");
        }, 2000);

        return;
      }

      // QR returned
      const qr = data.qrCode || data.qr;

      if (qr) {
        setQrCode(qr);
        setStatus("Scan this QR code with WhatsApp.");
      } else {
        throw new Error(data.message || "QR code not available.");
      }
    } catch (err) {
      setError(err.message || "Unexpected error.");
      setStatus("Failed to generate QR code.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQRCode();
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-slate-900 flex items-center justify-center px-4 py-4">
      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md h-[95vh] max-h-[860px] px-8 py-6 flex flex-col items-center text-center">
        {/* Logo */}
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
          alt="WhatsApp"
          className="w-12 h-12 mb-3 flex-shrink-0"
        />

        {/* Title - Single line */}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-3 flex-shrink-0">
          Connect Your WhatsApp
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 text-sm leading-relaxed max-w-xs mb-2 flex-shrink-0">
          Scan the QR code below using WhatsApp on your phone.
        </p>

        {/* Status */}
        <p className="text-sm text-gray-500 mb-4 flex-shrink-0">
          {status}
        </p>

        {/* Error */}
        {error && (
          <div className="text-red-500 text-sm font-medium mb-4 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 w-full flex items-center justify-center min-h-0">
          {/* Loading */}
          {loading && (
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">
                Generating secure QR code...
              </p>
            </div>
          )}

          {/* QR Code */}
          {!loading && qrCode && (
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="w-56 h-56 sm:w-60 sm:h-60 object-contain"
              />
            </div>
          )}

          {/* Initial Button */}
          {!loading && !qrCode && (
            <button
              onClick={generateQRCode}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition shadow-sm"
            >
              Generate QR Code
            </button>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="w-full mt-4 flex flex-col items-center gap-3 flex-shrink-0">
          {/* Generate New QR Button */}
          {qrCode && (
            <button
              onClick={generateQRCode}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition shadow-sm"
            >
              Generate New QR Code
            </button>
          )}

          {/* Back Button */}
          <button
            onClick={() => router.push("/automation")}
            className="px-5 py-2 text-gray-500 hover:text-gray-700 font-medium rounded-lg transition"
          >
            ← Back to automation
          </button>
        </div>
      </div>
    </div>
  );
}