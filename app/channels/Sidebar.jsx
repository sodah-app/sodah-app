"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

/* =========================================================
   BRAND ICONS
========================================================= */

const WA =
  "https://cdn.simpleicons.org/whatsapp/25D366";

const GMAIL =
  "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png";

/* =========================================================
   ICON SYSTEM
========================================================= */

function Icon({
  name,
  className = "h-4 w-4",
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),

    inbox: (
      <>
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="2"
        />
        <path d="M3 13h4l2 3h6l2-3h4" />
      </>
    ),

    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </>
    ),

    campaign: (
      <>
        <path d="M3 11v2a2 2 0 0 0 2 2h2l4 5h2l-2-5h3l5 3V6l-5 3H7a2 2 0 0 0-2 2Z" />
        <path d="M19 9v6" />
      </>
    ),

    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    money: (
      <>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        />
        <circle cx="12" cy="12" r="3" />
        <path d="M7 9h.01M17 15h.01" />
      </>
    ),

    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    briefcase: (
      <>
        <rect
          x="3"
          y="7"
          width="18"
          height="13"
          rx="2"
        />
        <path d="M8 7V5h8v2M3 12h18" />
        <path d="M10 12v2h4v-2" />
      </>
    ),

    card: (
      <>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        />
        <path d="M3 10h18" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />

        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V22h-2.4v-.2a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.44 17a1.7 1.7 0 0 0-1.56-1.04H6.7v-2.4h.18A1.7 1.7 0 0 0 8.44 12a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.72 7.2V7h2.4v.2a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 12c.12.62.65 1.08 1.28 1.08h.18v2.4h-.18c-.63 0-1.16.46-1.28 1.08Z" />
      </>
    ),

    bulb: (
      <>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M8.5 15.5C7.5 14.7 7 13.5 7 12a5 5 0 1 1 10 0c0 1.5-.5 2.7-1.5 3.5-.6.5-1 1.1-1.2 1.5h-4.6c-.2-.4-.6-1-1.2-1.5Z" />
      </>
    ),

    mail: (
      <>
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
        />
        <path d="m3 7 9 6 9-6" />
      </>
    ),

    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),

    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.9.7-1.7 1.1-1.7 2.7" />
        <path d="M12 17h.01" />
      </>
    ),

    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v6" />
        <path d="M12 7h.01" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
      </>
    ),

    chevron: (
      <path d="m9 18 6-6-6-6" />
    ),

    whatsapp: (
      <>
        <path d="M20.5 11.5a8.5 8.5 0 0 1-12.5 7.4L4 20l1.1-3.8A8.5 8.5 0 1 1 20.5 11.5Z" />
        <path d="M9 8.5c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.7c.1.2.1.4-.1.6l-.6.7c.5 1 1.3 1.8 2.3 2.3l.7-.6c.2-.2.4-.2.6-.1l1.7.7c.3.1.4.3.4.5v.5c0 .3 0 .5-.4.7-.4.2-1.3.3-2.3-.1-1-.4-2-1-2.8-1.8-.8-.8-1.5-1.8-1.9-2.8-.4-1-.3-1.9-.1-2.3Z" />
      </>
    ),
  };

  return (
    <svg {...common}>
      {paths[name] || paths.info}
    </svg>
  );
}

/* =========================================================
   NAVIGATION GROUPS

   IMPORTANT:
   DO NOT REMOVE ITEMS.
   The first five are intentionally arranged in the
   requested order.
========================================================= */

const groups = [
  {
    label: "Workspace",
    items: [
      // Main page stays first.
      ["Welcome", "/channels", "home"],
      // Requested primary navigation order.
      ["Leads", "/dashboard", "users"],
      ["Analytics", "/analytics", "chart"],
    ],
  },

  {
    label: "WhatsApp",
    items: [
      ["Connect WhatsApp", "/connect-whatsapp/load", "whatsapp"],
      ["WhatsApp Campaign", "/whatsapp-campaign", "campaign"],
      ["WhatsApp History", "/whatsapp-campaign/history", "history"],
    ],
  },

  {
    // These business-operation tools sit between WhatsApp and Email.
    label: "Operations",
    items: [
      ["Timesheets", "/timesheet", "clock"],
      ["Cash Flow", "/cashflow", "money"],
    ],
  },

  {
    label: "Email AI",
    items: [
      ["Connect Email", "/email-ai", "gmail"],
      ["Email Campaign", "/email-ai/new-campaign", "mail"],
      ["Send Email", "/email-ai/new-campaign", "send"],
    ],
  },

  {
    label: "Business",
    items: [
      // Business Update comes immediately after the email tools.
      ["Business Update AI", "/dashboard/business-ai", "briefcase"],
      ["Subscription", "/subscription", "card", "PRO"],
      ["Suggestions", "/suggestions", "bulb"],
      ["Settings", "/settings", "settings"],
    ],
  },
];
/* =========================================================
   SIDEBAR
========================================================= */

