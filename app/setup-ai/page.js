"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupAIPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSave = () => {
    const data = {
      businessName,
      businessType,
      email,
      phone,
    };

    localStorage.setItem(
      "automationSetup",
      JSON.stringify(data)
    );

    alert("Automation setup saved successfully!");

    router.push("/welcome");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#064e3b] to-[#020617] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
        <h1 className="text-3xl font-bold mb-2 text-center">
          AI Automation Setup 🤖
        </h1>

        <p className="text-gray-300 text-center mb-8">
          Configure your business information.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Business Name"
            value={businessName}
            onChange={(e) =>
              setBusinessName(e.target.value)
            }
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/10 outline-none"
          />

          <input
            type="text"
            placeholder="Business Type"
            value={businessType}
            onChange={(e) =>
              setBusinessType(e.target.value)
            }
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/10 outline-none"
          />

          <input
            type="email"
            placeholder="Business Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/10 outline-none"
          />

          <input
            type="tel"
            placeholder="Business Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/10 outline-none"
          />

          <button
            onClick={handleSave}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 rounded-lg transition"
          >
            Save Setup
          </button>

          <button
            onClick={() => router.push("/welcome")}
            className="w-full bg-white/10 hover:bg-white/20 py-3 rounded-lg transition"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}