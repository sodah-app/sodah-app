"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function BusinessAIContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [businessId, setBusinessId] = useState("");
  const [business, setBusiness] = useState(null);

  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ============================================================
  // AUTO SCROLL CONVERSATION ONLY
  // ============================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending]);

  // ============================================================
  // LOAD ACTIVE BUSINESS
  // ============================================================

  const loadBusiness = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message ||
            "Unable to load your login session."
        );
      }

      if (!session?.user?.id) {
        throw new Error(
          "Your login session is missing. Please log in again."
        );
      }

      const userId = session.user.id;

      const { data, error: businessError } =
        await supabase
          .from("businesses")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

      if (businessError) {
        console.error(
          "BUSINESS LOAD ERROR:",
          businessError
        );

        throw new Error(
          "Unable to load your business workspace."
        );
      }

      if (!data?.business_id) {
        throw new Error(
          "No Sodah business is linked to this account."
        );
      }

      const resolvedBusinessId =
        data.business_id;

      setBusinessId(
        resolvedBusinessId
      );

      setBusiness(data);

      // ----------------------------------------------------------
      // Preserve business_id in the URL
      // ----------------------------------------------------------

      const urlBusinessId =
        searchParams.get(
          "business_id"
        );

      if (
        urlBusinessId !==
        String(resolvedBusinessId)
      ) {
        const params =
          new URLSearchParams(
            searchParams.toString()
          );

        params.set(
          "business_id",
          String(resolvedBusinessId)
        );

        window.history.replaceState(
          null,
          "",
          `/dashboard/business-ai?${params.toString()}`
        );
      }

      // ----------------------------------------------------------
      // Initial conversation
      // ----------------------------------------------------------

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "👋 Welcome to Sodah AI.",
        },
        {
          id: "welcome-info",
          role: "assistant",
          content:
            "I can help update your business profile, services, packages, promotions, working hours, contact information and other business settings.",
        },
        {
          id: "welcome-question",
          role: "assistant",
          content:
            "What would you like to change today?",
        },
      ]);
    } catch (err) {
      console.error(
        "BUSINESS AI LOAD ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to load Business AI."
      );
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || sending) {
      return;
    }

    setError("");

    // ----------------------------------------------------------
    // Get current Supabase session
    // ----------------------------------------------------------

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setError(
        sessionError.message ||
          "Unable to verify your session."
      );

      return;
    }

    if (!session?.access_token) {
      setError(
        "Your login session has expired. Please log in again."
      );

      return;
    }

    // ----------------------------------------------------------
    // Add user message immediately
    // ----------------------------------------------------------

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setInput("");
    setSending(true);

    try {
      const response = await fetch(
        "/api/business-update",
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            message: text,

            business_id:
              businessId || "",
          }),
        }
      );

      let result = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            `Business update failed (${response.status}).`
        );
      }

      // --------------------------------------------------------
      // Add AI response
      // --------------------------------------------------------

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,

          role: "assistant",

          content:
            result?.message ||
            "Your business information has been updated successfully.",

          success:
            result?.updated === true,
        },
      ]);

      // --------------------------------------------------------
      // Update local business state
      // --------------------------------------------------------

      if (result?.business) {
        setBusiness(
          result.business
        );
      }
    } catch (err) {
      console.error(
        "BUSINESS UPDATE ERROR:",
        err
      );

      const errorMessage =
        err?.message ||
        "I couldn't complete that update. Please try again.";

      setError(errorMessage);

      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,

          role: "assistant",

          content:
            "I couldn't complete that update. Please try again.",

          error: true,
        },
      ]);
    } finally {
      setSending(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // ============================================================
  // ENTER KEY
  // ============================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  };

  // ============================================================
  // BACK TO CHANNELS
  // ============================================================

  const goBackToChannels = () => {
    if (businessId) {
      router.push(
        `/channels?business_id=${encodeURIComponent(
          businessId
        )}`
      );
    } else {
      router.push("/channels");
    }
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <main className="fixed inset-0 bg-[#020807] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 rounded-full border-2 border-emerald-400/20 border-t-emerald-400 animate-spin" />

          <h1 className="text-lg font-bold">
            Loading Sodah AI
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Loading your business workspace...
          </p>
        </div>
      </main>
    );
  }

  // ============================================================
  // ERROR SCREEN
  // ============================================================

  if (
    error &&
    !businessId
  ) {
    return (
      <main className="fixed inset-0 bg-[#020807] text-white flex items-center justify-center px-5">
        <div className="w-full max-w-md rounded-3xl border border-red-400/20 bg-red-400/[0.04] p-7 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10 text-red-300 text-xl">
            !
          </div>

          <h1 className="text-xl font-black">
            Business workspace unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/50">
            {error}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={loadBusiness}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 transition"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={
                goBackToChannels
              }
              className="flex-1 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-[#03100b] hover:bg-emerald-300 transition"
            >
              Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020807] text-white">
      {/* ========================================================
          BACKGROUND LAYERS
      ======================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-52 left-1/2 h-[550px] w-[750px] -translate-x-1/2 rounded-full bg-emerald-500/[0.055] blur-[130px]" />

        <div className="absolute bottom-[-150px] right-[-100px] h-[550px] w-[550px] rounded-full bg-cyan-500/[0.045] blur-[130px]" />

        <div className="absolute top-[40%] left-[-180px] h-[450px] w-[450px] rounded-full bg-green-500/[0.025] blur-[120px]" />
      </div>

      {/* ========================================================
          FIXED TOP BAR
      ======================================================== */}

      <header
        className="
          fixed
          top-0
          left-0
          right-0
          z-50
          h-[72px]
          border-b
          border-emerald-400/[0.08]
          bg-[#06120f]/95
          backdrop-blur-2xl
          shadow-[0_8px_40px_rgba(0,0,0,0.35)]
        "
      >
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* LEFT */}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={
                goBackToChannels
              }
              aria-label="Back to Channels"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-white/[0.08]
                bg-white/[0.035]
                text-white/70
                transition
                hover:bg-white/[0.08]
                hover:text-white
              "
            >
              ←
            </button>

            <div>
              <div className="text-sm font-black tracking-tight">
                Sodah
                <span className="text-emerald-400">
                  .io
                </span>
              </div>

              <div className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Business AI
              </div>
            </div>
          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-2">
            {/* BUSINESS ID */}

            <div
              className="
                hidden
                sm:block
                rounded-xl
                border
                border-white/[0.08]
                bg-black/20
                px-3
                py-2
              "
            >
              <p className="text-[8px] uppercase tracking-[0.16em] text-white/30">
                Active Business
              </p>

              <p className="mt-0.5 max-w-[180px] truncate font-mono text-[10px] font-semibold text-emerald-300">
                {businessId}
              </p>
            </div>

            {/* WORKSPACE */}

            <div
              className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-emerald-400/10
                bg-emerald-400/[0.055]
                px-3
                py-2
              "
            >
              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-emerald-400
                  shadow-[0_0_12px_rgba(52,211,153,0.8)]
                "
              />

              <span className="hidden xs:block text-[9px] font-black uppercase tracking-[0.12em] text-emerald-300">
                Workspace Active
              </span>

              <span className="xs:hidden text-[9px] font-black text-emerald-300">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          MOBILE BUSINESS ID BAR
      ======================================================== */}

      <div
        className="
          fixed
          top-[72px]
          left-0
          right-0
          z-40
          sm:hidden
          border-b
          border-white/[0.05]
          bg-[#04100d]/95
          backdrop-blur-xl
        "
      >
        <div className="mx-auto flex h-9 items-center justify-center px-4">
          <span className="mr-2 text-[8px] uppercase tracking-[0.16em] text-white/25">
            Business
          </span>

          <span className="truncate font-mono text-[9px] font-semibold text-emerald-300">
            {businessId}
          </span>
        </div>
      </div>

      {/* ========================================================
          SCROLLABLE CHAT AREA
      ======================================================== */}

      <section
        className="
          absolute
          top-[72px]
          bottom-[104px]
          left-0
          right-0
          overflow-y-auto
          overscroll-contain
        "
      >
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <div className="space-y-5 py-8 sm:py-10">
            {messages.map(
              (message) => {
                const isUser =
                  message.role ===
                  "user";

                return (
                  <div
                    key={
                      message.id
                    }
                    className={`flex ${
                      isUser
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[90%] items-start gap-3 sm:max-w-[82%] ${
                        isUser
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >
                      {/* AVATAR */}

                      <div
                        className={`
                          mt-1
                          flex
                          h-8
                          w-8
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          border
                          text-[9px]
                          font-black
                          ${
                            isUser
                              ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          }
                        `}
                      >
                        {isUser
                          ? "YOU"
                          : "AI"}
                      </div>

                      {/* MESSAGE */}

                      <div
                        className={`
                          rounded-2xl
                          border
                          px-4
                          py-3
                          shadow-xl
                          ${
                            isUser
                              ? "border-cyan-400/20 bg-gradient-to-br from-cyan-400 to-emerald-400 text-[#02100c]"
                              : message.error
                              ? "border-red-400/20 bg-red-400/[0.06] text-red-200"
                              : "border-white/[0.08] bg-[#09120f]/90 text-white/80"
                          }
                        `}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {
                            message.content
                          }
                        </p>

                        {message.success && (
                          <div className="mt-3 border-t border-emerald-400/10 pt-2 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
                            ✓ Business
                            Updated
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}

            {/* ==================================================
                TYPING INDICATOR
            ================================================== */}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div
                    className="
                      mt-1
                      flex
                      h-8
                      w-8
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-emerald-400/20
                      bg-emerald-400/10
                      text-[9px]
                      font-black
                      text-emerald-300
                    "
                  >
                    AI
                  </div>

                  <div
                    className="
                      rounded-2xl
                      border
                      border-white/[0.08]
                      bg-[#09120f]/90
                      px-5
                      py-4
                    "
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.3s]" />

                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.15s]" />

                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </section>

      {/* ========================================================
          FIXED BOTTOM INPUT AREA
      ======================================================== */}

      <footer
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-50
          h-[104px]
          border-t
          border-cyan-400/[0.08]
          bg-[#06100f]/[0.98]
          backdrop-blur-2xl
          shadow-[0_-12px_45px_rgba(0,0,0,0.45)]
        "
      >
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center px-4 sm:px-6">
          {/* ERROR */}

          {error && (
            <div className="mb-2 rounded-lg border border-red-400/20 bg-red-400/[0.05] px-3 py-2 text-[10px] text-red-300">
              {error}
            </div>
          )}

          {/* INPUT */}

          <div
            className="
              rounded-2xl
              border
              border-cyan-400/[0.12]
              bg-[#081713]
              p-1.5
              shadow-[0_0_35px_rgba(0,0,0,0.3)]
              transition
              focus-within:border-emerald-400/30
              focus-within:shadow-[0_0_35px_rgba(16,185,129,0.06)]
            "
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                disabled={sending}
                rows={1}
                placeholder="Tell Sodah what you'd like to update..."
                className="
                  max-h-24
                  min-h-[42px]
                  flex-1
                  resize-none
                  bg-transparent
                  px-3
                  py-2.5
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-white/25
                  disabled:opacity-50
                "
              />

              <button
                type="button"
                onClick={
                  sendMessage
                }
                disabled={
                  sending ||
                  !input.trim()
                }
                className="
                  mb-0.5
                  rounded-xl
                  bg-gradient-to-r
                  from-emerald-400
                  via-cyan-400
                  to-blue-500
                  px-4
                  py-2.5
                  text-[11px]
                  font-black
                  text-[#03100b]
                  transition
                  hover:scale-[1.02]
                  hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]
                  disabled:cursor-not-allowed
                  disabled:opacity-30
                "
              >
                {sending
                  ? "Updating..."
                  : "Send →"}
              </button>
            </div>
          </div>

          {/* FOOTER STATUS */}

          <div className="mt-2 flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap text-[8px] uppercase tracking-[0.18em] text-white/20">
            <span>
              Sodah AI
            </span>

            <span>•</span>

            <span>
              Active Business
            </span>

            <span>•</span>

            <span className="font-mono normal-case tracking-normal text-white/25">
              {businessId}
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ============================================================
// PRODUCTION SUSPENSE WRAPPER
// ============================================================
//
// Next.js requires useSearchParams() to be rendered inside
// a Suspense boundary during production prerendering.
//

function BusinessAILoading() {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-[#020807] text-white">
      <div className="text-center">
        <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400" />
        <h1 className="text-lg font-bold">
          Loading Sodah AI
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Loading your business workspace...
        </p>
      </div>
    </main>
  );
}

export default function BusinessAI() {
  return (
    <Suspense fallback={<BusinessAILoading />}>
      <BusinessAIContent />
    </Suspense>
  );
}
