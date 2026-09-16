"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TYPES = [
  { value: "feature", label: "Feature request", icon: "✦" },
  { value: "improvement", label: "Improvement", icon: "↗" },
  { value: "bug", label: "Report a problem", icon: "⚠" },
  { value: "other", label: "Other", icon: "💬" },
];

export default function SuggestionsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [type, setType] = useState("feature");
  const [subject, setSubject] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const remaining = useMemo(
    () => 2000 - suggestion.length,
    [suggestion.length]
  );

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.push("/");
          return;
        }

        const authUser = session.user;

        const { data: business } = await supabase
          .from("businesses")
          .select("business_id, business_name")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        setUser(authUser);
        setBusinessId(String(business?.business_id || "").trim());
        setBusinessName(String(business?.business_name || "").trim());
      } catch (err) {
        console.error("[Suggestions] Failed to load user:", err);
        if (mounted) setError("Unable to load your account.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadUser();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function submitSuggestion(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanSubject = subject.trim();
    const cleanSuggestion = suggestion.trim();

    if (!cleanSuggestion) {
      setError("Please enter your suggestion before submitting.");
      return;
    }

    if (cleanSuggestion.length < 10) {
      setError("Please provide a little more detail so we can understand your suggestion.");
      return;
    }

    if (cleanSuggestion.length > 2000) {
      setError("Your suggestion is too long. Please keep it under 2,000 characters.");
      return;
    }

    try {
      setSending(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/");
        return;
      }

      const response = await fetch("/api/suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          type,
          subject: cleanSubject,
          suggestion: cleanSuggestion,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Unable to submit your suggestion."
        );
      }

      setSubject("");
      setSuggestion("");
      setSuccess("Thank you. Your suggestion has been sent to the Sodah team.");
    } catch (err) {
      console.error("[Suggestions] Submit failed:", err);
      setError(err?.message || "Unable to submit your suggestion.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="suggestions-page">
        <div className="loading-overlay">
          <div className="loader-ring" />
          <span>Loading suggestions…</span>
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="suggestions-page">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />

      <div className="suggestions-shell">
        <header className="topbar">
          <button
            type="button"
            className="back-button"
            onClick={() => router.back()}
          >
            <span>←</span>
            Back
          </button>

          <div className="brand">
            <div className="brand-mark">S</div>
            <div>
              <div className="brand-name">Sodah</div>
              <div className="brand-caption">Business Platform</div>
            </div>
          </div>

          <div className="account-chip">
            <span className="account-dot" />
            <span>{businessName || user?.email || "Account"}</span>
          </div>
        </header>

        <section className="hero">
          <div className="hero-badge">
            <span>✦</span>
            Product feedback
          </div>

          <h1>Help us make Sodah better.</h1>
          <p>
            Share a feature idea, improvement, or problem you would like the
            Sodah team to know about. Every submission goes directly to our
            team for review.
          </p>
        </section>

        <form className="card" onSubmit={submitSuggestion}>
          <div className="card-heading">
            <div>
              <h2>Send a suggestion</h2>
              <p>Your feedback helps shape what we build next.</p>
            </div>
            <div className="secure-badge">Private feedback</div>
          </div>

          <div className="field">
            <label>What would you like to tell us?</label>
            <div className="type-grid">
              {TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`type-option ${
                    type === item.value ? "selected" : ""
                  }`}
                  onClick={() => setType(item.value)}
                >
                  <span className="type-icon">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="check">
                    {type === item.value ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="subject">Subject <span>Optional</span></label>
            <input
              id="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={160}
              placeholder="Give your suggestion a short title"
            />
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="suggestion">Your suggestion</label>
              <span>{remaining} characters left</span>
            </div>
            <textarea
              id="suggestion"
              value={suggestion}
              onChange={(event) => setSuggestion(event.target.value)}
              maxLength={2000}
              rows={8}
              placeholder="Tell us what you would like to see, what is not working, or how we can improve your experience…"
            />
          </div>

          {(error || success) && (
            <div className={`notice ${error ? "notice-error" : "notice-success"}`}>
              <span>{error ? "!" : "✓"}</span>
              {error || success}
            </div>
          )}

          <div className="form-footer">
            <p>
              Suggestions are associated with your Sodah account so our team
              can understand the context of your feedback.
            </p>

            <button
              type="submit"
              className="submit-button"
              disabled={sending}
            >
              {sending ? (
                <>
                  <span className="button-spinner" />
                  Sending…
                </>
              ) : (
                <>
                  Send suggestion
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  * { box-sizing: border-box; }

  .suggestions-page {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(circle at 15% 10%, rgba(34,197,94,.12), transparent 28%),
      radial-gradient(circle at 90% 85%, rgba(59,130,246,.10), transparent 28%),
      #f6f8fb;
    color: #0f172a;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .background-orb {
    position: fixed;
    width: 420px;
    height: 420px;
    border-radius: 50%;
    filter: blur(80px);
    opacity: .22;
    pointer-events: none;
  }

  .orb-one { background: #22c55e; top: -220px; left: -180px; }
  .orb-two { background: #60a5fa; right: -220px; bottom: -240px; }

  .suggestions-shell {
    width: min(1080px, calc(100% - 36px));
    margin: 0 auto;
    padding: 24px 0 70px;
    position: relative;
    z-index: 1;
  }

  .topbar {
    min-height: 68px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 20px;
    padding: 0 4px;
  }

  .back-button {
    justify-self: start;
    border: 1px solid #dbe2ea;
    background: rgba(255,255,255,.82);
    color: #334155;
    border-radius: 12px;
    padding: 10px 15px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: .2s ease;
  }

  .back-button:hover {
    background: #fff;
    transform: translateY(-1px);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-mark {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: linear-gradient(135deg, #111827, #334155);
    color: white;
    font-size: 18px;
    font-weight: 900;
    box-shadow: 0 8px 22px rgba(15,23,42,.15);
  }

  .brand-name { font-size: 17px; font-weight: 850; line-height: 1; }
  .brand-caption { font-size: 11px; color: #64748b; margin-top: 4px; }

  .account-chip {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 260px;
    padding: 9px 12px;
    border: 1px solid #dbe2ea;
    border-radius: 999px;
    background: rgba(255,255,255,.78);
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .account-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 4px rgba(34,197,94,.12);
    flex: 0 0 auto;
  }

  .hero {
    max-width: 760px;
    margin: 74px auto 32px;
    text-align: center;
  }

  .hero-badge {
    width: fit-content;
    margin: 0 auto 18px;
    padding: 7px 11px;
    border-radius: 999px;
    border: 1px solid #d7f3df;
    background: #f0fdf4;
    color: #15803d;
    font-size: 12px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(34px, 5vw, 54px);
    line-height: 1.04;
    letter-spacing: -1.8px;
    font-weight: 900;
  }

  .hero p {
    max-width: 680px;
    margin: 18px auto 0;
    color: #64748b;
    font-size: 16px;
    line-height: 1.75;
  }

  .card {
    max-width: 820px;
    margin: 0 auto;
    padding: 30px;
    border: 1px solid rgba(203,213,225,.75);
    border-radius: 24px;
    background: rgba(255,255,255,.91);
    box-shadow: 0 24px 70px rgba(15,23,42,.09);
    backdrop-filter: blur(18px);
  }

  .card-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
  }

  .card-heading h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 850;
  }

  .card-heading p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
  }

  .secure-badge {
    flex: 0 0 auto;
    padding: 7px 10px;
    border-radius: 999px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 11px;
    font-weight: 750;
  }

  .field { margin-top: 23px; }
  .field > label, .label-row label {
    display: block;
    margin-bottom: 9px;
    font-size: 13px;
    font-weight: 800;
    color: #334155;
  }

  .field label span {
    color: #94a3b8;
    font-weight: 600;
    margin-left: 5px;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .label-row span {
    font-size: 11px;
    color: #94a3b8;
  }

  .type-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .type-option {
    position: relative;
    min-height: 86px;
    padding: 14px;
    text-align: left;
    border: 1px solid #e2e8f0;
    border-radius: 15px;
    background: #fff;
    color: #475569;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 9px;
    font-size: 12px;
    font-weight: 750;
    transition: .2s ease;
  }

  .type-option:hover { border-color: #bbf7d0; transform: translateY(-1px); }

  .type-option.selected {
    border-color: #22c55e;
    background: #f0fdf4;
    color: #166534;
    box-shadow: 0 7px 20px rgba(34,197,94,.10);
  }

  .type-icon { font-size: 18px; }
  .check { position: absolute; top: 11px; right: 12px; color: #16a34a; font-size: 14px; }

  input, textarea {
    width: 100%;
    border: 1px solid #dbe2ea;
    background: #fff;
    border-radius: 13px;
    outline: none;
    color: #0f172a;
    font: inherit;
    transition: .2s ease;
  }

  input {
    height: 48px;
    padding: 0 14px;
    font-size: 14px;
  }

  textarea {
    resize: vertical;
    min-height: 170px;
    padding: 13px 14px;
    font-size: 14px;
    line-height: 1.65;
  }

  input:focus, textarea:focus {
    border-color: #86efac;
    box-shadow: 0 0 0 4px rgba(34,197,94,.10);
  }

  input::placeholder, textarea::placeholder { color: #a1aab8; }

  .notice {
    margin-top: 18px;
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    font-size: 13px;
    line-height: 1.5;
  }

  .notice-error {
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #be123c;
  }

  .notice-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #15803d;
  }

  .form-footer {
    margin-top: 25px;
    padding-top: 22px;
    border-top: 1px solid #eef2f7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .form-footer p {
    max-width: 450px;
    margin: 0;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.6;
  }

  .submit-button {
    flex: 0 0 auto;
    min-height: 46px;
    border: 0;
    border-radius: 12px;
    padding: 0 18px;
    background: #111827;
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    transition: .2s ease;
  }

  .submit-button:hover:not(:disabled) {
    background: #1f2937;
    transform: translateY(-1px);
  }

  .submit-button:disabled { opacity: .65; cursor: wait; }

  .button-spinner, .loader-ring {
    border: 2px solid rgba(255,255,255,.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }

  .button-spinner { width: 15px; height: 15px; }

  .loading-overlay {
    min-height: 100vh;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 14px;
    color: #64748b;
    font-size: 13px;
    font-weight: 700;
  }

  .loader-ring {
    width: 30px;
    height: 30px;
    border: 3px solid #dbeafe;
    border-top-color: #22c55e;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 760px) {
    .suggestions-shell { width: min(100% - 24px, 620px); padding-top: 12px; }
    .topbar { grid-template-columns: auto 1fr; }
    .brand { justify-self: center; }
    .account-chip { display: none; }
    .hero { margin-top: 48px; }
    .hero h1 { font-size: 37px; }
    .hero p { font-size: 14px; }
    .card { padding: 20px; border-radius: 18px; }
    .card-heading { display: block; }
    .secure-badge { display: inline-flex; margin-top: 12px; }
    .type-grid { grid-template-columns: repeat(2, 1fr); }
    .form-footer { align-items: stretch; flex-direction: column; }
    .submit-button { justify-content: center; }
  }

  @media (max-width: 430px) {
    .type-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .type-option { min-height: 80px; padding: 11px; }
  }
`;
