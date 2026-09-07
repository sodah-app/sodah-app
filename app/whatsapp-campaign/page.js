 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const INITIAL = {
  name: "",
  message: "",
  preparedMessage: "",
  tone: "Friendly",
  template: "",
  schedule: "now",
  date: "",
  time: "",
  weeklyDay: "monday",
};

const TEMPLATES = [
  {
    id: "offer",
    title: "Promote an offer",
    icon: "✦",
    instruction:
      "Create a concise WhatsApp promotional campaign using the authenticated business profile/system details loaded for this Sodah account. If the user supplied a message, improve it and preserve its factual details. If the message is empty, create the campaign from the business details. Clearly communicate the relevant value and invite the customer to reply. Never invent discounts, prices, dates, services, features, guarantees, or other business facts.",
  },
  {
    id: "lead",
    title: "Follow up with lead",
    icon: "↗",
    instruction:
      "Create a friendly, professional WhatsApp follow-up for a lead using the authenticated business profile/system details loaded for this Sodah account. If the user supplied a message, improve it and preserve its factual details. If the message is empty, create the follow-up from the business details. Encourage a reply and use only verified business information. Never invent facts.",
  },
  {
    id: "reengage",
    title: "Re-engage customer",
    icon: "↻",
    instruction:
      "Create a warm WhatsApp re-engagement campaign for an existing customer using the authenticated business profile/system details loaded for this Sodah account. If the user supplied a message, improve it and preserve its factual details. If the message is empty, create the message from the business details. Encourage the customer to reconnect without inventing facts.",
  },
  {
    id: "invite",
    title: "Invite customers",
    icon: "＋",
    instruction:
      "Create a warm WhatsApp invitation using the authenticated business profile/system details loaded for this Sodah account. If the user supplied a message, improve it and preserve its factual details. If the message is empty, create the invitation from the business details. Invite customers to connect, visit, book, or respond only when supported by the business profile. Never invent facts.",
  },
];

const TONES = ["Friendly", "Professional", "Casual", "Warm", "Persuasive", "Concise"];

const DAYS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
];

function cleanPhone(value) {
  return String(value || "").trim().replace(/[^\d+]/g, "");
}

function validPhone(value) {
  return cleanPhone(value).replace(/\D/g, "").length >= 8;
}

function contactFrom(phone, name = "", email = "") {
  const normalized = cleanPhone(phone);
  if (!validPhone(normalized)) return null;

  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    name: String(name || "").trim(),
    phone: normalized,
    email: String(email || "").trim(),
  };
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function scheduleLabel(campaign) {
  if (campaign.schedule === "now") return "Send now";
  if (campaign.schedule === "scheduled") {
    return campaign.date && campaign.time
      ? `${campaign.date} at ${campaign.time}`
      : "Scheduled once";
  }
  if (campaign.schedule === "daily") {
    return campaign.time ? `Every day at ${campaign.time}` : "Every day";
  }
  const day =
    DAYS.find(([value]) => value === campaign.weeklyDay)?.[1] || "Monday";
  return campaign.time ? `Every ${day} at ${campaign.time}` : `Every ${day}`;
}

