"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const POLL_INTERVAL = 1500;
const MAX_WAIT_TIME = 120000;

export default function ConnectWhatsAppClient() {
  const searchParams = useSearchParams();

  const [businessId, setBusinessId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");

  const pollTimerRef = useRef(null);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true);
  const qrRef = useRef("");

  /*
  |--------------------------------------------------------------------------
  | Keep QR ref synchronized
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    qrRef.current = qrCode;
  }, [qrCode]);

  /*
  |--------------------------------------------------------------------------
  | Resolve Business ID
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!searchParams) return;

    const queryBusinessId =
      searchParams.get("businessId") ||
      searchParams.get("business_id") ||
      searchParams.get("sessionId");

    let resolved =
      queryBusinessId?.trim() || "";

    if (!resolved) {
      try {
        resolved =
          localStorage.getItem(
            "sodah_business_id"
          ) || "";
      } catch (error) {
        console.error(
          "Unable to read business ID:",
          error
        );
      }
    }

    resolved = resolved.trim();

    if (resolved) {
      setBusinessId(resolved);
    } else {
      setError(
        "Business ID is missing. Please return to your business setup and try again."
      );
      setStatus("error");
    }
  }, [searchParams]);

  /*
  |--------------------------------------------------------------------------
  | Cleanup
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Clear timers
  |--------------------------------------------------------------------------
  */

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Apply API response
  |--------------------------------------------------------------------------
  */

  const applyResponse = useCallback(
    (data) => {
      if (!mountedRef.current) return false;

      if (!data) {
        return false;
      }

      const receivedQR =
        data.qrCode ||
        data.qr ||
        data.qrDataUrl ||
        null;

      const receivedStatus =
        data.status || "";

      const connected =
        data.connected === true ||
        receivedStatus === "connected";

      if (data.phone) {
        setPhone(String(data.phone));
      }

      /*
       * Connected
       */
      if (connected) {
        clearTimers();

        setQrCode("");
        qrRef.current = "";

        setStatus("connected");
        setError("");

        return true;
      }

      /*
       * QR received
       */
      if (receivedQR) {
        setQrCode(receivedQR);
        qrRef.current = receivedQR;

        setStatus("qr");
        setError("");

        return true;
      }

      /*
       * Session is being created/connected.
       */
      if (
        receivedStatus === "connecting" ||
        receivedStatus === "reconnecting" ||
        receivedStatus === "qr"
      ) {
        setStatus("waiting");
        setError("");

        return false;
      }

      /*
       * Session does not exist.
       */
      if (receivedStatus === "not_found") {
        setStatus("not_found");
        setError("");
        return false;
      }

      return false;
    },
    [clearTimers]
  );

  /*
  |--------------------------------------------------------------------------
  | Check existing session
  |--------------------------------------------------------------------------
  */

  const checkExistingSession =
    useCallback(async () => {
      if (!businessId) return null;

      try {
        const response = await fetch(
          `/api/connect-whatsapp?businessId=${encodeURIComponent(
            businessId
          )}&_=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data =
          await response.json().catch(() => null);

        console.log(
          "[Connect WhatsApp] GET:",
          response.status,
          data
        );

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Connect API returned HTTP ${response.status}.`
          );
        }

        applyResponse(data);

        return data;
      } catch (err) {
        console.error(
          "[Connect WhatsApp] Existing session check failed:",
          err
        );

        throw err;
      }
    }, [businessId, applyResponse]);

  /*
  |--------------------------------------------------------------------------
  | Create / Reuse WhatsApp Session
  |--------------------------------------------------------------------------
  */

  const generateQRCode =
    useCallback(async () => {
      if (!businessId) {
        setStatus("error");
        setError(
          "Business ID is missing."
        );
        return;
      }

      clearTimers();

      setStatus("loading");
      setError("");
      setQrCode("");
      qrRef.current = "";
      setPhone("");

      try {
        /*
         * IMPORTANT:
         *
         * POST tells our API:
         *
         * "Use the existing session if it exists.
         * Otherwise create it."
         */
        const response = await fetch(
          `/api/connect-whatsapp`,
          {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              businessId,
            }),
          }
        );

        const data =
          await response.json().catch(() => null);

        console.log(
          "[Connect WhatsApp] POST:",
          response.status,
          data
        );

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Connect API returned HTTP ${response.status}.`
          );
        }

        const handled =
          applyResponse(data);

        /*
         * If POST did not yet produce QR,
         * begin polling the existing session.
         */
        if (!handled || !qrRef.current) {
          startPolling();
        }
      } catch (err) {
        console.error(
          "[Connect WhatsApp] QR generation failed:",
          err
        );

        if (!mountedRef.current) return;

        clearTimers();

        setQrCode("");
        qrRef.current = "";

        setStatus("error");

        setError(
          err?.message ||
            "Unable to generate QR code."
        );
      }
    }, [
      businessId,
      clearTimers,
      applyResponse,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Poll Existing Session
  |--------------------------------------------------------------------------
  */

  const startPolling =
    useCallback(() => {
      if (!businessId) return;

      clearTimers();

      const startedAt = Date.now();

      const poll = async () => {
        if (!mountedRef.current) return;

        if (Date.now() - startedAt >= MAX_WAIT_TIME) {
          setStatus("error");
          setError(
            "The WhatsApp QR code did not become available. Please try again."
          );

          return;
        }

        try {
          const response =
            await fetch(
              `/api/connect-whatsapp?businessId=${encodeURIComponent(
                businessId
              )}&_=${Date.now()}`,
              {
                method: "GET",
                cache: "no-store",
                headers: {
                  Accept:
                    "application/json",
                },
              }
            );

          const data =
            await response
              .json()
              .catch(() => null);

          console.log(
            "[Connect WhatsApp] Poll:",
            response.status,
            data
          );

          if (!response.ok) {
            throw new Error(
              data?.error ||
                `Connect API returned HTTP ${response.status}.`
            );
          }

          const finished =
            applyResponse(data);

          if (finished) {
            return;
          }
        } catch (err) {
          console.error(
            "[Connect WhatsApp] Poll failed:",
            err
          );
        }

        pollTimerRef.current =
          setTimeout(
            poll,
            POLL_INTERVAL
          );
      };

      poll();
    }, [
      businessId,
      clearTimers,
      applyResponse,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Initial Load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;

    async function initialize() {
      setStatus("loading");
      setError("");

      try {
        /*
         * FIRST:
         *
         * Look for the existing session.
         *
         * This allows an already-generated QR
         * to be displayed without creating
         * another WhatsApp session.
         */
        const data =
          await checkExistingSession();

        if (cancelled) return;

        if (
          data?.connected === true ||
          data?.status === "connected"
        ) {
          return;
        }

        if (
          data?.qrCode ||
          data?.qr
        ) {
          return;
        }

        /*
         * If the business has no provider session,
         * create/reuse it.
         */
        if (
          data?.status ===
          "not_found"
        ) {
          await generateQRCode();
          return;
        }

        /*
         * Existing session is starting.
         */
        startPolling();
      } catch (err) {
        if (cancelled) return;

        console.error(
          "[Connect WhatsApp] Initialization failed:",
          err
        );

        /*
         * If GET fails, POST can still
         * attempt to create/reuse the session.
         */
        await generateQRCode();
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    businessId,
    checkExistingSession,
    generateQRCode,
    startPolling,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Try Again
  |--------------------------------------------------------------------------
  */

  const handleRetry = () => {
    generateQRCode();
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "#070d1d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background:
            "#111b2e",
          border:
            "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "34px 32px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {/* Logo */}
        <div
          style={{
            marginBottom: "28px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "25px",
                height: "25px",
                border:
                  "4px solid #00aaff",
                transform:
                  "rotate(45deg)",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  border:
                    "3px solid #00aaff",
                }}
              />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1
          style={{
            margin: 0,
            fontSize: "30px",
            fontWeight: 700,
          }}
        >
          Connect WhatsApp
        </h1>

        <p
          style={{
            margin:
              "14px 0 28px",
            color:
              "#aab4c7",
            fontSize: "15px",
          }}
        >
          Connect your WhatsApp account to your AI assistant.
        </p>

        {/* QR area */}
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            maxWidth: "288px",
            margin:
              "0 auto 24px",
            borderRadius: "16px",
            background:
              "#202d43",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            overflow: "hidden",
          }}
        >
          {status === "connected" ? (
            <div
              style={{
                padding: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  marginBottom: "12px",
                }}
              >
                ✓
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                }}
              >
                WhatsApp Connected
              </div>

              {phone && (
                <div
                  style={{
                    marginTop: "8px",
                    color:
                      "#aab4c7",
                    fontSize: "13px",
                  }}
                >
                  {phone}
                </div>
              )}
            </div>
          ) : qrCode ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding: "18px",
                boxSizing:
                  "border-box",
                background:
                  "#ffffff",
              }}
            >
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit:
                    "contain",
                  imageRendering:
                    "pixelated",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: "30px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  border:
                    "4px solid rgba(255,255,255,0.18)",
                  borderTopColor:
                    "#00bfff",
                  borderRadius:
                    "50%",
                  animation:
                    "sodah-spin 0.8s linear infinite",
                  margin:
                    "0 auto 22px",
                }}
              />

              <div
                style={{
                  color:
                    status === "error"
                      ? "#ffb3b3"
                      : "#aab4c7",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                {status === "error"
                  ? "Unable to generate QR code."
                  : status === "not_found"
                  ? "Starting WhatsApp connection..."
                  : "Connecting to WhatsApp..."}
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              border:
                "1px solid #ff334f",
              background:
                "rgba(255,51,79,0.10)",
              borderRadius:
                "12px",
              padding:
                "16px 18px",
              marginBottom:
                "24px",
              color:
                "#ffb5be",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* Retry */}
        {(status === "error" ||
          status === "not_found") && (
          <button
            type="button"
            onClick={handleRetry}
            style={{
              width: "100%",
              border: "none",
              borderRadius:
                "12px",
              padding:
                "16px",
              background:
                "#00d15a",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        )}

        {/* Connected information */}
        {status === "connected" && (
          <div
            style={{
              color:
                "#7f8ba3",
              fontSize: "13px",
            }}
          >
            Your WhatsApp account is now connected to Sodah.
          </div>
        )}

        {/* Business ID */}
        {businessId && (
          <div
            style={{
              marginTop: "28px",
              color:
                "#68748b",
              fontSize: "12px",
              wordBreak:
                "break-word",
            }}
          >
            Business ID: {businessId}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes sodah-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}