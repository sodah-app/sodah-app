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

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AnalyticsPage() {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const businessId =
    typeof window !== "undefined"
      ? localStorage.getItem("business_id") || "BIZ_002"
      : "BIZ_002";

  // ======================================================
  // FETCH DATA FROM SUPABASE
  // ======================================================
  const fetchData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [
        appointmentsResult,
        customersResult,
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: true }),

        supabase
          .from("customers")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: true }),
      ]);

      if (appointmentsResult.error) {
        throw appointmentsResult.error;
      }

      if (customersResult.error) {
        throw customersResult.error;
      }

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
          "Pending",
        created_at:
          item.created_at,
      }));

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

      setAppointments(normalizedAppointments);
      setCustomers(normalizedCustomers);
    } catch (error) {
      console.error(
        "Analytics fetch error:",
        error
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // ======================================================
  // INITIAL LOAD + BACKGROUND REFRESH
  // ======================================================
  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      fetchData(false);
    }, 4000);

    return () => clearInterval(interval);
  }, []);
  // ======================================================
  // SUMMARY METRICS
  // ======================================================
  const total = appointments.length;

  const booked = appointments.filter(
    (item) =>
      String(item.Appointment_status || "")
        .toLowerCase()
        .trim() === "booked"
  ).length;

  const pending = appointments.filter(
    (item) =>
      String(item.Appointment_status || "")
        .toLowerCase()
        .trim() === "pending"
  ).length;

  const success = total
    ? Math.round((booked / total) * 100)
    : 0;

  const reminders = Math.floor(total * 0.25);
  const followUps = Math.floor(total * 0.35);

  // ======================================================
  // BOOKING TREND (LAST 30 RECORDS)
  // ======================================================
  const trendData = useMemo(() => {
    const recent = appointments.slice(-30);

    return recent.map((item, index) => ({
      name: `D${index + 1}`,
      value:
        String(
          item.Appointment_status || ""
        )
          .toLowerCase()
          .trim() === "booked"
          ? 1
          : 0,
    }));
  }, [appointments]);

  // ======================================================
  // BOOKING STATUS PIE
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
  const weeklyReportData = useMemo(() => {
    const weekly = [
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
        item.created_at ||
        item.Date;

      if (!rawDate) return;

      const date = new Date(rawDate);

      if (isNaN(date.getTime())) return;

      const jsDay = date.getDay();
      const index = dayMap[jsDay];

      if (index !== undefined) {
        weekly[index].value += 1;
      }
    });

    return weekly;
  }, [appointments]);
  // ======================================================
  // LOADING SCREEN
  // ======================================================
  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#020617] text-white items-center justify-center">
        <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-xl">
          Loading analytics...
        </div>
      </div>
    );
  }

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] text-white">
      {/* SIDEBAR */}
      <div className="w-56 bg-gradient-to-b from-[#020617] to-[#0f172a] border-r border-white/20 p-3 flex flex-col gap-2 shadow-xl">
        <h2 className="text-sm font-bold mb-2">
          Analytics
        </h2>

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

        <div className="mt-4 p-3 bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/10 rounded-xl shadow-[0_0_25px_rgba(168,85,247,0.2)]">
          <p className="text-xs text-purple-300 mb-2">
            🤖 AI Insights
          </p>

          <p className="text-[11px] text-gray-300 leading-relaxed">
            • High booking success rate 📈
            <br />
            • No pending appointments ⚡
            <br />
            • Follow-ups improving engagement 🔥
          </p>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-4 grid grid-rows-[auto_1fr_1fr] gap-4">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">
            Sodah.io Analytics
          </h1>

          <div className="flex items-center gap-2 text-green-400 text-xs">
            <span className="live-dot"></span>
            LIVE
          </div>
        </div>

        {/* TOP ROW */}
        <div className="grid grid-cols-2 gap-4">
          {/* BOOKINGS TREND */}
          <div className="box">
            <p className="text-xs text-gray-400 mb-1">
              Bookings Trend
            </p>

            <ResponsiveContainer
              width="100%"
              height={160}
            >
              <LineChart data={trendData}>
                <XAxis
                  dataKey="name"
                  stroke="#aaa"
                  fontSize={9}
                />
                <YAxis hide />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* BOOKING STATUS */}
          <div className="box flex flex-col items-center justify-center relative">
            <p className="text-xs text-gray-400 mb-2 absolute top-3 left-3">
              Booking Success Rate
            </p>

            <PieChart
              width={180}
              height={180}
            >
              <Pie
                data={pieData}
                dataKey="value"
                innerRadius={50}
                outerRadius={70}
                isAnimationActive
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index]}
                  />
                ))}
              </Pie>
            </PieChart>

            <div className="absolute text-sm font-bold">
              {success}%
            </div>
          </div>
        </div>
        {/* BOTTOM ROW */}
        <div className="grid grid-cols-2 gap-4">
          {/* MONTHLY REPORT */}
          <div className="box">
            <p className="text-xs text-gray-400 mb-2">
              Monthly Report
            </p>

            <ResponsiveContainer
              width="100%"
              height={170}
            >
              <BarChart
                data={monthlyReportData}
                barSize={35}
              >
                <defs>
                  <linearGradient
                    id="grad1"
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
                  stroke="#aaa"
                  fontSize={9}
                />
                <YAxis hide />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="url(#grad1)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* WEEKLY REPORT */}
          <div className="box">
            <p className="text-xs text-gray-400 mb-2">
              Weekly Report
            </p>

            <ResponsiveContainer
              width="100%"
              height={170}
            >
              <BarChart
                data={weeklyReportData}
                barSize={30}
              >
                <defs>
                  <linearGradient
                    id="grad2"
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
                  stroke="#aaa"
                  fontSize={9}
                />
                <YAxis hide />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="url(#grad2)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px;
          border-radius: 12px;
          overflow: hidden;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          background: #22c55e;
          border-radius: 50%;
          animation: pulse 1.2s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(1.6);
            opacity: 0.5;
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

function MiniCard({
  title,
  value,
  color,
}) {
  const colors = {
    blue:
      "bg-blue-500/20 border-blue-500",
    green:
      "bg-green-500/20 border-green-500",
    yellow:
      "bg-yellow-500/20 border-yellow-500",
    purple:
      "bg-purple-500/20 border-purple-500",
    pink:
      "bg-pink-500/20 border-pink-500",
    orange:
      "bg-orange-500/20 border-orange-500",
  };

  return (
    <div
      className={`p-2 border-l-4 ${colors[color]} rounded hover:scale-[1.02] transition`}
    >
      <p className="text-[10px] text-gray-400">
        {title}
      </p>

      <h3 className="text-sm font-bold">
        {value}
      </h3>
    </div>
  );
}