export default function WhatsAppCampaignPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [campaign, setCampaign] = useState(INITIAL);
  const [contacts, setContacts] = useState([]);
  const [contactText, setContactText] = useState("");
  const [contactMode, setContactMode] = useState("paste");
  const [media, setMedia] = useState(null);
  const [business, setBusiness] = useState(null);
  const [businessId, setBusinessId] = useState("");
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [success, setSuccess] = useState(null);

  const validContacts = useMemo(
    () => contacts.filter((c) => validPhone(c.phone)),
    [contacts]
  );

  async function getAuthHeaders() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBusiness() {
      setLoadingBusiness(true);
      setError("");

      try {
        // The campaign page can be opened with:
        // /whatsapp-campaign?businessId=BIZ-xxxxxxxxxxxx
        // Read the URL first so the page never loses the active business ID.
        const params = new URLSearchParams(window.location.search);
        const requestedBusinessId = String(
          params.get("businessId") || params.get("business_id") || ""
        ).trim();

        if (requestedBusinessId && !cancelled) {
          setBusinessId(requestedBusinessId);
        }

        const query = requestedBusinessId
          ? `?businessId=${encodeURIComponent(requestedBusinessId)}`
          : "";

        const response = await fetch(`/api/whatsapp-campaign${query}`, {
          method: "GET",
          headers: {
            ...(await getAuthHeaders()),
          },
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "Unable to load your WhatsApp business.");
        }

        const loadedBusiness = data?.business || null;
        const loadedBusinessId = String(
          loadedBusiness?.business_id ||
          loadedBusiness?.id ||
          requestedBusinessId ||
          ""
        ).trim();

        if (!loadedBusinessId) {
          throw new Error("Your Sodah business ID could not be loaded.");
        }

        if (!cancelled) {
          setBusiness(loadedBusiness);
          setBusinessId(loadedBusinessId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load your WhatsApp business.");
        }
      } finally {
        if (!cancelled) setLoadingBusiness(false);
      }
    }

    loadBusiness();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (key, value) => {
    setCampaign((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const addContacts = () => {
    const raw = contactText.trim();
    if (!raw) {
      setError("Enter or paste at least one WhatsApp number.");
      return;
    }

    const next = [];
    const lines = raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

    for (const line of lines) {
      const matches = line.match(/\+?\d[\d\s().-]{7,}\d/g) || [];
      for (const phone of matches) {
        const parts = line.split(/[|,;]/).map((x) => x.trim()).filter(Boolean);
        const name = parts.length > 1 && !/\d/.test(parts[0]) ? parts[0] : "";
        const contact = contactFrom(phone, name);
        if (contact) next.push(contact);
      }
    }

    if (!next.length) {
      setError("No valid WhatsApp numbers were found.");
      return;
    }

    setContacts((current) => {
      const seen = new Set(current.map((c) => c.phone.replace(/\D/g, "")));
      const unique = [];

      for (const contact of next) {
        const key = contact.phone.replace(/\D/g, "");
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(contact);
        }
      }

      return [...current, ...unique];
    });

    setContactText("");
    setError("");
  };

  const uploadContacts = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "txt"].includes(ext)) {
      setError("Please upload a CSV or TXT file.");
      return;
    }

    try {
      const text = await file.text();
      const next = [];

      if (ext === "txt") {
        const lines = text.split(/[\r\n,;]+/).map((x) => x.trim()).filter(Boolean);
        for (const line of lines) {
          const matches = line.match(/\+?\d[\d\s().-]{7,}\d/g) || [];
          for (const phone of matches) {
            const contact = contactFrom(phone);
            if (contact) next.push(contact);
          }
        }
      } else {
        const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error("The CSV needs a header and at least one row.");

        const headers = parseCsvLine(lines[0]).map((x) =>
          x.replace(/^"|"$/g, "").trim().toLowerCase()
        );

        for (const line of lines.slice(1)) {
          const values = parseCsvLine(line);
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          const first =
            row.first_name || row.firstname || "";
          const last =
            row.last_name || row.lastname || "";
          const name =
            row.name ||
            row.full_name ||
            row.fullname ||
            `${first} ${last}`.trim();

          const phone =
            row.phone ||
            row.phone_number ||
            row.mobile ||
            row.whatsapp ||
            row.whatsapp_number ||
            "";

          const email = row.email || row.email_address || "";
          const contact = contactFrom(phone, name, email);
          if (contact) next.push(contact);
        }
      }

      if (!next.length) throw new Error("No valid WhatsApp contacts were found in the file.");

      setContacts((current) => {
        const seen = new Set(current.map((c) => c.phone.replace(/\D/g, "")));
        const unique = [];

        for (const contact of next) {
          const key = contact.phone.replace(/\D/g, "");
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(contact);
          }
        }

        return [...current, ...unique];
      });
    } catch (err) {
      setError(err?.message || "Unable to read the contact file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const selectTemplate = (template) => {
    update("template", template.id);
    setError("");

    // Templates may be selected with or without a draft.
    // When the draft is empty, AI creates the message from the
    // authenticated Sodah business/system details.
    prepareWithAI(template.instruction, campaign.message);
  };

  async function prepareWithAI(customInstruction = "", sourceMessage = "") {
    const message = String(sourceMessage || campaign.message || "").trim();
    const isTemplateRequest = Boolean(customInstruction);

    if (!message && !isTemplateRequest) {
      setError("Write the message you want to send first.");
      return;
    }

    if (!businessId) {
      setError("Your Sodah business ID is still loading. Please wait a moment.");
      return;
    }

    setAiLoading(true);
    setError("");

    try {
      const selectedTemplate =
        TEMPLATES.find((item) => item.id === campaign.template);

      const response = await fetch("/api/campaign-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        credentials: "include",
        body: JSON.stringify({
          message,
          tone: campaign.tone,
          business_id: businessId,
          instruction:
            customInstruction ||
            selectedTemplate?.instruction ||
            "Improve the message for clarity, grammar, professionalism and customer response. Use the authenticated business/system details loaded for this Sodah account and never invent facts.",
          business_name: business?.business_name || "",
          business_context: {
            business_id: businessId,
            business_name: business?.business_name || "",
            industry: business?.industry || "",
            location: business?.location || "",
            services_description: business?.services_description || "",
            capabilities: business?.capabilities || "",
            price_range: business?.price_range || "",
            working_days: business?.working_days || "",
            hours: business?.hours || "",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "AI could not prepare the message.");
      }

      setCampaign((current) => ({
        ...current,
        preparedMessage: String(data.message || "").trim(),
      }));
    } catch (err) {
      setError(err?.message || "AI preparation failed.");
    } finally {
      setAiLoading(false);
    }
  }

  const selectMedia = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("For this campaign version, please select an image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Please keep the image below 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setMedia({
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result || ""),
      });
    };

    reader.onerror = () => setError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (loadingBusiness) return "Loading your business connection. Please wait.";
    if (!business) return "We couldn't load your Sodah business.";
    if (!businessId) return "Your Sodah business ID is missing. Please reload the page.";
    if (!business.whatsapp_connected) return "Connect WhatsApp before creating a campaign.";
    if (!campaign.name.trim()) return "Enter a campaign name.";
    if (!campaign.message.trim()) return "Enter the message you want to send.";
    if (!validContacts.length) return "Add at least one valid WhatsApp contact.";

    if (campaign.schedule === "scheduled" && (!campaign.date || !campaign.time)) {
      return "Select the date and time.";
    }

    if (campaign.schedule === "daily" && !campaign.time) {
      return "Select the daily campaign time.";
    }

    if (campaign.schedule === "weekly" && (!campaign.weeklyDay || !campaign.time)) {
      return "Select the weekly day and time.";
    }

    return "";
  };

  const openReview = () => {
    const message = campaign.preparedMessage || campaign.message;
    if (!message.trim()) {
      setError("Enter or prepare a message first.");
      return;
    }

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setReview(true);
  };

  const assignCampaign = async () => {
    const problem = validate();

    if (problem) {
      setReview(false);
      setError(problem);
      return;
    }

    const finalMessage = campaign.preparedMessage.trim() || campaign.message.trim();

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/whatsapp-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        credentials: "include",
        body: JSON.stringify({
          business_id: businessId,
          campaign_name: campaign.name.trim(),
          message: finalMessage,
          tone: campaign.tone,
          template: campaign.template,
          schedule: {
            mode: campaign.schedule,
            date: campaign.date,
            time: campaign.time,
            weekly_day: campaign.weeklyDay,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          contacts: validContacts,
          media,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Campaign could not be assigned.");
      }

      setReview(false);
      setSuccess(data);
    } catch (err) {
      setError(err?.message || "Campaign could not be assigned.");
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setCampaign(INITIAL);
    setContacts([]);
    setContactText("");
    setMedia(null);
    setError("");
    setSuccess(null);
    setReview(false);
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#04100d] px-4 py-8 text-white md:px-8">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-emerald-400/15 bg-[#071a15] p-8 text-center shadow-2xl md:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/10 text-4xl text-emerald-300">
              ✓
            </div>
            <h1 className="mt-6 text-3xl font-black">Campaign Assigned</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
              {success.status === "scheduled"
                ? "Your campaign has been saved and scheduled."
                : "Your WhatsApp campaign has been sent through your connected Sodah WhatsApp."}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Metric label="Campaign" value={campaign.name} />
              <Metric label="Contacts" value={String(validContacts.length)} />
              <Metric
                label="Schedule"
                value={scheduleLabel(campaign)}
              />
            </div>

            <button
              type="button"
              onClick={reset}
              className="mt-8 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-7 py-3 font-black text-slate-950"
            >
              Create Another Campaign
            </button>
          </div>
        </div>
      </main>
    );
  }

  const preview = campaign.preparedMessage.trim() || campaign.message.trim();

  return (
    <main className="min-h-screen bg-[#04100d] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-7 lg:px-10">
        <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const destination = businessId
                  ? `/channels?businessId=${encodeURIComponent(businessId)}`
                  : "/channels";

                router.push(destination);
              }}
              className="mr-1 flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#071a15] px-4 text-sm font-bold text-white/70 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.06] hover:text-white"
            >
              <span className="text-base">←</span>
              <span>Back</span>
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 via-cyan-400 to-blue-500 text-xl font-black text-slate-950">
              S
            </div>
            <div>
              <h1 className="text-2xl font-black md:text-3xl">WhatsApp Campaign</h1>
              <p className="mt-1 text-sm text-white/45">
                Create, improve, review and send campaigns directly from Sodah.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] px-4 py-2 text-xs font-bold text-cyan-200">
              Business ID: {loadingBusiness ? "Loading..." : businessId || "Unavailable"}
            </div>

            <div
              className={`rounded-xl border px-4 py-2 text-xs font-bold ${
                business?.whatsapp_connected
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-red-400/20 bg-red-400/10 text-red-300"
              }`}
            >
              {loadingBusiness
                ? "Checking WhatsApp..."
                : business?.whatsapp_connected
                  ? "● WhatsApp Connected"
                  : "○ WhatsApp Not Connected"}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#071a15] px-4 py-2 text-xs text-white/50">
              {validContacts.length} valid contacts
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="text-xl text-white/50">
              ×
            </button>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            <section className="rounded-[26px] border border-emerald-400/15 bg-[#071a15] p-6 shadow-xl">
              <SectionTitle
                title="Campaign AI"
                subtitle="Write a draft or choose a template. AI uses your authenticated Sodah business/system details to prepare the campaign message."
              />

              <textarea
                value={campaign.message}
                onChange={(e) => update("message", e.target.value)}
                rows={7}
                placeholder="Example: We are introducing our new package this month. Please let our customers know and invite them to ask for more details."
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#04100d] p-5 text-sm leading-6 outline-none placeholder:text-white/20 focus:border-emerald-400/40"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template)}
                    className={`rounded-full border px-3 py-2 text-xs transition ${
                      campaign.template === template.id
                        ? "border-emerald-300/50 bg-emerald-400/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.025] text-white/55 hover:bg-white/[0.05]"
                    }`}
                  >
                    {template.icon} {template.title}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => prepareWithAI()}
                  disabled={aiLoading}
                  className="rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  {aiLoading
                    ? "Preparing..."
                    : campaign.preparedMessage
                      ? "✦ Improve with AI"
                      : "✦ Prepare with AI"}
                </button>

                <span className="text-xs text-white/35">
                  AI only changes the draft here. Nothing is sent until you review it.
                </span>
              </div>

              {campaign.preparedMessage && (
                <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                      AI Prepared Message
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCampaign((current) => ({
                          ...current,
                          message: current.preparedMessage,
                          preparedMessage: "",
                        }))
                      }
                      className="text-xs text-white/50 hover:text-white"
                    >
                      Use as message
                    </button>
                  </div>
                  <div className="whitespace-pre-line text-sm leading-6 text-white/80">
                    {campaign.preparedMessage}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#071a15] p-6">
              <SectionTitle
                title="Campaign Details"
                subtitle="Choose the message tone and give the campaign a clear name."
              />

              <label className="mb-2 block text-sm text-white/55">Campaign Name</label>
              <input
                value={campaign.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. New Package Promotion"
                className="w-full rounded-xl border border-white/10 bg-[#04100d] px-4 py-3.5 text-sm outline-none focus:border-cyan-400/40"
              />

              <label className="mb-2 mt-6 block text-sm text-white/55">Message Tone</label>
              <select
                value={campaign.tone}
                onChange={(e) => update("tone", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#04100d] px-4 py-3.5 text-sm outline-none"
              >
                {TONES.map((tone) => (
                  <option key={tone}>{tone}</option>
                ))}
              </select>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-sm font-bold">Message behavior</div>
                <p className="mt-1 text-xs leading-5 text-white/35">
                  {campaign.preparedMessage
                    ? "The prepared AI message will be the exact message submitted after review."
                    : "Your original message will be the exact message submitted after review."}
                </p>
              </div>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#071a15] p-6">
              <SectionTitle
                title="Add Contacts"
                subtitle="Paste numbers or upload a CSV/TXT file. Duplicate numbers are removed automatically."
              />

              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={uploadContacts}
                className="hidden"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setContactMode("paste")}
                  className={`rounded-2xl border p-4 text-left ${
                    contactMode === "paste"
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="font-bold">✎ Type or Paste</div>
                  <div className="mt-1 text-xs text-white/35">
                    One number per line, or Name, Number.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setContactMode("upload")}
                  className={`rounded-2xl border p-4 text-left ${
                    contactMode === "upload"
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="font-bold">↑ Upload CSV/TXT</div>
                  <div className="mt-1 text-xs text-white/35">
                    Upload a customer contact list.
                  </div>
                </button>
              </div>

              {contactMode === "paste" ? (
                <div className="mt-5">
                  <textarea
                    value={contactText}
                    onChange={(e) => setContactText(e.target.value)}
                    rows={6}
                    placeholder={"John, +971501234567\nMary, +971501234568\n+971501234569"}
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#04100d] p-4 text-sm leading-6 outline-none placeholder:text-white/20 focus:border-emerald-400/40"
                  />
                  <button
                    type="button"
                    onClick={addContacts}
                    className="mt-3 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950"
                  >
                    Add Contacts
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/10 p-8 text-center">
                  <div className="text-3xl">📄</div>
                  <div className="mt-3 text-sm font-bold">Upload your contacts</div>
                  <p className="mt-1 text-xs text-white/35">CSV or TXT files.</p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-bold text-cyan-300"
                  >
                    Choose File
                  </button>
                </div>
              )}

              {contacts.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Contacts ({validContacts.length})</span>
                    <button
                      type="button"
                      onClick={() => setContacts([])}
                      className="text-xs text-red-300"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#04100d] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {contact.name || "WhatsApp Contact"}
                          </div>
                          <div className="text-xs text-white/35">{contact.phone}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setContacts((current) =>
                              current.filter((item) => item.id !== contact.id)
                            )
                          }
                          className="text-xs text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#071a15] p-6">
              <SectionTitle
                title="Add Image"
                subtitle="Optionally send one image with the WhatsApp message."
              />

              <input
                id="campaign-image"
                type="file"
                accept="image/*"
                onChange={selectMedia}
                className="hidden"
              />

              {media ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={media.dataUrl}
                      alt="Campaign"
                      className="h-24 w-24 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{media.name}</div>
                      <div className="mt-1 text-xs text-white/35">{media.type}</div>
                      <button
                        type="button"
                        onClick={() => setMedia(null)}
                        className="mt-4 text-xs text-red-300"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="campaign-image"
                  className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center"
                >
                  <div>
                    <div className="text-3xl">🖼️</div>
                    <div className="mt-3 text-sm font-bold">Choose campaign image</div>
                    <div className="mt-1 text-xs text-white/35">PNG, JPG or WEBP · up to 5 MB</div>
                  </div>
                </label>
              )}
            </section>
          </div>

          <aside className="space-y-6 self-start">
            <section className="rounded-[26px] border border-white/10 bg-[#071a15] p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-black">Campaign Summary</h2>
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  Draft
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <Summary label="Business" value={business?.business_name || "Loading..."} />
                <Summary label="Business ID" value={businessId || "Loading..."} />
                <Summary
                  label="WhatsApp"
                  value={business?.whatsapp_connected ? "Connected" : "Not connected"}
                  green={Boolean(business?.whatsapp_connected)}
                />
                <Summary label="Contacts" value={String(validContacts.length)} green />
                <Summary label="Tone" value={campaign.tone} />
                <Summary
                  label="Message"
                  value={campaign.preparedMessage ? "AI Prepared" : "Original"}
                />
                <Summary label="Schedule" value={scheduleLabel(campaign)} />
                <Summary label="Image" value={media ? "Attached" : "None"} />
              </div>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#071a15] p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-black">Message Preview</h2>
                <span className="text-[10px] uppercase tracking-wider text-white/25">
                  {campaign.preparedMessage ? "AI" : "Direct"}
                </span>
              </div>

              <div className="mt-4 min-h-[170px] rounded-2xl border border-white/10 bg-[#04100d] p-5">
                {preview ? (
                  <div className="whitespace-pre-line text-sm leading-6 text-white/80">
                    {preview}
                  </div>
                ) : (
                  <div className="text-sm text-white/25">
                    Your exact campaign message will appear here.
                  </div>
                )}

                {media && (
                  <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                    <img src={media.dataUrl} alt="Campaign attachment" className="max-h-64 w-full object-cover" />
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-white/30">
                The previewed message is the exact message submitted to the campaign API after you confirm.
              </p>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#071a15] p-6">
              <h2 className="font-black">Schedule Campaign</h2>

              <div className="mt-5 space-y-3">
                {[
                  ["now", "Send Now", "Start immediately."],
                  ["scheduled", "Schedule Once", "Choose a specific date and time."],
                  ["daily", "Every Day", "Send automatically every day."],
                  ["weekly", "Every Week", "Send automatically once every week."],
                ].map(([value, title, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update("schedule", value)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                      campaign.schedule === value
                        ? "border-cyan-400/40 bg-cyan-400/[0.08]"
                        : "border-white/10 bg-[#04100d]"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{title}</div>
                      <div className="mt-1 text-xs text-white/35">{description}</div>
                    </div>
                    <span
                      className={`h-3 w-3 rounded-full ${
                        campaign.schedule === value ? "bg-cyan-300" : "bg-white/15"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {campaign.schedule === "scheduled" && (
                <div className="mt-4 grid gap-3">
                  <input
                    type="date"
                    value={campaign.date}
                    onChange={(e) => update("date", e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#04100d] px-4 py-3 text-sm"
                  />
                  <input
                    type="time"
                    value={campaign.time}
                    onChange={(e) => update("time", e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#04100d] px-4 py-3 text-sm"
                  />
                </div>
              )}

              {campaign.schedule === "daily" && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs text-white/40">Daily time</label>
                  <input
                    type="time"
                    value={campaign.time}
                    onChange={(e) => update("time", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#04100d] px-4 py-3 text-sm"
                  />
                </div>
              )}

              {campaign.schedule === "weekly" && (
                <div className="mt-4 grid gap-3">
                  <select
                    value={campaign.weeklyDay}
                    onChange={(e) => update("weeklyDay", e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#04100d] px-4 py-3 text-sm"
                  >
                    {DAYS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={campaign.time}
                    onChange={(e) => update("time", e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#04100d] px-4 py-3 text-sm"
                  />
                </div>
              )}
            </section>

            <section className="rounded-[26px] border border-cyan-400/15 bg-gradient-to-br from-emerald-400/[0.08] via-cyan-500/[0.06] to-blue-500/[0.08] p-6">
              <div className="text-sm font-black">Ready to continue?</div>
              <p className="mt-2 text-xs leading-5 text-white/40">
                Review the exact message, contacts, image and schedule before assigning.
              </p>
              <button
                type="button"
                onClick={openReview}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-5 py-3.5 text-sm font-black text-slate-950"
              >
                🚀 Review & Assign Campaign
              </button>
            </section>
          </aside>
        </div>
      </div>

      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">
          <div className="my-8 w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#06130f] p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-cyan-300">Final Review</div>
                <h2 className="mt-1 text-2xl font-black">Ready to assign?</h2>
                <p className="mt-2 text-sm text-white/40">
                  This is the final message and campaign configuration that will be submitted.
                </p>
              </div>

              <button
                type="button"
                onClick={() => !sending && setReview(false)}
                className="text-2xl text-white/50 hover:text-white"
                aria-label="Close review"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Review label="Business ID" value={businessId || "Missing"} />
              <Review label="Campaign" value={campaign.name} />
              <Review label="Contacts" value={String(validContacts.length)} />
              <Review label="Schedule" value={scheduleLabel(campaign)} />
              <Review label="Image" value={media ? "Attached" : "None"} />
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.03] p-5">
              <div className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-300">
                Exact Message
              </div>
              <div className="whitespace-pre-line text-sm leading-6 text-white/80">
                {preview}
              </div>
              {media && (
                <img
                  src={media.dataUrl}
                  alt="Campaign attachment"
                  className="mt-5 max-h-72 w-full rounded-xl object-cover"
                />
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={sending}
                onClick={() => setReview(false)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={assignCampaign}
                className="rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {sending ? "Assigning..." : "🚀 Assign Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="font-black">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">{subtitle}</p>
    </div>
  );
}

function Summary({ label, value, green = false }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/40">{label}</span>
      <span
        className={`max-w-[230px] truncate text-right font-semibold ${
          green ? "text-emerald-300" : "text-white/80"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#04100d] p-4 text-left">
      <div className="truncate text-lg font-black">{value}</div>
      <div className="mt-1 text-xs text-white/35">{label}</div>
    </div>
  );
}

function Review({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xs text-white/30">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-white/80">{value}</div>
    </div>
  );
}
