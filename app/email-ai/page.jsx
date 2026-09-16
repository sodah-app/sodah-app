"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

export default function EmailAIPage() {
  const router = useRouter();

  const [account, setAccount] = useState(null);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const token = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data?.session?.access_token) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    return data.session.access_token;
  }, []);

  const api = useCallback(
    async (url, options = {}) => {
      const t = await token();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${t}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || data?.error || "Request failed."
        );
      }

      return data;
    },
    [token]
  );

  /* =========================================================
     ACTIVE BUSINESS ID

     Uses the same business context approach as the Welcome page.
     This is only used when opening Inbox or Send Email.
  ========================================================== */
  const getActiveBusinessId = async () => {
    const urlBusinessId =
      new URLSearchParams(window.location.search)
        .get("businessId")
        ?.trim();

    if (urlBusinessId) {
      return urlBusinessId;
    }

    try {
      const auth = await getCurrentUser();

      const authenticatedBusinessId =
        auth?.business?.business_id?.trim();

      if (authenticatedBusinessId) {
        return authenticatedBusinessId;
      }
    } catch (error) {
      console.error(
        "[Business Context] Failed to load authenticated business:",
        error
      );
    }

    try {
      const storedBusinessId =
        localStorage.getItem("business_id")?.trim();

      if (storedBusinessId) {
        return storedBusinessId;
      }
    } catch (error) {
      console.error(
        "[Business Context] Failed to read business_id:",
        error
      );
    }

    return "";
  };

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [accountData, historyData] = await Promise.all([
        api("/api/email-ai/account"),
        api("/api/email-ai/history"),
      ]);

      setAccount(accountData?.account || null);
      setHistory(historyData?.history || []);
    } catch (e) {
      console.error("[Email AI] Dashboard load failed:", e);
      setError(
        e?.message ||
          "Unable to load Email AI. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("connected") === "1") {
      setNotice("Gmail connected successfully.");
      loadDashboard();

      window.history.replaceState(
        {},
        "",
        "/email-ai"
      );
    }

    const errorMessage = params.get("error");

    if (errorMessage) {
      setError(errorMessage);

      window.history.replaceState(
        {},
        "",
        "/email-ai"
      );
    }
  }, [loadDashboard]);

  const connectGmail = async () => {
    try {
      setConnecting(true);
      setError("");
      setNotice("");

      const data = await api(
        "/api/email-ai/google/connect"
      );

      if (!data?.url) {
        throw new Error(
          "Unable to start Gmail connection."
        );
      }

      window.location.href = data.url;
    } catch (e) {
      console.error(
        "[Email AI] Gmail connection failed:",
        e
      );

      setError(
        e?.message ||
          "Unable to connect Gmail."
      );

      setConnecting(false);
    }
  };

  const disconnect = async () => {
    const confirmed = window.confirm(
      "Disconnect this Gmail account from Sodah?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setNotice("");

      await api("/api/email-ai/account", {
        method: "DELETE",
      });

      setAccount(null);
      setNotice("Gmail disconnected.");
    } catch (e) {
      console.error(
        "[Email AI] Gmail disconnect failed:",
        e
      );

      setError(
        e?.message ||
          "Unable to disconnect Gmail."
      );
    }
  };

  const openSendEmail = async () => {
    if (!account) {
      setError(
        "Connect Gmail before sending an email."
      );
      return;
    }

    try {
      const businessId =
        await getActiveBusinessId();

      if (!businessId) {
        setError(
          "Unable to determine your active Sodah business."
        );
        return;
      }

      router.push(
        `/email-ai/new-campaign?businessId=${encodeURIComponent(
          businessId
        )}`
      );
    } catch (error) {
      console.error(
        "[Business Context] Failed to open Send Email:",
        error
      );

      setError(
        error?.message ||
          "Unable to determine your active Sodah business."
      );
    }
  };

  const emailsSent = history.reduce(
    (total, item) =>
      total + Number(item?.sent_count || 0),
    0
  );

  const campaigns = history.length;

  return (
    <main className="page">
      <div className="shell">

       {/* BACK */}
<button
  onClick={() => router.push("/channels")}
  className="back-button"
>
  ← Back to Channels
</button>

{/* HERO */}
<header className="hero">
  <div>
    <div className="eyebrow">
      <i />
              SODAH EMAIL AI
            </div>

            <h1>
              Email AI{" "}
              <span className="sparkles">
                ✨
              </span>
            </h1>

            <p>
              AI Powered Email Campaigns that
              convert.
            </p>
          </div>

          <div className="hero-icon">
            <div className="mail-emoji">
              📩
            </div>
          </div>
        </header>

        {/* NOTICES */}
        {(notice || error) && (
          <div
            className={
              error
                ? "notice error"
                : "notice"
            }
          >
            {error || notice}
          </div>
        )}

        {/* STATS BUTTONS */}
        <section className="stats">

          <StatCard
            title="Connected Gmail"
            value={account ? "1" : "0"}
            subtitle={
              account?.gmail_email ||
              "No Gmail"
            }
            className="blue"
          />

          <StatCard
            title="Campaigns"
            value={campaigns}
            subtitle={`${campaigns} campaigns`}
            className="purple"
          />

          <StatCard
            title="Replies"
            value="0"
            subtitle="0 replies"
            className="green"
          />

          <StatCard
            title="Emails Sent"
            value={emailsSent}
            subtitle={`${emailsSent} emails`}
            className="orange"
          />

        </section>

        {/* MAIN TWO CARDS */}
        <section className="main-grid">

          {/* GMAIL CARD */}
          <div className="gmail-card">

            <div>
              <div className="card-heading">
                <img
                  src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico"
                  alt="Gmail"
                  className="gmail-logo"
                />

                <h2>
                  Gmail Accounts
                </h2>
              </div>

              {loading ? (
                <div className="loading">
                  Loading Gmail...
                </div>
              ) : account ? (
                <div className="connected-account">

                  <div className="account-row">
                    <div className="account-status">
                      <span className="check">
                        ✓
                      </span>

                      <div>
                        <strong>
                          {account.gmail_email}
                        </strong>

                        <small>
                          Google account connected
                          securely
                        </small>
                      </div>
                    </div>

                    <div className="gmail-row-actions">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const businessId =
                              await getActiveBusinessId();

                            if (!businessId) {
                              setError(
                                "Unable to determine your active Sodah business."
                              );
                              return;
                            }

                            router.push(
                              `/inbox?businessId=${encodeURIComponent(
                                businessId
                              )}`
                            );
                          } catch (error) {
                            console.error(
                              "[Business Context] Failed to open Inbox:",
                              error
                            );

                            setError(
                              error?.message ||
                                "Unable to determine your active Sodah business."
                            );
                          }
                        }}
                        className="inbox-button"
                      >
                        📥 Inbox
                      </button>

                      <button
                        onClick={disconnect}
                        className="logout-button"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="no-account">
                  <p>
                    Connect your Gmail account
                    to start sending emails
                    with Sodah.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={connectGmail}
              disabled={connecting}
              className="connect-button"
            >
              {connecting
                ? "Connecting..."
                : account
                ? "📧 Connect Another Gmail"
                : "📧 Connect Gmail"}
            </button>

          </div>

          {/* SEND EMAIL CARD */}
          <div className="campaign-card">

            <div>
              <div className="campaign-icon">
                ✨
              </div>

              <h2>
                Send Email
              </h2>

              <p>
                Create and send AI powered
                emails from your connected
                Gmail.
              </p>
            </div>

            <button
              type="button"
              disabled={!account}
              onClick={openSendEmail}
              className={
                account
                  ? "send-email-button active"
                  : "send-email-button disabled"
              }
            >
              {account
                ? "✨ Send Email →"
                : "🔒 Connect Gmail First"}
            </button>

          </div>

        </section>

      </div>

      <style jsx>{`

        .page {
          min-height: 100%;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(74, 222, 128, 0.07),
              transparent 27%
            ),
            radial-gradient(
              circle at 90% 15%,
              rgba(99, 102, 241, 0.06),
              transparent 25%
            ),
            #020617;

          color: #f8fafc;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 25px 28px 60px;
        }

        .back-button {
          border: none;
          background: transparent;
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
          margin-bottom: 24px;
        }

        .back-button:hover {
          color: white;
        }

        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 30px;
        }

        .eyebrow {
          color: #86efac;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .eyebrow i {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          margin-right: 8px;
        }

        .hero h1 {
          margin: 13px 0 8px;
          font-size: clamp(42px, 5vw, 58px);
          line-height: 1;
          letter-spacing: -0.05em;
          font-weight: 900;
        }

        .sparkles {
          font-size: 0.8em;
        }

        .hero p {
          margin: 0;
          color: #94a3b8;
          font-size: 15px;
        }

        .hero-icon {
          width: 128px;
          height: 128px;
          border-radius: 35px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mail-emoji {
          font-size: 60px;
        }

        .notice {
          margin: 0 0 20px;
          padding: 13px 15px;
          border-radius: 12px;
          background: rgba(74,222,128,0.06);
          border: 1px solid rgba(74,222,128,0.18);
          color: #bbf7d0;
          font-size: 12px;
        }

        .notice.error {
          background: rgba(248,113,113,0.06);
          border-color: rgba(248,113,113,0.20);
          color: #fecaca;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .stat {
          min-height: 150px;
          width: 100%;
          box-sizing: border-box;
          padding: 20px;
          border-radius: 25px;
          border: 1px solid rgba(255,255,255,0.12);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: left;
          color: white;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          overflow: hidden;
        }

        .stat::after {
          content: "";
          position: absolute;
          width: 110px;
          height: 110px;
          right: -35px;
          top: -40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.07);
          pointer-events: none;
        }

        .stat:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.24);
          box-shadow: 0 12px 30px rgba(0,0,0,0.18);
        }

        .stat:active {
          transform: translateY(0);
        }

        .stat.blue {
          background:
            linear-gradient(
              145deg,
              rgba(56,189,248,0.20),
              rgba(14,116,144,0.30)
            );
        }

        .stat.purple {
          background:
            linear-gradient(
              145deg,
              rgba(167,139,250,0.20),
              rgba(109,40,217,0.30)
            );
        }

        .stat.green {
          background:
            linear-gradient(
              145deg,
              rgba(52,211,153,0.20),
              rgba(5,150,105,0.30)
            );
        }

        .stat.orange {
          background:
            linear-gradient(
              145deg,
              rgba(251,146,60,0.20),
              rgba(194,65,12,0.30)
            );
        }

        .stat-label {
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 600;
        }

        .stat-value {
          margin-top: 12px;
          font-size: 43px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .stat-subtitle {
          margin-top: 9px;
          color: #cbd5e1;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .gmail-card,
        .campaign-card {
          min-height: 285px;
          padding: 22px;
          border-radius: 30px;
          border: 1px solid rgba(255,255,255,0.10);
          background:
            linear-gradient(
              145deg,
              rgba(30,41,59,0.72),
              rgba(15,23,42,0.84)
            );
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .card-heading {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 22px;
        }

        .gmail-logo {
          width: 48px;
          height: 48px;
          object-fit: contain;
        }

        .card-heading h2 {
          margin: 0;
          font-size: 29px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .loading {
          color: #64748b;
          font-size: 12px;
          padding: 18px 0;
        }

        .no-account p {
          max-width: 380px;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.7;
        }

        .connected-account {
          margin-top: 5px;
        }

        .account-row {
          min-height: 68px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .account-status {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .check {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(74,222,128,0.12);
          color: #86efac;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .account-status strong {
          display: block;
          color: #86efac;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .account-status small {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .logout-button {
          flex-shrink: 0;
          border: 1px solid rgba(248,113,113,0.20);
          background: rgba(248,113,113,0.06);
          color: #fca5a5;
          border-radius: 9px;
          padding: 8px 10px;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .connect-button {
          width: 100%;
          height: 48px;
          border: none;
          border-radius: 16px;
          background:
            linear-gradient(
              90deg,
              #06b6d4,
              #8b5cf6,
              #ec4899
            );
          color: white;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 12px 30px rgba(139,92,246,0.14);
        }

        .connect-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .campaign-icon {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          background: rgba(124,58,237,0.20);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 27px;
          margin-bottom: 23px;
        }

        .campaign-card h2 {
          margin: 0;
          font-size: 29px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .campaign-card p {
          margin: 10px 0 0;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
          max-width: 370px;
        }

        .send-email-button {
          width: 100%;
          height: 48px;
          border: none;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 800;
          transition: 0.2s ease;
        }

        .send-email-button.active {
          background:
            linear-gradient(
              90deg,
              #06b6d4,
              #8b5cf6,
              #ec4899
            );
          color: white;
          cursor: pointer;
        }

        .send-email-button.active:hover {
          transform: translateY(-1px);
          box-shadow:
            0 12px 30px rgba(139,92,246,0.18);
        }

        .send-email-button.disabled {
          background: #293449;
          color: #64748b;
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .shell {
            padding: 20px 15px 40px;
          }

          .hero {
            align-items: flex-start;
          }

          .hero-icon {
            display: none;
          }

          .hero h1 {
            font-size: 42px;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .card-heading h2,
          .campaign-card h2 {
            font-size: 24px;
          }

          .account-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .logout-button {
            width: 100%;
          }
        }

        .gmail-row-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .inbox-button {
          border: 1px solid rgba(52,211,153,.22);
          background: rgba(52,211,153,.10);
          color: #86efac;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .inbox-button:hover {
          background: rgba(52,211,153,.16);
          color: #bbf7d0;
        }

      `}</style>
    </main>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  className,
}) {
  const buttonBackgrounds = {
    blue:
      "linear-gradient(145deg, rgba(14, 65, 98, 0.96), rgba(8, 52, 79, 0.96))",
    purple:
      "linear-gradient(145deg, rgba(49, 39, 103, 0.96), rgba(39, 34, 91, 0.96))",
    green:
      "linear-gradient(145deg, rgba(8, 73, 70, 0.96), rgba(7, 61, 60, 0.96))",
    orange:
      "linear-gradient(145deg, rgba(76, 39, 45, 0.96), rgba(66, 29, 43, 0.96))",
  };

  return (
    <button
      type="button"
      className={`stat ${className}`}
      aria-label={`${title}: ${value}`}
      style={{
        background: buttonBackgrounds[className] || buttonBackgrounds.blue,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "25px",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        textAlign: "left",
        width: "100%",
        minHeight: "150px",
        boxSizing: "border-box",
        padding: "20px",
        cursor: "pointer",
        appearance: "none",
        WebkitAppearance: "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="stat-label"
        style={{
          color: "#e2e8f0",
          fontSize: "13px",
          fontWeight: 600,
          position: "relative",
          zIndex: 1,
        }}
      >
        {title}
      </div>

      <div
        className="stat-value"
        style={{
          color: "#ffffff",
          fontSize: "43px",
          lineHeight: 1,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          marginTop: "12px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {value}
      </div>

      <div
        className="stat-subtitle"
        style={{
          color: "#cbd5e1",
          fontSize: "11px",
          marginTop: "9px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {subtitle}
      </div>
    </button>
  );
}