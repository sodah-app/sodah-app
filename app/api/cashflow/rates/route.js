import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * SODAH CASHFLOW — CURRENCY RATES
 *
 * The old implementation used Frankfurter. Frankfurter does not provide
 * the full set of currencies Cashflow supports (for example AED and GHS),
 * so conversions could fall back to the original number and only change
 * the displayed symbol.
 *
 * This route uses the keyless USD-based ExchangeRate-API open endpoint.
 * We always fetch one USD rate table, then mathematically derive
 * base -> quote rates. This supports AED, USD, EUR, GBP, SAR, CAD, AUD,
 * INR, GHS, ZAR, NGN, KWD, QAR and the other supported ISO currencies.
 *
 * IMPORTANT:
 * The invoice amount stored in Supabase is NEVER changed by currency
 * selection. Conversion is display-only.
 */

const CACHE_TTL = 30 * 60 * 1000;

let cachedUsdRates = null;
let cachedAt = 0;
let cachedDate = "";

const FALLBACK_USD_RATES = {
  USD: 1,
  AED: 3.6725,
  EUR: 0.85,
  GBP: 0.74,
  SAR: 3.75,
  CAD: 1.38,
  AUD: 1.52,
  INR: 88.0,
  GHS: 12.0,
  ZAR: 17.0,
  NGN: 1500,
  KWD: 0.306,
  QAR: 3.64,
};

function validCurrency(value) {
  return /^[A-Z]{3}$/.test(String(value || "").toUpperCase());
}

async function getUsdRates() {
  if (cachedUsdRates && Date.now() - cachedAt < CACHE_TTL) {
    return {
      rates: cachedUsdRates,
      date: cachedDate,
      cached: true,
    };
  }

  try {
    const response = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.result !== "success" || !data?.rates) {
      throw new Error(
        data?.error_type ||
          `Exchange-rate service returned HTTP ${response.status}.`
      );
    }

    const rates = {
      USD: 1,
      ...data.rates,
    };

    cachedUsdRates = rates;
    cachedAt = Date.now();
    cachedDate =
      data?.time_last_update_utc ||
      new Date().toISOString().slice(0, 10);

    return {
      rates,
      date: cachedDate,
      cached: false,
    };
  } catch (error) {
    console.error("[Cashflow Rates Upstream]", error);

    /*
     * Keep Cashflow usable if the public rate service is temporarily
     * unavailable. The next successful request replaces these fallback
     * values with the current upstream rates.
     */
    return {
      rates: FALLBACK_USD_RATES,
      date: "fallback",
      cached: false,
      fallback: true,
    };
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const base = String(
      searchParams.get("base") || "AED"
    ).toUpperCase();

    const quotes = String(
      searchParams.get(
        "quotes"
      ) || "AED,USD,EUR,GBP,SAR,CAD,AUD,INR,GHS,ZAR,NGN,KWD,QAR"
    )
      .toUpperCase()
      .split(",")
      .map((x) => x.trim())
      .filter(validCurrency);

    if (!validCurrency(base)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid base currency.",
        },
        { status: 400 }
      );
    }

    const { rates: usdRates, date, cached, fallback } =
      await getUsdRates();

    const baseUsdRate = Number(usdRates[base]);

    if (!Number.isFinite(baseUsdRate) || baseUsdRate <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Exchange rate for ${base} is unavailable.`,
        },
        { status: 502 }
      );
    }

    const rates = { [base]: 1 };

    for (const quote of quotes) {
      if (quote === base) {
        rates[quote] = 1;
        continue;
      }

      const quoteUsdRate = Number(usdRates[quote]);

      if (!Number.isFinite(quoteUsdRate) || quoteUsdRate <= 0) {
        continue;
      }

      /*
       * usdRates[X] means: 1 USD = X units of X.
       * Therefore:
       *     1 BASE = quoteUsdRate / baseUsdRate QUOTE
       */
      rates[quote] = quoteUsdRate / baseUsdRate;
    }

    return NextResponse.json({
      success: true,
      base,
      rates,
      date,
      cached,
      fallback: Boolean(fallback),
      provider: "ExchangeRate-API",
    });
  } catch (error) {
    console.error("[Cashflow Rates]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to load exchange rates.",
      },
      { status: 502 }
    );
  }
}
