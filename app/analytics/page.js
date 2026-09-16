"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function AnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ======================================================
  // STATE
  // ======================================================

  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState(null);

  // ======================================================
  // BUSINESS ID
  // ======================================================
  //
  // Priority:
  //
  // 1. URL ?businessId=
  // 2. localStorage business_id
  // 3. Authenticated user's business record
  //
  // The business ID is the tenant boundary.
  // ======================================================

  const resolveBusinessId = useCallback(async () => {
    try {
      // --------------------------------------------------
      // 1. CHECK URL
      // --------------------------------------------------

      const urlBusinessId =
        searchParams?.get("businessId")?.trim() || null;

      // --------------------------------------------------
      // 2. CHECK LOCAL STORAGE
      // --------------------------------------------------

      const storedBusinessId =
        typeof window !== "undefined"
          ? localStorage.getItem("business_id")
          : null;

      const candidateBusinessId =
        urlBusinessId || storedBusinessId || null;

      // --------------------------------------------------
      // GET CURRENT SESSION
      // --------------------------------------------------

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "[Analytics] Session error:",
          sessionError
        );

        return null;
      }

      const userId = session?.user?.id;

      if (!userId) {
        console.error(
          "[Analytics] No authenticated user."
        );

        return null;
      }

      // --------------------------------------------------
      // 3. IF WE HAVE A BUSINESS ID, VERIFY OWNERSHIP
      // --------------------------------------------------

      if (candidateBusinessId) {
        console.log(
          "[Analytics] Verifying business:",
          candidateBusinessId
        );

        const {
          data: business,
          error: businessError,
        } = await supabase
          .from("businesses")
          .select("business_id, user_id")
          .eq("business_id", candidateBusinessId)
          .eq("user_id", userId)
          .maybeSingle();

        if (businessError) {
          console.error(
            "[Analytics] Business verification error:",
            businessError
          );

          return null;
        }

        if (business?.business_id) {
          console.log(
            "[Analytics] Verified business:",
            business.business_id
          );

          return business.business_id;
        }

        console.warn(
          "[Analytics] Supplied business ID does not belong to current user."
        );
      }

      // --------------------------------------------------
      // 4. FALLBACK TO USER'S BUSINESS
      // --------------------------------------------------

      console.log(
        "[Analytics] Finding business for user:",
        userId
      );

      const {
        data: userBusiness,
        error: userBusinessError,
      } = await supabase
        .from("businesses")
        .select("business_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (userBusinessError) {
        console.error(
          "[Analytics] User business lookup error:",
          userBusinessError
        );

        return null;
      }

      if (!userBusiness?.business_id) {
        console.error(
          "[Analytics] No business linked to this account."
        );

        return null;
      }

      console.log(
        "[Analytics] Resolved business:",
        userBusiness.business_id
      );

      return userBusiness.business_id;
    } catch (error) {
      console.error(
        "[Analytics] Business resolution error:",
        error
      );

      return null;
    }
  }, [searchParams]);

  // ======================================================
  // INITIAL BUSINESS LOAD
  // ======================================================

  useEffect(() => {
    let mounted = true;

    const initializeBusiness = async () => {
      setLoading(true);

      const resolvedBusinessId =
        await resolveBusinessId();

      if (!mounted) {
        return;
      }

      if (!resolvedBusinessId) {
        setBusinessId(null);
        setLoading(false);
        return;
      }

      // --------------------------------------------------
      // SAVE BUSINESS ID
      // --------------------------------------------------

      setBusinessId(resolvedBusinessId);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "business_id",
          resolvedBusinessId
        );
      }

      // --------------------------------------------------
      // KEEP BUSINESS ID IN URL
      // --------------------------------------------------

      const currentUrlBusinessId =
        searchParams?.get("businessId");

      if (
        currentUrlBusinessId !==
        resolvedBusinessId
      ) {
        router.replace(
          `/analytics?businessId=${encodeURIComponent(
            resolvedBusinessId
          )}`
        );
      }
    };

    initializeBusiness();

    return () => {
      mounted = false;
    };
  }, [
    resolveBusinessId,
    router,
    searchParams,
  ]);

  // ======================================================
  // FETCH DATA
  // ======================================================

  const fetchData = useCallback(
    async (showLoader = true) => {
      if (!businessId) {
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        console.log(
          "[Analytics] Fetching data for business:",
          businessId
        );

        // ------------------------------------------------
        // APPOINTMENTS
        // ------------------------------------------------

        const appointmentsPromise =
          supabase
            .from("appointments")
            .select("*")
            .eq(
              "business_id",
              businessId
            )
            .order("created_at", {
              ascending: true,
            });

        // ------------------------------------------------
        // CUSTOMERS
        // ------------------------------------------------

        const customersPromise =
          supabase
            .from("customers")
            .select("*")
            .eq(
              "business_id",
              businessId
            )
            .order("created_at", {
              ascending: true,
            });

        const [
          appointmentsResult,
          customersResult,
        ] = await Promise.all([
          appointmentsPromise,
          customersPromise,
        ]);

        // ------------------------------------------------
        // HANDLE APPOINTMENT ERROR
        // ------------------------------------------------

        if (appointmentsResult.error) {
          throw appointmentsResult.error;
        }

        // ------------------------------------------------
        // HANDLE CUSTOMER ERROR
        // ------------------------------------------------

        if (customersResult.error) {
          throw customersResult.error;
        }

        // ------------------------------------------------
        // NORMALIZE APPOINTMENTS
        // ------------------------------------------------

        const normalizedAppointments = (
          appointmentsResult.data || []
        ).map((item) => ({
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

          created_at:
            item.created_at,
        }));

        // ------------------------------------------------
        // NORMALIZE CUSTOMERS
        // ------------------------------------------------

        const normalizedCustomers = (
          customersResult.data || []
        ).map((item) => ({
          ...item,

          Name:
            item.name ||
            "Unknown",

          Phone:
            item.phone ||
            "No phone",

          lead_status:
            item.lead_status ||
            "new",

          Query:
            item.customer_message ||
            item.query ||
            "",
        }));

        console.log(
          "[Analytics] Appointments:",
          normalizedAppointments
        );

        console.log(
          "[Analytics] Customers:",
          normalizedCustomers
        );

        // ------------------------------------------------
        // UPDATE STATE
        // ------------------------------------------------

        setAppointments(
          normalizedAppointments
        );

        setCustomers(
          normalizedCustomers
        );
      } catch (error) {
        console.error(
          "[Analytics] Fetch error:",
          error
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [businessId]
  );

  // ======================================================
  // INITIAL FETCH + LIVE REFRESH
  // ======================================================

  useEffect(() => {
    if (!businessId) {
      return;
    }

    fetchData(true);

    const interval = setInterval(() => {
      fetchData(false);
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [businessId, fetchData]);

  // ======================================================
  // REAL-TIME SUPABASE LISTENER
  // ======================================================

  useEffect(() => {
    if (!businessId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `analytics-${businessId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `business_id=eq.${businessId}`,
          },
          () => {
            console.log(
              "[Analytics] Appointment change detected."
            );

            fetchData(false);
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
          () => {
            console.log(
              "[Analytics] Customer change detected."
            );

            fetchData(false);
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [businessId, fetchData]);

  // ======================================================
  // SUMMARY METRICS
  // ======================================================

  const total =
    appointments.length;

  const booked =
    appointments.filter(
      (item) =>
        String(
          item.Appointment_status ||
            ""
        )
          .toLowerCase()
          .trim() === "booked"
    ).length;

  const pending =
    appointments.filter(
      (item) =>
        String(
          item.Appointment_status ||
            ""
        )
          .toLowerCase()
          .trim() === "pending"
    ).length;

  const success = total
    ? Math.round(
        (booked / total) * 100
      )
    : 0;

  const reminders =
    Math.floor(total * 0.25);

  const followUps =
    Math.floor(total * 0.35);

  // ======================================================
  // BOOKING TREND
  // ======================================================

  const trendData = useMemo(() => {
    const recent =
      appointments.slice(-30);

    return recent.map(
      (item, index) => ({
        name: `D${index + 1}`,

        value:
          String(
            item.Appointment_status ||
              ""
          )
            .toLowerCase()
            .trim() === "booked"
            ? 1
            : 0,
      })
    );
  }, [appointments]);

  // ======================================================
  // BOOKING STATUS
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

  const COLORS = [
    "#22c55e",
    "#facc15",
  ];

  // ======================================================
  // MONTHLY REPORT
  // ======================================================

  const monthlyReportData = [
    {
      name: "Total",
      value: total,
    },
    {
      name: "Booked",
      value: booked,
    },
    {
      name: "Pending",
      value: pending,
    },
    {
      name: "Success",
      value: success,
    },
  ];

  // ======================================================
  // WEEKLY REPORT
  // ======================================================

  const weeklyReportData =
    useMemo(() => {
      const weekly = [
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
            item.created_at ||
            item.Date;

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
            weekly[index].value +=
              1;
          }
        }
      );

      return weekly;
    }, [appointments]);

  // ======================================================
  // BACK TO CHANNELS
  // ======================================================

  const handleBackToChannels =
    useCallback(() => {
      const activeBusinessId =
        businessId ||
        (typeof window !==
        "undefined"
          ? localStorage.getItem(
              "business_id"
            )
          : null);

      if (!activeBusinessId) {
        console.error(
          "[Analytics] Cannot return to Channels: business ID missing."
        );

        return;
      }

      console.log(
        "[Analytics] Returning to Channels with business:",
        activeBusinessId
      );

      if (
        typeof window !==
        "undefined"
      ) {
        localStorage.setItem(
          "business_id",
          activeBusinessId
        );
      }

      router.push(
        `/channels?businessId=${encodeURIComponent(
          activeBusinessId
        )}`
      );
    }, [
      businessId,
      router,
    ]);

  // ======================================================
  // NO BUSINESS
  // ======================================================

  if (
    !loading &&
    !businessId
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
            ⚠️
          </div>

          <h1 className="text-xl font-black">
            Business not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/50">
            We could not determine
            the active Sodah business
            for this account.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/welcome"
              )
            }
            className="mt-6 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-black transition hover:bg-emerald-400"
          >
            Return to Welcome
          </button>
        </div>
      </div>
    );
  }

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center overflow-hidden bg-[#020617] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />

          <p className="text-sm font-bold">
            Loading analytics...
          </p>

          {businessId && (
            <p className="mt-2 text-[10px] text-white/30">
              Business:{" "}
              {businessId}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-white">

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside className="hidden w-56 shrink-0 flex-col gap-2 border-r border-white/10 bg-gradient-to-b from-[#020617] via-[#07110f] to-[#0f172a] p-3 shadow-2xl md:flex">

        <div className="mb-2 border-b border-white/10 pb-3">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
            Sodah.io
          </p>

          <h2 className="mt-1 text-sm font-black">
            Analytics
          </h2>

          <p className="mt-1 truncate text-[9px] text-white/30">
            Business:{" "}
            {businessId}
          </p>
        </div>

        <MiniCard
          title="Total"
          value={total}
          color="blue"
        />

        <MiniCard
          title="Booked"
          value={booked}
          color="green"
        />

        <MiniCard
          title="Pending"
          value={pending}
          color="yellow"
        />

        <MiniCard
          title="Success"
          value={`${success}%`}
          color="purple"
        />

        <MiniCard
          title="Reminders"
          value={reminders}
          color="pink"
        />

        <MiniCard
          title="Follow-ups"
          value={followUps}
          color="orange"
        />

        {/* AI INSIGHTS */}

        <div className="mt-4 rounded-2xl border border-purple-400/10 bg-gradient-to-br from-purple-600/20 to-blue-600/10 p-3 shadow-[0_0_30px_rgba(168,85,247,0.12)]">
          <p className="mb-2 text-xs font-black text-purple-300">
            🤖 AI Insights
          </p>

          <p className="text-[11px] leading-relaxed text-gray-300">
            • Booking performance
            is being monitored 📈
            <br />
            • Appointment activity
            is live ⚡
            <br />
            • Follow-ups can improve
            customer engagement 🔥
          </p>
        </div>
      </aside>

      {/* ==================================================
          MAIN
      ================================================== */}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">

        {/* HEADER */}

        <header className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 backdrop-blur-xl">

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Business Analytics
            </p>

            <h1 className="mt-1 text-base font-black sm:text-lg">
              Sodah.io Analytics
            </h1>
          </div>

          <div className="flex items-center gap-3">

            <div className="hidden text-right sm:block">
              <p className="text-[9px] text-white/30">
                Active Business
              </p>

              <p className="max-w-[180px] truncate text-[10px] font-bold text-white/60">
                {businessId}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[10px] font-black text-emerald-400">
              <span className="live-dot" />
              LIVE
            </div>
          </div>
        </header>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="grid min-h-0 flex-1 grid-rows-[1fr_1fr] gap-3">

          {/* TOP ROW */}

          <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-2">

            {/* BOOKINGS TREND */}

            <div className="box">

              <div className="mb-1 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white/80">
                    Bookings Trend
                  </p>

                  <p className="text-[9px] text-white/30">
                    Recent appointment activity
                  </p>
                </div>

                <span className="rounded-full border border-emerald-400/10 bg-emerald-400/5 px-2 py-1 text-[8px] font-bold text-emerald-400">
                  {total} records
                </span>
              </div>

              <ResponsiveContainer
                width="100%"
                height="85%"
              >
                <LineChart
                  data={trendData}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis hide />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#0f172a",
                      border:
                        "1px solid rgba(255,255,255,0.1)",
                      borderRadius:
                        "12px",
                      color:
                        "#fff",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{
                      r: 5,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* BOOKING STATUS */}

            <div className="box relative flex flex-col items-center justify-center">

              <p className="absolute left-4 top-3 text-xs font-bold text-white/80">
                Booking Success Rate
              </p>

              <p className="absolute left-4 top-8 text-[9px] text-white/30">
                Booked vs pending
              </p>

              <PieChart
                width={200}
                height={200}
              >
                <Pie
                  data={pieData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  isAnimationActive
                  stroke="none"
                >
                  {pieData.map(
                    (
                      entry,
                      index
                    ) => (
                      <Cell
                        key={
                          `${entry.name}-${index}`
                        }
                        fill={
                          COLORS[
                            index
                          ]
                        }
                      />
                    )
                  )}
                </Pie>
              </PieChart>

              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black">
                  {success}%
                </span>

                <span className="text-[9px] uppercase tracking-wider text-white/30">
                  Success
                </span>
              </div>

              <div className="absolute bottom-3 flex gap-5 text-[9px]">
                <span className="flex items-center gap-1.5 text-white/50">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Booked
                </span>

                <span className="flex items-center gap-1.5 text-white/50">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  Pending
                </span>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW */}

          <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-2">

            {/* MONTHLY REPORT */}

            <div className="box">

              <p className="text-xs font-bold text-white/80">
                Monthly Report
              </p>

              <p className="mb-1 text-[9px] text-white/30">
                Business performance overview
              </p>

              <ResponsiveContainer
                width="100%"
                height="85%"
              >
                <BarChart
                  data={
                    monthlyReportData
                  }
                  barSize={32}
                >
                  <defs>
                    <linearGradient
                      id="analyticsGrad1"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#22c55e"
                      />

                      <stop
                        offset="100%"
                        stopColor="#3b82f6"
                      />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis hide />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#0f172a",
                      border:
                        "1px solid rgba(255,255,255,0.1)",
                      borderRadius:
                        "12px",
                      color:
                        "#fff",
                    }}
                  />

                  <Bar
                    dataKey="value"
                    fill="url(#analyticsGrad1)"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* WEEKLY REPORT */}

            <div className="box">

              <p className="text-xs font-bold text-white/80">
                Weekly Report
              </p>

              <p className="mb-1 text-[9px] text-white/30">
                Appointment activity by day
              </p>

              <ResponsiveContainer
                width="100%"
                height="85%"
              >
                <BarChart
                  data={
                    weeklyReportData
                  }
                  barSize={28}
                >
                  <defs>
                    <linearGradient
                      id="analyticsGrad2"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#a855f7"
                      />

                      <stop
                        offset="100%"
                        stopColor="#6366f1"
                      />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis hide />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#0f172a",
                      border:
                        "1px solid rgba(255,255,255,0.1)",
                      borderRadius:
                        "12px",
                      color:
                        "#fff",
                    }}
                  />

                  <Bar
                    dataKey="value"
                    fill="url(#analyticsGrad2)"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>

      {/* ==================================================
          BACK TO CHANNELS
      ================================================== */}

      <button
        type="button"
        onClick={
          handleBackToChannels
        }
        disabled={!businessId}
        aria-label="Back to Channels"
        title="Back to Channels"
        className="fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-xl text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ←
      </button>

      {/* ==================================================
          STYLES
      ================================================== */}

      <style jsx>{`
        .box {
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px;
          border-radius: 18px;
          overflow: hidden;
          min-height: 0;
          box-shadow:
            0 20px 50px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(18px);
        }

        .live-dot {
          width: 6px;
          height: 6px;
          display: inline-block;
          background: #22c55e;
          border-radius: 9999px;
          animation: pulse 1.2s infinite;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.8);
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(1.6);
            opacity: 0.45;
          }

          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ======================================================
// MINI CARD
// ======================================================

function MiniCard({
  title,
  value,
  color,
}) {
  const colors = {
    blue:
      "bg-blue-500/10 border-blue-500/40 text-blue-300",

    green:
      "bg-green-500/10 border-green-500/40 text-green-300",

    yellow:
      "bg-yellow-500/10 border-yellow-500/40 text-yellow-300",

    purple:
      "bg-purple-500/10 border-purple-500/40 text-purple-300",

    pink:
      "bg-pink-500/10 border-pink-500/40 text-pink-300",

    orange:
      "bg-orange-500/10 border-orange-500/40 text-orange-300",
  };

  return (
    <div
      className={`rounded-xl border-l-4 p-3 transition duration-300 hover:translate-x-0.5 hover:bg-white/[0.04] ${colors[color]}`}
    >
      <p className="text-[9px] uppercase tracking-wider text-white/40">
        {title}
      </p>

      <h3 className="mt-1 text-base font-black text-white">
        {value}
      </h3>
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

function AnalyticsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-8 py-6 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
        <p className="text-sm font-bold">
          Loading analytics...
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsLoading />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}
