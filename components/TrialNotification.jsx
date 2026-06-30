"use client";

import { useEffect, useState } from "react";

export default function SubscriptionNotification({
  subscriptionEndDate,
  isTrial = false,
}) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("green");

  useEffect(() => {
    if (!subscriptionEndDate) return;

    const end = new Date(subscriptionEndDate);
    const now = new Date();

    const diff = end.getTime() - now.getTime();

    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days > 7) return;

    if (days <= 7 && days > 3) {
      setTitle("📅 Subscription Reminder");
      setMessage(
        `Your ${isTrial ? "free trial" : "subscription"} will expire in ${days} days. Renew now to avoid interruption.`
      );
      setColor("blue");
      setShow(true);
    }

    else if (days <= 3 && days > 1) {
      setTitle("⚠️ Subscription Expiring Soon");
      setMessage(
        `Only ${days} days remaining. Your AI Auto Reply and automation services will pause if your subscription expires.`
      );
      setColor("yellow");
      setShow(true);
    }

    else if (days === 1) {
      setTitle("🚨 Final Reminder");
      setMessage(
        "Your subscription expires tomorrow. Renew today to keep all AI services running."
      );
      setColor("red");
      setShow(true);
    }

    else if (diff <= 0) {
      setTitle("❌ Subscription Expired");
      setMessage(
        "Your subscription has expired. AI Auto Reply and Automation have been paused. Renew now to restore all services."
      );
      setColor("red");
      setShow(true);
    }

  }, [subscriptionEndDate, isTrial]);

  if (!show) return null;

  const styles = {
    blue: "border-blue-500 bg-blue-500/10",
    yellow: "border-yellow-500 bg-yellow-500/10",
    red: "border-red-500 bg-red-500/10",
    green: "border-green-500 bg-green-500/10",
  };

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-slideIn">

      <div
        className={`w-[380px] rounded-2xl border backdrop-blur-xl shadow-2xl p-6 bg-[#111827] ${styles[color]}`}
      >

        <h2 className="text-xl font-bold text-white">
          {title}
        </h2>

        <p className="text-gray-300 mt-3 leading-7">
          {message}
        </p>

        <button
          className="mt-6 w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-black font-bold transition"
          onClick={() => window.location.href="/subscription"}
        >
          Renew Subscription
        </button>

        <button
          className="mt-3 w-full py-3 rounded-xl border border-white/10 text-gray-300"
          onClick={() => setShow(false)}
        >
          Remind Me Later
        </button>

      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }

          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slideIn {
          animation: slideIn .4s ease;
        }
      `}</style>

    </div>
  );
}