"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const DUPLICATE_WHATSAPP_MESSAGE =
  "This WhatsApp number is already registered. Please upgrade your plan or contact our support team for further assistance.";

export default function ConnectWhatsAppClient() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [generatingQr, setGeneratingQr] = useState(false);

  const [status, setStatus] = useState(
    "Checking your WhatsApp connection..."
  );

  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");

  /*
   * ------------------------------------------------------------------------
   * FIND LOGGED-IN USER'S BUSINESS
   * ------------------------------------------------------------------------
   */
  const findBusiness = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setQrCode("");
      setStatus("Checking your account...");

      /*
       * Get authenticated Supabase user.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(
          userError.message ||
            "Unable to verify your account."
        );
      }

      if (!user) {
        throw new Error(
          "You are not logged in. Please log in again."
        );
      }

      console.log(
        "[WhatsApp Connect] Logged-in user:",
        user.id
      );

      /*
       * IMPORTANT:
       *
       * Do NOT use .maybeSingle().
       *
       * There may currently be more than one business row
       * belonging to this user because of older data.
       *
       * We retrieve the rows and handle the situation ourselves.
       */
      const {
        data: businesses,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select(
          `
            business_id,
            user_id,
            whatsapp_connected,
            full_name,
            business_name,
            ai_number,
            support_number
          `
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true,
        });

      if (businessError) {
        console.error(
          "[WhatsApp Connect] Business lookup error:",
          businessError
        );

        throw new Error(
          businessError.message ||
            "Unable to find your business."
        );
      }

      /*
       * No business.
       */
      if (!businesses || businesses.length === 0) {
        setStatus(
          "No business found. Please complete your business setup."
        );

        setTimeout(() => {
          router.replace("/welcome");
        }, 1000);

        return null;
      }

      console.log(
        "[WhatsApp Connect] Businesses found:",
        businesses
      );

      /*
       * --------------------------------------------------------------------
       * HANDLE MULTIPLE BUSINESS RECORDS
       * --------------------------------------------------------------------
       *
       * This prevents:
       *
       * "JSON object requested, multiple (or no) rows returned"
       *
       * from ever reaching the user.
       */
      if (businesses.length > 1) {
        console.warn(
          "[WhatsApp Connect] Multiple business records found:",
          businesses
        );

        /*
         * Look for an existing WhatsApp number across these records.
         *
         * If multiple records exist because the same number was registered
         * more than once, show the duplicate-number message.
         */
        const numbers = [];

        for (const business of businesses) {
          if (business.ai_number) {
            numbers.push({
              number: String(
                business.ai_number
              ).trim(),
              businessId:
                business.business_id,
            });
          }

          if (business.support_number) {
            numbers.push({
              number: String(
                business.support_number
              ).trim(),
              businessId:
                business.business_id,
            });
          }
        }

        const numberMap = new Map();

        for (const item of numbers) {
          if (!item.number) {
            continue;
          }

          const existing =
            numberMap.get(item.number) || [];

          existing.push(item.businessId);

          numberMap.set(
            item.number,
            existing
          );
        }

        const duplicateNumber =
          Array.from(numberMap.entries()).find(
            ([, ids]) => ids.length > 1
          );

        if (duplicateNumber) {
          setError(
            DUPLICATE_WHATSAPP_MESSAGE
          );

          setStatus(
            "This WhatsApp number is already registered."
          );

          return null;
        }

        /*
         * If there are multiple businesses but no duplicate number,
         * we still don't silently guess which business should be used.
         *
         * That would risk connecting WhatsApp to the wrong business.
         */
        throw new Error(
          "Multiple business profiles were found for your account. Please contact support so we can correct your business setup."
        );
      }

      /*
       * Exactly one business.
       */
      const business = businesses[0];

      if (!business.business_id) {
        throw new Error(
          "Your business does not have a business ID."
        );
      }

      console.log(
        "[WhatsApp Connect] Business found:",
        business
      );

      /*
       * Save business ID locally for convenience.
       *
       * Supabase remains the source of truth.
       */
      localStorage.setItem(
        "business_id",
        business.business_id
      );

      setBusinessId(
        business.business_id
      );

      /*
       * --------------------------------------------------------------------
       * CHECK EXISTING WHATSAPP CONNECTION
       * --------------------------------------------------------------------
       */
      if (
        business.whatsapp_connected === true
      ) {
        setStatus(
          "WhatsApp is already connected to this business."
        );

        setTimeout(() => {
          router.replace(
            "/welcome?connected=true"
          );
        }, 1800);

        return {
          connected: true,
          businessId:
            business.business_id,
        };
      }

      /*
       * Business exists and WhatsApp is not connected.
       */
      setStatus(
        "Business found. Checking WhatsApp registration..."
      );

      return {
        connected: false,
        businessId:
          business.business_id,
      };
    } catch (err) {
      console.error(
        "[WhatsApp Connect] Business lookup failed:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unable to find your business.";

      setError(message);
      setStatus(
        "Unable to continue."
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, [router]);

  /*
   * ------------------------------------------------------------------------
   * GENERATE QR CODE
   * ------------------------------------------------------------------------
   */
  const generateQRCode = useCallback(
    async (id) => {
      if (!id) {
        setError(
          "Missing business ID."
        );
        return;
      }

      setGeneratingQr(true);
      setError("");
      setQrCode("");

      setStatus(
        "Checking WhatsApp registration..."
      );

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

        const text =
          await response.text();

        console.log(
          "[WhatsApp Connect] Raw API response:",
          text
        );

        let data = {};

        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(
              `Invalid API response: ${text}`
            );
          }
        }

        console.log(
          "[WhatsApp Connect] Parsed response:",
          data
        );

        /*
         * Duplicate WhatsApp number.
         */
        if (
          data.duplicate ||
          data.alreadyRegistered
        ) {
          setQrCode("");

          setError(
            data.message ||
              DUPLICATE_WHATSAPP_MESSAGE
          );

          setStatus(
            "This WhatsApp number is already registered."
          );

          return;
        }

        /*
         * Already connected.
         */
        if (
          data.connected ||
          data.alreadyConnected ||
          data.whatsappConnected
        ) {
          setQrCode("");

          setError("");

          setStatus(
            data.message ||
              "WhatsApp is already connected."
          );

          setTimeout(() => {
            router.replace(
              "/welcome?connected=true"
            );
          }, 1800);

          return;
        }

        /*
         * Other server error.
         */
        if (!response.ok) {
          throw new Error(
            data?.message ||
              `Request failed with status ${response.status}`
          );
        }

        /*
         * QR returned.
         */
        if (data.qrCode) {
          setQrCode(data.qrCode);

          setStatus(
            data.message ||
              "Scan this QR code with WhatsApp."
          );

          return;
        }

        throw new Error(
          data.message ||
            "QR code not found."
        );
      } catch (err) {
        console.error(
          "[WhatsApp Connect] QR generation error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error."
        );

        setStatus(
          "Unable to generate QR code."
        );
      } finally {
        setGeneratingQr(false);
      }
    },
    [router]
  );

  /*
   * ------------------------------------------------------------------------
   * INITIAL LOAD
   * ------------------------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const result =
        await findBusiness();

      if (
        cancelled ||
        !result
      ) {
        return;
      }

      /*
       * Already connected.
       *
       * findBusiness() already handled
       * the redirect.
       */
      if (result.connected) {
        return;
      }

      /*
       * Business exists and WhatsApp
       * is not connected.
       *
       * Now generate the QR code.
       */
      await generateQRCode(
        result.businessId
      );
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    findBusiness,
    generateQRCode,
  ]);

  /*
   * ------------------------------------------------------------------------
   * WHATSAPP STATUS POLLING
   * ------------------------------------------------------------------------
   */
  useEffect(() => {
    if (
      !businessId ||
      !qrCode
    ) {
      return;
    }

    const interval =
      setInterval(async () => {
        try {
          const response =
            await fetch(
              `/api/whatsapp/status?businessId=${encodeURIComponent(
                businessId
              )}`,
              {
                cache: "no-store",
              }
            );

          const data =
            await response.json();

          console.log(
            "[WhatsApp Status Check]:",
            data
          );

          if (
            data.connected
          ) {
            clearInterval(
              interval
            );

            setQrCode("");

            setError("");

            setStatus(
              "WhatsApp connected successfully."
            );

            setTimeout(() => {
              router.replace(
                "/welcome?connected=true"
              );
            }, 1200);
          }
        } catch (error) {
          console.error(
            "[WhatsApp Status Check]",
            error
          );
        }
      }, 3000);

    return () =>
      clearInterval(interval);
  }, [
    businessId,
    qrCode,
    router,
  ]);

  /*
   * ------------------------------------------------------------------------
   * UI
   * ------------------------------------------------------------------------
   */
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
          Connect your WhatsApp account
          to your AI assistant.
        </p>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500 bg-red-500/10 p-4 text-red-300 text-sm break-words">
            {error}
          </div>
        )}

        {loading ||
        generatingQr ? (
          <div className="w-72 h-72 mx-auto rounded-2xl bg-[#1E293B] animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-sm px-6">
              {status}
            </div>
          </div>
        ) : qrCode ? (
          <>
            <div className="bg-white p-4 rounded-2xl inline-block">
              <img
                src={qrCode}
                alt="WhatsApp QR Code"
                className="w-72 h-72"
              />
            </div>

            <p className="mt-6 text-sm text-gray-400">
              Scan this QR code using
              WhatsApp.
            </p>
          </>
        ) : error ? (
          <button
            onClick={async () => {
              const result =
                await findBusiness();

              if (
                result &&
                !result.connected
              ) {
                await generateQRCode(
                  result.businessId
                );
              }
            }}
            className="w-full rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700 transition"
          >
            Try Again
          </button>
        ) : (
          <div className="text-gray-400 text-sm">
            {status}
          </div>
        )}

        <div className="mt-6 text-sm text-gray-400">
          {status}
        </div>

        {businessId && (
          <p className="mt-4 text-xs text-gray-500">
            Business ID:{" "}
            {businessId}
          </p>
        )}
      </div>
    </div>
  );
}