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
  // MAIN STATS
  // ======================================================

  const total =
    appointments.length;

  const booked =
    appointments.filter(
      (a) =>
        String(
          a.Appointment_status ||
            ""
        )
          .toLowerCase()
          .trim() === "booked"
    ).length;

  const pending =
    appointments.filter(
      (a) =>
        String(
          a.Appointment_status ||
            ""
        )
          .toLowerCase()
          .trim() === "pending"
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

  const activityData =
    useMemo(() => {
      const weeklyActivity = [
        {
          name: "Mon",
          value: 0,
        },
        {
          name: "Tue",
          value: 0,
        },
        {
          name: "Wed",
          value: 0,
        },
        {
          name: "Thu",
          value: 0,
        },
        {
          name: "Fri",
          value: 0,
        },
        {
          name: "Sat",
          value: 0,
        },
        {
          name: "Sun",
          value: 0,
        },
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

      appointments.forEach(
        (item) => {
          const rawDate =
            item.appointment_date ||
            item.created_at;

          if (!rawDate) {
            return;
          }

          const date =
            new Date(rawDate);

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return;
          }

          const index =
            dayMap[
              date.getDay()
            ];

          if (
            index !== undefined
          ) {
            weeklyActivity[
              index
            ].value += 1;
          }
        }
      );

      return weeklyActivity;
    }, [appointments]);

  // ======================================================
  // UNIQUE CUSTOMERS
  // ======================================================

  const uniqueCustomers =
    useMemo(() => {
      const merged = [
        ...customers,
        ...appointments,
      ];

      return Array.from(
        new Map(
          merged.map(
            (
              item,
              index
            ) => [
              item.Phone ||
                item.phone ||
                item.id ||
                `temp-${index}`,
              item,
            ]
          )
        ).values()
      );
    }, [
      customers,
      appointments,
    ]);

  // ======================================================
  // NEW LEADS
  // ======================================================

  const newLeads =
    uniqueCustomers.filter(
      (customer) => {
        const status =
          String(
            customer.lead_status ||
              customer.leadStatus ||
              "new"
          ).toLowerCase();

        return status.includes(
          "new"
        );
      }
    );

  // ======================================================
  // HOT LEADS
  // ======================================================

  const hotLeads =
    uniqueCustomers.filter(
      (customer) => {
        const status =
          String(
            customer.lead_status ||
              customer.leadStatus ||
              ""
          ).toLowerCase();

        const service =
          String(
            customer.service ||
              customer.Service ||
              customer.customer_message ||
              ""
          ).toLowerCase();

        return (
          status.includes("hot") ||
          service.includes(
            "price"
          ) ||
          service.includes(
            "book"
          ) ||
          service.includes(
            "appointment"
          ) ||
          service.includes(
            "today"
          ) ||
          service.includes(
            "available"
          )
        );
      }
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

              {/* STATS */}

              <div className="grid grid-cols-4 gap-4 mb-4">
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
                  appointments
                }
                darkMode={
                  darkMode
                }
              />
            </>
          )}

          {/* BOOKINGS */}

          {activePage ===
            "Bookings" && (
            <AppointmentsTable
              appointments={
                appointments
              }
              full
              darkMode={
                darkMode
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
                Total Bookings:{" "}
                {total}
              </p>

              <p>
                Booked: {booked}
              </p>

              <p>
                Pending: {pending}
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
      className={`p-6 rounded-xl shadow-xl h-full overflow-y-auto ${
        darkMode
          ? "bg-[#0f172a]"
          : "bg-white"
      }`}
    >
      <h2 className="font-bold mb-4 text-lg">
        {title}
      </h2>

      <div
        className={`grid grid-cols-4 text-sm font-bold px-3 py-2 rounded mb-2 ${
          darkMode
            ? "bg-[#1e293b]"
            : "bg-gray-300"
        }`}
      >
        <div>#</div>
        <div>Name</div>
        <div>Phone</div>
        <div>
          {statusLabel
            ? "Status"
            : "Service"}
        </div>
      </div>

      {customers.map(
        (
          customer,
          index
        ) => (
          <div
            key={
              customer.id ||
              `${customer.Phone}-${index}`
            }
            className={`grid grid-cols-4 px-3 py-2 text-sm ${
              darkMode
                ? index % 2 === 0
                  ? "bg-[#1e293b]"
                  : "bg-[#0f172a]"
                : index % 2 === 0
                ? "bg-gray-100"
                : "bg-white"
            }`}
          >
            <div className="text-gray-400">
              {index + 1}
            </div>

            <div className="font-medium">
              {customer.Name ||
                "Unknown"}
            </div>

            <div>
              {customer.Phone ||
                "No phone"}
            </div>

            <div
              className={
                statusLabel
                  ? statusColor
                  : darkMode
                  ? "font-medium text-white"
                  : "font-medium text-gray-900"
              }
            >
              {statusLabel
                ? statusLabel
                : customer.service ||
                  customer.Service ||
                  "No service"}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ======================================================
// APPOINTMENTS TABLE
// ======================================================

function AppointmentsTable({
  appointments,
  full,
  darkMode,
}) {
  return (
    <div
      className={`rounded-xl shadow-xl p-4 flex flex-col ${
        full
          ? "h-full"
          : "h-[380px]"
      } ${
        darkMode
          ? "bg-[#0f172a]"
          : "bg-white"
      }`}
    >
      <h3 className="text-sm font-semibold mb-2">
        Appointment Bookings
      </h3>

      <div
        className={`grid grid-cols-6 text-xs font-bold px-2 py-2 rounded ${
          darkMode
            ? "bg-[#1e293b]"
            : "bg-blue-200"
        }`}
      >
        <div>#</div>
        <div>Name</div>
        <div>Phone</div>
        <div>Date</div>
        <div>Time</div>
        <div>Status</div>
      </div>

      <div
        className={`overflow-y-auto mt-2 ${
          full ? "flex-1" : ""
        }`}
      >
        {appointments.length ===
        0 ? (
          <div className="p-4 text-center text-gray-400">
            No appointments
            found.
          </div>
        ) : (
          appointments.map(
            (
              item,
              index
            ) => (
              <div
                key={
                  item.id ||
                  `${item.Phone}-${item.Date}-${index}`
                }
                className={`grid grid-cols-6 text-sm px-2 ${
                  darkMode
                    ? index % 2 === 0
                      ? "bg-[#1e293b]"
                      : "bg-[#0f172a]"
                    : index % 2 === 0
                    ? "bg-gray-200"
                    : "bg-white"
                }`}
                style={{
                  height: "40px",
                  alignItems:
                    "center",
                }}
              >
                <div>
                  {index + 1}
                </div>

                <div>
                  {item.Name}
                </div>

                <div>
                  {item.Phone}
                </div>

                <div>
                  {item.Date}
                </div>

                <div>
                  {item.Time}
                </div>

                <div>
                  {
                    item.Appointment_status
                  }
                </div>
              </div>
            )
          )
        )}
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
