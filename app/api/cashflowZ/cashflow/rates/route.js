import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const base = String(searchParams.get("base") || "AED").toUpperCase();
    const quotes = String(
      searchParams.get("quotes") || "AED,USD,EUR,GBP,SAR"
    )
      .toUpperCase()
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    if (!/^[A-Z]{3}$/.test(base)) {
      return NextResponse.json(
        { success: false, message: "Invalid base currency." },
        { status: 400 }
      );
    }

    const key = `${base}:${quotes.join(",")}`;
    const cached = CACHE.get(key);
    if (cached && Date.now() - cached.time < 30 * 60 * 1000) {
      return NextResponse.json({ success: true, ...cached.data, cached: true });
    }

    const target = quotes.filter((x) => /^[A-Z]{3}$/.test(x) && x !== base);
    const url =
      `https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(base)}` +
      (target.length ? `&quotes=${encodeURIComponent(target.join(","))}` : "");

    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || `Exchange-rate service returned HTTP ${response.status}.`);
    }

    const rates = { [base]: 1, ...(data?.rates || {}) };
    const result = {
      base,
      rates,
      date: data?.date || new Date().toISOString().slice(0, 10),
    };

    CACHE.set(key, { time: Date.now(), data: result });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[Cashflow Rates]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Unable to load exchange rates." },
      { status: 502 }
    );
  }
}
