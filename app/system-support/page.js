"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SystemSupportPage() {
  const router = useRouter();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      role: "assistant",
      text: "👋 Welcome to Sodah.io.",
    },
    {
      id: "welcome-2",
      role: "assistant",
      text: "I am your personal Sodah Support assistant. I can help you understand WhatsApp automation, campaigns, leads, appointments, analytics, settings, subscriptions and other Sodah.io features.",
    },
    {
      id: "welcome-3",
      role: "assistant",
      text: "How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [userId, setUserId] = useState("");

  /*
   * ============================================================
   * OPTIONAL USER / BUSINESS CONTEXT
   * ============================================================
   *
   * System Support works WITHOUT login.
   *
   * If a user is logged in, we optionally load the business name.
   */

  useEffect(() => {
    let mounted = true;

    const loadUserContext = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        const currentUserId = session?.user?.id || "";

        setUserId(currentUserId);

        if (!currentUserId) {
          return;
        }

        const { data, error: businessError } =
          await supabase
            .from("businesses")
            .select("business_name")
            .eq("user_id", currentUserId)
            .maybeSingle();

        if (!mounted) return;

        if (businessError) {
          console.warn(
            "[System Support] Optional business context unavailable:",
            businessError.message
          );

          return;
        }

        if (data?.business_name) {
          setBusinessName(data.business_name);
        }
      } catch (err) {
        console.warn(
          "[System Support] Guest mode:",
          err
        );
      }
    };

    loadUserContext();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================================================
   * AUTO SCROLL
   * ============================================================
   */

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [messages, loading]);

  /*
   * ============================================================
   * CLOSE
   * ============================================================
   */

  const closeSupport = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1
    ) {
      window.history.back();
      return;
    }

    router.push("/channels");
  };

  /*
   * ============================================================
   * SEND MESSAGE
   * ============================================================
   */

  const sendMessage = async (presetMessage = null) => {
    const text = String(
      presetMessage !== null
        ? presetMessage
        : input
    ).trim();

    if (!text || loading) {
      return;
    }

    setError("");

    setMessages((previous) => [
      ...previous,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/system-support",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: text,
            user_id: userId || null,
            business_name: businessName || null,
          }),
        }
      );

      const result =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to connect to Sodah Support."
        );
      }

      const reply =
        result?.reply ||
        result?.message ||
        result?.response ||
        "I'm sorry, I could not process that request.";

      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: String(reply),
        },
      ]);
    } catch (err) {
      console.error(
        "[System Support] Message error:",
        err
      );

      setError(
        err?.message ||
          "Unable to connect to Sodah Support."
      );
    } finally {
      setLoading(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  /*
   * ============================================================
   * ENTER KEY
   * ============================================================
   */

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  /*
   * ============================================================
   * QUICK QUESTIONS
   * ============================================================
   */

  const quickQuestions = [
    "How does Sodah work?",
    "How do I connect WhatsApp?",
    "How do campaigns work?",
    "How do I update my business?",
  ];

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <main className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-3 py-4 backdrop-blur-md sm:px-5 sm:py-6">

      {/* ======================================================
          SUPPORT POPUP
      ====================================================== */}

      <section className="relative flex h-[94vh] max-h-[960px] w-full max-w-[1200px] flex-col overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[#03120f] shadow-[0_35px_120px_rgba(0,0,0,0.65)]">

        {/* ====================================================
            TOP BAR
        ==================================================== */}

        <header className="z-30 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#061b16] px-4 py-4 sm:px-6 md:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-sm font-black text-[#02100d]">
              AI
            </div>

            <div className="min-w-0">

              <h1 className="text-base font-black text-white sm:text-lg">
                Sodah<span className="text-cyan-400">.io</span>
              </h1>

              <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-white/35 sm:text-[9px]">
                System Support
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 sm:flex">

              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
                Support Active
              </span>

            </div>

            {/* CLOSE */}

            <button
              type="button"
              onClick={closeSupport}
              aria-label="Close support"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-2xl font-light text-white/75 transition hover:border-red-400/40 hover:bg-red-400/10 hover:text-white active:scale-95"
            >
              ×
            </button>

          </div>

        </header>

        {/* ====================================================
            MIDDLE
            ONLY THIS AREA SCROLLS
        ==================================================== */}

        <div className="relative min-h-0 flex-1 overflow-hidden bg-gradient-to-br from-[#dff8ed] via-[#eafaf4] to-[#d2f2e6]">

          <div className="pointer-events-none absolute inset-0">

            <div className="absolute left-[-100px] top-[-100px] h-[350px] w-[350px] rounded-full bg-emerald-300/20 blur-[120px]" />

            <div className="absolute bottom-[-150px] right-[-100px] h-[400px] w-[400px] rounded-full bg-cyan-300/20 blur-[120px]" />

          </div>

          <div className="relative h-full overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 sm:py-8 md:px-10">

            {/* ==================================================
                WORKSPACE
            ================================================== */}

            <div className="mx-auto mb-8 flex max-w-[1050px] items-center justify-between rounded-2xl border border-emerald-900/10 bg-white/50 px-4 py-3 shadow-sm backdrop-blur">

              <div className="flex min-w-0 items-center gap-2">

                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  Support Workspace
                </span>

                {businessName && (
                  <>
                    <span className="text-emerald-900/20">
                      /
                    </span>

                    <span className="truncate text-[10px] font-semibold text-slate-600">
                      {businessName}
                    </span>
                  </>
                )}

              </div>

              <span className="hidden text-[8px] font-bold uppercase tracking-wider text-emerald-800/30 md:block">
                Sodah.io System Support
              </span>

            </div>

            {/* ==================================================
                MESSAGES
            ================================================== */}

            <div className="mx-auto flex max-w-[1050px] flex-col gap-6">

              {messages.map((message) => {
                const isUser =
                  message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={`flex w-full ${
                      isUser
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    <div
                      className={`flex max-w-[94%] items-end gap-2 sm:max-w-[86%] md:max-w-[76%] ${
                        isUser
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >

                      {/* AVATAR */}

                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[8px] font-black ${
                          isUser
                            ? "bg-[#073c35] text-cyan-200"
                            : "border border-emerald-300/40 bg-emerald-400 text-[#06342c]"
                        }`}
                      >
                        {isUser
                          ? "YOU"
                          : "AI"}
                      </div>

                      {/* MESSAGE BUBBLE */}

                      <div
                        className={`min-w-0 rounded-2xl px-5 py-3.5 text-sm leading-6 shadow-sm ${
                          isUser
                            ? "rounded-br-md bg-gradient-to-r from-[#075e54] to-[#087f73] text-white"
                            : "rounded-bl-md border border-slate-900/10 bg-white text-slate-700"
                        }`}
                      >

                        <div className="whitespace-pre-wrap break-words">
                          {message.text}
                        </div>

                        <div
                          className={`mt-1 text-[8px] font-semibold ${
                            isUser
                              ? "text-white/45"
                              : "text-slate-400"
                          }`}
                        >
                          {isUser
                            ? "YOU"
                            : "SODAH AI"}
                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}

              {/* ==================================================
                  TYPING
              ================================================== */}

              {loading && (
                <div className="flex w-full justify-start">

                  <div className="flex items-end gap-2">

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-400 text-[8px] font-black text-[#06342c]">
                      AI
                    </div>

                    <div className="rounded-2xl rounded-bl-md border border-slate-900/10 bg-white px-5 py-3 shadow-sm">

                      <div className="flex items-center gap-1.5">

                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" />

                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500"
                          style={{
                            animationDelay: "120ms",
                          }}
                        />

                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500"
                          style={{
                            animationDelay: "240ms",
                          }}
                        />

                      </div>

                    </div>

                  </div>

                </div>
              )}

              <div ref={messagesEndRef} />

            </div>

          </div>

        </div>

        {/* ====================================================
            BOTTOM BAR
        ==================================================== */}

        <footer className="z-30 shrink-0 border-t border-emerald-400/10 bg-[#061b16] px-4 py-4 sm:px-6 md:px-8">

          {/* QUICK QUESTIONS */}

          <div className="mx-auto mb-3 flex max-w-[1050px] gap-2 overflow-x-auto pb-1">

            {quickQuestions.map(
              (question) => (
                <button
                  key={question}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    sendMessage(
                      question
                    )
                  }
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[9px] font-semibold text-white/60 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {question}
                </button>
              )
            )}

          </div>

          {/* ERROR */}

          {error && (
            <div className="mx-auto mb-3 flex max-w-[1050px] items-center justify-between rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-[10px] text-red-300">

              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                aria-label="Close error"
                className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </button>

            </div>
          )}

          {/* INPUT */}

          <div className="mx-auto flex max-w-[1050px] items-end gap-2 rounded-2xl border border-emerald-400/25 bg-[#041610] p-1.5 shadow-inner">

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              placeholder="Tell Sodah Support how we can help..."
              aria-label="Support message"
              className="min-h-[48px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 disabled:opacity-50"
            />

            <button
              type="button"
              onClick={() =>
                sendMessage()
              }
              disabled={
                loading ||
                !input.trim()
              }
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 text-[11px] font-black text-[#03211a] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? "..."
                : "Send →"}
            </button>

          </div>

          {/* FOOTER */}

          <div className="mt-3 text-center text-[8px] font-bold uppercase tracking-[0.2em] text-white/20">
            Sodah AI&nbsp;&nbsp;•&nbsp;&nbsp;System Support
          </div>

        </footer>

      </section>

      {/* ======================================================
          MOBILE / ANIMATION CSS
      ====================================================== */}

      <style jsx global>{`
        section {
          animation: supportModalIn 220ms ease-out;
        }

        @keyframes supportModalIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 640px) {
          section {
            height: calc(100vh - 24px);
            max-height: none;
            border-radius: 20px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          section {
            animation: none;
          }
        }
      `}</style>

    </main>
  );
}