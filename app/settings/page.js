"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Settings() {
  const router = useRouter();

  // =====================================================
  // STATE
  // =====================================================

  const [dark, setDark] = useState(false);

  const [groupChatsEnabled, setGroupChatsEnabled] =
    useState(false);

  const [businessId, setBusinessId] =
    useState(null);

  const [loadingBusiness, setLoadingBusiness] =
    useState(true);

  const [savingGroupChats, setSavingGroupChats] =
    useState(false);

  // =====================================================
  // LOAD BUSINESS ID
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadBusinessId = async () => {
      try {
        setLoadingBusiness(true);

        /*
         * -------------------------------------------------
         * 1. Check URL
         *
         * Example:
         *
         * /settings?businessId=223e4e9d-73a7-4d1f-aa79-34621d1eff30
         * -------------------------------------------------
         */

        const params = new URLSearchParams(
          window.location.search
        );

        const urlBusinessId =
          params.get("businessId");

        /*
         * -------------------------------------------------
         * 2. Get authenticated Supabase session
         * -------------------------------------------------
         */

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "[Settings] Session error:",
            sessionError
          );
        }

        /*
         * -------------------------------------------------
         * 3. Resolve business from authenticated user
         *
         * Supabase user_id identifies the account.
         * business_id identifies the tenant/workspace.
         * -------------------------------------------------
         */

        if (session?.user?.id) {
          const {
            data,
            error,
          } = await supabase
            .from("businesses")
            .select("business_id")
            .eq(
              "user_id",
              session.user.id
            )
            .maybeSingle();

          if (error) {
            console.error(
              "[Settings] Business lookup error:",
              error
            );
          }

          if (data?.business_id) {
            const activeBusinessId =
              data.business_id;

            if (mounted) {
              setBusinessId(
                activeBusinessId
              );
            }

            localStorage.setItem(
              "business_id",
              activeBusinessId
            );

            if (mounted) {
              setLoadingBusiness(false);
            }

            return;
          }
        }

        /*
         * -------------------------------------------------
         * 4. URL fallback
         * -------------------------------------------------
         */

        if (urlBusinessId) {
          if (mounted) {
            setBusinessId(
              urlBusinessId
            );
          }

          localStorage.setItem(
            "business_id",
            urlBusinessId
          );

          if (mounted) {
            setLoadingBusiness(false);
          }

          return;
        }

        /*
         * -------------------------------------------------
         * 5. localStorage fallback
         * -------------------------------------------------
         */

        const storedBusinessId =
          localStorage.getItem(
            "business_id"
          );

        if (storedBusinessId) {
          if (mounted) {
            setBusinessId(
              storedBusinessId
            );
          }

          if (mounted) {
            setLoadingBusiness(false);
          }

          return;
        }

        /*
         * -------------------------------------------------
         * No business found
         * -------------------------------------------------
         */

        console.error(
          "[Settings] Unable to determine active business."
        );

        if (mounted) {
          setLoadingBusiness(false);
        }
      } catch (error) {
        console.error(
          "[Settings] Business resolution error:",
          error
        );

        if (mounted) {
          setLoadingBusiness(false);
        }
      }
    };

    loadBusinessId();

    return () => {
      mounted = false;
    };
  }, []);

  // =====================================================
  // LOAD SAVED THEME GLOBALLY
  // =====================================================

  useEffect(() => {
    const savedTheme =
      localStorage.getItem("theme");

    if (savedTheme === "dark") {
      setDark(true);

      document.documentElement.classList.add(
        "dark"
      );

      document.body.style.background =
        "#020617";

      document.body.style.color =
        "white";
    } else {
      setDark(false);

      document.documentElement.classList.remove(
        "dark"
      );

      document.body.style.background =
        "#ffffff";

      document.body.style.color =
        "black";
    }
  }, []);

  // =====================================================
  // LOAD GROUP CHAT SETTING
  // =====================================================

  useEffect(() => {
    if (!businessId) {
      return;
    }

    let mounted = true;

    const loadGroupChatSetting = async () => {
      try {
        /*
         * IMPORTANT:
         *
         * We use business_id here.
         *
         * This prevents one business from reading
         * another business's settings.
         */

        const {
          data,
          error,
        } = await supabase
          .from("businesses")
          .select(
            "business_id, group_chat_enabled"
          )
          .eq(
            "business_id",
            businessId
          )
          .maybeSingle();

        console.log(
          "[Settings] Active Business:",
          data
        );

        console.log(
          "[Settings] Business ID:",
          businessId
        );

        console.log(
          "[Settings] Group Chat Load Error:",
          error
        );

        if (error) {
          console.error(
            "[Settings] Group chat load error:",
            error
          );

          return;
        }

        if (
          data &&
          mounted
        ) {
          setGroupChatsEnabled(
            !!data.group_chat_enabled
          );
        }
      } catch (error) {
        console.error(
          "[Settings] Load Group Chat Error:",
          error
        );
      }
    };

    loadGroupChatSetting();

    return () => {
      mounted = false;
    };
  }, [businessId]);

  // =====================================================
  // GLOBAL DARK MODE TOGGLE
  // =====================================================

  const toggleDark = () => {
    const newMode = !dark;

    setDark(newMode);

    if (newMode) {
      document.documentElement.classList.add(
        "dark"
      );

      localStorage.setItem(
        "theme",
        "dark"
      );

      document.body.style.background =
        "#020617";

      document.body.style.color =
        "white";
    } else {
      document.documentElement.classList.remove(
        "dark"
      );

      localStorage.setItem(
        "theme",
        "light"
      );

      document.body.style.background =
        "#ffffff";

      document.body.style.color =
        "black";
    }

    /*
     * Force other components to notice
     * the theme change.
     */

    window.dispatchEvent(
      new Event("storage")
    );
  };

  // =====================================================
  // NAVIGATION HELPERS
  // =====================================================

  const getBusinessQuery = () => {
    if (!businessId) {
      return "";
    }

    return `?businessId=${encodeURIComponent(
      businessId
    )}`;
  };

  const goToChannels = () => {
    if (businessId) {
      router.push(
        `/channels?businessId=${encodeURIComponent(
          businessId
        )}`
      );
    } else {
      router.push("/channels");
    }
  };

  const goToProfile = () => {
    if (businessId) {
      router.push(
        `/profile?businessId=${encodeURIComponent(
          businessId
        )}`
      );
    } else {
      router.push("/profile");
    }
  };

  const openAIAssistant = () => {
    const baseUrl =
      "/system-support";
    const assistantUrl =
      businessId
        ? `${baseUrl}?businessId=${encodeURIComponent(
            businessId
          )}`
        : baseUrl;

    window.open(
      assistantUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =====================================================
  // RESET ACCOUNT
  // =====================================================

  const handleResetAccount = () => {
    const confirmed =
      window.confirm(
        "Reset your account and clear all data?"
      );

    if (!confirmed) {
      return;
    }

    /*
     * This intentionally clears local application
     * state because the user explicitly requested
     * an account reset.
     */

    localStorage.clear();

    router.push("/signup");
  };

  // =====================================================
  // TOGGLE GROUP CHATS
  // =====================================================

  const toggleGroupChats = async () => {
    if (!businessId) {
      alert(
        "No active business found."
      );

      return;
    }

    if (savingGroupChats) {
      return;
    }

    const newValue =
      !groupChatsEnabled;

    /*
     * Optimistic UI update.
     */

    setGroupChatsEnabled(
      newValue
    );

    try {
      setSavingGroupChats(true);

      console.log(
        "[Settings] Saving Group Chat:"
      );

      console.log(
        "Business ID:",
        businessId
      );

      console.log(
        "New Value:",
        newValue
      );

      /*
       * IMPORTANT:
       *
       * Save strictly using business_id.
       */

      const {
        data,
        error,
      } = await supabase
        .from("businesses")
        .update({
          group_chat_enabled:
            newValue,
        })
        .eq(
          "business_id",
          businessId
        )
        .select(
          "business_id, group_chat_enabled"
        );

      console.log(
        "[Settings] Saved Data:",
        data
      );

      console.log(
        "[Settings] Save Error:",
        error
      );

      if (error) {
        console.error(
          "[Settings] Failed to save group chat:",
          error
        );

        /*
         * Roll back UI if database save failed.
         */

        setGroupChatsEnabled(
          !newValue
        );

        alert(
          "Failed to save setting."
        );

        return;
      }

      if (
        !data ||
        data.length === 0
      ) {
        console.error(
          "[Settings] No business row was updated."
        );

        setGroupChatsEnabled(
          !newValue
        );

        alert(
          "The active business could not be updated."
        );

        return;
      }

      console.log(
        "[Settings] Group Chat successfully saved for Business:",
        data[0].business_id
      );

      console.log(
        "[Settings] Database Value:",
        data[0].group_chat_enabled
      );
    } catch (error) {
      console.error(
        "[Settings] Toggle Error:",
        error
      );

      setGroupChatsEnabled(
        !newValue
      );

      alert(
        "Failed to save setting."
      );
    } finally {
      setSavingGroupChats(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-7 py-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-8 w-8 rounded-full border-2 border-white/10 border-t-green-400 animate-spin" />

          <p className="text-sm font-bold">
            Loading Settings...
          </p>

          <p className="mt-1 text-xs text-white/40">
            Resolving your business workspace
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div
      className={`
        min-h-screen
        transition-all
        duration-300
        px-4
        py-6
        ${
          dark
            ? "bg-[#020617] text-white"
            : "bg-gray-100 text-black"
        }
      `}
    >
      <div className="w-full max-w-2xl mx-auto space-y-4">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-start justify-between gap-4">

          <div>
            <p
              className={`
                text-[10px]
                uppercase
                tracking-[0.25em]
                font-black
                mb-1
                ${
                  dark
                    ? "text-green-400"
                    : "text-green-600"
                }
              `}
            >
              Workspace
            </p>

            <h1
              className={`
                text-3xl
                font-black
                ${
                  dark
                    ? "text-white"
                    : "text-black"
                }
              `}
            >
              ⚙️ Settings
            </h1>

            <p
              className={`
                text-sm
                mt-1
                ${
                  dark
                    ? "text-gray-400"
                    : "text-gray-500"
                }
              `}
            >
              Manage your business workspace and preferences
            </p>
          </div>

          {/* BUSINESS ID */}

          <div
            className="
              shrink-0
              rounded-2xl
              border
              border-green-400/20
              bg-green-400/10
              px-3
              py-2
              text-right
            "
          >
            <p className="text-[8px] uppercase tracking-wider text-green-300/60">
              Business ID
            </p>

            <p className="mt-1 max-w-[150px] break-all font-mono text-[9px] font-bold text-green-300">
              {businessId ||
                "Unavailable"}
            </p>
          </div>

        </div>

        {/* =================================================
            ACTIVE BUSINESS
        ================================================= */}

        <div
          className={`
            rounded-2xl
            border
            p-4
            ${
              dark
                ? "bg-white/[0.035] border-white/10"
                : "bg-white border-gray-200"
            }
          `}
        >
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-400/10 border border-green-400/20">
              <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
            </div>

            <div className="min-w-0">
              <p
                className={`
                  text-xs
                  font-black
                  ${
                    dark
                      ? "text-white"
                      : "text-gray-900"
                  }
                `}
              >
                Active Business Workspace
              </p>

              <p
                className={`
                  mt-1
                  font-mono
                  text-[10px]
                  break-all
                  ${
                    dark
                      ? "text-green-300"
                      : "text-green-700"
                  }
                `}
              >
                {businessId ||
                  "No Business ID detected"}
              </p>
            </div>

          </div>
        </div>

        {/* =================================================
            PROFILE
        ================================================= */}

        <Card
          dark={dark}
          onClick={goToProfile}
        >
          <Title
            dark={dark}
            title="Profile"
            desc="Manage your business details"
          />
        </Card>

        {/* =================================================
            DARK MODE
        ================================================= */}

        <Card dark={dark}>
          <div className="flex justify-between items-center gap-4">

            <Title
              dark={dark}
              title="Dark Mode"
              desc="Switch Sodah workspace appearance"
            />

            <div
              onClick={toggleDark}
              role="button"
              tabIndex={0}
              className={`
                w-14
                h-7
                shrink-0
                flex
                items-center
                rounded-full
                p-1
                cursor-pointer
                transition-all
                duration-300
                ${
                  dark
                    ? "bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-500/30"
                    : "bg-gray-300"
                }
              `}
            >
              <div
                className={`
                  bg-white
                  w-5
                  h-5
                  rounded-full
                  shadow-md
                  transform
                  transition
                  duration-300
                  ${
                    dark
                      ? "translate-x-7"
                      : "translate-x-0"
                  }
                `}
              />
            </div>

          </div>
        </Card>

        {/* =================================================
            SYSTEM SUPPORT
        ================================================= */}

        <Card
          dark={dark}
          onClick={() =>
            window.open(
              "https://wa.me/971544027954",
              "_blank",
              "noopener,noreferrer"
            )
          }
        >
          <Title
            dark={dark}
            title="System Support"
            desc="Chat with us on WhatsApp"
          />
        </Card>

        {/* =================================================
            AI ASSISTANT
        ================================================= */}

        <Card
          dark={dark}
          onClick={openAIAssistant}
        >
          <Title
            dark={dark}
            title="AI Assistant"
            desc={
              businessId
                ? "Ask anything about your business workspace"
                : "Ask anything about the system"
            }
          />
        </Card>

        {/* =================================================
            GROUP CHAT + RESET
        ================================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* GROUP CHAT */}

          <div
            className={`
              p-5
              rounded-2xl
              transition-all
              duration-300
              border
              ${
                dark
                  ? "bg-white/5 border-white/10"
                  : "bg-white border-gray-200"
              }
            `}
          >
            <div className="flex justify-between items-start gap-4">

              <div>
                <h3
                  className={`
                    font-semibold
                    ${
                      dark
                        ? "text-green-400"
                        : "text-green-600"
                    }
                  `}
                >
                  WhatsApp Group Chats
                </h3>

                <p
                  className={`
                    text-sm
                    mt-1
                    ${
                      dark
                        ? "text-gray-400"
                        : "text-gray-500"
                    }
                  `}
                >
                  Enable or disable AI replies in groups
                </p>

                {businessId && (
                  <p className="mt-2 font-mono text-[8px] text-white/25 break-all">
                    Business: {businessId}
                  </p>
                )}
              </div>

              <div
                onClick={
                  toggleGroupChats
                }
                role="button"
                tabIndex={0}
                className={`
                  w-14
                  h-7
                  shrink-0
                  flex
                  items-center
                  rounded-full
                  p-1
                  cursor-pointer
                  transition-all
                  duration-300
                  ${
                    groupChatsEnabled
                      ? "bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-500/20"
                      : "bg-gray-400"
                  }
                  ${
                    savingGroupChats
                      ? "opacity-60"
                      : ""
                  }
                `}
              >
                <div
                  className={`
                    bg-white
                    w-5
                    h-5
                    rounded-full
                    shadow-md
                    transform
                    transition-all
                    duration-300
                    ${
                      groupChatsEnabled
                        ? "translate-x-7"
                        : "translate-x-0"
                    }
                  `}
                />
              </div>

            </div>

            {savingGroupChats && (
              <p className="mt-3 text-[10px] text-green-400">
                Saving workspace setting...
              </p>
            )}
          </div>

          {/* RESET ACCOUNT */}

          <div
            onClick={
              handleResetAccount
            }
            className={`
              p-5
              rounded-2xl
              cursor-pointer
              transition-all
              duration-300
              border
              hover:scale-[1.01]
              ${
                dark
                  ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15"
                  : "bg-red-50 border-red-300 hover:bg-red-100"
              }
            `}
          >
            <h3 className="text-red-500 font-semibold">
              Reset Account
            </h3>

            <p
              className={`
                text-sm
                mt-1
                ${
                  dark
                    ? "text-gray-400"
                    : "text-gray-500"
                }
              `}
            >
              Clear local account data and start again
            </p>
          </div>

        </div>

        {/* =================================================
            WORKSPACE STATUS
        ================================================= */}

        <div
          className={`
            rounded-2xl
            border
            p-5
            ${
              dark
                ? "bg-white/[0.025] border-white/10"
                : "bg-white border-gray-200"
            }
          `}
        >
          <div className="flex items-center justify-between gap-4">

            <div>
              <p
                className={`
                  text-xs
                  font-black
                  ${
                    dark
                      ? "text-white"
                      : "text-gray-900"
                  }
                `}
              >
                Workspace Security
              </p>

              <p
                className={`
                  mt-1
                  text-[11px]
                  ${
                    dark
                      ? "text-white/40"
                      : "text-gray-500"
                  }
                `}
              >
                Settings are associated with the active business workspace.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />

              <span className="text-[9px] uppercase tracking-wider font-bold text-green-400">
                Active
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* =================================================
          BACK BUTTON
      ================================================= */}

      <button
        type="button"
        onClick={goToChannels}
        aria-label="Back to Channels"
        className="
          fixed
          bottom-6
          left-6
          z-50
          w-14
          h-14
          rounded-2xl
          bg-white/10
          border
          border-white/10
          backdrop-blur-xl
          flex
          items-center
          justify-center
          text-white
          text-2xl
          shadow-lg
          hover:scale-105
          hover:bg-white/15
          transition-all
          duration-300
        "
      >
        ←
      </button>

    </div>
  );
}

// =====================================================
// CARD
// =====================================================

function Card({
  children,
  onClick,
  dark,
}) {
  return (
    <div
      onClick={onClick}
      className={`
        p-5
        rounded-2xl
        transition-all
        duration-300
        ${
          onClick
            ? "cursor-pointer hover:scale-[1.01]"
            : ""
        }
        hover:shadow-xl
        ${
          dark
            ? "bg-white/5 border border-white/10 backdrop-blur-xl hover:border-green-400/30"
            : "bg-white border border-gray-200 hover:border-green-400/40"
        }
      `}
    >
      {children}
    </div>
  );
}

// =====================================================
// TITLE
// =====================================================

function Title({
  title,
  desc,
  dark,
}) {
  return (
    <div>
      <h3
        className={`
          font-semibold
          ${
            dark
              ? "text-white"
              : "text-black"
          }
        `}
      >
        {title}
      </h3>

      <p
        className={`
          text-sm
          mt-1
          ${
            dark
              ? "text-gray-400"
              : "text-gray-500"
          }
        `}
      >
        {desc}
      </p>
    </div>
  );
}