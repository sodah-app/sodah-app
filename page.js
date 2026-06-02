"use client";

import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {

  const router = useRouter();

  // ✅ THIS is where the protection goes
  useEffect(() => {
    const plan = localStorage.getItem("plan");
    const expiry = localStorage.getItem("planExpiry");

    // ❌ No plan → redirect
    if (!plan) {
      router.push("/subscription");
      return;
    }

    // ⏳ Check expiry
    if (expiry) {
      const now = new Date();
      const expiryDate = new Date(expiry);

      if (now > expiryDate) {
        alert("Your free trial has expired 🚫");
        localStorage.removeItem("plan");
        localStorage.removeItem("planExpiry");
        router.push("/subscription");
      }
    }
  }, []);

  // -----------------------

  const stats = {
    bookings: 22,
    activeChats: 14,
    pending: 6,
  };

  const pieData = [
    { name: "Booked", value: 16 },
    { name: "Pending", value: 6 },
  ];

  const barData = [
    { day: "Mon", bookings: 2 },
    { day: "Tue", bookings: 4 },
    { day: "Wed", bookings: 3 },
    { day: "Thu", bookings: 6 },
    { day: "Fri", bookings: 7 },
  ];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#020617] via-[#020617] to-[#0f172a] p-4 text-white flex flex-col">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-semibold">Sodah Automation</h1>
        <span className="text-gray-400 text-sm">Welcome back</span>
      </div>

      {/* MAIN */}
      <div className="flex flex-col flex-1 gap-4 overflow-hidden">

        {/* 🔹 TOP GRID */}
        <div className="grid grid-cols-3 gap-4">

          <div className="grid grid-cols-2 gap-3">
            <Card title="Total Bookings" value={stats.bookings} color="blue" />
            <Card title="Active Chats" value={stats.activeChats} color="green" />
            <Card title="Pending Chats" value={stats.pending} color="yellow" />
            <Card title="Score" value="73%" color="purple" />
          </div>

          {/* PIE */}
          <div className="glass-card p-3 flex flex-col justify-center">
            <p className="text-xs text-gray-400 mb-1">Booking Status</p>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={45} outerRadius={60}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#facc15" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* BAR */}
          <div className="glass-card p-3 flex flex-col justify-center">
            <p className="text-xs text-gray-400 mb-1">Weekly</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={barData}>
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="bookings" radius={[6,6,0,0]} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* TABLE */}
        <div className="glass-card flex flex-col flex-1 p-3 overflow-hidden">

          <h3 className="text-sm font-semibold mb-2">
            Appointment Bookings
          </h3>

          <div className="grid grid-cols-5 text-gray-400 text-xs px-2 mb-1">
            <div>Name</div>
            <div>Phone</div>
            <div>Date</div>
            <div>Time</div>
            <div>Status</div>
          </div>

          <div className="overflow-y-auto flex-1 pr-1">
            {[
              "Ali","Sara","Michael","Emma","Alex","John Doe","Alice",
              "Vivian","Tom","Peter","David","James","Noah","Lucas"
            ].map((name, i) => (
              <div
                key={i}
                className="grid grid-cols-5 items-center bg-white/5 hover:bg-white/10 transition px-3 py-2 rounded-md text-xs mb-1"
              >
                <div>{name}</div>
                <div className="text-gray-400">+971 50 000 0000</div>
                <div className="text-gray-400">20 May 2024</div>
                <div className="text-gray-400">18:00</div>

                <div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      i % 2
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {i % 2 ? "Booked" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}

/* CARD */
function Card({ title, value, color }) {

  const styles = {
    blue: "from-blue-500/20 to-blue-700/30 text-blue-400",
    green: "from-green-500/20 to-green-700/30 text-green-400",
    yellow: "from-yellow-500/20 to-yellow-700/30 text-yellow-400",
    purple: "from-purple-500/20 to-purple-700/30 text-purple-400",
  };

  return (
    <div className={`bg-gradient-to-br ${styles[color]} backdrop-blur-xl border border-white/10 p-3 rounded-lg shadow-md`}>
      <p className="text-[10px] text-gray-400">{title}</p>
      <h3 className="text-lg font-bold mt-1">{value}</h3>
    </div>
  );
}