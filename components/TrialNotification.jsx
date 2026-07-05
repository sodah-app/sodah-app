"use client";

import { useEffect, useState } from "react";

export default function SubscriptionNotification({
  subscriptionEndDate,
  isTrial = false,
}) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState<
    "blue" | "yellow" | "red" | "green"
  >("green");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!subscriptionEndDate) return;

    const end = new Date(subscriptionEndDate);
    const now = new Date();

    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    // Don't show reminders until only 3 days remain
    if (days > 3) return;

    // Show reminder only once every 24 hours while active
    const STORAGE_KEY = "subscription_notification";

    if (diff > 0) {
      const lastShown = localStorage.getItem(STORAGE_KEY);

      if (lastShown) {
        const hours =
          (Date.now() - Number(lastShown)) / (1000 * 60 * 60);

        if (hours < 24) return;
      }

      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    if (days === 3 || days === 2) {
      setTitle("⚠️ Subscription Expiring Soon");
      setMessage(
        `Only ${days} days remaining. Your ${
          isTrial ? "free trial" : "subscription"
        } will expire soon. Renew now to keep your AI Auto Reply and automation services running without interruption.`
      );
      setColor("yellow");
      setExpired(false);
      setShow(true);
    } else if (days === 1) {
      setTitle("🚨 Final Reminder");
      setMessage(
        `Your ${
          isTrial ? "free trial" : "subscription"
        } expires tomorrow. Renew today to keep all AI services active.`
      );
      setColor("red");
      setExpired(false);
      setShow(true);
    } else if (diff <= 0) {
      setTitle("❌ Subscription Expired");
      setMessage(
        "Your subscription has expired. AI Auto Reply and Automation have been paused. Renew now to restore all services."
      );
      setColor("red");
      setExpired(true);
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
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:top-6 z-[9999] flex justify-center md:block animate-slideIn">

      <div
        className={`relative w-[92vw] max-w-[380px] rounded-2xl border backdrop-blur-xl bg-[#111827] p-6 shadow-2xl ${styles[color]}`}
      >

        {/* Close */}
        <button
          onClick={() => setShow(false)}
          className="absolute right-4 top-4 text-2xl text-gray-400 transition hover:text-white"
        >
          ×
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-white">
          {title}
        </h2>

        {/* Message */}
        <p className="mt-3 leading-7 text-gray-300">
          {message}
        </p>

        {/* Main Button */}
        <button
          onClick={() => (window.location.href = "/subscription")}
          className="mt-6 w-full rounded-xl bg-green-500 py-3 font-bold text-black transition hover:bg-green-600"
        >
          {expired ? "Renew Subscription" : "Manage Subscription"}
        </button>

        {/* Remind Later */}
        {!expired && (
          <button
            onClick={() => setShow(false)}
            className="mt-3 w-full rounded-xl border border-white/10 py-3 text-gray-300 transition hover:bg-white/5"
          >
            Remind Me Later
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideIn {
          animation: slideIn 0.35s ease;
        }
      `}</style>
    </div>
  );
}