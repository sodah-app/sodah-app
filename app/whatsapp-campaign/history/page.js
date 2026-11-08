"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

/* =========================================================
   CONSTANTS
========================================================= */

const FILTERS = [
  {
    key: "all",
    label: "All Campaigns",
    description: "Every campaign",
    icon: "◉",
    tone: "neutral",
  },
  {
    key: "sent",
    label: "Sent",
    description: "Successfully sent",
    icon: "✓",
    tone: "green",
  },
  {
    key: "partial",
    label: "Partial",
    description: "Partially completed",
    icon: "◐",
    tone: "yellow",
  },
  {
    key: "scheduled",
    label: "Scheduled",
    description: "Upcoming campaigns",
    icon: "◷",
    tone: "cyan",
  },
  {
    key: "failed",
    label: "Failed",
    description: "Needs attention",
    icon: "!",
    tone: "red",
  },
];

const TEMPLATE_LABELS = {
  offer: "Promote an offer",
  lead: "Follow up with lead",
  reengage: "Re-engage customer",
  invite: "Invite customers",
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeStatus(status) {
  const value = String(status || "").toLowerCase();

  if (
    value === "completed" ||
    value === "complete" ||
    value === "sent"
  ) {
    return "sent";
  }

  if (
    value === "partial" ||
    value === "partially_completed" ||
    value === "partially-completed"
  ) {
    return "partial";
  }

  if (
    value === "scheduled" ||
    value === "pending"
  ) {
    return "scheduled";
  }

  if (
    value === "failed" ||
    value === "error"
  ) {
    return "failed";
  }

  return value || "unknown";
}

function statusLabel(status) {
  const value = normalizeStatus(status);

  switch (value) {
    case "sent":
      return "Sent";

    case "partial":
      return "Partial";

    case "scheduled":
      return "Scheduled";

    case "failed":
      return "Failed";

    default:
      return "Unknown";
  }
}

function formatDate(value) {
  if (!value) return "—";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat("en", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return String(value);
  }
}

function formatSchedule(schedule) {
  if (!schedule) return "—";

  if (typeof schedule === "string") {
    return schedule;
  }

  const mode = String(
    schedule.mode || ""
  ).toLowerCase();

  if (mode === "now") {
    return "Send immediately";
  }

  if (mode === "daily") {
    const time = schedule.time || "";

    return time
      ? `Daily at ${time}`
      : "Daily";
  }

  if (mode === "weekly") {
    const day =
      schedule.weekly_day ||
      schedule.day ||
      "";

    const time = schedule.time || "";

    if (day && time) {
      return `Every ${day} at ${time}`;
    }

    if (day) {
      return `Every ${day}`;
    }

    return time
      ? `Weekly at ${time}`
      : "Weekly";
  }

  if (mode === "scheduled") {
    const date = schedule.date || "";
    const time = schedule.time || "";

    if (date && time) {
      return `${date} at ${time}`;
    }

    if (date) {
      return date;
    }

    if (time) {
      return `At ${time}`;
    }

    return "Scheduled";
  }

  return (
    schedule.label ||
    schedule.description ||
    "Scheduled"
  );
}

function contactCount(campaign) {
  if (!campaign) return 0;

  if (
    typeof campaign.contact_count === "number"
  ) {
    return campaign.contact_count;
  }

  if (Array.isArray(campaign.contacts)) {
    return campaign.contacts.length;
  }

  if (
    typeof campaign.contacts === "object" &&
    campaign.contacts !== null
  ) {
    return Object.keys(campaign.contacts).length;
  }

  return 0;
}

function safeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

/* =========================================================
   ICONS
========================================================= */

function ArrowLeftIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 12H5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 19L5 12L12 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 11A8.1 8.1 0 0 0 5.3 6.3L3 8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 4V8.5H7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 13A8.1 8.1 0 0 0 18.7 17.7L21 15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 20V15.5H16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5V19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon({ size = 19 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M20 20L16.2 16.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightIcon({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 18L15 12L9 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MessageIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 11.5C20 15.64 16.42 19 12 19C10.78 19 9.63 18.74 8.62 18.28L4 20L5.38 16.12C4.51 14.84 4 13.25 4 11.5C4 7.36 7.58 4 12 4C16.42 4 20 7.36 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);

  const config = {
    sent: {
      label: "Sent",
      className:
        "border-emerald-400/30 bg-emerald-400/12 text-emerald-300",
      dot: "bg-emerald-400",
    },

    partial: {
      label: "Partial",
      className:
        "border-yellow-400/30 bg-yellow-400/12 text-yellow-300",
      dot: "bg-yellow-400",
    },

    scheduled: {
      label: "Scheduled",
      className:
        "border-cyan-400/30 bg-cyan-400/12 text-cyan-300",
      dot: "bg-cyan-400",
    },

    failed: {
      label: "Failed",
      className:
        "border-red-400/30 bg-red-400/12 text-red-300",
      dot: "bg-red-400",
    },
  };

  const current =
    config[normalized] || {
      label: "Unknown",
      className:
        "border-white/10 bg-white/[0.05] text-white/60",
      dot: "bg-white/40",
    };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${current.className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${current.dot}`}
      />
      {current.label}
    </span>
  );
}

/* =========================================================
   ANALYTICS CARD
   REDUCED HEIGHT
========================================================= */

function AnalyticsCard({
  filter,
  count,
  active,
  onClick,
}) {
  const toneClasses = {
    neutral: {
      wrapper:
        "border-white/16 bg-white/[0.07] hover:bg-white/[0.11]",
      icon:
        "border-white/15 bg-white/[0.09] text-white/80",
      number: "text-white",
      accent: "bg-white/60",
      glow: "bg-white/[0.04]",
    },

    green: {
      wrapper:
        "border-emerald-400/30 bg-emerald-500/[0.11] hover:bg-emerald-500/[0.17]",
      icon:
        "border-emerald-400/30 bg-emerald-400/15 text-emerald-300",
      number: "text-emerald-300",
      accent: "bg-emerald-400",
      glow: "bg-emerald-400/[0.08]",
    },

    yellow: {
      wrapper:
        "border-yellow-400/30 bg-yellow-400/[0.10] hover:bg-yellow-400/[0.16]",
      icon:
        "border-yellow-400/30 bg-yellow-400/15 text-yellow-300",
      number: "text-yellow-300",
      accent: "bg-yellow-400",
      glow: "bg-yellow-400/[0.07]",
    },

    cyan: {
      wrapper:
        "border-cyan-400/30 bg-cyan-400/[0.10] hover:bg-cyan-400/[0.16]",
      icon:
        "border-cyan-400/30 bg-cyan-400/15 text-cyan-300",
      number: "text-cyan-300",
      accent: "bg-cyan-400",
      glow: "bg-cyan-400/[0.07]",
    },

    red: {
      wrapper:
        "border-red-400/30 bg-red-500/[0.10] hover:bg-red-500/[0.16]",
      icon:
        "border-red-400/30 bg-red-400/15 text-red-300",
      number: "text-red-300",
      accent: "bg-red-400",
      glow: "bg-red-400/[0.07]",
    },
  };

  const tone =
    toneClasses[filter.tone] ||
    toneClasses.neutral;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        group relative min-w-0 overflow-hidden rounded-2xl
        border text-left
        transition-all duration-200
        ${tone.wrapper}
        ${
          active
            ? "scale-[1.005] border-opacity-100 shadow-[0_0_30px_rgba(16,185,129,0.12)]"
            : "shadow-[0_8px_25px_rgba(0,0,0,0.14)]"
        }
      `}
    >
      <div
        className={`
          pointer-events-none absolute -right-8 -top-8
          h-24 w-24 rounded-full blur-2xl
          ${tone.glow}
        `}
      />

      <div className="relative flex h-[82px] items-center gap-3 px-4 sm:px-5">
        <div
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center
            rounded-xl border text-base font-black
            ${tone.icon}
          `}
        >
          {filter.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={`text-2xl font-black leading-none tracking-tight sm:text-[28px] ${tone.number}`}
          >
            {count}
          </div>

          <div className="mt-1 truncate text-xs font-bold text-white sm:text-sm">
            {filter.label}
          </div>
        </div>

        {active && (
          <span className="hidden rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/65 sm:inline-flex">
            Active
          </span>
        )}

        <div
          className={`
            absolute bottom-0 left-4 right-4 h-[2px]
            rounded-full
            ${tone.accent}
            ${active ? "opacity-100" : "opacity-45"}
          `}
        />
      </div>
    </button>
  );
}

/* =========================================================
   DETAIL CARD
========================================================= */

function DetailCard({
  label,
  value,
  children,
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">
        {label}
      </div>

      {children || (
        <div className="mt-2 break-words text-sm font-semibold text-white/85">
          {value || "—"}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   HISTORY CONTENT
   IMPORTANT:
   useSearchParams() lives inside this component.
   The parent page below wraps it in Suspense.
========================================================= */

function CampaignHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [business, setBusiness] = useState(null);
  const [businessId, setBusinessId] = useState("");

  const [campaigns, setCampaigns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] =
    useState(false);

  const [error, setError] = useState("");

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);

  /* =======================================================
     AUTH
  ======================================================= */

  const getAuthHeaders = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        return {
          Authorization: `Bearer ${session.access_token}`,
        };
      }
    } catch (authError) {
      console.error(
        "Unable to get Supabase session:",
        authError
      );
    }

    return {};
  }, []);

  /* =======================================================
     LOAD HISTORY
  ======================================================= */

  const loadHistory = useCallback(
    async (requestedBusinessId = "") => {
      try {
        setLoading(true);
        setError("");

        const headers = await getAuthHeaders();

        const query =
          requestedBusinessId
            ? `?businessId=${encodeURIComponent(
                requestedBusinessId
              )}`
            : "";

        const response = await fetch(
          `/api/campaign-history${query}`,
          {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Unable to load campaign history."
          );
        }

        setBusiness(data?.business || null);

        setCampaigns(
          Array.isArray(data?.campaigns)
            ? data.campaigns
            : Array.isArray(data?.data)
              ? data.data
              : []
        );
      } catch (loadError) {
        console.error(
          "Campaign history load failed:",
          loadError
        );

        setError(
          loadError?.message ||
            "Unable to load campaign history."
        );

        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const id =
      searchParams.get("businessId") ||
      searchParams.get("business_id") ||
      "";

    setBusinessId(id);
    loadHistory(id);
  }, [searchParams, loadHistory]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const counts = useMemo(() => {
    const result = {
      all: campaigns.length,
      sent: 0,
      partial: 0,
      scheduled: 0,
      failed: 0,
    };

    campaigns.forEach((campaign) => {
      const status = normalizeStatus(
        campaign?.status
      );

      if (
        Object.prototype.hasOwnProperty.call(
          result,
          status
        )
      ) {
        result[status] += 1;
      }
    });

    return result;
  }, [campaigns]);

  /* =======================================================
     FILTER + SEARCH
  ======================================================= */

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const status = normalizeStatus(
        campaign?.status
      );

      if (
        filter !== "all" &&
        status !== filter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const template =
        TEMPLATE_LABELS[
          campaign?.template
        ] || campaign?.template || "";

      const searchable = [
        campaign?.campaign_name,
        campaign?.message,
        campaign?.campaignName,
        campaign?.name,
        campaign?.tone,
        template,
        statusLabel(status),
        formatSchedule(campaign?.schedule),
      ]
        .map(safeText)
        .join(" ")
        .toLowerCase();

      return searchable.includes(
        normalizedSearch
      );
    });
  }, [campaigns, filter, search]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const goToChannels = () => {
    router.push(
      businessId
        ? `/channels?businessId=${encodeURIComponent(
            businessId
          )}`
        : "/channels"
    );
  };

  const goToCampaign = () => {
    router.push(
      businessId
        ? `/whatsapp-campaign?businessId=${encodeURIComponent(
            businessId
          )}`
        : "/whatsapp-campaign"
    );
  };

  /* =======================================================
     REFRESH
  ======================================================= */

  const refresh = () => {
    loadHistory(businessId);
  };

  /* =======================================================
     DETAILS
  ======================================================= */

  const openDetails = async (campaign) => {
    if (!campaign?.id) {
      setSelected(campaign);
      return;
    }

    try {
      setLoadingDetails(true);

      const headers = await getAuthHeaders();

      const queryParts = [];

      if (businessId) {
        queryParts.push(
          `businessId=${encodeURIComponent(
            businessId
          )}`
        );
      }

      queryParts.push(
        `id=${encodeURIComponent(campaign.id)}`
      );

      const response = await fetch(
        `/api/campaign-history?${queryParts.join(
          "&"
        )}`,
        {
          method: "GET",
          headers,
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to load campaign details."
        );
      }

      setSelected(
        data?.campaign ||
          data?.data ||
          campaign
      );
    } catch (detailsError) {
      console.error(
        "Campaign details failed:",
        detailsError
      );

      setSelected(campaign);
    } finally {
      setLoadingDetails(false);
    }
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeDetails = () => {
    setSelected(null);
  };

  /* =======================================================
     ESCAPE KEY
  ======================================================= */

  useEffect(() => {
    if (!selected) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDetails();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selected]);

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="h-screen overflow-hidden bg-[#03110d] text-white">
      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-emerald-500/[0.12] blur-[140px]" />

        <div className="absolute right-[-180px] top-[10%] h-[560px] w-[560px] rounded-full bg-cyan-500/[0.07] blur-[150px]" />

        <div className="absolute bottom-[-220px] left-[25%] h-[520px] w-[520px] rounded-full bg-emerald-700/[0.08] blur-[150px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_35%)]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* ===================================================
          FIXED / STICKY DASHBOARD AREA
      =================================================== */}

      <div className="relative z-40 shrink-0 border-b border-emerald-300/[0.10] bg-[#04120f]/[0.96] shadow-[0_14px_50px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          {/* TOP NAVIGATION */}

          <div className="flex min-h-[70px] items-center gap-3">
            {/* CHANNELS */}

            <button
              type="button"
              onClick={goToChannels}
              className="inline-flex h-11 shrink-0 items-center gap-2.5 rounded-xl border border-cyan-300/20 bg-cyan-400/[0.12] px-4 text-sm font-bold text-cyan-200 shadow-[0_8px_25px_rgba(6,182,212,0.08)] transition hover:border-cyan-300/40 hover:bg-cyan-400/[0.20]"
            >
              <ArrowLeftIcon size={18} />

              <span className="hidden sm:inline">
                Channels
              </span>
            </button>

            {/* BRAND */}

            <div className="hidden items-center gap-2.5 xl:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.10] text-base font-black text-emerald-300">
                S
              </div>

              <div>
                <div className="text-sm font-black tracking-tight">
                  Sodah.io
                </div>

                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Campaign Analytics
                </div>
              </div>
            </div>

            {/* TITLE */}

            <div className="min-w-0 flex-1 px-1 sm:px-4">
              <div className="flex items-center gap-3">
                <div className="hidden h-9 w-1 rounded-full bg-gradient-to-b from-emerald-300 via-emerald-500 to-cyan-400 sm:block" />

                <div className="min-w-0">
                  <h1 className="truncate text-xl font-black tracking-[-0.035em] text-white sm:text-2xl">
                    Campaign History
                  </h1>

                  <p className="hidden truncate text-[11px] font-medium text-white/35 sm:block">
                    Track every WhatsApp campaign
                  </p>
                </div>
              </div>
            </div>

            {/* REFRESH */}

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh campaign history"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-400/[0.12] text-emerald-300 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.20] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              >
                <RefreshIcon size={18} />
              </span>
            </button>

            {/* NEW CAMPAIGN */}

            <button
              type="button"
              onClick={goToCampaign}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-emerald-300/30 bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 text-sm font-black text-[#02110c] shadow-[0_10px_30px_rgba(16,185,129,0.20)] transition hover:scale-[1.01] hover:from-emerald-400 hover:to-cyan-400 sm:px-5"
            >
              <PlusIcon size={17} />

              <span className="hidden sm:inline">
                New Campaign
              </span>

              <span className="sm:hidden">
                New
              </span>
            </button>
          </div>

          {/* =================================================
              COMPACT ANALYTICS ROW
          ================================================= */}

          <div className="grid grid-cols-2 gap-2.5 pb-3 md:grid-cols-3 xl:grid-cols-5">
            {FILTERS.map((item) => (
              <AnalyticsCard
                key={item.key}
                filter={item}
                count={counts[item.key] || 0}
                active={filter === item.key}
                onClick={() =>
                  setFilter(item.key)
                }
              />
            ))}
          </div>

          {/* =================================================
              SEARCH
          ================================================= */}

          <div className="pb-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-emerald-300/70">
                <SearchIcon size={18} />
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search campaigns, messages, templates, status..."
                className="h-12 w-full rounded-2xl border border-emerald-300/[0.14] bg-[#061a15]/95 pl-13 pr-12 text-sm font-medium text-white outline-none placeholder:text-white/30 transition focus:border-emerald-400/40 focus:bg-[#072019] focus:ring-4 focus:ring-emerald-400/[0.06]"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <CloseIcon size={17} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          SCROLLABLE CAMPAIGN AREA
      ===================================================== */}

      <section className="h-[calc(100vh-1px)] overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          {/* ERROR */}

          {error && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-5 py-4">
              <div>
                <div className="text-sm font-bold text-red-300">
                  Unable to load campaign history
                </div>

                <div className="mt-1 text-xs text-red-200/60">
                  {error}
                </div>
              </div>

              <button
                type="button"
                onClick={refresh}
                className="shrink-0 rounded-xl border border-red-300/20 bg-red-400/[0.10] px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-400/[0.16]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* RESULT COUNT */}

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white/80">
                {loading
                  ? "Loading campaigns..."
                  : `${filteredCampaigns.length} campaign${
                      filteredCampaigns.length === 1
                        ? ""
                        : "s"
                    }`}
              </div>

              {!loading &&
                (filter !== "all" ||
                  search.trim()) && (
                  <div className="mt-1 text-xs text-white/35">
                    Showing filtered results
                  </div>
                )}
            </div>

            {business?.business_name && (
              <div className="rounded-full border border-emerald-300/10 bg-emerald-400/[0.05] px-3.5 py-2 text-xs font-semibold text-emerald-200/70">
                {business.business_name}
              </div>
            )}
          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (
            <div className="grid gap-4">
              {Array.from({
                length: 5,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-[160px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.035]"
                />
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            /* =================================================
               EMPTY
            ================================================= */

            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-emerald-300/[0.10] bg-[#061813]/80 px-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.20)]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-300">
                <MessageIcon size={28} />
              </div>

              <h2 className="mt-5 text-xl font-black text-white">
                {search.trim()
                  ? "No campaigns found"
                  : filter === "all"
                    ? "No campaign history yet"
                    : `No ${statusLabel(
                        filter
                      ).toLowerCase()} campaigns`}
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
                {search.trim()
                  ? "Try a different search term or clear the search to see more campaigns."
                  : "Campaigns you send through Sodah.io will appear here automatically."}
              </p>

              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-6 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.10] px-5 py-3 text-sm font-bold text-emerald-200 transition hover:bg-emerald-400/[0.16]"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            /* =================================================
               CAMPAIGN LIST
            ================================================= */

            <div className="grid gap-4">
              {filteredCampaigns.map(
                (campaign, index) => {
                  const status =
                    normalizeStatus(
                      campaign?.status
                    );

                  const contacts =
                    contactCount(campaign);

                  const campaignName =
                    campaign?.campaign_name ||
                    campaign?.campaignName ||
                    campaign?.name ||
                    `Campaign ${index + 1}`;

                  const message =
                    campaign?.message || "";

                  const template =
                    TEMPLATE_LABELS[
                      campaign?.template
                    ] ||
                    campaign?.template ||
                    "";

                  return (
                    <button
                      type="button"
                      key={
                        campaign?.id ||
                        `${campaignName}-${index}`
                      }
                      onClick={() =>
                        openDetails(campaign)
                      }
                      className="group w-full rounded-2xl border border-emerald-300/[0.08] bg-[#061813]/85 p-5 text-left shadow-[0_12px_45px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-[1px] hover:border-emerald-300/[0.20] hover:bg-[#071d17] hover:shadow-[0_18px_55px_rgba(0,0,0,0.24)] sm:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                        {/* CAMPAIGN */}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="truncate text-base font-black text-white sm:text-lg">
                              {campaignName}
                            </h2>

                            <StatusBadge
                              status={status}
                            />
                          </div>

                          {message && (
                            <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-white/50">
                              {message}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/35">
                            {template && (
                              <span>
                                {template}
                              </span>
                            )}

                            <span>
                              {contacts} contact
                              {contacts === 1
                                ? ""
                                : "s"}
                            </span>

                            <span>
                              {formatDate(
                                campaign?.created_at ||
                                  campaign?.createdAt
                              )}
                            </span>
                          </div>
                        </div>

                        {/* METADATA */}

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[430px]">
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
                              Contacts
                            </div>

                            <div className="mt-1.5 text-sm font-black text-white">
                              {contacts}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
                              Schedule
                            </div>

                            <div className="mt-1.5 truncate text-sm font-bold text-white/70">
                              {formatSchedule(
                                campaign?.schedule
                              )}
                            </div>
                          </div>

                          <div className="col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 sm:col-span-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
                              Status
                            </div>

                            <div className="mt-1.5 text-sm font-bold text-white/70">
                              {statusLabel(
                                status
                              )}
                            </div>
                          </div>
                        </div>

                        {/* OPEN */}

                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/35 transition group-hover:border-emerald-300/20 group-hover:bg-emerald-400/[0.08] group-hover:text-emerald-300 lg:flex">
                          <ChevronRightIcon
                            size={18}
                          />
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          DETAILS MODAL
      ===================================================== */}

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-emerald-300/[0.12] bg-[#061713] shadow-[0_35px_100px_rgba(0,0,0,0.55)]">
            {/* MODAL HEADER */}

            <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] px-6 py-5 sm:px-7">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="truncate text-xl font-black text-white sm:text-2xl">
                    {selected?.campaign_name ||
                      selected?.campaignName ||
                      selected?.name ||
                      "Campaign Details"}
                  </h2>

                  <StatusBadge
                    status={selected?.status}
                  />
                </div>

                <p className="mt-1 text-xs text-white/35">
                  {formatDate(
                    selected?.created_at ||
                      selected?.createdAt
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Close"
              >
                <CloseIcon size={19} />
              </button>
            </div>

            {/* MODAL CONTENT */}

            <div className="max-h-[calc(90vh-90px)] overflow-y-auto px-6 py-6 sm:px-7">
              {loadingDetails && (
                <div className="mb-5 rounded-xl border border-cyan-300/10 bg-cyan-400/[0.05] px-4 py-3 text-xs font-semibold text-cyan-200/70">
                  Loading latest campaign details...
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailCard
                  label="Status"
                  value={statusLabel(
                    selected?.status
                  )}
                />

                <DetailCard
                  label="Contacts"
                  value={contactCount(
                    selected
                  )}
                />

                <DetailCard
                  label="Schedule"
                  value={formatSchedule(
                    selected?.schedule
                  )}
                />

                <DetailCard
                  label="Created"
                  value={formatDate(
                    selected?.created_at ||
                      selected?.createdAt
                  )}
                />
              </div>

              {/* MESSAGE */}

              <div className="mt-4">
                <DetailCard label="Message">
                  <div className="mt-3 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-6 text-white/75">
                    {selected?.message ||
                      "No message content."}
                  </div>
                </DetailCard>
              </div>

              {/* MEDIA */}

              {(selected?.media?.url ||
                selected?.media_url ||
                selected?.mediaUrl) && (
                <div className="mt-4">
                  <DetailCard label="Campaign Media">
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/20">
                      <img
                        src={
                          selected?.media?.url ||
                          selected?.media_url ||
                          selected?.mediaUrl
                        }
                        alt="Campaign media"
                        className="max-h-[420px] w-full object-contain"
                      />
                    </div>
                  </DetailCard>
                </div>
              )}

              {/* CONTACTS */}

              {Array.isArray(
                selected?.contacts
              ) &&
                selected.contacts.length > 0 && (
                  <div className="mt-4">
                    <DetailCard label="Recipients">
                      <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06]">
                        <div className="max-h-[260px] overflow-y-auto">
                          {selected.contacts.map(
                            (contact, index) => (
                              <div
                                key={
                                  contact?.phone ||
                                  contact?.email ||
                                  index
                                }
                                className="flex items-center justify-between gap-4 border-b border-white/[0.05] px-4 py-3 last:border-b-0"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-bold text-white/80">
                                    {contact?.name ||
                                      "Unnamed contact"}
                                  </div>

                                  {contact?.email && (
                                    <div className="truncate text-xs text-white/35">
                                      {
                                        contact.email
                                      }
                                    </div>
                                  )}
                                </div>

                                <div className="shrink-0 text-xs font-semibold text-emerald-300/70">
                                  {contact?.phone ||
                                    "—"}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </DetailCard>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   PAGE
   Suspense is required because CampaignHistoryContent
   uses useSearchParams().
========================================================= */

export default function CampaignHistoryPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#03110d] text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-400/20 border-t-emerald-400" />

            <div className="text-sm font-semibold text-white/50">
              Loading campaign history...
            </div>
          </div>
        </main>
      }
    >
      <CampaignHistoryContent />
    </Suspense>
  );
}