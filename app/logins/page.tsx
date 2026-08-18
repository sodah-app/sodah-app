"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Channel = "whatsapp" | "instagram" | "";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [businessId, setBusinessId] = useState("");
  const [channel, setChannel] = useState<Channel>("");

  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);

  /*
   * ------------------------------------------------------------
   * LOAD LOGIN CONTEXT
   * ------------------------------------------------------------
   *
   * Supported URLs:
   *
   * /login
   * /login?email=user@example.com
   * /login?email=user@example.com&businessId=123
   * /login?email=user@example.com&businessId=123&channel=whatsapp
   * /login?email=user@example.com&businessId=123&channel=instagram
   *
   * Password is NEVER accepted from the URL.
   */
  useEffect(() => {
    const suppliedEmail =
      searchParams.get("email") || "";

    const suppliedBusinessId =
      searchParams.get("businessId") || "";

    const suppliedChannel =
      searchParams.get("channel") || "";

    setEmail(suppliedEmail);
    setBusinessId(suppliedBusinessId);

    if (
      suppliedChannel === "whatsapp" ||
      suppliedChannel === "instagram"
    ) {
      setChannel(suppliedChannel);
    } else {
      setChannel("");
    }
  }, [searchParams]);

  /*
   * ------------------------------------------------------------
   * BUILD THE REAL INBOX URL
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Login does NOT render the Inbox.
   *
   * It sends the authenticated user to:
   *
   * /inbox
   *
   * Optional context is preserved:
   *
   * /inbox?businessId=123&channel=whatsapp
   */
  function buildInboxUrl() {
    const params = new URLSearchParams();

    if (businessId.trim()) {
      params.set(
        "businessId",
        businessId.trim()
      );
    }

    if (channel) {
      params.set("channel", channel);
    }

    const query = params.toString();

    return query
      ? `/inbox?${query}`
      : "/inbox";
  }

  /*
   * ------------------------------------------------------------
   * CHECK EXISTING SUPABASE SESSION
   * ------------------------------------------------------------
   *
   * If the user already logged in previously:
   *
   * /login
   *    ↓
   * /inbox
   *
   * No second Inbox is rendered here.
   */
  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        const supabase = createClient();

        const {
          data: { user: currentUser },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (
          userError ||
          !currentUser
        ) {
          setUser(null);
          setLoading(false);
          return;
        }

        /*
         * User is already authenticated.
         *
         * Send them directly to the REAL Inbox.
         */
        setUser(currentUser);

        router.replace(
          buildInboxUrl()
        );
      } catch (authenticationError) {
        console.error(
          "Authentication check failed:",
          authenticationError
        );

        if (!mounted) {
          return;
        }

        setUser(null);
        setLoading(false);
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [
    router,
    businessId,
    channel,
  ]);

  /*
   * ------------------------------------------------------------
   * LOGIN
   * ------------------------------------------------------------
   */
  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const normalizedEmail =
      email.trim();

    if (!normalizedEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setLoggingIn(true);

    try {
      const supabase = createClient();

      const {
        data,
        error: loginError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: normalizedEmail,
            password,
          }
        );

      if (loginError) {
        setError(
          loginError.message
        );
        setLoggingIn(false);
        return;
      }

      if (!data.user) {
        setError(
          "Login was not completed. Please try again."
        );

        setLoggingIn(false);
        return;
      }

      /*
       * Authentication succeeded.
       *
       * Do NOT render an Inbox here.
       *
       * Do NOT redirect to /app/inbox.
       *
       * Open the REAL Inbox route.
       */
      setUser(data.user);
      setPassword("");

      const inboxUrl =
        buildInboxUrl();

      router.replace(inboxUrl);
    } catch (loginError) {
      console.error(
        "Login failed:",
        loginError
      );

      setError(
        "Unable to sign in right now. Please try again."
      );

      setLoggingIn(false);
    }
  }

  /*
   * ------------------------------------------------------------
   * BACK TO CHANNELS
   * ------------------------------------------------------------
   *
   * /app has been removed.
   *
   * Channels now lives at:
   *
   * /channels
   */
  function handleBackToChannels() {
    router.push("/channels");
  }

  /*
   * ------------------------------------------------------------
   * LOADING
   * ------------------------------------------------------------
   */
  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.logoCircle}>
            💬
          </div>

          <h1 style={styles.loadingTitle}>
            Opening Inbox
          </h1>

          <p style={styles.mutedText}>
            Checking your account...
          </p>

          <div style={styles.loadingBar}>
            <div
              style={
                styles.loadingBarProgress
              }
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes inboxLoading {
            0% {
              transform: translateX(-100%);
            }

            100% {
              transform: translateX(300%);
            }
          }
        `}</style>
      </main>
    );
  }

  /*
   * ------------------------------------------------------------
   * LOGIN SCREEN
   * ------------------------------------------------------------
   */
  return (
    <main style={styles.page}>
      <div
        style={styles.backgroundGlowOne}
      />

      <div
        style={styles.backgroundGlowTwo}
      />

      <section style={styles.loginCard}>
        {/* BACK TO CHANNELS */}

        <button
          type="button"
          onClick={
            handleBackToChannels
          }
          style={styles.backButton}
        >
          ← Back to Channels
        </button>

        {/* BRAND */}

        <div style={styles.brandArea}>
          <div
            style={
              styles.logoCircleLarge
            }
          >
            💬
          </div>

          <div>
            <p style={styles.brandName}>
              Sodah
              <span
                style={
                  styles.brandAccent
                }
              >
                .io
              </span>
            </p>

            <p
              style={
                styles.brandSubtitle
              }
            >
              AI AUTOMATION PLATFORM
            </p>
          </div>
        </div>

        {/* HEADING */}

        <div
          style={styles.headingArea}
        >
          <p style={styles.eyebrow}>
            INBOX ACCESS
          </p>

          <h1 style={styles.heading}>
            Welcome to your Inbox
          </h1>

          <p
            style={styles.description}
          >
            Sign in to continue to your
            customer conversations and
            connected channels.
          </p>
        </div>

        {/* CHANNEL */}

        {channel && (
          <div
            style={
              styles.channelBox
            }
          >
            <div
              style={
                styles.channelIcon
              }
            >
              {channel ===
              "whatsapp"
                ? "◉"
                : "◎"}
            </div>

            <div
              style={
                styles.channelContent
              }
            >
              <span
                style={
                  styles.channelLabel
                }
              >
                CONNECTED CHANNEL
              </span>

              <span
                style={
                  styles.channelValue
                }
              >
                {channel ===
                "whatsapp"
                  ? "WhatsApp"
                  : "Instagram"}
              </span>
            </div>
          </div>
        )}

        {/* BUSINESS */}

        {businessId && (
          <div
            style={
              styles.workspaceBox
            }
          >
            <div
              style={
                styles.workspaceIcon
              }
            >
              🏢
            </div>

            <div
              style={
                styles.workspaceContent
              }
            >
              <span
                style={
                  styles.workspaceLabel
                }
              >
                BUSINESS ID
              </span>

              <span
                style={
                  styles.workspaceValue
                }
              >
                {businessId}
              </span>
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            style={styles.errorBox}
          >
            <span
              style={styles.errorIcon}
            >
              !
            </span>

            <span>{error}</span>
          </div>
        )}

        {/* LOGIN FORM */}

        <form
          onSubmit={handleLogin}
          style={styles.form}
        >
          {/* EMAIL */}

          <div style={styles.field}>
            <label
              htmlFor="login-email"
              style={styles.label}
            >
              Email address
            </label>

            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              disabled={loggingIn}
              style={styles.input}
              required
            />
          </div>

          {/* PASSWORD */}

          <div style={styles.field}>
            <div
              style={
                styles.passwordLabelRow
              }
            >
              <label
                htmlFor="login-password"
                style={styles.label}
              >
                Password
              </label>

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value
                  )
                }
                disabled={loggingIn}
                style={
                  styles.showPasswordButton
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>

            <input
              id="login-password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Enter your password"
              disabled={loggingIn}
              style={styles.input}
              required
            />
          </div>

          {/* LOGIN */}

          <button
            type="submit"
            disabled={loggingIn}
            style={{
              ...styles.loginButton,
              ...(loggingIn
                ? styles.loginButtonDisabled
                : {}),
            }}
          >
            {loggingIn ? (
              <>
                <span
                  style={
                    styles.spinner
                  }
                />

                Signing in...
              </>
            ) : (
              <>
                Open Inbox

                <span
                  style={
                    styles.buttonArrow
                  }
                >
                  →
                </span>
              </>
            )}
          </button>
        </form>

        {/* SECURITY */}

        <div
          style={
            styles.securityNotice
          }
        >
          <span
            style={styles.lockIcon}
          >
            🔒
          </span>

          <span>
            Your password is entered
            securely and is never
            placed in the Inbox URL.
          </span>
        </div>

        {/* FOOTER */}

        <div
          style={styles.footerText}
        >
          <span>
            Need to select another
            channel?
          </span>

          <button
            type="button"
            onClick={
              handleBackToChannels
            }
            style={styles.footerLink}
          >
            Back to Channels
          </button>
        </div>
      </section>

      <style jsx>{`
        button,
        input {
          font-family: inherit;
        }

        input::placeholder {
          color: #64748b;
        }

        input:focus {
          outline: none;
          border-color: rgba(
            37,
            211,
            102,
            0.65
          );

          box-shadow:
            0 0 0 3px
              rgba(
                37,
                211,
                102,
                0.08
              ),
            0 0 30px
              rgba(
                37,
                211,
                102,
                0.08
              );
        }

        button:not(:disabled):hover {
          filter: brightness(1.08);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}

