"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
      "Create a concise, persuasive promotional campaign for the business. If the user supplied a draft, improve it; if the draft is empty, write the message from the business context. Make the value clear and invite the customer to reply. Do not invent discounts, prices, dates, or features.",
  },
  {
    id: "lead",
    title: "Follow up with lead",
    icon: "↗",
    instruction:
      "Create a friendly, professional follow-up message for a lead. If the user supplied a draft, improve it; if the draft is empty, write the follow-up from the business context. Encourage a reply and preserve all factual details supplied by the user.",
  },
  {
    id: "reengage",
    title: "Re-engage customer",
    icon: "↻",
    instruction:
      "Create a warm re-engagement message for an existing customer. If the user supplied a draft, improve it; if the draft is empty, write the message from the business context. Encourage them to reconnect without inventing facts.",
  },
  {
    id: "invite",
    title: "Invite customers",
    icon: "＋",
    instruction:
      "Create a warm invitation for customers to connect, visit, book, or respond. If the user supplied a draft, improve it; if the draft is empty, write the invitation from the business context. Use only the facts provided.",
  },
];

const TONES = [
  "Friendly",
  "Professional",
  "Casual",
  "Warm",
  "Persuasive",
  "Concise",
];

const DAYS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
];

/* ============================================================
   PHONE HELPERS
   ============================================================ */

function cleanPhone(value) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function validPhone(value) {
  return cleanPhone(value).replace(/\D/g, "").length >= 8;
}

