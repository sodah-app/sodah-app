"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const PAYPAL_CHECKOUT_LINKS = {
  Starter: "https://www.paypal.com/ncp/payment/44CGPMTMY4ZHQ",
  Business: "https://www.paypal.com/ncp/payment/AH23RR8JBGTNN",
  Pro: "https://www.paypal.com/ncp/payment/H87TGY5F8Z6EA",
};

const PLANS = [
  {
    name: "Starter", price: "$40.99", subtitle: "Essential WhatsApp automation for small teams.", badge: "Great for getting started", icon: "▥",
    features: [
      "Send up to 20 WhatsApp messages at once",
      "Up to 100 messages per day",
      "5 scheduled campaigns · 5 contacts each",
      "Up to 20 product images",
      "2 active promotion",
      "AI customer replies 24/7",
      "Appointment booking, follow-ups and reminders",
      "Send and schedule messages for customers and team members",
      "Business dashboard and workspace",
      "Daily business reports not included",
    ],
  },
  {
    name: "Business", price: "$81.99", subtitle: "More capacity, team coordination and daily business insights.", badge: "For growing businesses", icon: "♛",
    features: [
      "Send up to 50 WhatsApp messages at once",
      "Up to 220 messages per day",
      "10 scheduled campaigns · 5 contacts each",
      "Up to 60 product images",
      "5 active promotions",
      "AI customer replies 24/7",
      "Appointment booking, follow-ups and reminders",
      "Send and schedule messages for customers and team members",
      "Daily business summary delivered at 6:00 PM",
      "Add team numbers to receive the daily report",
      "Business dashboard and workspace",
    ],
  },
  {
    name: "Pro", price: "$135.99", subtitle: "Maximum capacity, flexible reporting and advanced team communication.", badge: "Most complete plan", icon: "◇",
    features: [
      "Send up to 100 WhatsApp messages at once",
      "Up to 500 messages per day",
      "10 scheduled campaigns · 10 contacts each",
      "Up to 500 product images",
      "10 active promotions",
      "AI customer replies 24/7",
      "Appointment booking, follow-ups and reminders",
      "Send and schedule messages for customers and team members",
      "Daily business summary with a custom delivery time",
      "Add multiple team numbers to receive the daily report",
      "Business dashboard and workspace",
    ],
  },
];

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trialStarting, setTrialStarting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBusiness = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.id) {
        router.replace(`/login?next=${encodeURIComponent("/subscription")}`);
        return;
      }
      const { data, error } = await supabase
        .from("businesses")
        .select("business_id,business_name,subscription_plan,subscription_status,subscription_start,subscription_expiry,renewal_date,trial_used_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data?.business_id) {
        setBusiness(null);
        setPageError("No business workspace was found for this account. Please finish setting up your business first.");
        return;
      }
      setBusiness(data);
      localStorage.setItem("business_id", data.business_id);
    } catch (error) {
      console.error("[Subscription] Could not load business subscription:", error);
      setPageError(error?.message?.includes("trial_used_at")
        ? "The subscription database needs the trial_used_at field before trial eligibility can be checked safely. Apply the SQL migration supplied with this update."
        : "We could not load your business subscription. Please refresh the page and try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadBusiness(); }, [loadBusiness]);

  const expiryTime = business?.subscription_expiry ? new Date(business.subscription_expiry).getTime() : 0;
  const isUnexpired = Number.isFinite(expiryTime) && expiryTime > Date.now();
  const status = String(business?.subscription_status || "inactive").toLowerCase();
  const plan = String(business?.subscription_plan || "");
  const isTrialPlan = /trial/i.test(plan);
  const trialActive = isTrialPlan && isUnexpired && ["active", "trialing"].includes(status);
  const paidActive = Boolean(plan) && !isTrialPlan && isUnexpired && status === "active";
  // A trial-plan record is evidence that this business has entered the trial, even if its expiry is missing.
  const trialUsed = Boolean(business?.trial_used_at) || isTrialPlan;
  const trialExpired = trialUsed && !trialActive;
  const expiryLabel = formatDate(business?.subscription_expiry);

  const statusText = useMemo(() => {
    if (trialActive) return `Free trial active until ${expiryLabel}`;
    if (paidActive) return `${plan} plan active until ${expiryLabel}`;
    if (trialExpired) return "Your free trial has expired";
    return "Your free trial is available";
  }, [trialActive, paidActive, trialExpired, expiryLabel, plan]);

  async function startFreeTrial() {
    if (!business?.business_id || trialStarting) return;

    // An already-active trial should let the customer continue, not leave them
    // stuck behind a disabled button.
    if (trialActive || paidActive) {
      router.push("/channels");
      return;
    }

    // A used/expired trial remains locked. Paid checkout buttons are independent.
    if (trialUsed) return;

    setTrialStarting(true);
    setPageError("");
    setNotice("");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) {
        router.replace(`/login?next=${encodeURIComponent("/subscription")}`);
        return;
      }
      const response = await fetch("/api/subscription/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ businessId: business.business_id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The free trial could not be started.");
      setNotice("Your 7-day free trial is active. Opening WhatsApp channels…");
      await loadBusiness();
      router.push("/channels");
    } catch (error) {
      setPageError(error?.message || "The free trial could not be started. Please try again.");
      await loadBusiness();
    } finally {
      setTrialStarting(false);
    }
  }

  function openCheckout(planName) {
    setPageError("");
    const url = PAYPAL_CHECKOUT_LINKS[planName];
    if (!url) {
      setPageError(`The PayPal checkout link for ${planName} is not configured.`);
      return;
    }
    window.location.assign(url);
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-[#020b18] px-4 text-white">
      <div className="rounded-2xl border border-sky-400/20 bg-[#071a2e] px-8 py-6 text-center shadow-2xl shadow-sky-950/50">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
        <p className="text-sm font-semibold text-slate-200">Loading your subscription…</p>
      </div>
    </main>
  );

  // Active trial is clickable and continues to Channels. Only a previously used
  // or expired trial is locked; the three paid plan buttons remain independent.
  const trialButtonDisabled = trialStarting || trialExpired || (!business?.business_id);
  const trialButtonLabel = trialStarting
    ? "Checking business…"
    : trialActive
      ? "Continue to Channels  ›"
      : trialExpired
        ? "🔒 Free Trial Expired"
        : paidActive
          ? "Continue to Channels  ›"
          : "Start Free Trial  ›";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020914] text-white selection:bg-sky-500/30">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-32 -top-48 h-[520px] w-[760px] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -left-48 top-[35%] h-[420px] w-[620px] rounded-full bg-sky-700/10 blur-3xl" />
        <div className="absolute bottom-0 right-[20%] h-[300px] w-[520px] rounded-full bg-indigo-700/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-sky-100/10 bg-[#061629]/90">
        <div className="mx-auto flex min-h-[78px] w-full max-w-[1500px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <button type="button" onClick={() => router.push("/dashboard")} className="flex items-center gap-3 text-left" aria-label="Sodah.io dashboard">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/10 text-2xl font-black text-sky-400 shadow-lg shadow-sky-950/30">✉</span>
            <span><span className="block text-[27px] font-black leading-none tracking-tight">Sodah<span className="text-sky-400">.io</span></span><span className="mt-1 block text-[11px] font-medium tracking-wide text-slate-400">AI for Business Growth</span></span>
          </button>
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="hidden h-11 w-11 items-center justify-center rounded-full border border-sky-300/70 text-xl text-sky-200 sm:flex">▱</span>
            <div className="hidden min-w-0 sm:block"><p className="text-xs text-slate-400">My Business</p><p className="max-w-[230px] truncate text-sm font-bold text-white">{business?.business_name || "Business Workspace"}</p></div>
            <span className="text-slate-400">⌄</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-5 sm:px-7 lg:px-8">
        <div className="mt-4 flex items-center justify-between gap-4">
          <button type="button" onClick={() => router.push("/signup")} className="inline-flex items-center gap-2 rounded-full border border-sky-300/70 bg-sky-950/40 px-5 py-2.5 text-sm font-bold text-slate-100 transition hover:border-sky-300 hover:bg-sky-900/50 focus:outline-none focus:ring-2 focus:ring-sky-400"><span className="text-xl leading-none">←</span> Back to Sign Up</button>
          <span className="hidden text-xs text-slate-500 sm:block">Secure plans for your business</span>
        </div>

        <section className="mt-3 text-center">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Choose <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">Your Plan</span></h1>
          <p className="mt-1 text-sm text-slate-300 sm:text-lg">Automate customer conversations, coordinate your team, schedule WhatsApp messages and stay informed with daily business reports.</p>
          <div className={`mx-auto mt-4 flex max-w-[600px] items-center gap-4 rounded-2xl border px-5 py-3 text-left ${trialActive ? "border-emerald-400/70 bg-emerald-950/45" : trialExpired ? "border-rose-400/50 bg-rose-950/30" : "border-emerald-400/70 bg-emerald-950/35"}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl ${trialExpired ? "text-rose-300" : "text-emerald-300"}`}>{trialExpired ? "🔒" : trialActive ? "✓" : "▣"}</span>
            <div className="min-w-0"><p className="text-sm font-extrabold">{trialActive ? "Your free trial is active" : trialExpired ? "Free trial already used" : "7-day free trial available"}</p><p className="mt-0.5 text-xs text-slate-300 sm:text-sm">{trialActive ? `Enjoy all features until ${expiryLabel}.` : trialExpired ? "Choose a paid plan below to continue." : "Start your 7-day free trial and explore all the features."}</p></div>
          </div>
        </section>

        {pageError && <div role="alert" className="mx-auto mt-3 max-w-4xl rounded-xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">{pageError}</div>}
        {notice && <div role="status" className="mx-auto mt-3 max-w-4xl rounded-xl border border-emerald-400/40 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

        <section className="mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Subscription plans">
          <article className={`relative flex min-w-0 flex-col rounded-[25px] border p-5 shadow-xl shadow-black/20 ${trialActive ? "border-emerald-400/80 bg-gradient-to-b from-emerald-950/90 to-[#03131a]" : trialExpired ? "border-slate-700 bg-gradient-to-b from-slate-900 to-[#050b15]" : "border-emerald-500/70 bg-gradient-to-b from-emerald-950/75 to-[#03131a]"}`}>
            <div className="mb-4 flex items-center justify-between gap-2"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-300 ring-1 ring-emerald-400/40">♧</span><span className="rounded-full border border-emerald-400/60 bg-emerald-950/80 px-3 py-2 text-[11px] font-bold text-emerald-200">7 Days Free</span></div>
            <h2 className="text-2xl font-extrabold">Free Trial</h2><p className="mt-1 text-4xl font-black text-emerald-300">$0</p><p className="mt-2 min-h-[42px] text-sm text-slate-300">Explore Sodah.io risk-free.</p>
            <div className="my-4 h-px bg-emerald-100/10" />
            <ul className="flex-1 space-y-3 text-sm leading-snug text-slate-200">{["AI replies to customers 24/7", "Send up to 20 messages at once", "Up to 100 messages per day", "5 scheduled campaigns · 5 contacts each", "Send and schedule messages for customers and team members", "Appointment booking, follow-ups and reminders", "Business dashboard and workspace", "Daily business reports available on Business and Pro"].map((feature) => <li key={feature} className="flex items-start gap-2"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-black text-emerald-300">✓</span><span>{feature}</span></li>)}</ul>
            <button type="button" disabled={trialButtonDisabled} onClick={startFreeTrial} aria-busy={trialStarting} className={`mt-5 min-h-[52px] w-full rounded-2xl px-3 py-3 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#04111a] ${trialButtonDisabled ? "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-400" : "bg-gradient-to-r from-emerald-400 to-green-500 text-[#032015] shadow-lg shadow-emerald-500/20 hover:brightness-110"}`}>{trialButtonLabel}</button>
            {trialExpired && <p className="mt-2 text-center text-[11px] text-slate-500">Trial used · {expiryLabel}</p>}
          </article>

          {PLANS.map((item) => {
            const isBusiness = item.name === "Business";
            const isStarter = item.name === "Starter";
            const palette = isStarter
              ? { border: "border-emerald-500/60", bg: "from-[#031d1b] to-[#03101a]", icon: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30", badge: "border-emerald-400/40 bg-emerald-950/80 text-emerald-200", price: "text-emerald-300", button: "from-emerald-400 to-green-500 text-[#032015] shadow-emerald-500/20" }
              : isBusiness
                ? { border: "border-sky-400 ring-2 ring-sky-500/80", bg: "from-[#061b43] to-[#030e22]", icon: "bg-blue-500/25 text-sky-300 ring-sky-400/40", badge: "border-sky-400/40 bg-blue-600 text-white", price: "text-sky-400", button: "from-sky-400 to-blue-600 text-white shadow-blue-500/30" }
                : { border: "border-violet-500/50", bg: "from-[#18112f] to-[#080b19]", icon: "bg-violet-500/25 text-violet-300 ring-violet-400/30", badge: "border-violet-400/40 bg-violet-800 text-white", price: "text-violet-300", button: "from-violet-500 to-purple-600 text-white shadow-violet-500/30" };
            return <article key={item.name} className={`relative flex min-w-0 flex-col rounded-[25px] border bg-gradient-to-b p-5 shadow-xl shadow-black/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl ${palette.border} ${palette.bg}`}>
              <div className="mb-4 flex items-center justify-between gap-2"><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl ring-1 ${palette.icon}`}>{item.icon}</span><span className={`rounded-full border px-3 py-2 text-center text-[10px] font-bold leading-tight ${palette.badge}`}>{item.badge}</span></div>
              <h2 className="text-2xl font-extrabold">{item.name}</h2><p className={`mt-1 whitespace-nowrap text-3xl font-black sm:text-[34px] ${palette.price}`}>{item.price}<span className="ml-1 text-sm font-medium text-slate-400">/ month</span></p><p className="mt-2 min-h-[42px] text-sm leading-snug text-slate-300">{item.subtitle}</p>
              <div className="my-4 h-px bg-white/10" />
              <ul className="flex-1 space-y-2.5 text-[13px] leading-snug text-slate-200 sm:text-sm">{item.features.map((feature) => <li key={feature} className="flex items-start gap-2"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-black text-emerald-400">✓</span><span>{feature}</span></li>)}</ul>
              <button type="button" onClick={() => openCheckout(item.name)} className={`mt-5 min-h-[52px] w-full rounded-2xl bg-gradient-to-r px-3 py-3 text-sm font-extrabold shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#07111f] active:scale-[0.99] ${palette.button}`}>Upgrade to {item.name} <span className="ml-1 text-lg">›</span></button>
            </article>;
          })}
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 border-t border-sky-100/10 pt-4 sm:grid-cols-4 sm:gap-5">
          {[{ icon: "ϟ", title: "AI Powered", detail: "Automate & Save Time" }, { icon: "▥", title: "Grow Faster", detail: "More Customers, More Sales" }, { icon: "♢", title: "Secure & Reliable", detail: "Your Data is Safe" }, { icon: "♧", title: "24/7 Support", detail: "We're Here for You" }].map((item) => <div key={item.title} className="flex items-center gap-3 px-1 py-2 sm:justify-center"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-900/60 text-2xl text-sky-300 ring-1 ring-sky-400/20">{item.icon}</span><div><p className="text-xs font-extrabold sm:text-sm">{item.title}</p><p className="mt-1 text-[10px] text-slate-400 sm:text-xs">{item.detail}</p></div></div>)}
        </section>
        <footer className="mt-2 flex flex-col items-center justify-between gap-2 border-t border-white/5 py-4 text-[10px] text-slate-500 sm:flex-row sm:text-xs"><p>© 2026 Sodah.io — AI Automation Platform</p><p>🔒 Secure checkout · WhatsApp AI · Easy setup</p></footer>
      </div>
    </main>
  );
}
