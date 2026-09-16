"use client";

import { usePathname, useRouter } from "next/navigation";

export default function CashflowNavButton() {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === "/cashflow" || pathname.startsWith("/cashflow/");

  return (
    <button
      type="button"
      onClick={() => router.push("/cashflow")}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
        active
          ? "border border-emerald-400/20 bg-emerald-400/15 text-emerald-300"
          : "border border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="text-lg">💰</span>
      <span>Cashflow</span>
    </button>
  );
}
