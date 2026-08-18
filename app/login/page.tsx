"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InstagramLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const supabase = createClient();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        /*
         * If the user already has a valid Sodah session,
         * continue directly to Instagram OAuth.
         */
        if (session?.user) {
          window.location.href = "/api/auth/instagram";
          return;
        }
      } catch (sessionError) {
        console.error(
          "Instagram login session check failed:",
          sessionError
        );
      }

      if (mounted) {
        setLoading(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoggingIn(true);

    try {
      /*
       * IMPORTANT:
       *
       * Supabase Auth signs in with an email + password.
       * Therefore the username must first be resolved
       * to the user's Supabase email by the server.
       */
      const response = await fetch(
        "/api/auth/instagram/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to sign in. Please check your username and password."
        );
      }

      /*
       * The server has authenticated the Sodah account.
       *
       * Now start the Instagram OAuth flow using the
       * authenticated browser session.
       */
      window.location.href = "/api/auth/instagram";
    } catch (loginError) {
      console.error(
        "Instagram Sodah login failed:",
        loginError
      );

      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in. Please check your username and password."
      );

      setLoggingIn(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
          color: "#ffffff",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 20px",
              borderRadius: "14px",
              background:
                "linear-gradient(135deg, #8df7b2, #42d9e8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "25px",
            }}
          >
            ◎
          </div>

          <p
            style={{
              margin: 0,
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            Checking your Sodah session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "28px",
          background: "rgba(15, 23, 42, 0.88)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.40)",
          padding: "40px",
          backdropFilter: "blur(20px)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/channels")}
          style={{
            border: 0,
            background: "transparent",
            color: "#9ca3af",
            cursor: "pointer",
            padding: 0,
            marginBottom: "34px",
            fontSize: "14px",
          }}
        >
          ← Back to Channels
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background:
                "linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            ◎
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "26px",
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              Instagram
            </h1>

            <p
              style={{
                margin: "5px 0 0",
                color: "#8df7b2",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.20em",
              }}
            >
              CHANNEL CONNECTION
            </p>
          </div>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <h2
            style={{
              margin: "0 0 10px",
              color: "#ffffff",
              fontSize: "36px",
              lineHeight: 1.1,
              fontWeight: 800,
            }}
          >
            Connect Instagram
          </h2>

          <p
            style={{
              margin: 0,
              color: "#aab4c3",
              fontSize: "15px",
              lineHeight: 1.6,
            }}
          >
            Sign in to your Sodah account before connecting
            your Instagram business account.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "14px",
              border:
                "1px solid rgba(248,113,113,0.30)",
              background:
                "rgba(248,113,113,0.08)",
              color: "#fca5a5",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label
            htmlFor="instagram-username"
            style={{
              display: "block",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Username
          </label>

          <input
            id="instagram-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            placeholder="Enter your username"
            required
            disabled={loggingIn}
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: "14px",
              border:
                "1px solid rgba(255,255,255,0.14)",
              background:
                "rgba(255,255,255,0.06)",
              color: "#ffffff",
              padding: "15px 16px",
              outline: "none",
              fontSize: "15px",
              marginBottom: "20px",
            }}
          />

          <label
            htmlFor="instagram-password"
            style={{
              display: "block",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Password
          </label>

          <input
            id="instagram-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            required
            disabled={loggingIn}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border:
                "1px solid rgba(255,255,255,0.14)",
              background:
                "rgba(255,255,255,0.06)",
              color: "#ffffff",
              padding: "15px 16px",
              outline: "none",
              fontSize: "15px",
              marginBottom: "24px",
            }}
          />

          <button
            type="submit"
            disabled={loggingIn}
            style={{
              width: "100%",
              border: 0,
              borderRadius: "15px",
              padding: "16px 20px",
              background: loggingIn
                ? "rgba(141,247,178,0.45)"
                : "linear-gradient(135deg, #8df7b2, #61e6d1)",
              color: "#062017",
              cursor: loggingIn
                ? "not-allowed"
                : "pointer",
              fontSize: "15px",
              fontWeight: 800,
              boxShadow:
                "0 12px 30px rgba(97,230,209,0.18)",
            }}
          >
            {loggingIn
              ? "Signing in..."
              : "Continue to Instagram →"}
          </button>
        </form>

        <p
          style={{
            margin: "22px 0 0",
            textAlign: "center",
            color: "#7f8a9a",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Your Sodah credentials are used to establish
          your account session. Instagram authentication
          happens separately on Instagram.
        </p>

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/channels")}
            style={{
              border: 0,
              background: "transparent",
              color: "#8df7b2",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Back to Channels
          </button>
        </div>
      </div>
    </main>
  );
}