export default function Sidebar({
  businessId = "",
  user = null,
  onSupport,
  onWhySodah,
  onAbout,
  onLogout,
  open: controlledOpen,
  setOpen: controlledSetOpen,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ======================================================
     SIDEBAR OPEN STATE

     Desktop:
     collapsed by default.

     Cursor enters:
     expanded.

     Cursor leaves:
     collapsed.

     Mobile:
     controlled state can be used.
  ====================================================== */

  const [
    internalOpen,
    setInternalOpen,
  ] = useState(false);

  const open =
    typeof controlledOpen === "boolean"
      ? controlledOpen
      : internalOpen;

  const setOpen =
    controlledSetOpen ||
    setInternalOpen;

/* ======================================================
     BUSINESS ID RESOLUTION

     The sidebar must never lose the tenant/business context.
     Priority:
       1. businessId prop
       2. user.businessId / user.business_id
       3. URL ?businessId=...
       4. URL ?business_id=...
       5. localStorage
       6. cookie
   ====================================================== */

  const [storedBusinessId, setStoredBusinessId] = useState("");

  useEffect(() => {
    try {
      const storageId =
        localStorage.getItem("business_id")?.trim() ||
        localStorage.getItem("businessId")?.trim() ||
        "";

      const cookieId =
        document.cookie
          .split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith("business_id="))
          ?.split("=")
          .slice(1)
          .join("=")
          .trim() || "";

      setStoredBusinessId(storageId || cookieId || "");
    } catch (error) {
      console.error("[Sidebar] Failed to load stored business ID:", error);
    }
  }, []);

  const resolvedBusinessId = useMemo(() => {
    const propId = String(businessId || "").trim();
    if (propId) return propId;

    const userId = String(
      user?.businessId ||
      user?.business_id ||
      user?.business?.id ||
      ""
    ).trim();
    if (userId) return userId;

    const urlId =
      searchParams?.get("businessId")?.trim() ||
      searchParams?.get("business_id")?.trim() ||
      "";
    if (urlId) return urlId;

    return storedBusinessId;
  }, [businessId, user, searchParams, storedBusinessId]);

  /* ======================================================
     KEEP BUSINESS ID IN LOCAL STORAGE
   ====================================================== */

  useEffect(() => {
    if (!resolvedBusinessId) return;

    try {
      localStorage.setItem("business_id", resolvedBusinessId);
      localStorage.setItem("businessId", resolvedBusinessId);
    } catch (error) {
      console.error("[Sidebar] Failed to save business ID:", error);
    }
  }, [resolvedBusinessId]);

  /* ======================================================
     GET BUSINESS ID
   ====================================================== */

  const getBusinessId = useCallback(() => {
    if (resolvedBusinessId) return resolvedBusinessId;

    try {
      return (
        localStorage.getItem("business_id")?.trim() ||
        localStorage.getItem("businessId")?.trim() ||
        ""
      );
    } catch (error) {
      console.error("[Sidebar] Failed to read business ID:", error);
      return "";
    }
  }, [resolvedBusinessId]);

  /* ======================================================
     ADD BUSINESS ID TO EVERY INTERNAL PAGE

     This is the central navigation function.

     Every sidebar page goes through here.
  ====================================================== */

  const withBusinessId = useCallback(
    (path) => {
      const activeBusinessId = getBusinessId();

      const url = new URL(
        path || "/channels",
        window.location.origin
      );

      /*
       * Every internal destination gets the same business context.
       * Existing query parameters such as ?info=about are preserved.
       */
      if (activeBusinessId) {
        url.searchParams.set("businessId", activeBusinessId);
      }

      return `${url.pathname}${url.search}${url.hash}`;
    },
    [getBusinessId]
  );

  /* ======================================================
     NAVIGATE

     Every sidebar navigation goes through this function.
  ====================================================== */

  const go = useCallback(
    (path) => {
      const destination =
        withBusinessId(path);

      console.log(
        "[Sidebar] Navigation:",
        destination
      );

      router.push(destination);
    },
    [
      router,
      withBusinessId,
    ]
  );

  /* ======================================================
     SUPPORT
  ====================================================== */

  const supportAction =
    onSupport ||
    (() => go("/system-support"));

  /* ======================================================
     WHY SODAH
  ====================================================== */

  const whyAction =
    onWhySodah ||
    (() =>
      go(
        "/channels?info=why-sodah"
      ));

  /* ======================================================
     ABOUT
  ====================================================== */

  const aboutAction =
    onAbout ||
    (() =>
      go(
        "/channels?info=about"
      ));

  /* ======================================================
     LOGOUT
  ====================================================== */

  const logoutAction =
    onLogout ||
    (() => {
      try {
        localStorage.removeItem(
          "user"
        );

        localStorage.removeItem(
          "token"
        );

        /*
         * Keep business_id untouched until navigation
         * completes if your login flow needs it.
         */
      } catch (error) {
        console.error(
          "[Sidebar] Logout cleanup failed:",
          error
        );
      }

      router.push("/");
    });

  /* ======================================================
     ACTIVE PAGE CHECK
  ====================================================== */

  const isActive = useCallback(
    (path) => {
      if (!pathname) {
        return false;
      }

      const cleanPath =
        path.split("?")[0];

      if (cleanPath === "/channels") {
        return (
          pathname === "/channels"
        );
      }

      return (
        pathname === cleanPath ||
        pathname.startsWith(
          `${cleanPath}/`
        )
      );
    },
    [pathname]
  );

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <>
      {/* ==================================================
          MOBILE BACKDROP
      ================================================== */}

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-[145] bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={() =>
            setOpen(false)
          }
        />
      )}

      {/* ==================================================
          SIDEBAR PROXIMITY OPEN RAIL

          Desktop:
          - No arrow click is required.
          - Moving the cursor into the left-edge hover rail
            immediately expands the sidebar.
          - Moving the cursor onto the sidebar itself also
            keeps it expanded.
      ================================================== */}

      <div
        aria-hidden="true"
        onMouseEnter={() => setOpen(true)}
        className="fixed left-0 top-0 z-[10001] hidden h-screen w-[18px] lg:block"
      />

      {/* ==================================================
          SIDEBAR

          z-[9999] deliberately keeps the sidebar above
          page content, modals and most application layers.
      ================================================== */}

      <aside
        onMouseEnter={() =>
          setOpen(true)
        }
        onMouseLeave={() =>
          setOpen(false)
        }
        onFocus={() =>
          setOpen(true)
        }
        className={`
          fixed
          left-0
          top-0
          z-[9999]
          h-screen
          overflow-hidden
          border-r
          border-white/[0.09]
          bg-[#04120e]/[0.98]
          shadow-[18px_0_70px_rgba(0,0,0,0.30)]
          backdrop-blur-2xl
          transition-[width,transform,box-shadow]
          duration-300
          ease-out

          ${
            open
              ? "w-[270px]"
              : "w-[64px]"
          }
        `}
      >

        {/* ==================================================
            SIDEBAR BACKGROUND
        ================================================== */}

        <div className="pointer-events-none absolute inset-0">

          <div className="absolute left-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-emerald-400/[0.11] blur-[100px]" />

          <div className="absolute bottom-[15%] right-[-140px] h-[330px] w-[330px] rounded-full bg-cyan-400/[0.05] blur-[110px]" />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_30%,rgba(0,0,0,0.12))]" />

        </div>

        {/* ==================================================
            INNER SIDEBAR
        ================================================== */}

        <div className="relative flex h-full flex-col">

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className={`
              flex
              h-[82px]
              shrink-0
              items-center
              border-b
              border-white/[0.08]

              ${
                open
                  ? "justify-between px-3"
                  : "justify-center"
              }
            `}
          >

            {open ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    go("/channels")
                  }
                  className="group flex items-center gap-2.5 rounded-2xl p-1.5 transition hover:bg-white/[0.05]"
                  title="Sodah.io"
                >

                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-gradient-to-br from-[#35e895] via-[#27c878] to-[#0ba8d7] text-xl font-black text-white shadow-[0_0_30px_rgba(37,211,102,0.22)]">

                    S

                    <span className="absolute inset-0 rounded-[15px] border border-white/20" />

                  </span>

                  <span className="whitespace-nowrap text-left">

                    <span className="block text-[18px] font-black tracking-tight text-white">

                      Sodah
                      <span className="text-cyan-300">
                        .io
                      </span>

                    </span>

                    <span className="block text-[8px] font-bold uppercase tracking-[2px] text-white/35">
                      AI Workspace
                    </span>

                  </span>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white/45 transition hover:border-emerald-400/20 hover:bg-emerald-400/[0.07] hover:text-white"
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >

                  <Icon
                    name="chevron"
                    className="h-4 w-4 rotate-180"
                  />

                </button>
              </>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#35e895] via-[#27c878] to-[#0ba8d7] text-lg font-black text-white shadow-[0_0_25px_rgba(37,211,102,0.20)]">
                S
              </div>
            )}

          </div>

          {/* =================================================
              BUSINESS INDICATOR
          ================================================= */}

          {open && (
            <div className="mx-3 mt-3 rounded-2xl border border-emerald-400/[0.10] bg-emerald-400/[0.035] px-3 py-2.5">

              <div className="flex items-center gap-2">

                <span className="relative flex h-2 w-2 shrink-0">

                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />

                </span>

                <span className="truncate text-[9px] font-black uppercase tracking-[1.5px] text-emerald-300/80">
                  Business Workspace
                </span>

              </div>

              <div className="mt-1 truncate text-[10px] text-white/30">
                {getBusinessId() ||
                  "Business ID not loaded"}
              </div>

            </div>
          )}

          {/* =================================================
              NAVIGATION
          ================================================= */}

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

            {groups.map(
              (group) => (
                <div
                  key={group.label}
                  className="mb-5 last:mb-0"
                >

                  {/* GROUP LABEL */}

                  {open && (
                    <p className="mb-2 px-2 text-[9px] font-black uppercase tracking-[1.8px] text-white/25">
                      {group.label}
                    </p>
                  )}

                  <div className="space-y-1">

                    {group.items.map(
                      (item) => {
                        const [label, path, icon, badge] = item;

                        const active =
                          isActive(path);

                        return (
                          <button
                            key={`${label}-${path}`}
                            type="button"
                            onClick={() =>
                              go(path)
                            }
                            title={
                              !open
                                ? label
                                : undefined
                            }
                            className={`
                              group
                              relative
                              flex
                              w-full
                              items-center
                              rounded-xl
                              transition-all
                              duration-200

                              ${
                                open
                                  ? "gap-3 px-2.5 py-2.5"
                                  : "justify-center px-0 py-3"
                              }

                              ${
                                active
                                  ? "border border-emerald-300/15 bg-gradient-to-r from-[#18b960] via-[#16ad5c] to-[#0d9850] text-white shadow-[0_8px_24px_rgba(25,185,93,0.20)]"
                                  : "border border-transparent text-white/65 hover:border-white/[0.06] hover:bg-white/[0.055] hover:text-white"
                              }
                            `}
                          >

                            {/* ACTIVE INDICATOR */}

                            {active && (
                              <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.65)]" />
                            )}

                            {/* ICON */}

                            <span
                              className={`
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                transition
                                ${
                                  active
                                    ? "bg-white/[0.13] text-white"
                                    : "bg-white/[0.035] text-white/60 group-hover:bg-white/[0.06] group-hover:text-white"
                                }
                              `}
                            >

                              {icon ===
                              "whatsapp" ? (
                                <img
                                  src={WA}
                                  alt=""
                                  className="h-[17px] w-[17px] object-contain"
                                />
                              ) : icon ===
                                "gmail" ? (
                                <img
                                  src={GMAIL}
                                  alt=""
                                  className="h-[17px] w-[17px] object-contain"
                                />
                              ) : (
                                <Icon
                                  name={icon}
                                  className="h-[17px] w-[17px]"
                                />
                              )}

                            </span>

                            {/* LABEL */}

                            {open && (
                              <>
                                <span className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold">
                                  {label}
                                </span>

                                {badge && (
                                  <span
                                    className={`
                                      rounded-full
                                      px-1.5
                                      py-0.5
                                      text-[7px]
                                      font-black
                                      tracking-[0.8px]

                                      ${
                                        badge ===
                                        "PRO"
                                          ? "border border-purple-300/20 bg-purple-300/[0.08] text-purple-300"
                                          : "border border-green-300/15 bg-green-300/[0.06] text-green-300"
                                      }
                                    `}
                                  >
                                    {badge}
                                  </span>
                                )}

                                {!badge &&
                                  active && (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
                                  )}
                              </>
                            )}

                          </button>
                        );
                      }
                    )}

                  </div>

                </div>
              )
            )}

          </div>

          {/* =================================================
              BOTTOM ACTIONS
          ================================================= */}

          <div className="relative shrink-0 border-t border-white/[0.08] p-3">

            {/* PROFILE */}

            <button
              type="button"
              onClick={() =>
                go("/profile")
              }
              title={
                !open
                  ? "Profile"
                  : undefined
              }
              className={`
                group
                flex
                w-full
                items-center
                rounded-xl
                py-2.5
                text-white/65
                transition
                hover:bg-white/[0.055]
                hover:text-white

                ${
                  open
                    ? "gap-3 px-2.5"
                    : "justify-center px-0"
                }
              `}
            >

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">

                <Icon
                  name="user"
                  className="h-4 w-4"
                />

              </span>

              {open && (
                <span className="text-[12px] font-medium">
                  Profile
                </span>
              )}

            </button>

            {/* SUPPORT */}

            <button
              type="button"
              onClick={() =>
                supportAction()
              }
              title={
                !open
                  ? "Help & Support"
                  : undefined
              }
              className={`
                group
                flex
                w-full
                items-center
                rounded-xl
                py-2.5
                text-white/65
                transition
                hover:bg-white/[0.055]
                hover:text-white

                ${
                  open
                    ? "gap-3 px-2.5"
                    : "justify-center px-0"
                }
              `}
            >

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">

                <Icon
                  name="help"
                  className="h-4 w-4"
                />

              </span>

              {open && (
                <span className="text-[12px] font-medium">
                  Help & Support
                </span>
              )}

            </button>

            {/* WHY SODAH */}

            <button
              type="button"
              onClick={() =>
                whyAction()
              }
              title={
                !open
                  ? "Why Sodah"
                  : undefined
              }
              className={`
                group
                flex
                w-full
                items-center
                rounded-xl
                py-2.5
                text-white/65
                transition
                hover:bg-white/[0.055]
                hover:text-white

                ${
                  open
                    ? "gap-3 px-2.5"
                    : "justify-center px-0"
                }
              `}
            >

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">

                <Icon
                  name="info"
                  className="h-4 w-4"
                />

              </span>

              {open && (
                <span className="text-[12px] font-medium">
                  Why Sodah
                </span>
              )}

            </button>

            {/* ABOUT */}

            <button
              type="button"
              onClick={() =>
                aboutAction()
              }
              title={
                !open
                  ? "About Us"
                  : undefined
              }
              className={`
                group
                flex
                w-full
                items-center
                rounded-xl
                py-2.5
                text-white/65
                transition
                hover:bg-white/[0.055]
                hover:text-white

                ${
                  open
                    ? "gap-3 px-2.5"
                    : "justify-center px-0"
                }
              `}
            >

              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">

                <Icon
                  name="info"
                  className="h-4 w-4"
                />

              </span>

              {open && (
                <span className="text-[12px] font-medium">
                  About Us
                </span>
              )}

            </button>

            {/* SIGN OUT */}

            {open && (
              <button
                type="button"
                onClick={() =>
                  logoutAction()
                }
                className="mt-2 flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 text-red-300/65 transition hover:border-red-400/10 hover:bg-red-400/[0.055] hover:text-red-300"
              >

                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-400/[0.035]">

                  <Icon
                    name="logout"
                    className="h-4 w-4"
                  />

                </span>

                <span className="text-[12px] font-medium">
                  Sign out
                </span>

              </button>
            )}

          </div>

        </div>
      </aside>

      {/* ====================================================
          SIDEBAR CONTENT OFFSET HELPER

          Pages should use this class/spacing so their content
          never sits underneath the sidebar.

          The sidebar itself remains fixed.
      ==================================================== */}

      <style jsx global>{`
        /*
          IMPORTANT APPLICATION RULE:

          The sidebar is fixed and persistent.
          Main application pages should reserve:

              lg:pl-[64px]

          so the collapsed sidebar remains visible.

          When the sidebar expands, it floats over the page
          rather than destroying the page layout.
        */

        :root {
          --sodah-sidebar-collapsed: 64px;
          --sodah-sidebar-expanded: 270px;
        }

        .sodah-app-shell {
          min-height: 100vh;
          padding-left: var(
            --sodah-sidebar-collapsed
          );
        }

        @media (max-width: 1023px) {
          .sodah-app-shell {
            padding-left: 0;
          }
        }
      `}</style>
    </>
  );
}