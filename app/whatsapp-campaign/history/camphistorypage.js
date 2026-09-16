"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FILTERS = [
  ["all", "All Campaigns"],
  ["sent", "Sent"],
  ["partial", "Partial"],
  ["scheduled", "Scheduled"],
  ["failed", "Failed"],
];

const TEMPLATE_LABELS = {
  offer: "Promote an offer",
  lead: "Follow up with lead",
  reengage: "Re-engage customer",
  invite: "Invite customers",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatSchedule(campaign) {
  const schedule = campaign?.schedule || {};
  const mode = String(schedule?.mode || "");
  if (mode === "scheduled") {
    return schedule.date && schedule.time
      ? `${schedule.date} at ${schedule.time}`
      : "Scheduled";
  }
  if (mode === "daily") {
    return schedule.time ? `Every day at ${schedule.time}` : "Every day";
  }
  if (mode === "weekly") {
    const raw = String(schedule.weekly_day || "monday");
    const day = raw.charAt(0).toUpperCase() + raw.slice(1);
    return schedule.time ? `Every ${day} at ${schedule.time}` : `Every ${day}`;
  }
  return "Sent immediately";
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();
  if (value === "sent") return "Sent";
  if (value === "scheduled") return "Scheduled";
  if (value === "partial") return "Partial";
  if (value === "failed") return "Failed";
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "sent") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (value === "scheduled") return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  if (value === "partial") return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  if (value === "failed") return "border-red-400/20 bg-red-400/10 text-red-300";
  return "border-white/10 bg-white/[0.04] text-white/60";
}

function contactCount(campaign) {
  return Array.isArray(campaign?.contacts)
    ? campaign.contacts.length
    : Number(campaign?.contact_count || 0);
}