function contactFrom(phone, name = "", email = "") {
  const normalized = cleanPhone(phone);

  if (!validPhone(normalized)) {
    return null;
  }

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

/* ============================================================
   CSV PARSER
   ============================================================ */

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

/* ============================================================
   SCHEDULE LABEL
   ============================================================ */

function scheduleLabel(campaign) {
  if (campaign.schedule === "now") {
    return "Send now";
  }

  if (campaign.schedule === "scheduled") {
    return campaign.date && campaign.time
      ? `${campaign.date} at ${campaign.time}`
      : "Scheduled once";
  }

  if (campaign.schedule === "daily") {
    return campaign.time
      ? `Every day at ${campaign.time}`
      : "Every day";
  }

  const day =
    DAYS.find(
      ([value]) =>
        value === campaign.weeklyDay
    )?.[1] || "Monday";

  return campaign.time
    ? `Every ${day} at ${campaign.time}`
    : `Every ${day}`;
}

/* ============================================================
   PAGE
   ============================================================ */

function WhatsAppCampaignContent() {
  const searchParams = useSearchParams();

  const fileRef = useRef(null);

  const [campaign, setCampaign] =
    useState(INITIAL);

  const [contacts, setContacts] =
    useState([]);

  const [contactText, setContactText] =
    useState("");

  const [contactMode, setContactMode] =
    useState("paste");

  const [media, setMedia] =
    useState(null);

  const [business, setBusiness] =
    useState(null);

  const [loadingBusiness, setLoadingBusiness] =
    useState(true);

  const [aiLoading, setAiLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [review, setReview] =
    useState(false);

  const [success, setSuccess] =
    useState(null);

  const [cashflowLoaded, setCashflowLoaded] =
    useState(false);

  const validContacts = useMemo(
    () =>
      contacts.filter((contact) =>
        validPhone(contact.phone)
      ),
    [contacts]
  );

  /* ==========================================================
     AUTH HEADER

     Always send the current Supabase access token.
     This prevents the standalone WhatsApp page from making
     unauthenticated API requests.
     ========================================================== */

  const getAuthHeaders = async () => {
    const {
      data,
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !data?.session?.access_token
    ) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    return {
      Authorization: `Bearer ${data.session.access_token}`,
    };
  };

  /* ==========================================================
     LOAD BUSINESS

     This loads the authenticated Sodah business only.
     No invoice information is loaded here.
     ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadBusiness() {
      setLoadingBusiness(true);

      setError("");

      try {
        const authHeaders =
          await getAuthHeaders();

        const response =
          await fetch(
            "/api/whatsapp-campaign",
            {
              method: "GET",

              headers: {
                ...authHeaders,
              },

              credentials: "include",

              cache: "no-store",
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              data?.message ||
              "Unable to load your WhatsApp business."
          );
        }

        if (!cancelled) {
          setBusiness(
            data.business || null
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load your WhatsApp business."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingBusiness(false);
        }
      }
    }

    loadBusiness();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
     CASHFLOW → WHATSAPP

     IMPORTANT:

     WhatsApp Campaign is NOT an invoice page.

     When opened normally:
       - no invoice data
       - no invoice card
       - no invoice number
       - no amount
       - no due date
       - no currency

     When opened from Cashflow:
       - load approved message
       - load customer name
       - load customer phone
       - put those into normal campaign fields

     The approved Cashflow message is NOT sent through AI.
     ========================================================== */

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    if (
      searchParams.get("source") !==
      "cashflow"
    ) {
      return;
    }

    let saved = {};

    try {
      const raw =
        window.sessionStorage.getItem(
          "sodah_cashflow_campaign_message"
        );

      if (raw) {
        const parsed =
          JSON.parse(raw);

        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          saved = parsed;
        }
      }
    } catch (err) {
      console.warn(
        "[WhatsApp Campaign] Could not read Cashflow context:",
        err
      );
    }

    const getValue = (...keys) => {
      for (const key of keys) {
        const queryValue =
          searchParams.get(key);

        if (
          queryValue &&
          queryValue.trim()
        ) {
          return queryValue.trim();
        }

        const savedValue =
          saved?.[key];

        if (
          savedValue !== undefined &&
          savedValue !== null
        ) {
          const value =
            String(savedValue).trim();

          if (value) {
            return value;
          }
        }
      }

      return "";
    };

    /*
     * ONLY THESE CASHFLOW VALUES ARE USED.
     *
     * Invoice number, amount, due date,
     * currency etc. are deliberately ignored.
     */

    const message =
      getValue(
        "message",
        "preparedMessage",
        "aiMessage",
        "campaign_message"
      );

    const customerName =
      getValue(
        "customer_name",
        "name"
      );

    const customerPhone =
      getValue(
        "customer_phone",
        "phone"
      );

    setCashflowLoaded(true);

    /*
     * Load the EXACT approved message.
     *
     * Do NOT call AI here.
     */

    if (message) {
      setCampaign(
        (current) => ({
          ...current,

          message,

          preparedMessage: "",

          template: "",
        })
      );
    }

    /*
     * Load customer phone directly into
     * the normal campaign contacts list.
     */

    if (customerPhone) {
      const contact =
        contactFrom(
          customerPhone,
          customerName
        );

      if (contact) {
        setContacts([
          contact,
        ]);
      }
    }

    setNotice(
      message
        ? "Cashflow message loaded exactly as approved. No invoice details are shown on this WhatsApp campaign page."
        : "Cashflow opened this campaign page, but no approved message was provided."
    );

    setError("");
  }, [searchParams]);

  /* ==========================================================
     UPDATE CAMPAIGN
     ========================================================== */

  const update = (
    key,
    value
  ) => {
    setCampaign(
      (current) => ({
        ...current,
        [key]: value,
      })
    );

    setError("");

    setNotice("");
  };

  /* ==========================================================
     ADD CONTACTS
     ========================================================== */

  const addContacts = () => {
    const raw =
      contactText.trim();

    if (!raw) {
      setError(
        "Enter or paste at least one WhatsApp number."
      );

      return;
    }

    const next = [];

    const lines =
      raw
        .split(/\r?\n/)
        .map((x) =>
          x.trim()
        )
        .filter(Boolean);

    for (const line of lines) {
      const matches =
        line.match(
          /\+?\d[\d\s().-]{7,}\d/g
        ) || [];

      for (const phone of matches) {
        const parts =
          line
            .split(/[|,;]/)
            .map((x) =>
              x.trim()
            )
            .filter(Boolean);

        const name =
          parts.length > 1 &&
          !/\d/.test(parts[0])
            ? parts[0]
            : "";

        const contact =
          contactFrom(
            phone,
            name
          );

        if (contact) {
          next.push(contact);
        }
      }
    }

    if (!next.length) {
      setError(
        "No valid WhatsApp numbers were found."
      );

      return;
    }

    setContacts(
      (current) => {
        const seen =
          new Set(
            current.map(
              (c) =>
                c.phone.replace(
                  /\D/g,
                  ""
                )
            )
          );

        const unique = [];

        for (const contact of next) {
          const key =
            contact.phone.replace(
              /\D/g,
              ""
            );

          if (!seen.has(key)) {
            seen.add(key);

            unique.push(
              contact
            );
          }
        }

        return [
          ...current,
          ...unique,
        ];
      }
    );

    setContactText("");

    setError("");
  };

  /* ==========================================================
     UPLOAD CONTACTS
     ========================================================== */

  const uploadContacts =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      setError("");

      const ext =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase();

      if (
        ![
          "csv",
          "txt",
        ].includes(ext)
      ) {
        setError(
          "Please upload a CSV or TXT file."
        );

        return;
      }

      try {
        const text =
          await file.text();

        const next = [];

        if (ext === "txt") {
          const lines =
            text
              .split(
                /[\r\n,;]+/
              )
              .map((x) =>
                x.trim()
              )
              .filter(Boolean);

          for (const line of lines) {
            const matches =
              line.match(
                /\+?\d[\d\s().-]{7,}\d/g
              ) || [];

            for (const phone of matches) {
              const contact =
                contactFrom(
                  phone
                );

              if (contact) {
                next.push(
                  contact
                );
              }
            }
          }
        } else {
          const lines =
            text
              .split(/\r?\n/)
              .map((x) =>
                x.trim()
              )
              .filter(Boolean);

          if (
            lines.length < 2
          ) {
            throw new Error(
              "The CSV needs a header and at least one row."
            );
          }

          const headers =
            parseCsvLine(
              lines[0]
            ).map((x) =>
              x
                .replace(
                  /^"|"$/g,
                  ""
                )
                .trim()
                .toLowerCase()
            );

          for (
            const line of
              lines.slice(1)
          ) {
            const values =
              parseCsvLine(
                line
              );

            const row = {};

            headers.forEach(
              (
                header,
                index
              ) => {
                row[
                  header
                ] =
                  values[
                    index
                  ] || "";
              }
            );

            const first =
              row.first_name ||
              row.firstname ||
              "";

            const last =
              row.last_name ||
              row.lastname ||
              "";

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

            const email =
              row.email ||
              row.email_address ||
              "";

            const contact =
              contactFrom(
                phone,
                name,
                email
              );

            if (contact) {
              next.push(
                contact
              );
            }
          }
        }

        if (!next.length) {
          throw new Error(
            "No valid WhatsApp contacts were found in the file."
          );
        }

        setContacts(
          (current) => {
            const seen =
              new Set(
                current.map(
                  (c) =>
                    c.phone.replace(
                      /\D/g,
                      ""
                    )
                )
              );

            const unique = [];

            for (
              const contact of
                next
            ) {
              const key =
                contact.phone.replace(
                  /\D/g,
                  ""
                );

              if (
                !seen.has(key)
              ) {
                seen.add(key);

                unique.push(
                  contact
                );
              }
            }

            return [
              ...current,
              ...unique,
            ];
          }
        );
      } catch (err) {
        setError(
          err?.message ||
            "Unable to read the contact file."
        );
      } finally {
        if (fileRef.current) {
          fileRef.current.value =
            "";
        }
      }
    };

  /* ==========================================================
     SELECT TEMPLATE

     Templates remain part of the standalone WhatsApp platform.
     Selecting one explicitly is an AI action.
     ========================================================== */

  const selectTemplate =
    (template) => {
      update(
        "template",
        template.id
      );

      prepareWithAI(
        template.instruction,
        campaign.message
      );
    };

  /* ==========================================================
     AI PREPARATION

     AI only runs when the user explicitly:
       - selects a template
       - clicks Prepare/Improve with AI
     ========================================================== */

  async function prepareWithAI(
    customInstruction = "",
    sourceMessage = ""
  ) {
    const message =
      String(
        sourceMessage ||
          campaign.message ||
          ""
      ).trim();

    if (
      !message &&
      !customInstruction
    ) {
      setError(
        "Write the message you want to send first, or choose a template."
      );

      return;
    }

    setAiLoading(true);

    setError("");

    setNotice("");

    try {
      const selectedTemplate =
        TEMPLATES.find(
          (item) =>
            item.id ===
            campaign.template
        );

      const authHeaders =
        await getAuthHeaders();

      const response =
        await fetch(
          "/api/campaign-ai",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...authHeaders,
            },

            credentials:
              "include",

            body:
              JSON.stringify({
                message,

                tone:
                  campaign.tone,

                instruction:
                  customInstruction ||
                  selectedTemplate?.instruction ||
                  "Improve the message for clarity, grammar, professionalism and customer response. If the user message is empty, create a campaign message using the business context.",

                business_name:
                  business?.business_name ||
                  "",

                business_context: {
                  business_name:
                    business?.business_name ||
                    "",

                  industry:
                    business?.industry ||
                    "",

                  location:
                    business?.location ||
                    "",

                  services_description:
                    business?.services_description ||
                    "",

                  capabilities:
                    business?.capabilities ||
                    "",

                  price_range:
                    business?.price_range ||
                    "",
                },
              }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            data?.message ||
            "AI could not prepare the message."
        );
      }

      const generatedMessage =
        String(
          data.message || ""
        ).trim();

      if (!generatedMessage) {
        throw new Error(
          "AI returned an empty message."
        );
      }

      setCampaign(
        (current) => ({
          ...current,

          message:
            generatedMessage,

          preparedMessage:
            generatedMessage,
        })
      );
    } catch (err) {
      setError(
        err?.message ||
          "AI preparation failed."
      );
    } finally {
      setAiLoading(false);
    }
  }

  /* ==========================================================
     MEDIA
     ========================================================== */

  const selectMedia =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      setError("");

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        setError(
          "Please select an image for the campaign."
        );

        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setError(
          "Please keep the image below 5 MB."
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload =
        () => {
          setMedia({
            name: file.name,

            type: file.type,

            dataUrl:
              String(
                reader.result ||
                  ""
              ),
          });
        };

      reader.onerror =
        () =>
          setError(
            "Unable to read the selected image."
          );

      reader.readAsDataURL(
        file
      );
    };

  /* ==========================================================
     VALIDATION
     ========================================================== */

  const validate = () => {
    if (
      loadingBusiness
    ) {
      return "Loading your business connection. Please wait.";
    }

    if (!business) {
      return "We couldn't load your Sodah business.";
    }

    if (
      !business.whatsapp_connected
    ) {
      return "Connect WhatsApp before creating a campaign.";
    }

    if (
      !campaign.name.trim()
    ) {
      return "Enter a campaign name.";
    }

    if (
      !campaign.message.trim() &&
      !campaign.preparedMessage.trim()
    ) {
      return "Enter a message or choose a campaign AI template.";
    }

    if (
      !validContacts.length
    ) {
      return "Add at least one valid WhatsApp contact.";
    }

    if (
      campaign.schedule ===
        "scheduled" &&
      (!campaign.date ||
        !campaign.time)
    ) {
      return "Select the date and time.";
    }

    if (
      campaign.schedule ===
        "daily" &&
      !campaign.time
    ) {
      return "Select the daily campaign time.";
    }

    if (
      campaign.schedule ===
        "weekly" &&
      (!campaign.weeklyDay ||
        !campaign.time)
    ) {
      return "Select the weekly day and time.";
    }

    return "";
  };

  /* ==========================================================
     REVIEW
     ========================================================== */

  const openReview =
    () => {
      const message =
        campaign.preparedMessage.trim() ||
        campaign.message.trim();

      if (!message) {
        setError(
          "Enter or prepare a message first."
        );

        return;
      }

      const problem =
        validate();

      if (problem) {
        setError(
          problem
        );

        return;
      }

      setReview(true);
    };

  /* ==========================================================
     ASSIGN CAMPAIGN
     ========================================================== */

  const assignCampaign =
    async () => {
      const problem =
        validate();

      if (problem) {
        setReview(false);

        setError(
          problem
        );

        return;
      }

      const finalMessage =
        campaign.preparedMessage.trim() ||
        campaign.message.trim();

      setSending(true);

      setError("");

      setNotice("");

      try {
        const authHeaders =
          await getAuthHeaders();

        const response =
          await fetch(
            "/api/whatsapp-campaign",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                ...authHeaders,
              },

              credentials:
                "include",

              body:
                JSON.stringify({
                  campaign_name:
                    campaign.name.trim(),

                  message:
                    finalMessage,

                  tone:
                    campaign.tone,

                  template:
                    campaign.template,

                  schedule: {
                    mode:
                      campaign.schedule,

                    date:
                      campaign.date,

                    time:
                      campaign.time,

                    weekly_day:
                      campaign.weeklyDay,

                    timezone:
                      Intl.DateTimeFormat().resolvedOptions()
                        .timeZone,
                  },

                  contacts:
                    validContacts,

                  media,
                }),
            }
          );

        const data =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              data?.message ||
              "Campaign could not be assigned."
          );
        }

        setReview(false);

        setSuccess(data);
      } catch (err) {
        setError(
          err?.message ||
            "Campaign could not be assigned."
        );
      } finally {
        setSending(false);
      }
    };

  /* ==========================================================
     RESET
     ========================================================== */

  const reset =
    () => {
      setCampaign(
        INITIAL
      );

      setContacts([]);

      setContactText("");

      setMedia(null);

      setError("");

      setNotice("");

      setSuccess(null);

      setReview(false);

      setCashflowLoaded(
        false
      );
    };

  /* ==========================================================
     SUCCESS
     ========================================================== */

  if (success) {
    return (
      <main className="min-h-screen bg-[#020d0a] px-4 py-8 text-slate-100 md:px-8">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-emerald-400/15 bg-[#061713] p-8 text-center shadow-2xl md:p-12">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/10 text-4xl text-emerald-300">
              ✓
            </div>

            <h1 className="mt-6 text-3xl font-black">
              Campaign Assigned
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
              {success.status ===
              "scheduled"
                ? "Your campaign has been saved and scheduled."
                : "Your WhatsApp campaign has been sent through your connected Sodah WhatsApp."}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">

              <Metric
                label="Campaign"
                value={
                  campaign.name
                }
              />

              <Metric
                label="Contacts"
                value={String(
                  validContacts.length
                )}
              />

              <Metric
                label="Schedule"
                value={scheduleLabel(
                  campaign
                )}
              />

            </div>

            <button
              type="button"
              onClick={
                reset
              }
              className="mt-8 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-7 py-3 font-black text-slate-950"
            >
              Create Another Campaign
            </button>

          </div>
        </div>
      </main>
    );
  }

  const preview =
    campaign.preparedMessage.trim() ||
    campaign.message.trim();

  /* ==========================================================
     MAIN PAGE
     ========================================================== */

  return (
    <main className="min-h-screen bg-[#020d0a] text-slate-100">

      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-7 lg:px-10">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 via-cyan-400 to-blue-500 text-xl font-black text-slate-950">
              S
            </div>

            <div>
              <h1 className="text-2xl font-black md:text-3xl">
                WhatsApp Campaign
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Create, improve, review and send campaigns directly from Sodah.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-3">

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

            <div className="rounded-xl border border-white/10 bg-[#061713] px-4 py-2 text-xs text-slate-300">
              {validContacts.length} valid contacts
            </div>

          </div>

        </header>

        {/* ======================================================
            CASHFLOW MESSAGE NOTICE

            No invoice information is displayed.
        ====================================================== */}

        {cashflowLoaded &&
          notice && (
            <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
              {notice}
            </div>
          )}

        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-950/40 px-4 py-3 text-sm text-red-200">

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-xl text-slate-400"
              aria-label="Close error"
            >
              ×
            </button>

          </div>
        )}

        {/* ======================================================
            MAIN GRID
        ====================================================== */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">

          <div className="space-y-6">

            {/* ==================================================
                CAMPAIGN AI
            ================================================== */}

            <section className="rounded-[26px] border border-emerald-400/15 bg-[#061713] p-6 shadow-xl">

              <SectionTitle
                title="Campaign AI"
                subtitle="Write what you want to say. AI is optional: you can send your original message exactly as written."
              />

              <textarea
                value={
                  campaign.message
                }
                onChange={(e) =>
                  setCampaign(
                    (current) => ({
                      ...current,

                      message:
                        e.target.value,

                      preparedMessage:
                        "",
                    })
                  )
                }
                rows={7}
                placeholder="Write your message here, or leave it empty and choose a template to let AI create it from your business profile."
                className="w-full resize-none rounded-2xl border border-emerald-300/60 bg-[#c7f3d4] p-5 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400/40"
              />

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-[#08251e] px-3 py-2 text-xs text-emerald-200">

                <span className="text-base">
                  ✦
                </span>

                <span>
                  AI uses your saved Sodah business details only when you explicitly choose an AI action.
                </span>

              </div>

              <div className="mt-4 flex flex-wrap gap-2">

                {TEMPLATES.map(
                  (template) => (
                    <button
                      key={
                        template.id
                      }
                      type="button"
                      onClick={() =>
                        selectTemplate(
                          template
                        )
                      }
                      className={`rounded-full border px-3 py-2 text-xs transition ${
                        campaign.template ===
                        template.id
                          ? "border-emerald-300/50 bg-emerald-400/10 text-emerald-200"
                          : "border-white/10 bg-[#071b16] text-slate-300 hover:bg-[#0b241e]"
                      }`}
                    >
                      {
                        template.icon
                      }{" "}
                      {
                        template.title
                      }
                    </button>
                  )
                )}

              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">

                <button
                  type="button"
                  onClick={() =>
                    prepareWithAI()
                  }
                  disabled={
                    aiLoading
                  }
                  className="rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                >
                  {aiLoading
                    ? "Preparing..."
                    : campaign.preparedMessage
                      ? "✦ Improve with AI"
                      : "✦ Prepare with AI"}
                </button>

                <span className="text-xs text-slate-400">
                  AI changes the message only when you explicitly use an AI action.
                </span>

              </div>

            </section>

            {/* ==================================================
                CAMPAIGN DETAILS
            ================================================== */}

            <section className="rounded-[26px] border border-white/10 bg-[#061713] p-6">

              <SectionTitle
                title="Campaign Details"
                subtitle="Choose the message tone and give the campaign a clear name."
              />

              <label className="mb-2 block text-sm text-slate-400">
                Campaign Name
              </label>

              <input
                value={
                  campaign.name
                }
                onChange={(e) =>
                  update(
                    "name",
                    e.target.value
                  )
                }
                placeholder="e.g. New Package Promotion"
                className="w-full rounded-xl border border-emerald-300/60 bg-[#c7f3d4] px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-cyan-400/40"
              />

              <label className="mb-2 mt-6 block text-sm text-slate-400">
                Message Tone
              </label>

              <select
                value={
                  campaign.tone
                }
                onChange={(e) =>
                  update(
                    "tone",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-emerald-300/60 bg-[#c7f3d4] px-4 py-3.5 text-sm text-slate-900 outline-none"
              >
                {TONES.map(
                  (tone) => (
                    <option
                      key={tone}
                    >
                      {tone}
                    </option>
                  )
                )}
              </select>

              <div className="mt-5 rounded-2xl border border-white/10 bg-[#071b16] p-4">

                <div className="text-sm font-bold">
                  Message behavior
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {campaign.preparedMessage
                    ? "AI prepared this message. You can edit it, and the edited text becomes the exact message submitted after review."
                    : "Your current message will be the exact message submitted after review."}
                </p>

              </div>

            </section>

            {/* ==================================================
                CONTACTS
            ================================================== */}

            <section className="rounded-[26px] border border-white/10 bg-[#061713] p-6">

              <SectionTitle
                title="Add Contacts"
                subtitle="Paste numbers or upload a CSV/TXT file. Duplicate numbers are removed automatically."
              />

              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={
                  uploadContacts
                }
                className="hidden"
              />

              <div className="grid gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={() =>
                    setContactMode(
                      "paste"
                    )
                  }
                  className={`rounded-2xl border p-4 text-left ${
                    contactMode ===
                    "paste"
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-[#071b16]"
                  }`}
                >
                  <div className="font-bold">
                    ✎ Type or Paste
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    One number per line, or Name, Number.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setContactMode(
                      "upload"
                    )
                  }
                  className={`rounded-2xl border p-4 text-left ${
                    contactMode ===
                    "upload"
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : "border-white/10 bg-[#071b16]"
                  }`}
                >
                  <div className="font-bold">
                    ↑ Upload CSV/TXT
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    Upload a customer contact list.
                  </div>
                </button>

              </div>

              {contactMode ===
              "paste" ? (
                <div className="mt-5">

                  <textarea
                    value={
                      contactText
                    }
                    onChange={(e) =>
                      setContactText(
                        e.target.value
                      )
                    }
                    rows={6}
                    placeholder={
                      "John, +971501234567\nMary, +971501234568\n+971501234569"
                    }
                    className="w-full resize-none rounded-xl border border-emerald-300/60 bg-[#c7f3d4] p-4 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400/40"
                  />

                  <button
                    type="button"
                    onClick={
                      addContacts
                    }
                    className="mt-3 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950"
                  >
                    Add Contacts
                  </button>

                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-[#071b16] p-8 text-center">

                  <div className="text-3xl">
                    📄
                  </div>

                  <div className="mt-3 text-sm font-bold">
                    Upload your contacts
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    CSV or TXT files.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      fileRef.current?.click()
                    }
                    className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-bold text-cyan-300"
                  >
                    Choose File
                  </button>

                </div>
              )}

              {contacts.length >
                0 && (
                <div className="mt-6">

                  <div className="flex items-center justify-between">

                    <span className="text-sm font-bold">
                      Contacts (
                      {
                        validContacts.length
                      }
                      )
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setContacts(
                          []
                        )
                      }
                      className="text-xs text-red-300"
                    >
                      Clear all
                    </button>

                  </div>

                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">

                    {contacts.map(
                      (contact) => (
                        <div
                          key={
                            contact.id
                          }
                          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300/60 bg-[#c7f3d4] px-4 py-3"
                        >

                          <div className="min-w-0">

                            <div className="truncate text-sm font-medium text-slate-900">
                              {
                                contact.name ||
                                "WhatsApp Contact"
                              }
                            </div>

                            <div className="text-xs text-slate-600">
                              {
                                contact.phone
                              }
                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setContacts(
                                (
                                  current
                                ) =>
                                  current.filter(
                                    (
                                      item
                                    ) =>
                                      item.id !==
                                      contact.id
                                  )
                              )
                            }
                            className="text-xs text-red-600"
                          >
                            Remove
                          </button>

                        </div>
                      )
                    )}

                  </div>

                </div>
              )}

            </section>

            {/* ==================================================
                IMAGE
            ================================================== */}

            <section className="rounded-[26px] border border-white/10 bg-[#061713] p-6">

              <SectionTitle
                title="Add Image"
                subtitle="Optionally send one image with the WhatsApp message."
              />

              <input
                id="campaign-image"
                type="file"
                accept="image/*"
                onChange={
                  selectMedia
                }
                className="hidden"
              />

              {media ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">

                  <div className="flex items-start gap-4">

                    <img
                      src={
                        media.dataUrl
                      }
                      alt="Campaign"
                      className="h-24 w-24 rounded-xl object-cover"
                    />

                    <div className="min-w-0 flex-1">

                      <div className="truncate text-sm font-bold">
                        {
                          media.name
                        }
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {
                          media.type
                        }
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setMedia(
                            null
                          )
                        }
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
                  className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#071b16] p-8 text-center"
                >

                  <div>

                    <div className="text-3xl">
                      🖼️
                    </div>

                    <div className="mt-3 text-sm font-bold">
                      Choose campaign image
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      PNG, JPG or WEBP · up to 5 MB
                    </div>

                  </div>

                </label>
              )}

            </section>

          </div>

          {/* ====================================================
              RIGHT SIDEBAR
          ==================================================== */}

          <aside className="space-y-6 self-start">

            {/* ==================================================
                CAMPAIGN SUMMARY

                IMPORTANT:
                NO INVOICE INFORMATION.
            ================================================== */}

            <section className="rounded-[26px] border border-white/10 bg-[#061713] p-6 shadow-xl">

              <div className="flex items-center justify-between">

                <h2 className="font-black">
                  Campaign Summary
                </h2>

                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  Draft
                </span>

              </div>

              <div className="mt-6 space-y-4">

                <Summary
                  label="Business"
                  value={
                    business?.business_name ||
                    "Loading..."
                  }
                />

                <Summary
                  label="WhatsApp"
                  value={
                    business?.whatsapp_connected
                      ? "Connected"
                      : "Not connected"
                  }
                  green={Boolean(
                    business?.whatsapp_connected
                  )}
                />

                <Summary
                  label="Contacts"
                  value={String(
                    validContacts.length
                  )}
                  green
                />

                <Summary
                  label="Tone"
                  value={
                    campaign.tone
                  }
                />

                <Summary
                  label="Message"
                  value={
                    campaign.preparedMessage
                      ? "AI Prepared"
                      : "Original"
                  }
                />

                <Summary
                  label="Schedule"
                  value={scheduleLabel(
                    campaign
                  )}
                />

                <Summary
                  label="Image"
                  value={
                    media
                      ? "Attached"
                      : "None"
                  }
                />

              </div>

            </section>

            {/* ==================================================
                MESSAGE PREVIEW
            ================================================== */}

            <section className="rounded-[26px] border border-white/10 bg-[#061713] p-6">

              <div className="flex items-center justify-between">

                <h2 className="font-black">
                  Message Preview
                </h2>

                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  {
                    campaign.preparedMessage
                      ? "AI"
                      : "Direct"
                  }
                </span>

              </div>

              <div className="mt-4 min-h-[170px] rounded-2xl border border-white/10 bg-[#c7f3d4] p-5">

                {preview ? (
                  <div className="whitespace-pre-line text-sm leading-6 text-slate-900">
                    {
                      preview
                    }
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">
                    Your exact message will appear here.
                  </div>
                )}

                {media && (
                  <div className="mt-5 overflow-hidden rounded-xl border border-white/10">

                    <img
                      src={
                        media.dataUrl
                      }
                      alt="Campaign attachment"
                      className="max-h-64 w-full object-cover"
                    />

                  </div>
                )}

              </div>

              <p className="mt-3 text-xs leading-5 text-slate-400">
                The previewed message is the exact message submitted to the campaign API after you confirm.
              </p>

            </section>

            {/* ==================================================
                SCHEDULE
            ================================================== */}

            <section className="rounded-[26px] border border-white/10 bg-[#061713] p-6">

              <h2 className="font-black">
                Schedule Campaign
              </h2>

              <div className="mt-5 space-y-3">

                {[
                  [
                    "now",
                    "Send Now",
                    "Start immediately.",
                  ],
                  [
                    "scheduled",
                    "Schedule Once",
                    "Choose a specific date and time.",
                  ],
                  [
                    "daily",
                    "Every Day",
                    "Send automatically every day.",
                  ],
                  [
                    "weekly",
                    "Every Week",
                    "Send automatically once every week.",
                  ],
                ].map(
                  ([
                    value,
                    title,
                    description,
                  ]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        update(
                          "schedule",
                          value
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                        campaign.schedule ===
                        value
                          ? "border-cyan-400/40 bg-cyan-400/[0.08]"
                          : "border-white/10 bg-[#061713]"
                      }`}
                    >

                      <div>

                        <div className="text-sm font-bold">
                          {
                            title
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {
                            description
                          }
                        </div>

                      </div>

                      <span
                        className={`h-3 w-3 rounded-full ${
                          campaign.schedule ===
                          value
                            ? "bg-cyan-300"
                            : "bg-[#16372f]"
                        }`}
                      />

                    </button>
                  )
                )}

              </div>

              {campaign.schedule ===
                "scheduled" && (
                <div className="mt-4 grid gap-3">

                  <input
                    type="date"
                    value={
                      campaign.date
                    }
                    onChange={(e) =>
                      update(
                        "date",
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-emerald-300/60 bg-[#c7f3d4] px-4 py-3 text-sm text-slate-900"
                  />

                  <input
                    type="time"
                    value={
                      campaign.time
                    }
                    onChange={(e) =>
                      update(
                        "time",
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-emerald-300/60 bg-[#c7f3d4] px-4 py-3 text-sm text-slate-900"
                  />

                </div>
              )}

              {campaign.schedule ===
                "daily" && (
                <div className="mt-4">

                  <label className="mb-2 block text-xs text-slate-400">
                    Daily time
                  </label>

                  <input
                    type="time"
                    value={
                      campaign.time
                    }
                    onChange={(e) =>
                      update(
                        "time",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-emerald-300/60 bg-[#c7f3d4] px-4 py-3 text-sm text-slate-900"
                  />

                </div>
              )}

              {campaign.schedule ===
                "weekly" && (
                <div className="mt-4 grid gap-3">

                  <select
                    value={
                      campaign.weeklyDay
                    }
                    onChange={(e) =>
                      update(
                        "weeklyDay",
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-emerald-300/60 bg-[#c7f3d4] px-4 py-3 text-sm text-slate-900"
                  >
                    {DAYS.map(
                      ([
                        value,
                        label,
                      ]) => (
                        <option
                          key={
                            value
                          }
                          value={
                            value
                          }
                        >
                          {
                            label
                          }
                        </option>
                      )
                    )}
                  </select>

                  <input
                    type="time"
                    value={
                      campaign.time
                    }
                    onChange={(e) =>
                      update(
                        "time",
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-emerald-300/60 bg-[#c7f3d4] px-4 py-3 text-sm text-slate-900"
                  />

                </div>
              )}

            </section>

            {/* ==================================================
                READY
            ================================================== */}

            <section className="rounded-[26px] border border-cyan-400/15 bg-gradient-to-br from-emerald-400/[0.08] via-cyan-500/[0.06] to-blue-500/[0.08] p-6">

              <div className="text-sm font-black">
                Ready to continue?
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Review the exact message, contacts, image and schedule before assigning.
              </p>

              <button
                type="button"
                onClick={
                  openReview
                }
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-5 py-3.5 text-sm font-black text-slate-950"
              >
                🚀 Review & Assign Campaign
              </button>

            </section>

          </aside>

        </div>

      </div>

      {/* ========================================================
          REVIEW MODAL
      ======================================================== */}

      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">

          <div className="my-8 w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#061713] p-7 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="text-sm font-bold text-cyan-300">
                  Final Review
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Ready to assign?
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  This is the final message and campaign configuration that will be submitted.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  !sending &&
                  setReview(
                    false
                  )
                }
                className="text-2xl text-slate-400 hover:text-white"
                aria-label="Close review"
              >
                ×
              </button>

            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">

              <Review
                label="Campaign"
                value={
                  campaign.name
                }
              />

              <Review
                label="Contacts"
                value={String(
                  validContacts.length
                )}
              />

              <Review
                label="Schedule"
                value={scheduleLabel(
                  campaign
                )}
              />

              <Review
                label="Image"
                value={
                  media
                    ? "Attached"
                    : "None"
                }
              />

            </div>

            <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-[#c7f3d4] p-5">

              <div className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-700">
                Exact Message
              </div>

              <div className="whitespace-pre-line text-sm leading-6 text-slate-900">
                {
                  preview
                }
              </div>

              {media && (
                <img
                  src={
                    media.dataUrl
                  }
                  alt="Campaign attachment"
                  className="mt-5 max-h-72 w-full rounded-xl object-cover"
                />
              )}

            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                type="button"
                disabled={
                  sending
                }
                onClick={() =>
                  setReview(
                    false
                  )
                }
                className="rounded-xl border border-white/10 px-5 py-3 text-sm disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                disabled={
                  sending
                }
                onClick={
                  assignCampaign
                }
                className="rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {sending
                  ? "Assigning..."
                  : "🚀 Assign Campaign"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}


/* ============================================================
   PAGE WRAPPER
   ============================================================ */

/*
 * Next.js 15 requires useSearchParams() to be rendered beneath
 * a Suspense boundary during production prerendering.
 *
 * WhatsAppCampaignContent contains the existing page logic and UI
 * unchanged; this wrapper only satisfies that Next.js requirement.
 */
export default function WhatsAppCampaignPage() {
  return (
    <Suspense fallback={null}>
      <WhatsAppCampaignContent />
    </Suspense>
  );
}

/* ============================================================
   SECTION TITLE
   ============================================================ */

function SectionTitle({
  title,
  subtitle,
}) {
  return (
    <div className="mb-5">

      <h2 className="font-black">
        {title}
      </h2>

      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
        {subtitle}
      </p>

    </div>
  );
}

/* ============================================================
   SUMMARY
   ============================================================ */

function Summary({
  label,
  value,
  green = false,
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">

      <span className="text-slate-400">
        {label}
      </span>

      <span
        className={`max-w-[230px] truncate text-right font-semibold ${
          green
            ? "text-emerald-300"
            : "text-white/80"
        }`}
      >
        {value}
      </span>

    </div>
  );
}

/* ============================================================
   METRIC
   ============================================================ */

function Metric({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#061713] p-4 text-left">

      <div className="truncate text-lg font-black">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-400">
        {label}
      </div>

    </div>
  );
}

/* ============================================================
   REVIEW
   ============================================================ */

function Review({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#071b16] p-4">

      <div className="text-xs text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-bold text-slate-200">
        {value}
      </div>

    </div>
  );
}