/*
 * --------------------------------------------------------------
 * PAGE WRAPPER
 * --------------------------------------------------------------
 *
 * This Suspense boundary is IMPORTANT.
 *
 * Next.js requires useSearchParams() to be rendered
 * inside Suspense during production builds.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={styles.page}>
          <div style={styles.loadingCard}>
            <div
              style={styles.logoCircle}
            >
              💬
            </div>

            <h1
              style={styles.loadingTitle}
            >
              Opening Inbox
            </h1>

            <p
              style={styles.mutedText}
            >
              Loading login...
            </p>

            <div
              style={styles.loadingBar}
            >
              <div
                style={
                  styles.loadingBarProgress
                }
              />
            </div>
          </div>

          <style jsx>{`
            @keyframes inboxLoading {
              0% {
                transform: translateX(-100%);
              }

              100% {
                transform: translateX(300%);
              }
            }
          `}</style>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

/* ===============================================================
   STYLES
================================================================ */

const styles = {
  page: {
    position: "relative" as const,
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 15% 15%, rgba(37,211,102,0.10), transparent 30%), radial-gradient(circle at 85% 20%, rgba(0,229,255,0.08), transparent 28%), #020806",
    color: "white",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },

  backgroundGlowOne: {
    position: "fixed" as const,
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    top: "-180px",
    left: "-140px",
    background:
      "rgba(37,211,102,0.08)",
    filter: "blur(80px)",
    pointerEvents:
      "none" as const,
  },

  backgroundGlowTwo: {
    position: "fixed" as const,
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    right: "-160px",
    bottom: "-160px",
    background:
      "rgba(0,229,255,0.07)",
    filter: "blur(80px)",
    pointerEvents:
      "none" as const,
  },

  loadingCard: {
    width: "100%",
    maxWidth: "420px",
    padding: "42px",
    borderRadius: "28px",
    border:
      "1px solid rgba(37,211,102,0.14)",
    background:
      "rgba(6,17,11,0.88)",
    boxShadow:
      "0 30px 100px rgba(0,0,0,0.45)",
    textAlign: "center" as const,
    backdropFilter: "blur(24px)",
  },

  loadingTitle: {
    margin: "20px 0 8px",
    fontSize: "24px",
    fontWeight: 900,
  },

  mutedText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
  },

  loadingBar: {
    position: "relative" as const,
    overflow: "hidden",
    height: "4px",
    marginTop: "26px",
    borderRadius: "999px",
    background: "#16231b",
  },

  loadingBarProgress: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "35%",
    height: "100%",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, #25D366, #00E5FF)",
    animation:
      "inboxLoading 1.4s ease-in-out infinite",
  },

  logoCircle: {
    width: "64px",
    height: "64px",
    margin: "0 auto",
    display: "grid",
    placeItems: "center",
    borderRadius: "20px",
    background:
      "linear-gradient(135deg, #25D366, #00E5FF)",
    fontSize: "28px",
    boxShadow:
      "0 0 35px rgba(37,211,102,0.20)",
  },

  loginCard: {
    position: "relative" as const,
    width: "100%",
    maxWidth: "500px",
    padding: "28px",
    borderRadius: "30px",
    border:
      "1px solid rgba(37,211,102,0.13)",
    background:
      "rgba(5,15,10,0.92)",
    boxShadow:
      "0 35px 120px rgba(0,0,0,0.60)",
    backdropFilter: "blur(30px)",
  },

  backButton: {
    border: 0,
    background: "transparent",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    padding: "4px 0",
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginTop: "24px",
  },

  logoCircleLarge: {
    width: "56px",
    height: "56px",
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    borderRadius: "18px",
    background:
      "linear-gradient(135deg, #25D366, #00E5FF)",
    fontSize: "25px",
    boxShadow:
      "0 0 30px rgba(37,211,102,0.18)",
  },

  brandName: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 900,
    letterSpacing: "-0.5px",
  },

  brandAccent: {
    color: "#22d3ee",
  },

  brandSubtitle: {
    margin: "5px 0 0",
    color: "#4ade80",
    fontSize: "8px",
    fontWeight: 800,
    letterSpacing: "2px",
  },

  headingArea: {
    marginTop: "32px",
  },

  eyebrow: {
    margin: 0,
    color: "#4ade80",
    fontSize: "9px",
    fontWeight: 900,
    letterSpacing: "3px",
  },

  heading: {
    margin: "9px 0 0",
    fontSize: "32px",
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: "-1px",
  },

  description: {
    margin: "12px 0 0",
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.7,
  },

  channelBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "22px",
    padding: "13px",
    borderRadius: "16px",
    border:
      "1px solid rgba(0,229,255,0.14)",
    background:
      "rgba(0,229,255,0.045)",
  },

  channelIcon: {
    width: "38px",
    height: "38px",
    display: "grid",
    placeItems: "center",
    borderRadius: "12px",
    background:
      "rgba(0,229,255,0.08)",
    color: "#67e8f9",
    fontSize: "20px",
    fontWeight: 900,
  },

  channelContent: {
    display: "flex",
    minWidth: 0,
    flexDirection:
      "column" as const,
    gap: "3px",
  },

  channelLabel: {
    color: "#67e8f9",
    fontSize: "8px",
    fontWeight: 900,
    letterSpacing: "1.5px",
  },

  channelValue: {
    color: "#cffafe",
    fontSize: "12px",
    fontWeight: 700,
  },

  workspaceBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "12px",
    padding: "13px",
    borderRadius: "16px",
    border:
      "1px solid rgba(37,211,102,0.14)",
    background:
      "rgba(37,211,102,0.045)",
  },

  workspaceIcon: {
    width: "38px",
    height: "38px",
    display: "grid",
    placeItems: "center",
    borderRadius: "12px",
    background:
      "rgba(37,211,102,0.08)",
  },

  workspaceContent: {
    display: "flex",
    minWidth: 0,
    flexDirection:
      "column" as const,
    gap: "3px",
  },

  workspaceLabel: {
    color: "#4ade80",
    fontSize: "8px",
    fontWeight: 900,
    letterSpacing: "1.5px",
  },

  workspaceValue: {
    overflow: "hidden",
    color: "#d1fae5",
    fontSize: "12px",
    fontWeight: 700,
    textOverflow: "ellipsis",
    whiteSpace:
      "nowrap" as const,
  },

  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    marginTop: "18px",
    padding: "12px 14px",
    borderRadius: "12px",
    border:
      "1px solid rgba(248,113,113,0.18)",
    background:
      "rgba(127,29,29,0.18)",
    color: "#fca5a5",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  errorIcon: {
    display: "grid",
    flexShrink: 0,
    width: "20px",
    height: "20px",
    placeItems: "center",
    borderRadius: "50%",
    background:
      "rgba(248,113,113,0.16)",
    color: "#f87171",
    fontWeight: 900,
  },

  form: {
    display: "flex",
    flexDirection:
      "column" as const,
    gap: "19px",
    marginTop: "22px",
  },

  field: {
    display: "flex",
    flexDirection:
      "column" as const,
    gap: "8px",
  },

  label: {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
  },

  passwordLabelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  showPasswordButton: {
    border: 0,
    background: "transparent",
    color: "#22d3ee",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },

  input: {
    width: "100%",
    boxSizing:
      "border-box" as const,
    height: "50px",
    padding: "0 15px",
    borderRadius: "13px",
    border:
      "1px solid rgba(148,163,184,0.14)",
    outline: "none",
    background:
      "rgba(255,255,255,0.035)",
    color: "white",
    fontSize: "14px",
    transition:
      "border-color 150ms ease, box-shadow 150ms ease",
  },

  loginButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    height: "52px",
    marginTop: "2px",
    border: 0,
    borderRadius: "14px",
    background:
      "linear-gradient(135deg, #25D366, #22c55e)",
    color: "#031109",
    fontSize: "14px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 0 30px rgba(37,211,102,0.20)",
  },

  loginButtonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },

  spinner: {
    width: "16px",
    height: "16px",
    border:
      "2px solid rgba(3,17,9,0.25)",
    borderTopColor: "#031109",
    borderRadius: "50%",
    animation:
      "spin 700ms linear infinite",
  },

  buttonArrow: {
    fontSize: "18px",
  },

  securityNotice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "20px",
    color: "#64748b",
    fontSize: "10px",
    lineHeight: 1.5,
    textAlign: "center" as const,
  },

  lockIcon: {
    fontSize: "12px",
  },

  footerText: {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "center",
    gap: "5px",
    marginTop: "24px",
    color: "#475569",
    fontSize: "11px",
    textAlign: "center" as const,
  },

  footerLink: {
    border: 0,
    padding: 0,
    background: "transparent",
    color: "#22d3ee",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
};