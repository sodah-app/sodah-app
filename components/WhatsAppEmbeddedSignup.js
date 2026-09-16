"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const META_SDK_ID = "facebook-jssdk";

function loadFacebookSDK(appId) {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version:
          process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v25.0",
      });

      resolve(window.FB);
      return;
    }

    const existing = document.getElementById(META_SDK_ID);

    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version:
          process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v25.0",
      });

      resolve(window.FB);
    };

    if (existing) {
      // The script is already loading. Wait for fbAsyncInit.
      return;
    }

    const script = document.createElement("script");

    script.id = META_SDK_ID;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";

    script.onerror = () => {
      reject(new Error("Unable to load Meta SDK."));
    };

    document.body.appendChild(script);
  });
}

export default function WhatsAppEmbeddedSignup({
  businessId,
  onConnected,
  className = "",
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const signupDataRef = useRef(null);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;

    if (!appId) return;

    loadFacebookSDK(appId).catch((err) => {
      console.error(
        "[WhatsApp Embedded Signup] SDK:",
        err
      );
    });

    const handler = (event) => {
      if (!event?.data || typeof event.data !== "string") {
        return;
      }

      let data;

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "WA_EMBEDDED_SIGNUP") {
        console.log(
          "[WhatsApp Embedded Signup] Event:",
          data
        );

        signupDataRef.current = {
          ...(signupDataRef.current || {}),
          ...data,
        };
      }
    };

    window.addEventListener("message", handler);

    return () => {
      window.removeEventListener("message", handler);
    };
  }, []);

  async function finishConnection(response, accessToken, configId) {
    try {
      if (!response?.authResponse?.code) {
        if (response?.status === "unknown") {
          throw new Error(
            "WhatsApp setup was cancelled."
          );
        }

        throw new Error(
          "Meta did not return the signup authorization code."
        );
      }

      setStatus(
        "Finishing WhatsApp connection..."
      );

      /*
       * Meta sends the WABA and phone number information
       * through the WA_EMBEDDED_SIGNUP postMessage event.
       *
       * Give the event a moment to arrive.
       */
      let signup = signupDataRef.current || {};

      for (let attempt = 0; attempt < 10; attempt++) {
        const wabaId =
          signup?.data?.waba_id ||
          signup?.data?.wabaId ||
          signup?.waba_id ||
          signup?.wabaId;

        const phoneNumberId =
          signup?.data?.phone_number_id ||
          signup?.data?.phoneNumberId ||
          signup?.phone_number_id ||
          signup?.phoneNumberId;

        if (wabaId && phoneNumberId) {
          break;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );

        signup = signupDataRef.current || {};
      }

      const wabaId =
        signup?.data?.waba_id ||
        signup?.data?.wabaId ||
        signup?.waba_id ||
        signup?.wabaId;

      const phoneNumberId =
        signup?.data?.phone_number_id ||
        signup?.data?.phoneNumberId ||
        signup?.phone_number_id ||
        signup?.phoneNumberId;

      const signupBusinessId =
        signup?.data?.business_id ||
        signup?.data?.businessId ||
        signup?.business_id ||
        signup?.businessId;

      if (!wabaId || !phoneNumberId) {
        throw new Error(
          "Meta completed authorization but did not return the WhatsApp Business Account or phone number ID. Check the Embedded Signup configuration."
        );
      }

      const result = await fetch(
        "/api/whatsapp/embedded-signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            code: response.authResponse.code,
            businessId,
            wabaId,
            phoneNumberId,
            signupBusinessId,
          }),
        }
      );

      const data = await result.json();

      if (!result.ok || !data.success) {
        throw new Error(
          data?.message ||
            "Unable to save WhatsApp connection."
        );
      }

      setStatus(
        "WhatsApp connected successfully."
      );

      onConnected?.(data);
    } catch (err) {
      console.error(
        "[WhatsApp Embedded Signup]",
        err
      );

      setError(
        err?.message ||
          "Unable to connect WhatsApp."
      );

      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function connect() {
    setLoading(true);
    setError("");
    setStatus(
      "Opening Meta WhatsApp setup..."
    );

    try {
      const appId =
        process.env.NEXT_PUBLIC_META_APP_ID;

      const configId =
        process.env
          .NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;

      if (!appId || !configId) {
        throw new Error(
          "Meta Embedded Signup is not configured. Add NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID."
        );
      }

      const session =
        await supabase.auth.getSession();

      const accessToken =
        session?.data?.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your Sodah session has expired. Please log in again."
        );
      }

      await loadFacebookSDK(appId);

      signupDataRef.current = null;

      /*
       * IMPORTANT:
       *
       * DO NOT make this callback async.
       *
       * Meta's FB.login expects a normal function.
       */
      window.FB.login(
        (response) => {
          /*
           * Run the asynchronous work separately.
           * This keeps the Meta callback itself synchronous.
           */
          finishConnection(
            response,
            accessToken,
            configId
          ).catch((err) => {
            console.error(
              "[WhatsApp Embedded Signup]",
              err
            );

            setError(
              err?.message ||
                "Unable to connect WhatsApp."
            );

            setStatus("");
            setLoading(false);
          });
        },
        {
          config_id: configId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            feature:
              "whatsapp_embedded_signup",
            sessionInfoVersion: "3",
          },
        }
      );
    } catch (err) {
      console.error(
        "[WhatsApp Embedded Signup]",
        err
      );

      setError(
        err?.message ||
          "Unable to start WhatsApp connection."
      );

      setStatus("");
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={connect}
        disabled={loading}
        className="rounded-xl px-5 py-3 font-semibold disabled:opacity-60"
      >
        {loading
          ? "Connecting..."
          : "Connect WhatsApp"}
      </button>

      {status ? (
        <p className="mt-3 text-sm text-green-600">
          {status}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}