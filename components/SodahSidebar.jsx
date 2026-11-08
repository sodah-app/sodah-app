"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

const WHATSAPP_LOGO =
  "https://cdn.simpleicons.org/whatsapp/25D366";

const NAVIGATION = [
  {
    section: "WORKSPACE",
    items: [
      {
        label: "Welcome",
        icon: "⌂",
        href: "/welcome",
      },
      {
        label: "Leads",
        icon: "♙",
        href: "/dashboard",
      },
      {
        label: "Analytics",
        icon: "▥",
        href: "/analytics",
      },
    ],
  },

  {
    section: "WHATSAPP",
    items: [
      {
        label: "WhatsApp Automation",
        logo: WHATSAPP_LOGO,
        href: "/voice-settings",
      },
      {
        label: "WhatsApp Manager",
        logo: WHATSAPP_LOGO,
        href: "/whatsapp-campaign",
      },
      {
        label: "WhatsApp History",
        logo: WHATSAPP_LOGO,
        href: "/whatsapp-campaign/history",
      },
      {
        label: "Timesheets",
        icon: "◷",
        href: "/timesheets",
      },
      {
        label: "Cash Flow",
        icon: "▥",
        href: "/cashflow",
      },
    ],
  },

  {
    section: "BUSINESS",
    items: [
      {
        label: "Business Update AI",
        icon: "✦",
        href: "/dashboard/business-ai",
      },
      {
        label: "Subscription",
        icon: "◆",
        href: "/subscription",
      },
      {
        label: "Settings",
        icon: "⚙",
        href: "/settings",
      },
      {
        label: "Suggestions",
        icon: "◇",
        href: "/suggestions",
      },
    ],
  },

  {
    section: "SUPPORT",
    items: [
      {
        label: "Why Sodah.io",
        icon: "◉",
        href: "/why-sodah",
      },
      {
        label: "About Us",
        icon: "◎",
        href: "/about",
      },
      {
        label: "Help & Support",
        icon: "?",
        href: "/system-support",
      },
    ],
  },
];

