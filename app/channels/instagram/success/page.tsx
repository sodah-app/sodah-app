"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InstagramSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/channels");
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#07101d] px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-4xl text-white">
          ✓
        </div>

        <h1 className="text-3xl font-bold text-white">
          Instagram Connected Successfully
        </h1>

        <p className="mt-3 text-gray-400">
          Your Instagram account is now connected to Sodah.
        </p>

        <button
          onClick={() => router.replace("/channels")}
          className="mt-8 rounded-xl bg-emerald-400 px-8 py-4 font-semibold text-black"
        >
          Continue to Channels
        </button>
      </div>
    </main>
  );
}