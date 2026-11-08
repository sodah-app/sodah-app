"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

const POLL_INTERVAL = 1500;
const MAX_WAIT_TIME = 120000;
const SODAH_CONNECTED_DISPLAY_MS = 10000;

const TEST_MESSAGE =
  "Thanks for choosing Sodah.io.";

export default function ConnectWhatsAppClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [testMessageStatus, setTestMessageStatus] =
    useState("idle");

  const pollTimerRef = useRef(null);
  const timeoutRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const qrRef = useRef("");
  const connectionHandledRef = useRef(false);
  const testMessageSentRef = useRef(false);

  useEffect(() => {
    qrRef.current = qrCode;
  }, [qrCode]);

  /* ============================================================
     CLEANUP
  ============================================================ */

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

      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  /* ============================================================
     RESOLVE BUSINESS ID
  ============================================================ */

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
      } catch (storageError) {
        console.error(
          "[Connect WhatsApp] Unable to read business ID:",
          storageError
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

  /* ============================================================
     CLEAR TIMERS
  ============================================================ */

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }, []);

  /* ============================================================
     RETURN TO VOICE SETTINGS
  ============================================================ */

  const returnToVoiceSettings = useCallback(() => {
    if (!mountedRef.current) return;

    clearTimers();

    const destination = businessId
      ? `/voice-settings?businessId=${encodeURIComponent(
          businessId
        )}`
      : "/voice-settings";

    router.push(destination);
  }, [businessId, clearTimers, router]);

  /* ============================================================
     SEND TEST MESSAGE
  ============================================================ */

  const sendTestMessage = useCallback(
    async (connectedPhone = "") => {
      if (!businessId) return;

      if (testMessageSentRef.current) {
        return;
      }

      testMessageSentRef.current = true;

      if (mountedRef.current) {
        setTestMessageStatus("sending");
      }

      try {
        const response = await fetch(
          "/api/connect-whatsapp",
          {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              businessId,
              action: "test_message",
              phone:
                connectedPhone || "",
              message:
                TEST_MESSAGE,
            }),
          }
        );

        const data =
          await response
            .json()
            .catch(() => null);

        console.log(
          "[Connect WhatsApp] TEST MESSAGE:",
          response.status,
          data
        );

        if (
          !response.ok ||
          data?.success !== true
        ) {
          throw new Error(
            data?.message ||
              data?.error ||
              "The Sodah test message could not be sent."
          );
        }

        if (!mountedRef.current) {
          return;
        }

        setTestMessageStatus(
          "sent"
        );
      } catch (testError) {
        console.error(
          "[Connect WhatsApp] Test message failed:",
          testError
        );

        if (!mountedRef.current) {
          return;
        }

        /*
         * The WhatsApp connection itself is still successful.
         * We only report the test-message problem.
         */
        setTestMessageStatus(
          "failed"
        );
      }
    },
    [businessId]
  );

  /* ============================================================
     CONNECTED SUCCESS FLOW
  ============================================================ */

  const handleConnected = useCallback(
    (data = {}) => {
      if (!mountedRef.current) return;

      /*
       * Prevent polling from repeatedly triggering:
       * - the test message
       * - the 10-second redirect
       */
      if (connectionHandledRef.current) {
        return;
      }

      connectionHandledRef.current = true;

      clearTimers();

      setQrCode("");
      qrRef.current = "";
      setError("");

      const connectedPhone =
        data.phone ||
        data.phoneNumber ||
        "";

      if (connectedPhone) {
        setPhone(
          String(connectedPhone)
        );
      }

      if (data.businessName) {
        setBusinessName(
          String(data.businessName)
        );
      }

      /*
       * Show the final connected screen.
       */
      setStatus("connected");

      /*
       * Send exactly one test message
       * through the existing WhatsApp session.
       */
      sendTestMessage(
        String(connectedPhone || "")
      );

      /*
       * Return to Voice Settings after 10 seconds.
       */
      redirectTimerRef.current =
        setTimeout(() => {
          if (!mountedRef.current) {
            return;
          }

          const destination =
            businessId
              ? `/voice-settings?businessId=${encodeURIComponent(
                  businessId
                )}`
              : "/voice-settings";

          router.push(destination);
        }, SODAH_CONNECTED_DISPLAY_MS);
    },
    [
      businessId,
      clearTimers,
      router,
      sendTestMessage,
    ]
  );

  /* ============================================================
     APPLY API RESPONSE
  ============================================================ */

  const applyResponse = useCallback(
    (data) => {
      if (
        !mountedRef.current ||
        !data
      ) {
        return false;
      }

      const receivedQR =
        data.qrCode ||
        data.qr ||
        data.qrDataUrl ||
        "";

      const receivedStatus =
        String(
          data.status || ""
        ).toLowerCase();

      const alreadyConnected =
        data.alreadyConnected === true ||
        receivedStatus ===
          "already_connected";

      const connected =
        data.connected === true ||
        receivedStatus === "connected";

      if (
        data.phone ||
        data.phoneNumber
      ) {
        setPhone(
          String(
            data.phone ||
              data.phoneNumber
          )
        );
      }

      if (data.businessName) {
        setBusinessName(
          String(
            data.businessName
          )
        );
      }

      /* ========================================================
         BUSINESS NOT FOUND
      ======================================================== */

      if (
        receivedStatus ===
          "business_not_found" ||
        data.code ===
          "BUSINESS_NOT_FOUND"
      ) {
        clearTimers();

        setQrCode("");
        qrRef.current = "";

        setStatus(
          "business_not_found"
        );

        setError(
          data.message ||
            "This business does not exist in Sodah.io. Please complete your business setup before connecting WhatsApp."
        );

        return true;
      }

      /* ========================================================
         NUMBER ALREADY CONNECTED
      ======================================================== */

      if (
        receivedStatus ===
          "number_already_connected" ||
        data.code ===
          "WHATSAPP_NUMBER_ALREADY_CONNECTED"
      ) {
        clearTimers();

        setQrCode("");
        qrRef.current = "";

        setStatus(
          "already_connected"
        );

        setError(
          data.message ||
            "This WhatsApp number is already connected to Sodah.io."
        );

        return true;
      }

      /* ========================================================
         ALREADY CONNECTED

         Treat this as a successful connection too.
         This means the existing session is reused.
      ======================================================== */

      if (alreadyConnected) {
        handleConnected(data);
        return true;
      }

      /* ========================================================
         NEWLY CONNECTED
      ======================================================== */

      if (connected) {
        handleConnected(data);
        return true;
      }

      /* ========================================================
         ACTIVATING
      ======================================================== */

      if (
        receivedStatus ===
          "connecting_to_sodah" ||
        receivedStatus ===
          "activating_ai" ||
        receivedStatus ===
          "activating"
      ) {
        setQrCode("");
        qrRef.current = "";

        setError("");
        setStatus(
          "connecting_to_sodah"
        );

        return false;
      }

      /* ========================================================
         QR
      ======================================================== */

      if (receivedQR) {
        connectionHandledRef.current =
          false;

        testMessageSentRef.current =
          false;

        setQrCode(receivedQR);
        qrRef.current =
          receivedQR;

        setStatus("qr");
        setError("");

        return true;
      }

      /* ========================================================
         WAITING FOR QR
      ======================================================== */

      if (
        receivedStatus ===
          "qr_pending" ||
        receivedStatus === "qr"
      ) {
        setStatus(
          "waiting_for_qr"
        );

        setError("");

        return false;
      }

      /* ========================================================
         CONNECTING
      ======================================================== */

      if (
        receivedStatus ===
          "connecting" ||
        receivedStatus ===
          "reconnecting" ||
        receivedStatus ===
          "starting"
      ) {
        setStatus("waiting");
        setError("");

        return false;
      }

      /* ========================================================
         SESSION NOT FOUND
      ======================================================== */

      if (
        receivedStatus ===
          "not_found" ||
        receivedStatus ===
          "session_not_found"
      ) {
        setStatus("not_found");
        setError("");

        return false;
      }

      /* ========================================================
         ERROR
      ======================================================== */

      if (
        receivedStatus === "error"
      ) {
        setStatus("error");

        setError(
          data.message ||
            data.error ||
            "Unable to connect WhatsApp."
        );

        return true;
      }

      return false;
    },
    [
      clearTimers,
      handleConnected,
    ]
  );

  /* ============================================================
     GET STATUS
  ============================================================ */

  const getStatus = useCallback(
    async () => {
      if (!businessId) {
        return null;
      }

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
        "[Connect WhatsApp] STATUS:",
        response.status,
        data
      );

      if (
        !response.ok &&
        response.status !== 202
      ) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Connect API returned HTTP ${response.status}.`
        );
      }

      return data;
    },
    [businessId]
  );

  /* ============================================================
     CREATE SESSION
  ============================================================ */

  const createSession =
    useCallback(async () => {
      if (!businessId) {
        setStatus("error");
        setError(
          "Business ID is missing."
        );

        return null;
      }

      clearTimers();

      connectionHandledRef.current =
        false;

      testMessageSentRef.current =
        false;

      setStatus("loading");
      setError("");
      setQrCode("");
      qrRef.current = "";
      setPhone("");
      setBusinessName("");
      setTestMessageStatus("idle");

      const response =
        await fetch(
          "/api/connect-whatsapp",
          {
            method: "POST",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              businessId,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      console.log(
        "[Connect WhatsApp] CREATE:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Connect API returned HTTP ${response.status}.`
        );
      }

      return data;
    }, [businessId, clearTimers]);

  /* ============================================================
     POLLING
  ============================================================ */

  const startPolling =
    useCallback(() => {
      if (!businessId) return;

      if (pollTimerRef.current) {
        clearTimeout(
          pollTimerRef.current
        );
      }

      const startedAt =
        Date.now();

      const poll = async () => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        if (
          Date.now() -
            startedAt >=
          MAX_WAIT_TIME
        ) {
          setStatus("error");

          setError(
            "WhatsApp connection is taking too long. Please try again."
          );

          return;
        }

        /*
         * Once the connection has been
         * handled, there is no reason to
         * continue polling.
         */
        if (
          connectionHandledRef.current
        ) {
          return;
        }

        try {
          const data =
            await getStatus();

          if (
            !mountedRef.current
          ) {
            return;
          }

          const finished =
            applyResponse(data);

          if (
            finished &&
            (
              data?.connected === true ||
              data?.alreadyConnected ===
                true ||
              data?.status ===
                "already_connected" ||
              data?.status ===
                "connected" ||
              data?.status ===
                "business_not_found" ||
              data?.status ===
                "number_already_connected"
            )
          ) {
            return;
          }
        } catch (pollError) {
          console.error(
            "[Connect WhatsApp] Poll failed:",
            pollError
          );
        }

        if (
          !connectionHandledRef.current
        ) {
          pollTimerRef.current =
            setTimeout(
              poll,
              POLL_INTERVAL
            );
        }
      };

      poll();
    }, [
      businessId,
      getStatus,
      applyResponse,
    ]);

  /* ============================================================
     INITIAL FLOW
  ============================================================ */

  useEffect(() => {
    if (!businessId) return;

    let cancelled = false;

    async function initialize() {
      setStatus("loading");
      setError("");

      try {
        const data =
          await getStatus();

        if (cancelled) return;

        if (
          data?.businessName
        ) {
          setBusinessName(
            String(
              data.businessName
            )
          );
        }

        if (
          data?.connected ===
            true ||
          data?.alreadyConnected ===
            true ||
          data?.status ===
            "connected" ||
          data?.status ===
            "already_connected"
        ) {
          applyResponse(data);
          return;
        }

        if (
          data?.status ===
            "business_not_found" ||
          data?.code ===
            "BUSINESS_NOT_FOUND" ||
          data?.status ===
            "number_already_connected" ||
          data?.code ===
            "WHATSAPP_NUMBER_ALREADY_CONNECTED"
        ) {
          applyResponse(data);
          return;
        }

        if (
          data?.qrCode ||
          data?.qr ||
          data?.qrDataUrl
        ) {
          applyResponse(data);
          return;
        }

        /*
         * Only a genuine provider session-not-found
         * causes creation.
         */
        if (
          data?.status ===
            "not_found" ||
          data?.status ===
            "session_not_found"
        ) {
          const created =
            await createSession();

          if (cancelled) return;

          applyResponse(created);
          startPolling();

          return;
        }

        /*
         * Existing session is starting/connecting.
         */
        applyResponse(data);
        startPolling();
      } catch (initializeError) {
        if (cancelled) return;

        console.error(
          "[Connect WhatsApp] Initialization failed:",
          initializeError
        );

        setStatus("error");

        setError(
          initializeError?.message ||
            "Unable to check WhatsApp connection."
        );
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    businessId,
    getStatus,
    createSession,
    applyResponse,
    startPolling,
  ]);

  /* ============================================================
     RETRY
  ============================================================ */

  const handleRetry =
    async () => {
      try {
        const data =
          await createSession();

        if (
          !mountedRef.current
        ) {
          return;
        }

        applyResponse(data);
        startPolling();
      } catch (retryError) {
        if (
          !mountedRef.current
        ) {
          return;
        }

        setStatus("error");

        setError(
          retryError?.message ||
            "Unable to start WhatsApp connection."
        );
      }
    };

  /* ============================================================
     UI STATE
  ============================================================ */

  const isConnected =
    status === "connected";

  const isAlreadyConnected =
    status ===
    "already_connected";

  const isActivating =
    status ===
    "connecting_to_sodah";

  const isBusinessMissing =
    status ===
    "business_not_found";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070d1d",
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
          maxWidth: "470px",
          background: "#111b2e",
          border:
            "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "34px 32px",
          textAlign: "center",
          boxSizing: "border-box",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.35)",
        }}
      >
        {/* ======================================================
            LOGO
        ====================================================== */}

        <div
          style={{
            marginBottom: "28px",
            display: "flex",
            justifyContent:
              "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
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
                alignItems: "center",
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

        {/* ======================================================
            TITLE
        ====================================================== */}

        <h1
          style={{
            margin: 0,
            fontSize: "30px",
            fontWeight: 700,
          }}
        >
          {isConnected ||
          isAlreadyConnected
            ? "WhatsApp Connected"
            : isActivating
            ? "Connecting WhatsApp"
            : "Connect WhatsApp"}
        </h1>

        {/* ======================================================
            DESCRIPTION
        ====================================================== */}

        <p
          style={{
            margin:
              "14px 0 28px",
            color: "#aab4c7",
            fontSize: "15px",
            lineHeight: 1.6,
          }}
        >
          {isConnected ||
          isAlreadyConnected ? (
            <>
              <strong
                style={{
                  display: "block",
                  color: "#ffffff",
                  fontSize: "18px",
                  marginBottom:
                    "8px",
                }}
              >
                Your business is connected
                to Sodah.io.
              </strong>

              AI auto-reply,
              appointment booking,
              reminders and
              follow-ups are now
              starting.
            </>
          ) : isActivating ? (
            "Connecting your business to Sodah.io AI..."
          ) : (
            "Connect your WhatsApp account to your AI assistant."
          )}
        </p>

        {/* ======================================================
            MAIN STATUS CARD
        ====================================================== */}

        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            maxWidth: "288px",
            margin:
              "0 auto 24px",
            borderRadius: "16px",
            background: "#202d43",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            overflow: "hidden",
          }}
        >
          {isConnected ? (
            <div
              style={{
                padding: "24px",
              }}
            >
              <div
                style={{
                  width: "78px",
                  height: "78px",
                  margin:
                    "0 auto 18px",
                  borderRadius: "50%",
                  background:
                    "rgba(0,209,90,0.14)",
                  border:
                    "2px solid rgba(0,209,90,0.45)",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color: "#00d15a",
                  fontSize: "42px",
                  fontWeight: 800,
                }}
              >
                ✓
              </div>

              <div
                style={{
                  fontSize: "19px",
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                Your business is
                connected to
                Sodah.io
              </div>

              {businessName && (
                <div
                  style={{
                    marginTop: "10px",
                    color:
                      "#aab4c7",
                    fontSize:
                      "13px",
                  }}
                >
                  {businessName}
                </div>
              )}

              {phone && (
                <div
                  style={{
                    marginTop: "5px",
                    color:
                      "#aab4c7",
                    fontSize:
                      "13px",
                  }}
                >
                  {phone}
                </div>
              )}

              <div
                style={{
                  marginTop:
                    "22px",
                  padding:
                    "12px 14px",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(0,209,90,0.08)",
                  color:
                    "#b8f5cf",
                  fontSize:
                    "12px",
                  lineHeight:
                    1.5,
                }}
              >
                AI auto-reply,
                appointments,
                reminders and
                follow-ups are
                starting.
              </div>

              <div
                style={{
                  marginTop:
                    "16px",
                  color:
                    "#7f8ba3",
                  fontSize:
                    "12px",
                  lineHeight:
                    1.5,
                }}
              >
                {testMessageStatus ===
                "sending"
                  ? "Sending your Sodah.io test message..."
                  : testMessageStatus ===
                    "sent"
                  ? "Test message sent successfully."
                  : testMessageStatus ===
                    "failed"
                  ? "WhatsApp is connected. The test message could not be sent."
                  : "Preparing your WhatsApp test message..."}
              </div>
            </div>
          ) : isAlreadyConnected ? (
            <div
              style={{
                padding: "24px",
              }}
            >
              <div
                style={{
                  width: "78px",
                  height: "78px",
                  margin:
                    "0 auto 18px",
                  borderRadius: "50%",
                  background:
                    "rgba(0,209,90,0.14)",
                  border:
                    "2px solid rgba(0,209,90,0.45)",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color: "#00d15a",
                  fontSize: "42px",
                  fontWeight: 800,
                }}
              >
                ✓
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                Your business is
                connected to
                Sodah.io
              </div>

              <div
                style={{
                  marginTop:
                    "10px",
                  color:
                    "#aab4c7",
                  fontSize:
                    "13px",
                  lineHeight:
                    1.5,
                }}
              >
                No new QR code is
                required.
              </div>

              {phone && (
                <div
                  style={{
                    marginTop:
                      "8px",
                    color:
                      "#aab4c7",
                    fontSize:
                      "13px",
                  }}
                >
                  {phone}
                </div>
              )}
            </div>
          ) : isActivating ? (
            <div
              style={{
                padding: "30px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
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
                  fontSize: "15px",
                  fontWeight: 600,
                  lineHeight:
                    1.5,
                }}
              >
                Connecting your
                business to
                Sodah.io AI...
              </div>

              <div
                style={{
                  marginTop:
                    "8px",
                  color:
                    "#aab4c7",
                  fontSize:
                    "13px",
                  lineHeight:
                    1.5,
                }}
              >
                Activating AI,
                appointments,
                follow-ups and
                reminders.
              </div>
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
                background: "#fff",
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
                    status ===
                    "error"
                      ? "#ffb3b3"
                      : "#aab4c7",
                  fontSize: "14px",
                  lineHeight:
                    1.5,
                }}
              >
                {status ===
                "error"
                  ? "Unable to connect WhatsApp."
                  : isBusinessMissing
                  ? "Business setup is required."
                  : "Checking WhatsApp connection..."}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div
            style={{
              border:
                "1px solid #ff334f",
              background:
                "rgba(255,51,79,0.10)",
              borderRadius: "12px",
              padding:
                "16px 18px",
              marginBottom:
                "24px",
              color:
                "#ffb5be",
              fontSize: "14px",
              lineHeight:
                1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* ======================================================
            RETRY
        ====================================================== */}

        {(status ===
          "error" ||
          status ===
            "business_not_found") && (
          <button
            type="button"
            onClick={
              handleRetry
            }
            style={{
              width: "100%",
              border: "none",
              borderRadius:
                "12px",
              padding: "16px",
              background:
                "#00d15a",
              color: "#fff",
              fontSize:
                "16px",
              fontWeight: 700,
              cursor:
                "pointer",
            }}
          >
            Try Again
          </button>
        )}

        {/* ======================================================
            CONNECTED FOOTER
        ====================================================== */}

        {isConnected && (
          <div
            style={{
              color:
                "#7f8ba3",
              fontSize: "13px",
              lineHeight:
                1.5,
            }}
          >
            <strong
              style={{
                color:
                  "#dce4f2",
              }}
            >
              Thanks for choosing
              Sodah.io.
            </strong>
            <br />
            You will be taken to
            Voice Settings in a few
            seconds.
          </div>
        )}

        {isAlreadyConnected && (
          <div
            style={{
              color:
                "#7f8ba3",
              fontSize: "13px",
              lineHeight:
                1.5,
            }}
          >
            This WhatsApp number is
            already connected to
            Sodah.io.
          </div>
        )}

        {businessId && (
          <div
            style={{
              marginTop:
                "28px",
              color:
                "#68748b",
              fontSize:
                "12px",
              wordBreak:
                "break-word",
            }}
          >
            Business ID:{" "}
            {businessId}
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