export default function CampaignHistoryPage() {
  const router = useRouter();
  const [business, setBusiness] = useState(null);
  const [businessId, setBusinessId] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  }

  async function loadHistory(requestedBusinessId = "") {
    setLoading(true);
    setError("");
    try {
      const query = requestedBusinessId
        ? `?businessId=${encodeURIComponent(requestedBusinessId)}`
        : "";
      const response = await fetch(`/api/campaign-history${query}`, {
        method: "GET",
        headers: { ...(await getAuthHeaders()) },
        credentials: "include",
        cache: "no-store",
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(text || "Campaign history returned an invalid response.");
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to load campaign history.");
      }
      setBusiness(data.business || null);
      setBusinessId(String(data.business?.business_id || requestedBusinessId || ""));
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } catch (err) {
      setError(err?.message || "Unable to load campaign history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedBusinessId = String(
      params.get("businessId") || params.get("business_id") || ""
    ).trim();
    if (requestedBusinessId) setBusinessId(requestedBusinessId);
    loadHistory(requestedBusinessId);
  }, []);

  const filteredCampaigns = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const status = String(campaign?.status || "").toLowerCase();
      if (filter !== "all" && status !== filter) return false;
      if (!needle) return true;
      return [
        campaign?.campaign_name,
        campaign?.message,
        campaign?.template,
        campaign?.tone,
      ].filter(Boolean).some((value) =>
        String(value).toLowerCase().includes(needle)
      );
    });
  }, [campaigns, filter, search]);

  const stats = useMemo(() => ({
    total: campaigns.length,
    sent: campaigns.filter((x) => x.status === "sent").length,
    scheduled: campaigns.filter((x) => x.status === "scheduled").length,
    partial: campaigns.filter((x) => x.status === "partial").length,
    contacts: campaigns.reduce((sum, x) => sum + contactCount(x), 0),
  }), [campaigns]);

  async function openDetails(id) {
    if (!id) return;
    setLoadingDetails(true);
    setError("");
    try {
      const query = new URLSearchParams({ businessId, id });
      const response = await fetch(`/api/campaign-history?${query.toString()}`, {
        method: "GET",
        headers: { ...(await getAuthHeaders()) },
        credentials: "include",
        cache: "no-store",
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(text || "Campaign details returned an invalid response.");
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Unable to load campaign details.");
      }
      setSelected(data.campaign || null);
    } catch (err) {
      setError(err?.message || "Unable to load campaign details.");
    } finally {
      setLoadingDetails(false);
    }
  }

  const goToChannels = () => router.push(
    businessId ? `/channels?businessId=${encodeURIComponent(businessId)}` : "/channels"
  );

  const goToCampaign = () => router.push(
    businessId ? `/whatsapp-campaign?businessId=${encodeURIComponent(businessId)}` : "/whatsapp-campaign"
  );

  return (
    <main className="min-h-screen bg-[#04100d] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-7 lg:px-10">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={goToChannels}
              className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#071a15] px-4 text-sm font-bold text-white/70 hover:border-cyan-400/30 hover:text-white">
              <span>←</span><span>Back</span>
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 via-cyan-400 to-blue-500 text-xl font-black text-slate-950">S</div>
            <div>
              <h1 className="text-2xl font-black md:text-3xl">Campaign History</h1>
              <p className="mt-1 text-sm text-white/45">View campaigns created for your Sodah business.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-4 py-2 text-xs font-bold text-cyan-200">
              Business ID: {loading ? "Loading..." : businessId || "Unavailable"}
            </div>
            <button type="button" onClick={goToCampaign}
              className="rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-black text-slate-950">
              + New Campaign
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="text-xl text-white/50">×</button>
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Campaigns" value={stats.total} />
          <StatCard label="Sent" value={stats.sent} />
          <StatCard label="Scheduled" value={stats.scheduled} />
          <StatCard label="Partial" value={stats.partial} />
          <StatCard label="Contacts" value={stats.contacts} />
        </section>

        <section className="rounded-[28px] border border-emerald-400/15 bg-[#071a15] p-5 shadow-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black">Your Campaigns</h2>
              <p className="mt-1 text-xs text-white/35">
                {business?.business_name || "Sodah Business"} · {filteredCampaigns.length} shown
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="h-11 rounded-xl border border-white/10 bg-[#04100d] px-4 text-sm outline-none placeholder:text-white/20 focus:border-emerald-400/40 sm:w-64" />
              <button type="button" onClick={() => loadHistory(businessId)}
                className="h-11 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-white/70 hover:bg-white/[0.06] hover:text-white">
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  filter === value
                    ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/[0.05] hover:text-white"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-sm text-white/40">Loading campaign history...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">◫</div>
              <h3 className="mt-5 text-lg font-black">No campaigns yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
                Campaigns you send or schedule will appear here automatically.
              </p>
              <button type="button" onClick={goToCampaign}
                className="mt-6 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950">
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {filteredCampaigns.map((campaign) => (
                <button key={campaign.id} type="button" onClick={() => openDetails(campaign.id)}
                  className="group w-full rounded-2xl border border-white/10 bg-[#04100d] p-5 text-left transition hover:border-emerald-400/25 hover:bg-[#061710]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-black">{campaign.campaign_name || "Untitled Campaign"}</h3>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClass(campaign.status)}`}>
                          {statusLabel(campaign.status)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/50">{campaign.message || "No message available."}</p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/35">
                        <span>{campaign.template ? (TEMPLATE_LABELS[campaign.template] || campaign.template) : "Custom message"}</span>
                        <span>{contactCount(campaign)} contacts</span>
                        <span>{formatSchedule(campaign)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 xl:flex-col xl:items-end">
                      <div className="text-xs text-white/30">{formatDate(campaign.created_at)}</div>
                      <span className="text-sm font-bold text-emerald-300 group-hover:translate-x-1">View campaign →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-emerald-400/15 bg-[#071a15] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-black">{selected.campaign_name || "Campaign"}</h2>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(selected.status)}`}>
                    {statusLabel(selected.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/35">{formatDate(selected.created_at)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xl text-white/60 hover:text-white">
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="py-10 text-center text-sm text-white/40">Loading campaign...</div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Detail label="Business" value={business?.business_name || "—"} />
                    <Detail label="Business ID" value={selected.business_id || businessId || "—"} />
                    <Detail label="Contacts" value={String(contactCount(selected))} />
                    <Detail label="Schedule" value={formatSchedule(selected)} />
                    <Detail label="Tone" value={selected.tone || "—"} />
                    <Detail label="Template" value={TEMPLATE_LABELS[selected.template] || selected.template || "Custom"} />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-[#04100d] p-5">
                    <div className="text-xs font-black uppercase tracking-wider text-emerald-300">Message</div>
                    <div className="mt-3 whitespace-pre-line text-sm leading-7 text-white/80">{selected.message || "No message available."}</div>
                  </div>

                  {selected.media?.url && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-[#04100d] p-4">
                      <div className="mb-3 text-xs font-black uppercase tracking-wider text-cyan-300">Campaign Image</div>
                      <img src={selected.media.url} alt="Campaign attachment" className="max-h-80 w-full rounded-xl object-contain" />
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl border border-white/10 bg-[#04100d] p-5">
                    <div className="text-xs font-black uppercase tracking-wider text-white/40">Timing</div>
                    <div className="mt-3 space-y-2 text-sm text-white/65">
                      <div>Created: {formatDate(selected.created_at)}</div>
                      <div>Last run: {formatDate(selected.last_run_at)}</div>
                      <div>Next run: {formatDate(selected.next_run_at)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#071a15] p-5">
      <div className="text-xs font-bold uppercase tracking-wider text-white/30">{label}</div>
      <div className="mt-3 text-2xl font-black">{value}</div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#04100d] p-4">
      <div className="text-[10px] font-black uppercase tracking-wider text-white/30">{label}</div>
      <div className="mt-2 break-words text-sm font-bold text-white/75">{value}</div>
    </div>
  );
}