const AUTH_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export default function SodahSidebar({
  businessId = "",
  user = {},
  onLogout,
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthRoute = useMemo(() => {
    return AUTH_ROUTES.some(
      (route) =>
        pathname === route ||
        pathname?.startsWith(`${route}/`)
    );
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setExpanded(false);
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  if (isAuthRoute) {
    return null;
  }

  /*
   * ============================================================
   * UNIVERSAL BUSINESS-AWARE NAVIGATION
   * ============================================================
   *
   * Every internal sidebar route receives businessId.
   *
   * Example:
   *
   * /dashboard
   * -> /dashboard?businessId=123
   *
   * Existing query parameters are preserved.
   */
  const getHref = (href) => {
    if (!href) {
      return "/";
    }

    /*
     * External URLs are returned untouched.
     */
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("#")
    ) {
      return href;
    }

    /*
     * If there is no business ID yet,
     * preserve the original route.
     */
    if (!businessId) {
      return href;
    }

    const url = new URL(
      href,
      window.location.origin
    );

    /*
     * Always force the current business ID.
     * This prevents duplicate businessId
     * query parameters.
     */
    url.searchParams.set(
      "businessId",
      businessId
    );

    return `${url.pathname}${url.search}${url.hash}`;
  };

  const isActive = (href) => {
    if (!pathname) {
      return false;
    }

    if (
      href === "/welcome" &&
      (pathname === "/" ||
        pathname === "/welcome")
    ) {
      return true;
    }

    if (href === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        pathname.startsWith("/dashboard/")
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  /*
   * All sidebar navigation goes through this function.
   * Therefore desktop and mobile always preserve
   * the business ID.
   */
  const navigate = (href) => {
    router.push(getHref(href));
    setMobileOpen(false);
  };

  return (
    <>
      {/* ======================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <div
        aria-hidden="true"
        className="fixed left-0 top-0 z-[119] hidden h-screen w-[18px] lg:block"
        onMouseEnter={() => setExpanded(true)}
      />

      <aside
        className={`fixed left-0 top-0 z-[120] hidden h-screen border-r border-white/10 bg-[#06100c]/96 shadow-[15px_0_60px_rgba(0,0,0,0.25)] backdrop-blur-2xl transition-all duration-200 ease-out lg:block ${
          expanded
            ? "w-[260px]"
            : "w-[74px]"
        }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="flex h-full flex-col">

          {/* HEADER */}
          <div
            className={`flex h-[66px] items-center border-b border-white/10 ${
              expanded
                ? "justify-between px-4"
                : "justify-center"
            }`}
          >
            {expanded && (
              <button
                type="button"
                onClick={() =>
                  navigate("/welcome")
                }
                className="flex items-center gap-2"
              >
                <SodahMark />

                <div className="text-left">
                  <p className="text-sm font-black">
                    Sodah
                    <span className="text-cyan-400">
                      .io
                    </span>
                  </p>

                  <p className="text-[7px] font-black uppercase tracking-[1.8px] text-gray-600">
                    AI Business Workspace
                  </p>
                </div>
              </button>
            )}

            {!expanded && <SodahMark />}
          </div>

          {/* NAVIGATION */}
          <div className="relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 scrollbar-none">
            {NAVIGATION.map((group) => (
              <div
                key={group.section}
                className="mb-5"
              >
                {expanded && (
                  <p className="mb-2 px-3 text-[8px] font-black tracking-[2px] text-gray-600">
                    {group.section}
                  </p>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <SidebarItem
                      key={item.label}
                      item={item}
                      expanded={expanded}
                      active={isActive(
                        item.href
                      )}
                      onClick={() =>
                        navigate(item.href)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* USER */}
          <div className="border-t border-white/10 p-2">
            {expanded ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-cyan-400 text-xs font-black text-black">
                    {(user?.fullName || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-white">
                      {user?.fullName || "User"}
                    </p>

                    <p className="truncate text-[8px] text-gray-600">
                      {user?.businessName ||
                        "Business"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onLogout?.()
                    }
                    className="text-gray-600 transition hover:text-red-300"
                    title="Sign out"
                  >
                    ↪
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setExpanded(true)
                }
                className="flex h-12 w-full items-center justify-center rounded-xl bg-white/[0.03] text-gray-400 transition hover:bg-green-400/[0.06] hover:text-green-300"
                title="Expand sidebar"
              >
                <span className="text-lg">
                  {(user?.fullName || "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ======================================================
          MOBILE SIDEBAR
      ====================================================== */}

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() =>
            setMobileOpen(
              (current) => !current
            )
          }
          className="fixed left-3 top-3 z-[160] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#07120d]/90 text-lg text-white shadow-xl backdrop-blur-xl"
        >
          ☰
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm">
            <aside className="h-full w-[285px] overflow-y-auto border-r border-white/10 bg-[#06100c]/98 p-3 shadow-2xl">

              <div className="flex h-14 items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <SodahMark />

                  <span className="font-black">
                    Sodah
                    <span className="text-cyan-400">
                      .io
                    </span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className="text-xl text-gray-500 hover:text-white"
                >
                  ×
                </button>
              </div>

              {NAVIGATION.map((group) => (
                <div
                  key={group.section}
                  className="mt-5"
                >
                  <p className="mb-2 px-3 text-[8px] font-black tracking-[2px] text-gray-600">
                    {group.section}
                  </p>

                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <SidebarItem
                        key={item.label}
                        item={item}
                        expanded
                        active={isActive(
                          item.href
                        )}
                        onClick={() =>
                          navigate(item.href)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================
   SIDEBAR ITEM
============================================================ */

function SidebarItem({
  item,
  expanded,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        expanded
          ? undefined
          : item.label
      }
      className={`group relative flex w-full items-center rounded-xl transition-all duration-300 ${
        expanded
          ? "gap-3 px-3 py-2.5"
          : "justify-center px-2 py-2.5"
      } ${
        active
          ? "bg-gradient-to-r from-green-400/20 to-green-400/5 text-white shadow-[inset_3px_0_0_#25D366]"
          : "text-gray-500 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {item.logo ? (
        <img
          src={item.logo}
          alt=""
          className="h-[19px] w-[19px] shrink-0 object-contain"
        />
      ) : (
        <span
          className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center text-sm ${
            active
              ? "text-green-300"
              : "text-gray-500 group-hover:text-green-300"
          }`}
        >
          {item.icon}
        </span>
      )}

      {expanded && (
        <span
          className={`truncate text-[11px] font-semibold ${
            active
              ? "text-white"
              : "text-gray-400 group-hover:text-white"
          }`}
        >
          {item.label}
        </span>
      )}

      {active && expanded && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_10px_#25D366]" />
      )}
    </button>
  );
}

/* ============================================================
   SODAH MARK
============================================================ */

function SodahMark() {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[30%] bg-gradient-to-br from-green-300 via-green-400 to-cyan-400 text-lg font-black text-black shadow-[0_0_22px_rgba(37,211,102,0.22)]">
      S
    </div>
  );
}