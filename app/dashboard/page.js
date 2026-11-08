"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
import DashboardSidebar from "./sidebar";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activePage, setActivePage] =
    useState("Dashboard");

  const [loading, setLoading] =
    useState(true);

  const [businessId, setBusinessId] =
    useState(null);

  const [session, setSession] =
    useState(null);

  const [darkMode, setDarkMode] =
    useState(false);

  const [updatingAppointmentId, setUpdatingAppointmentId] =
    useState(null);

  const [updateMessage, setUpdateMessage] =
    useState("");

  // ======================================================
  // AUTH SESSION
  // ======================================================

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "[Dashboard] Session error:",
          error
        );
        return;
      }

      console.log(
        "[Dashboard] Initial session:",
        session
      );

      if (mounted) {
        setSession(session);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(
          "[Dashboard] Auth event:",
          _event
        );

        if (mounted) {
          setSession(session);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ======================================================
  // DEBUG STATE
  // ======================================================

  useEffect(() => {
    console.log(
      "[Dashboard] STATE APPOINTMENTS:",
      appointments
    );
  }, [appointments]);

  // ======================================================
  // DARK MODE
  // ======================================================

  useEffect(() => {
    const savedTheme =
      localStorage.getItem(
        "dashboard_dark_mode"
      );

    if (savedTheme === "true") {
      setDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const newValue = !darkMode;

    setDarkMode(newValue);

    localStorage.setItem(
      "dashboard_dark_mode",
      String(newValue)
    );
  };

  // ======================================================
  // GET BUSINESS ID
  // ======================================================
  /*
   * Tenant resolution order:
   *
   * 1. URL ?businessId=
   * 2. localStorage.business_id
   * 3. Supabase authenticated user's business
   *
   * The URL/business_id must always represent the
   * actual Sodah business_id, NOT the Supabase user.id.
   */

  useEffect(() => {
    let mounted = true;

    const loadBusinessId = async () => {
      try {
        setLoading(true);

        // --------------------------------------------------
        // 1. URL BUSINESS ID
        // --------------------------------------------------

        const urlBusinessId =
          searchParams.get(
            "businessId"
          );

        if (urlBusinessId) {
          console.log(
            "[Dashboard] Business ID from URL:",
            urlBusinessId
          );

          localStorage.setItem(
            "business_id",
            urlBusinessId
          );

          if (mounted) {
            setBusinessId(
              urlBusinessId
            );
            setLoading(false);
          }

          return;
        }

        // --------------------------------------------------
        // 2. LOCAL STORAGE BUSINESS ID
        // --------------------------------------------------

        const storedBusinessId =
          localStorage.getItem(
            "business_id"
          );

        if (storedBusinessId) {
          console.log(
            "[Dashboard] Business ID from localStorage:",
            storedBusinessId
          );

          if (mounted) {
            setBusinessId(
              storedBusinessId
            );
          }

          /*
           * Repair the URL if it disappeared.
           *
           * Example:
           *
           * /dashboard
           *
           * becomes:
           *
           * /dashboard?businessId=ABC
           */

          const currentPath =
            window.location.pathname;

          const currentUrl =
            new URL(
              window.location.href
            );

          currentUrl.searchParams.set(
            "businessId",
            storedBusinessId
          );

          window.history.replaceState(
            {},
            "",
            `${currentPath}${currentUrl.search}`
          );

          if (mounted) {
            setLoading(false);
          }

          return;
        }

        // --------------------------------------------------
        // 3. AUTHENTICATED USER
        // --------------------------------------------------

        if (!session?.user?.id) {
          console.log(
            "[Dashboard] No authenticated user."
          );

          if (mounted) {
            setLoading(false);
          }

          return;
        }

        console.log(
          "[Dashboard] Resolving business for user:",
          session.user.id
        );

        const {
          data,
          error,
        } = await supabase
          .from("businesses")
          .select(
            "business_id"
          )
          .eq(
            "user_id",
            session.user.id
          )
          .maybeSingle();

        if (error) {
          console.error(
            "[Dashboard] Business lookup error:",
            error
          );

          if (mounted) {
            setLoading(false);
          }

          return;
        }

        if (!data?.business_id) {
          console.error(
            "[Dashboard] Business not linked to this account."
          );

          if (mounted) {
            setLoading(false);
          }

          return;
        }

        const resolvedBusinessId =
          data.business_id;

        console.log(
          "[Dashboard] Resolved business ID:",
          resolvedBusinessId
        );

        localStorage.setItem(
          "business_id",
          resolvedBusinessId
        );

        if (mounted) {
          setBusinessId(
            resolvedBusinessId
          );
        }

        // --------------------------------------------------
        // REPAIR URL
        // --------------------------------------------------

        const currentUrl =
          new URL(
            window.location.href
          );

        currentUrl.searchParams.set(
          "businessId",
          resolvedBusinessId
        );

        window.history.replaceState(
          {},
          "",
          `${currentUrl.pathname}${currentUrl.search}`
        );

        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "[Dashboard] Business load error:",
          error
        );

        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBusinessId();

    return () => {
      mounted = false;
    };
  }, [session, searchParams]);

  // ======================================================
  // TENANT-AWARE NAVIGATION
  // ======================================================

  const navigateWithBusinessId =
    useCallback(
      (path) => {
        const activeBusinessId =
          businessId ||
          searchParams.get(
            "businessId"
          ) ||
          localStorage.getItem(
            "business_id"
          );

        if (!activeBusinessId) {
          console.error(
            "[Business Context] Missing businessId. Cannot navigate:",
            path
          );

          return;
        }

        const url = new URL(
          path,
          window.location.origin
        );

        url.searchParams.set(
          "businessId",
          activeBusinessId
        );

        console.log(
          "[Business Context] Navigation:",
          `${url.pathname}${url.search}`
        );

        router.push(
          `${url.pathname}${url.search}${url.hash}`
        );
      },
      [
        businessId,
        searchParams,
        router,
      ]
    );

  // ======================================================
  // BACK TO CHANNELS
  // ======================================================
  /*
   * NEVER use router.back() here.
   *
   * NEVER use router.push("/channels").
   *
   * Always explicitly return to the tenant-aware
   * Channels page.
   */

  const handleBackToChannels =
    useCallback(() => {
      const activeBusinessId =
        businessId ||
        searchParams.get(
          "businessId"
        ) ||
        localStorage.getItem(
          "business_id"
        );

      if (!activeBusinessId) {
        console.error(
          "[Business Context] Cannot return to Channels because businessId is missing."
        );

        return;
      }

      localStorage.setItem(
        "business_id",
        activeBusinessId
      );

      const channelsUrl =
        `/channels?businessId=${encodeURIComponent(
          activeBusinessId
        )}`;

      console.log(
        "[Dashboard] Back to Channels:",
        channelsUrl
      );

      router.push(
        channelsUrl
      );
    }, [
      businessId,
      searchParams,
      router,
    ]);

  // ======================================================
  // NORMALIZERS
  // ======================================================

  const normalizeAppointments = (
    data = []
  ) =>
    data.map((item) => ({
      ...item,

      Name:
        item.customer_name ||
        item.name ||
        "Unknown",

      Phone:
        item.customer_phone ||
        item.phone ||
        "No phone",

      Date:
        item.appointment_date ||
        item.date ||
        "",

      Time:
        item.appointment_time ||
        item.time ||
        "",

      Appointment_status:
        item.status ||
        item.appointment_status ||
        "Pending",

      Service:
        item.service || "",

      service:
        item.service || "",

      lead_status:
        item.lead_status ||
        "new",
    }));

  const normalizeCustomers = (
    data = []
  ) =>
    data.map((item) => ({
      ...item,

      Name:
        item.name ||
        "Unknown",

      Phone:
        item.phone ||
        "No phone",

      Service:
        item.customer_message ||
        item.service ||
        "",

      service:
        item.customer_message ||
        item.service ||
        "",

      lead_status:
        item.lead_status ||
        "new",
    }));

  // ======================================================
  // FETCH DATA
  // ======================================================

  const fetchData =
    useCallback(async () => {
      if (!businessId) {
        console.log(
          "[Dashboard] fetchData skipped. No businessId."
        );

        return;
      }

      try {
        setLoading(true);

        console.log(
          "[Dashboard] Fetching data for business:",
          businessId
        );

        const [
          appointmentsResult,
          customersResult,
        ] = await Promise.all([
          supabase
            .from("appointments")
            .select("*")
            .eq(
              "business_id",
              businessId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("customers")
            .select("*")
            .eq(
              "business_id",
              businessId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),
        ]);

        if (
          appointmentsResult.error
        ) {
          throw appointmentsResult.error;
        }

        if (
          customersResult.error
        ) {
          throw customersResult.error;
        }

        console.log(
          "[Dashboard] ACTIVE BUSINESS ID:",
          businessId
        );

        console.log(
          "[Dashboard] APPOINTMENTS:",
          appointmentsResult.data
        );

        console.log(
          "[Dashboard] CUSTOMERS:",
          customersResult.data
        );

        const normalisedAppointments =
          normalizeAppointments(
            appointmentsResult.data ||
              []
          );

        setAppointments(
          normalisedAppointments
        );

        setCustomers(
          normalizeCustomers(
            customersResult.data ||
              []
          )
        );
      } catch (error) {
        console.error(
          "[Dashboard] Fetch error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }, [businessId]);

  // ======================================================
  // AUTO REFRESH
  // ======================================================

  useEffect(() => {
    if (!businessId) {
      return;
    }

    fetchData();

    const channel =
      supabase
        .channel(
          `dashboard-${businessId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `business_id=eq.${businessId}`,
          },
          (payload) => {
            console.log(
              "[Dashboard] Appointment updated:",
              payload
            );

            fetchData();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customers",
            filter: `business_id=eq.${businessId}`,
          },
          (payload) => {
            console.log(
              "[Dashboard] Customer updated:",
              payload
            );

            fetchData();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    businessId,
    fetchData,
  ]);

  // ======================================================
  // APPOINTMENT LIFECYCLE
  // ======================================================

  const APPOINTMENT_ACTIVE_WINDOW_HOURS = 48;
  const NEW_LEAD_WINDOW_HOURS = 72;

  const parseAppointmentDateTime = useCallback((item) => {
    const rawDate =
      item?.appointment_date ||
      item?.date ||
      item?.scheduled_date ||
      "";

    const rawTime =
      item?.appointment_time ||
      item?.time ||
      item?.scheduled_time ||
      "";

    if (!rawDate) return null;

    if (
      typeof rawDate === "string" &&
      rawDate.includes("T") &&
      !rawTime
    ) {
      const direct = new Date(rawDate);
      return Number.isNaN(direct.getTime())
        ? null
        : direct;
    }

    const dateText = String(rawDate).trim();
    const timeText = String(rawTime || "").trim();

    if (!timeText) {
      const dateOnly = new Date(`${dateText}T00:00:00`);
      if (!Number.isNaN(dateOnly.getTime())) {
        return dateOnly;
      }

      const fallback = new Date(dateText);
      return Number.isNaN(fallback.getTime())
        ? null
        : fallback;
    }

    const ampmMatch = timeText
      .replace(/\s+/g, " ")
      .trim()
      .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

    if (ampmMatch) {
      let hour = Number(ampmMatch[1]);
      const minute = Number(ampmMatch[2] || "0");
      const meridiem = ampmMatch[3].toUpperCase();

      if (hour === 12) hour = 0;
      if (meridiem === "PM") hour += 12;

      const localDate =
        new Date(`${dateText}T00:00:00`);

      if (Number.isNaN(localDate.getTime())) {
        return null;
      }

      localDate.setHours(hour, minute, 0, 0);
      return localDate;
    }

    const combined = new Date(
      `${dateText}T${timeText}`
    );

    if (!Number.isNaN(combined.getTime())) {
      return combined;
    }

    const fallback = new Date(
      `${dateText} ${timeText}`
    );

    return Number.isNaN(fallback.getTime())
      ? null
      : fallback;
  }, []);

  const getLeadTimestamp = useCallback((item) => {
    const candidates = [
      item?.created_at,
      item?.updated_at,
      item?.appointment_date,
      item?.date,
    ].filter(Boolean);

    for (const value of candidates) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }

    return null;
  }, []);

  const bookingHistory = appointments;

  /*
   * Dashboard shows future appointments plus appointments from
   * the previous 48 hours. Older appointments remain in Bookings.
   */
  const dashboardAppointments = useMemo(() => {
    const now = Date.now();
    const activeWindowMs =
      APPOINTMENT_ACTIVE_WINDOW_HOURS *
      60 *
      60 *
      1000;

    return appointments.filter((item) => {
      const status = String(
        item?.Appointment_status ||
          item?.status ||
          item?.appointment_status ||
          ""
      ).toLowerCase().trim();

      if (status.includes("cancel")) {
        return false;
      }

      const scheduledAt =
        parseAppointmentDateTime(item);

      if (!scheduledAt) {
        return true;
      }

      return (
        scheduledAt.getTime() >= now ||
        now - scheduledAt.getTime() <= activeWindowMs
      );
    });
  }, [appointments, parseAppointmentDateTime]);

  const updateAppointmentOutcome = useCallback(
    async (appointment, nextStatus) => {
      if (!appointment || !businessId) {
        console.error("[Dashboard] Outcome update missing appointment or business ID.", {
          appointmentId: appointment?.id || appointment?.appointment_id,
          businessId,
        });
        setUpdateMessage("Could not update appointment: missing appointment or business ID.");
        return;
      }

      const rowId = appointment.id ? String(appointment.id) : "";
      const bookingId = appointment.appointment_id ? String(appointment.appointment_id) : "";
      if (!rowId && !bookingId) {
        setUpdateMessage("Could not update appointment: no database row ID or booking ID was loaded.");
        return;
      }

      setUpdatingAppointmentId(rowId || bookingId);
      setUpdateMessage("");

      const now = new Date().toISOString();
      const followupTypeMap = {
        visited: "post_visit",
        did_not_visit: "no_show",
        delayed: "delayed",
        rescheduled: "reschedule",
        cancelled: "cancelled",
      };
      const updatePayload = {
        attendance_status: nextStatus,
        attendance_updated_at: now,
        ai_followup_status: nextStatus === "cancelled" ? "skipped" : "pending",
        ai_followup_type: followupTypeMap[nextStatus] || "general",
        ai_followup_at: null,
        ai_followup_sent_at: null,
      };
      if (nextStatus === "cancelled") updatePayload.status = "Cancelled";

      try {
        // The appointments table has two identifiers: UUID `id` and text `appointment_id`.
        // Try the UUID first, then the Sodah booking ID, always scoped to this business.
        let data = null;
        let lastError = null;
        const attempts = [];
        if (rowId) attempts.push(["id", rowId]);
        if (bookingId && bookingId !== rowId) attempts.push(["appointment_id", bookingId]);

        for (const [column, value] of attempts) {
          const result = await supabase
            .from("appointments")
            .update(updatePayload)
            .eq(column, value)
            .eq("business_id", businessId)
            .select("*")
            .maybeSingle();

          if (result.error) {
            lastError = result.error;
            // A missing optional match is handled by trying the other identifier.
            if (result.error.code === "PGRST116") continue;
            throw result.error;
          }
          if (result.data) {
            data = result.data;
            break;
          }
        }

        if (!data) {
          if (lastError) throw lastError;
          throw new Error(
            `No appointment row matched business_id=${businessId} using id=${rowId || "(missing)"} or appointment_id=${bookingId || "(missing)"}. Check the loaded identifiers and Supabase UPDATE/RLS permissions.`
          );
        }

        console.log("[Dashboard] Appointment outcome saved to appointments table:", {
          id: data.id,
          appointment_id: data.appointment_id,
          business_id: data.business_id,
          attendance_status: data.attendance_status,
          ai_followup_status: data.ai_followup_status,
          ai_followup_type: data.ai_followup_type,
        });
        setUpdateMessage(`Appointment updated: ${formatAttendanceLabel(nextStatus)}. AI follow-up queued.`);
        await fetchData();
      } catch (error) {
        console.error("[Dashboard] Outcome update error:", {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          appointmentRowId: rowId,
          appointmentBookingId: bookingId,
          businessId,
        });
        setUpdateMessage(
          error?.code === "42501"
            ? "Could not update appointment: Supabase denied UPDATE access. Check the appointments UPDATE RLS policy for this business."
            : error?.message
              ? `Could not update appointment: ${error.message}`
              : "Could not update appointment. Check the browser console for details."
        );
      } finally {
        setUpdatingAppointmentId(null);
      }
    },
    [businessId, fetchData]
  );

  // ======================================================
  // MAIN STATS
  // ======================================================

  const total = dashboardAppointments.length;

  const booked = dashboardAppointments.filter(
    (a) =>
      String(
        a.Appointment_status ||
          a.status ||
          ""
      ).toLowerCase().trim() === "booked"
  ).length;

  const pending = dashboardAppointments.filter(
    (a) =>
      String(
        a.Appointment_status ||
          a.status ||
          ""
      ).toLowerCase().trim() === "pending"
  ).length;

  const visited = bookingHistory.filter(
    (a) => a.attendance_status === "visited"
  ).length;

  const didNotVisit = bookingHistory.filter(
    (a) => a.attendance_status === "did_not_visit"
  ).length;

  // ======================================================
  // PIE DATA
  // ======================================================

  const pieData = [
    {
      name: "Booked",
      value: booked,
    },
    {
      name: "Pending",
      value: pending,
    },
  ];

  // ======================================================
  // WEEKLY ACTIVITY
  // ======================================================

  const activityData = useMemo(() => {
    const weeklyActivity = [
      { name: "Mon", value: 0 },
      { name: "Tue", value: 0 },
      { name: "Wed", value: 0 },
      { name: "Thu", value: 0 },
      { name: "Fri", value: 0 },
      { name: "Sat", value: 0 },
      { name: "Sun", value: 0 },
    ];

    const dayMap = {
      1: 0,
      2: 1,
      3: 2,
      4: 3,
      5: 4,
      6: 5,
      0: 6,
    };

    appointments.forEach((item) => {
      const rawDate =
        item.appointment_date ||
        item.created_at;

      if (!rawDate) return;

      const date = new Date(rawDate);

      if (Number.isNaN(date.getTime())) return;

      const index = dayMap[date.getDay()];

      if (index !== undefined) {
        weeklyActivity[index].value += 1;
      }
    });

    return weeklyActivity;
  }, [appointments]);

  // ======================================================
  // UNIQUE CUSTOMERS
  // ======================================================

  const uniqueCustomers = useMemo(() => {
    const merged = [
      ...customers,
      ...appointments,
    ];

    return Array.from(
      new Map(
        merged.map((item, index) => [
          item.Phone ||
            item.phone ||
            item.id ||
            `temp-${index}`,
          item,
        ])
      ).values()
    );
  }, [customers, appointments]);

  // ======================================================
  // NEW LEADS
  // ======================================================

  const newLeads = useMemo(() => {
    const now = Date.now();
    const windowMs =
      NEW_LEAD_WINDOW_HOURS *
      60 *
      60 *
      1000;

    return uniqueCustomers.filter((customer) => {
      const status = String(
        customer?.lead_status ||
          customer?.leadStatus ||
          ""
      ).toLowerCase();

      if (!status.includes("new")) {
        return false;
      }

      const timestamp = getLeadTimestamp(customer);

      if (!timestamp) {
        return true;
      }

      return now - timestamp <= windowMs;
    });
  }, [uniqueCustomers, getLeadTimestamp]);

  // ======================================================
  // HOT LEADS
  // ======================================================

  const hotLeads = useMemo(
    () =>
      uniqueCustomers.filter((customer) => {
        const status = String(
          customer.lead_status ||
            customer.leadStatus ||
            ""
        ).toLowerCase();

        const service = String(
          customer.service ||
            customer.Service ||
            customer.customer_message ||
            ""
        ).toLowerCase();

        return (
          status.includes("hot") ||
          service.includes("price") ||
          service.includes("book") ||
          service.includes("appointment") ||
          service.includes("today") ||
          service.includes("available")
        );
      }),
    [uniqueCustomers]
  );

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div
        className={`flex h-screen items-center justify-center ${
          darkMode
            ? "bg-[#020617] text-white"
            : "bg-gray-200 text-black"
        }`}
      >
        <div
          className={`p-6 rounded-xl shadow-xl ${
            darkMode
              ? "bg-[#0f172a]"
              : "bg-white"
          }`}
        >
          Loading dashboard...
        </div>
      </div>
    );
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <>
      {/* ==================================================
          TENANT-AWARE BACK BUTTON
      ================================================== */}

      <div className="fixed top-4 left-4 z-[9999]">
        <button
          type="button"
          onClick={
            handleBackToChannels
          }
          disabled={!businessId}
          className="
            px-4
            py-2
            rounded-lg
            bg-blue-500
            text-white
            hover:bg-blue-600
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          ← Back
        </button>
      </div>

      <div
        className={`flex h-screen transition-all duration-300 ${
          darkMode
            ? "bg-[#020617] text-white"
            : "bg-gray-200 text-black"
        }`}
      >
        {/* ==================================================
            SIDEBAR
        ================================================== */}

        <DashboardSidebar
          activePage={activePage}
          setActivePage={
            setActivePage
          }
        />

        {/* ==================================================
            MAIN CONTENT
        ================================================== */}

        <div className="flex-1 p-6 overflow-hidden">
          {/* DASHBOARD */}

          {activePage ===
            "Dashboard" && (
            <>
              <div className="flex justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold">
                    Dashboard
                  </h1>

                  <p className="text-xs opacity-50 mt-1">
                    Business ID:{" "}
                    {businessId ||
                      "Loading..."}
                  </p>
                </div>

                <p>
                  Welcome back
                </p>
              </div>

              {updateMessage ? (
                <div
                  className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                    updateMessage.startsWith("Could not")
                      ? "border-red-500/40 bg-red-500/10 text-red-300"
                      : "border-green-500/40 bg-green-500/10 text-green-300"
                  }`}
                >
                  {updateMessage}
                </div>
              ) : null}

              {/* STATS */}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Card
                  title="Total Bookings"
                  value={total}
                  color="blue"
                />

                <Card
                  title="Booked"
                  value={booked}
                  color="green"
                />

                <Card
                  title="Pending"
                  value={pending}
                  color="yellow"
                />

                <Card
                  title="Success %"
                  value={
                    total
                      ? `${Math.round(
                          (booked /
                            total) *
                            100
                        )}%`
                      : "0%"
                  }
                  color="purple"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <MiniStat
                  label="Visited"
                  value={visited}
                  darkMode={darkMode}
                  tone="green"
                />
                <MiniStat
                  label="Did Not Visit"
                  value={didNotVisit}
                  darkMode={darkMode}
                  tone="red"
                />
                <MiniStat
                  label="New Leads"
                  value={newLeads.length}
                  darkMode={darkMode}
                  tone="blue"
                />
                <MiniStat
                  label="Hot Leads"
                  value={hotLeads.length}
                  darkMode={darkMode}
                  tone="orange"
                />
              </div>

              {/* CHARTS */}

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* BOOKING STATUS */}

                <div
                  className={`p-3 rounded-xl shadow-xl ${
                    darkMode
                      ? "bg-[#0f172a]"
                      : "bg-white"
                  }`}
                >
                  <h3 className="text-xs font-semibold mb-1">
                    Booking Status
                  </h3>

                  <ResponsiveContainer
                    width="100%"
                    height={120}
                  >
                    <PieChart>
                      <Pie
                        data={
                          pieData
                        }
                        dataKey="value"
                        innerRadius={
                          45
                        }
                        outerRadius={
                          60
                        }
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#facc15" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* WEEKLY ACTIVITY */}

                <div
                  className={`p-3 rounded-xl shadow-xl ${
                    darkMode
                      ? "bg-[#0f172a]"
                      : "bg-white"
                  }`}
                >
                  <h3 className="text-xs font-semibold mb-1">
                    Weekly Chat Activity
                  </h3>

                  <ResponsiveContainer
                    width="100%"
                    height={120}
                  >
                    <BarChart
                      data={
                        activityData
                      }
                    >
                      <XAxis
                        dataKey="name"
                        stroke={
                          darkMode
                            ? "#ffffff"
                            : "#000000"
                        }
                        fontSize={10}
                      />

                      <YAxis hide />

                      <Tooltip />

                      <Bar
                        dataKey="value"
                        fill="#3b82f6"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <AppointmentsTable
                appointments={
                  dashboardAppointments
                }
                title="Active Appointment Queue"
                subtitle="Future appointments + the last 48 hours"
                darkMode={
                  darkMode
                }
                onOutcomeChange={
                  updateAppointmentOutcome
                }
                updatingAppointmentId={
                  updatingAppointmentId
                }
              />
            </>
          )}

          {/* BOOKINGS */}

          {activePage ===
            "Bookings" && (
            <AppointmentsTable
              appointments={
                bookingHistory
              }
              title="All Bookings"
              subtitle="Complete appointment history"
              full
              darkMode={
                darkMode
              }
              onOutcomeChange={
                updateAppointmentOutcome
              }
              updatingAppointmentId={
                updatingAppointmentId
              }
            />
          )}

          {/* CUSTOMERS */}

          {activePage ===
            "Customers" && (
            <CustomersTable
              customers={
                uniqueCustomers
              }
              title="Customers"
              darkMode={
                darkMode
              }
            />
          )}

          {/* NEW LEADS */}

          {activePage ===
            "New Leads" && (
            <CustomersTable
              customers={
                newLeads
              }
              title="New Leads"
              statusLabel="New Lead"
              statusColor="text-blue-400"
              darkMode={
                darkMode
              }
            />
          )}

          {/* HOT LEADS */}

          {activePage ===
            "Hot Leads" && (
            <CustomersTable
              customers={
                hotLeads
              }
              title="Hot Leads"
              statusLabel="🔥 Hot Lead"
              statusColor="text-red-400 font-bold"
              darkMode={
                darkMode
              }
            />
          )}

          {/* CALENDAR */}

          {activePage ===
            "Calendar" && (
            <iframe
              src="https://calendar.google.com/calendar/embed?src=en.ae%23holiday%40group.v.calendar.google.com"
              className="w-full h-full border rounded-xl"
              title="Google Calendar"
            />
          )}

          {/* REPORTS */}

          {activePage ===
            "Reports" && (
            <div
              className={`p-6 rounded-xl shadow-xl ${
                darkMode
                  ? "bg-[#0f172a]"
                  : "bg-white"
              }`}
            >
              <h2 className="font-bold mb-4">
                Daily Report
              </h2>

              <p>
                Active Dashboard Bookings:{" "}
                {dashboardAppointments.length}
              </p>

              <p>
                Total Booking History:{" "}
                {bookingHistory.length}
              </p>

              <p>
                Booked: {booked}
              </p>

              <p>
                Pending: {pending}
              </p>

              <p>
                Visited: {visited}
              </p>

              <p>
                Did Not Visit: {didNotVisit}
              </p>

              <p>
                New Leads:{" "}
                {newLeads.length}
              </p>

              <p>
                Hot Leads:{" "}
                {hotLeads.length}
              </p>

              <textarea
                className={`w-full mt-4 p-2 rounded border ${
                  darkMode
                    ? "bg-[#1e293b] border-gray-700 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
                placeholder="Write report..."
              />

              <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
                Download Report
              </button>
            </div>
          )}

          {/* SETTINGS */}

          {activePage ===
            "Settings" && (
            <div
              className={`p-6 rounded-xl shadow-xl ${
                darkMode
                  ? "bg-[#0f172a]"
                  : "bg-white"
              }`}
            >
              <h2 className="font-bold text-xl mb-4">
                Settings
              </h2>

              <div className="flex items-center justify-between">
                <span>
                  Dashboard Dark Mode
                </span>

                <button
                  onClick={
                    toggleDarkMode
                  }
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    darkMode
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-black"
                  }`}
                >
                  {darkMode
                    ? "ON"
                    : "OFF"}
                </button>
              </div>
            </div>
          )}
        </div>

        <DashboardRefresher />
      </div>
    </>
  );
}

// ======================================================
// AI LIVE
// ======================================================

function AILiveIndicator() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex space-x-2">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>

      <p className="text-xs text-gray-300 mt-3">
        AI is responding...
      </p>

      <style jsx>{`
        .dot {
          width: 8px;
          height: 8px;
          background: #38bdf8;
          border-radius: 50%;
          animation: bounce 1.4s infinite
            ease-in-out both;
        }

        .dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: scale(0);
          }

          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

// ======================================================
// SIDEBAR ITEM
// ======================================================

function SidebarItem({
  title,
  active,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 rounded-md cursor-pointer text-sm mb-1 ${
        active
          ? "bg-green-500 text-white"
          : "hover:bg-white/10"
      }`}
    >
      {title}
    </div>
  );
}

function formatAttendanceLabel(status) {
  const labels = {
    visited: "Visited",
    did_not_visit: "Did Not Visit",
    delayed: "Delayed",
    rescheduled: "Rescheduled",
    cancelled: "Cancelled",
  };

  return labels[status] || "Updated";
}

// ======================================================
// MINI STAT
// ======================================================

function MiniStat({
  label,
  value,
  darkMode,
  tone = "blue",
}) {
  const tones = {
    green: darkMode
      ? "border-green-500/30 bg-green-500/10 text-green-300"
      : "border-green-200 bg-green-50 text-green-700",
    red: darkMode
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-red-200 bg-red-50 text-red-700",
    blue: darkMode
      ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
      : "border-blue-200 bg-blue-50 text-blue-700",
    orange: darkMode
      ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
      : "border-orange-200 bg-orange-50 text-orange-700",
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        tones[tone] || tones.blue
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

// ======================================================
// CARD
// ======================================================

function Card({
  title,
  value,
  color,
}) {
  const styles = {
    blue:
      "bg-gradient-to-r from-blue-500 to-blue-600 text-white",

    green:
      "bg-gradient-to-r from-green-500 to-green-600 text-white",

    yellow:
      "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",

    purple:
      "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
  };

  return (
    <div
      className={`p-4 rounded-xl shadow-xl ${styles[color]}`}
    >
      <p className="text-xs">
        {title}
      </p>

      <h3 className="text-xl font-bold">
        {value}
      </h3>
    </div>
  );
}

// ======================================================
// CUSTOMERS TABLE
// ======================================================

function CustomersTable({
  customers,
  title,
  statusLabel,
  statusColor = "text-gray-700",
  darkMode,
}) {
  return (
    <div
      className={`p-4 md:p-6 rounded-xl shadow-xl h-full overflow-hidden flex flex-col ${
        darkMode ? "bg-[#0f172a]" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="font-bold text-lg">
            {title}
          </h2>
          <p
            className={`text-xs mt-1 ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {statusLabel
              ? "Recent lead records"
              : "Customer records and requested services"}
          </p>
        </div>

        <div
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
            darkMode
              ? "border-slate-700 bg-slate-900 text-slate-300"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {customers.length} records
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-slate-500/40">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead
            className={`sticky top-0 z-10 ${
              darkMode
                ? "bg-[#1e293b] text-white"
                : "bg-blue-100 text-slate-900"
            }`}
          >
            <tr>
              <th className="border border-slate-500/40 px-3 py-3 text-left w-14">
                #
              </th>
              <th className="border border-slate-500/40 px-3 py-3 text-left">
                Name
              </th>
              <th className="border border-slate-500/40 px-3 py-3 text-left">
                Phone
              </th>
              <th className="border border-slate-500/40 px-3 py-3 text-left">
                Service / Request
              </th>
              <th className="border border-slate-500/40 px-3 py-3 text-left">
                Lead Status
              </th>
            </tr>
          </thead>

          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border border-slate-500/40 px-4 py-10 text-center text-slate-400"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              customers.map((customer, index) => (
                <tr
                  key={
                    customer.id ||
                    `${customer.Phone}-${index}`
                  }
                  className={
                    darkMode
                      ? index % 2 === 0
                        ? "bg-[#111c2f]"
                        : "bg-[#0f172a]"
                      : index % 2 === 0
                      ? "bg-slate-50"
                      : "bg-white"
                  }
                >
                  <td className="border border-slate-500/40 px-3 py-3 text-slate-400">
                    {index + 1}
                  </td>

                  <td className="border border-slate-500/40 px-3 py-3 font-semibold">
                    {customer.Name ||
                      customer.name ||
                      "Unknown"}
                  </td>

                  <td className="border border-slate-500/40 px-3 py-3">
                    {customer.Phone ||
                      customer.phone ||
                      "No phone"}
                  </td>

                  <td className="border border-slate-500/40 px-3 py-3">
                    {customer.service ||
                      customer.Service ||
                      customer.customer_message ||
                      "No service/request"}
                  </td>

                  <td
                    className={`border border-slate-500/40 px-3 py-3 ${
                      statusLabel
                        ? statusColor
                        : darkMode
                        ? "text-slate-300"
                        : "text-slate-700"
                    }`}
                  >
                    {statusLabel ||
                      customer.lead_status ||
                      customer.leadStatus ||
                      "New"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ======================================================
// APPOINTMENTS TABLE
// ======================================================

function AppointmentsTable({
  appointments,
  title = "Appointment Bookings",
  subtitle,
  full,
  darkMode,
  onOutcomeChange,
  updatingAppointmentId,
}) {
  return (
    <div
      className={`rounded-xl shadow-xl p-4 md:p-5 flex flex-col ${
        full ? "h-full" : "h-[430px]"
      } ${
        darkMode ? "bg-[#0f172a]" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="text-sm font-bold">
            {title}
          </h3>
          {subtitle ? (
            <p
              className={`text-xs mt-1 ${
                darkMode
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        <div
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
            darkMode
              ? "border-slate-700 bg-slate-900 text-slate-300"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {appointments.length} bookings
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-slate-500/50">
        <table className="w-full min-w-[1120px] border-collapse text-sm">
          <thead
            className={`sticky top-0 z-10 ${
              darkMode
                ? "bg-[#1e293b] text-white"
                : "bg-blue-100 text-slate-900"
            }`}
          >
            <tr>
              <th className="border border-slate-500/50 px-3 py-3 text-left w-14">
                #
              </th>
              <th className="border border-slate-500/50 px-3 py-3 text-left">
                Name
              </th>
              <th className="border border-slate-500/50 px-3 py-3 text-left">
                Phone
              </th>
              <th className="border border-slate-500/50 px-3 py-3 text-left">
                Service
              </th>
              <th className="border border-slate-500/50 px-3 py-3 text-left">
                Date
              </th>
              <th className="border border-slate-500/50 px-3 py-3 text-left">
                Time
              </th>
              <th className="border border-slate-500/50 px-3 py-3 text-left">
                Booking Status
              </th>
              <th className="border border-slate-500/50 px-3 py-3 text-left min-w-[190px]">
                Visit / Outcome
              </th>
            </tr>
          </thead>

          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="border border-slate-500/50 px-4 py-12 text-center text-slate-400"
                >
                  No appointments found.
                </td>
              </tr>
            ) : (
              appointments.map((item, index) => {
                const outcome =
                  item.attendance_status || "";

                const rowKey =
                  item.id ||
                  `${item.Phone}-${item.Date}-${index}`;

                return (
                  <tr
                    key={rowKey}
                    className={
                      darkMode
                        ? index % 2 === 0
                          ? "bg-[#111c2f]"
                          : "bg-[#0f172a]"
                        : index % 2 === 0
                        ? "bg-slate-50"
                        : "bg-white"
                    }
                  >
                    <td className="border border-slate-500/50 px-3 py-3 text-slate-400">
                      {index + 1}
                    </td>

                    <td className="border border-slate-500/50 px-3 py-3 font-semibold">
                      {item.Name || "Unknown"}
                    </td>

                    <td className="border border-slate-500/50 px-3 py-3">
                      {item.Phone || "No phone"}
                    </td>

                    <td className="border border-slate-500/50 px-3 py-3">
                      {item.Service ||
                        item.service ||
                        "—"}
                    </td>

                    <td className="border border-slate-500/50 px-3 py-3">
                      {item.Date || "—"}
                    </td>

                    <td className="border border-slate-500/50 px-3 py-3">
                      {item.Time || "—"}
                    </td>

                    <td className="border border-slate-500/50 px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          String(
                            item.Appointment_status ||
                              item.status ||
                              ""
                          )
                            .toLowerCase()
                            .includes("book")
                            ? "bg-green-500/15 text-green-500"
                            : String(
                                item.Appointment_status ||
                                  item.status ||
                                  ""
                              )
                                .toLowerCase()
                                .includes("cancel")
                            ? "bg-red-500/15 text-red-500"
                            : "bg-yellow-500/15 text-yellow-500"
                        }`}
                      >
                        {item.Appointment_status ||
                          item.status ||
                          "Pending"}
                      </span>
                    </td>

                    <td className="border border-slate-500/50 px-3 py-2">
                      <select
                        value={outcome}
                        disabled={
                          !onOutcomeChange ||
                          updatingAppointmentId === item.id
                        }
                        onChange={(event) =>
                          onOutcomeChange?.(
                            item,
                            event.target.value
                          )
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold outline-none transition ${
                          darkMode
                            ? "border-slate-600 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-800"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <option value="">
                          Select outcome
                        </option>
                        <option value="visited">
                          Visited
                        </option>
                        <option value="did_not_visit">
                          Did Not Visit
                        </option>
                        <option value="delayed">
                          Delayed
                        </option>
                        <option value="rescheduled">
                          Rescheduled
                        </option>
                        <option value="cancelled">
                          Cancelled
                        </option>
                      </select>

                      {updatingAppointmentId === item.id ? (
                        <p className="mt-1 text-[10px] text-blue-400">
                          Saving...
                        </p>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ======================================================
// DASHBOARD REFRESHER
// ======================================================

function DashboardRefresher() {
  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    const interval =
      setInterval(() => {
        setLoading(true);

        setTimeout(() => {
          setLoading(false);
        }, 1500);
      }, 5000);

    return () =>
      clearInterval(interval);
  }, []);

  return (
    <div
      className="
        fixed
        bottom-4
        right-4
        z-50
        bg-[#0f172a]
        text-white
        px-4
        py-3
        rounded-xl
        shadow-2xl
        border
        border-green-500
      "
    >
      <div className="flex items-center gap-2">
        {loading ? (
          <>
            <span className="animate-spin">
              ⟳
            </span>

            <span className="text-xs">
              Syncing Dashboard...
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />

            <span className="text-xs">
              Dashboard Live
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ======================================================
// PRODUCTION SUSPENSE WRAPPER
// ======================================================
//
// Next.js requires useSearchParams() to be rendered inside
// a Suspense boundary during production prerendering.
//

function DashboardLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-200 text-black">
      <div className="rounded-xl bg-white p-6 shadow-xl">
        Loading dashboard...
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
