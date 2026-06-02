"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const router = useRouter();

  // ✅ BEST PRACTICE: always define structure
  const [user, setUser] = useState({
    fullName: "",
    phone: "",
    email: "",
  });

  // LOAD USER FROM LOCAL STORAGE
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("user") || "{}");

    setUser({
      fullName: saved.fullName || "",
      phone: saved.phone || "",
      email: saved.email || "",
    });
  }, []);

  // HANDLE INPUT CHANGE
  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  };

  // SAVE CHANGES
  const handleSave = () => {
    localStorage.setItem("user", JSON.stringify(user));
    alert("Profile updated successfully ✅");
    router.push("/welcome");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0b0f19] transition">

      <div className="w-full max-w-md bg-gray-100 dark:bg-[#111827] border border-gray-300 dark:border-white/10 rounded-xl p-6 shadow-lg">

        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Profile Settings
        </h2>

        <div className="space-y-4">

          {/* FULL NAME */}
          <input
            type="text"
            name="fullName"
            placeholder="Full Name"
            value={user.fullName}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1f2937] text-black dark:text-white outline-none"
          />

          {/* PHONE */}
          <input
            type="text"
            name="phone"
            placeholder="Phone Number"
            value={user.phone}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1f2937] text-black dark:text-white outline-none"
          />

          {/* EMAIL */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={user.email}
            onChange={handleChange}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1f2937] text-black dark:text-white outline-none"
          />

          {/* SAVE BUTTON */}
          <button
            onClick={handleSave}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold transition"
          >
            Save Changes
          </button>

          {/* BACK BUTTON */}
          <button
            onClick={() => router.push("/settings")}
            className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ← Back to Settings
          </button>

        </div>
      </div>
    </div>
  );
}