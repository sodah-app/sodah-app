"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";
import { parsePhoneNumberFromString } from "libphonenumber-js";

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
  followupMode: "same",
};

function normalizeTimeInput(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let match = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(raw);
  if (match) return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
  match = /^(0?[1-9]|1[0-2]):([0-5]\d)(?::[0-5]\d)?\s*(AM|PM)$/i.exec(raw);
  if (match) {
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return `${String(hour).padStart(2, "0")}:${match[2]}`;
  }
  return "";
}

const MAX_DRAFTS = 10;
const DRAFT_AUTOSAVE_DELAY = 700;

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
  return (
    cleanPhone(value).replace(/\D/g, "").length >= 8
  );
}

function phoneCallingCode(value, defaultCountry = "") {
  const raw = cleanPhone(value);
  if (!raw) return "";
  try {
    const international = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
    let parsed = international.startsWith("+") ? parsePhoneNumberFromString(international) : null;
    if (!parsed && !international.startsWith("+")) {
      const digits = international.replace(/\D/g, "");
      parsed = digits ? parsePhoneNumberFromString(`+${digits}`) : null;
      if (!parsed?.isValid() && defaultCountry) parsed = parsePhoneNumberFromString(international, defaultCountry);
    }
    return parsed?.isValid() ? String(parsed.countryCallingCode || "") : "";
  } catch {
    return "";
  }
}

const PAGE_PLAN_LIMITS = {
  free: { name: "Free", maxPerSend: 20, dailyMessages: 100, scheduled: 5, scheduleContacts: 5 },
  "free trial": { name: "Free Trial", maxPerSend: 20, dailyMessages: 100, scheduled: 5, scheduleContacts: 5 },
  starter: { name: "Starter", maxPerSend: 20, dailyMessages: 100, scheduled: 5, scheduleContacts: 5 },
  business: { name: "Business", maxPerSend: 50, dailyMessages: 220, scheduled: 10, scheduleContacts: 5 },
  pro: { name: "Pro", maxPerSend: 100, dailyMessages: 500, scheduled: 10, scheduleContacts: 10 },
};

function getPagePlanLimits(planValue) {
  const key = String(planValue || "Free Trial").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/\s+plan$/, "");
  return PAGE_PLAN_LIMITS[key] || PAGE_PLAN_LIMITS["free trial"];
}

function contactFrom(
  phone,
  name = "",
  email = ""
) {
  const normalized = cleanPhone(phone);

  if (!validPhone(normalized)) {
    return null;
  }

  return {
    id:
      typeof crypto !== "undefined" &&
      crypto.randomUUID
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

  for (
    let i = 0;
    i < line.length;
    i += 1
  ) {
    const ch = line[i];

    if (ch === '"') {
      if (
        quoted &&
        line[i + 1] === '"'
      ) {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (
      ch === "," &&
      !quoted
    ) {
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

  if (
    campaign.schedule === "scheduled"
  ) {
    return campaign.date &&
      campaign.time
      ? `${campaign.date} at ${campaign.time}`
      : "Scheduled once";
  }

  if (
    campaign.schedule === "daily"
  ) {
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
   DRAFT HELPERS
============================================================ */

function draftStorageKey(
  businessId = ""
) {
  return `sodah_whatsapp_campaign_drafts_${
    businessId || "default"
  }`;
}

function readDrafts(
  businessId = ""
) {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        draftStorageKey(businessId)
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .slice(0, MAX_DRAFTS);
  } catch (error) {
    console.warn(
      "[WhatsApp Campaign] Could not read drafts:",
      error
    );

    return [];
  }
}

function writeDrafts(
  drafts,
  businessId = ""
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    const limited =
      Array.isArray(drafts)
        ? drafts.slice(0, MAX_DRAFTS)
        : [];

    window.localStorage.setItem(
      draftStorageKey(businessId),
      JSON.stringify(limited)
    );
  } catch (error) {
    console.warn(
      "[WhatsApp Campaign] Could not save drafts:",
      error
    );
  }
}

/* ============================================================
   CREATE DRAFT ID
============================================================ */

function createDraftId() {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

/* ============================================================
   PAGE CONTENT
============================================================ */

function WhatsAppCampaignContent() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const fileRef = useRef(null);

  const autoSaveTimer =
    useRef(null);

  const draftIdRef =
    useRef(null);

  const initialDraftLoadRef =
    useRef(false);

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

  const [drafts, setDrafts] =
    useState([]);

  const [draftsOpen, setDraftsOpen] =
    useState(false);

  const [activePanel, setActivePanel] = useState("send");
  const [scheduleManagerOpen, setScheduleManagerOpen] = useState(false);
  const [reportEnabled, setReportEnabled] = useState(false);
  const [reportTime, setReportTime] = useState("20:00");
  const [reportTimeZone, setReportTimeZone] = useState("Asia/Dubai");
  const [reportRecipients, setReportRecipients] = useState("");
  const [savingReport, setSavingReport] = useState(false);
  const [showCountryWarning, setShowCountryWarning] = useState(false);
  const [pendingForeignContacts, setPendingForeignContacts] = useState([]);
  const [countryOverrideConfirmed, setCountryOverrideConfirmed] = useState(false);

  const goToPanel = (panelId) => {
    setActivePanel(panelId === "reports" ? "reports" : "send");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  useEffect(() => {
    if (loadingBusiness) return;

    let cancelled = false;
    const loadReportSettings = async () => {
      try {
        // Use the same Supabase bearer-token authentication as campaign requests.
        const authHeaders = await getAuthHeaders();
        const businessId =
          business?.business_id || getStoredBusinessId();

        const params = new URLSearchParams({
          resource: "report-settings",
        });
        if (businessId) params.set("business_id", businessId);

        const response = await fetch(
          `/api/whatsapp-campaign?${params.toString()}`,
          {
            method: "GET",
            headers: { ...authHeaders },
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          throw new Error(
            data?.error || data?.message ||
            `Could not load report settings (HTTP ${response.status}).`
          );
        }
        if (cancelled) return;

        const settings = data.settings || {};
        setReportEnabled(settings.enabled === true);
        setReportTime(normalizeTimeInput(settings.delivery_time || settings.report_time) || "20:00");
        setReportTimeZone(settings.time_zone || settings.timezone || "Asia/Dubai");
        setReportRecipients(
          Array.isArray(settings.recipients)
            ? settings.recipients.join("\\n")
            : ""
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load report settings:", error);
          // Do not show a blocking error on initial load; saving will show exact API errors.
        }
      }
    };

    loadReportSettings();
    return () => { cancelled = true; };
  }, [loadingBusiness, business]);

  const saveReportSettings = async () => {
    if (!reportEligible) {
      setError("Daily Business Summary is available on Business and Pro plans. Upgrade your subscription to use reports.");
      return;
    }
    setSavingReport(true);
    setError("");
    setNotice("");
    try {
      // Match the exact authentication flow used by the working campaign submit.
      const authHeaders = await getAuthHeaders();
      const businessId =
        business?.business_id || getStoredBusinessId();

      const response = await fetch("/api/whatsapp-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        credentials: "include",
        body: JSON.stringify({
          action: "save_report_settings",
          business_id: businessId || null,
          enabled: reportEnabled,
          delivery_time: businessReportLocked ? "18:00" : normalizeTimeInput(reportTime),
          time_zone: businessReportLocked ? "Asia/Dubai" : reportTimeZone,
          recipients: reportRecipients.split(/\\r?\\n/).map((n) => n.trim()).filter(Boolean),
        }),
      });
      const data = await response.json().catch(async () => ({
        success: false,
        error: `The report API returned a non-JSON response (HTTP ${response.status}). Check /api/whatsapp-campaign and the server log.`,
      }));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || data?.message || `Could not save report settings (HTTP ${response.status}).`);
      }
      setNotice(data?.message || "Daily report settings saved successfully.");
    } catch (err) {
      setError(err?.message || "Could not save report settings. Check the API route and server logs.");
    } finally {
      setSavingReport(false);
    }
  };

  const validContacts =
    useMemo(
      () =>
        contacts.filter(
          (contact) =>
            validPhone(contact.phone)
        ),
      [contacts]
    );

  /* ==========================================================
     AUTH HEADER
  ========================================================== */

  const getStoredBusinessId =
    () => {
      try {
        const urlId =
          searchParams?.get(
            "business_id"
          ) ||
          searchParams?.get(
            "businessId"
          ) ||
          "";

        if (urlId.trim()) {
          return urlId.trim();
        }

        return (
          window.localStorage.getItem(
            "sodah_business_id"
          ) ||
          window.localStorage.getItem(
            "business_id"
          ) ||
          window.localStorage.getItem(
            "businessId"
          ) ||
          ""
        ).trim();
      } catch {
        return "";
      }
    };

  const getAuthHeaders =
    async () => {
      let {
        data,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      let session =
        data?.session || null;

      if (sessionError) {
        console.warn(
          "[WhatsApp Campaign] getSession failed:",
          sessionError
        );
      }

      if (
        !session?.access_token
      ) {
        const refreshed =
          await supabase.auth.refreshSession();

        sessionError =
          refreshed.error || null;

        session =
          refreshed.data?.session ||
          null;
      }

      if (
        sessionError ||
        !session?.access_token
      ) {
        throw new Error(
          "Authentication required. Please sign in again."
        );
      }

      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    };

  /* ==========================================================
     LOAD BUSINESS
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadBusiness() {
      setLoadingBusiness(true);
      setError("");

      try {
        const authHeaders =
          await getAuthHeaders();

        const businessId =
          getStoredBusinessId();

        const query = businessId
          ? `?business_id=${encodeURIComponent(
              businessId
            )}`
          : "";

        const response =
          await fetch(
            `/api/whatsapp-campaign${query}`,
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
            .catch(
              () => null
            );

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
          setLoadingBusiness(
            false
          );
        }
      }
    }

    loadBusiness();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
     LOAD DRAFTS
  ========================================================== */

  useEffect(() => {
    if (loadingBusiness) {
      return;
    }

    const businessId =
      business?.business_id ||
      getStoredBusinessId() ||
      "default";

    const existing =
      readDrafts(businessId);

    setDrafts(existing);

    /*
     * Mark the initial load as complete.
     * Autosave is allowed only after the existing drafts
     * have been loaded.
     */
    initialDraftLoadRef.current =
      true;
  }, [
    business,
    loadingBusiness,
  ]);

  /* ==========================================================
     AUTOMATIC DRAFT SAVING
  ========================================================== */

  useEffect(() => {
    if (
      loadingBusiness ||
      !initialDraftLoadRef.current
    ) {
      return;
    }

    const businessId =
      business?.business_id ||
      getStoredBusinessId() ||
      "default";

    const finalMessage =
      campaign.preparedMessage.trim() ||
      campaign.message.trim();

    const hasContent =
      Boolean(
        campaign.name.trim() ||
          finalMessage ||
          contacts.length ||
          media
      );

    /*
     * Don't create empty drafts.
     */
    if (!hasContent) {
      return;
    }

    /*
     * Clear previous debounce.
     */
    if (autoSaveTimer.current) {
      clearTimeout(
        autoSaveTimer.current
      );
    }

    autoSaveTimer.current =
      setTimeout(() => {
        const now =
          new Date().toISOString();

        const existingId =
          campaign.__draftId ||
          draftIdRef.current ||
          createDraftId();

        draftIdRef.current =
          existingId;

        const existingDraft =
          drafts.find(
            (draft) =>
              draft.id ===
              existingId
          );

        const draft = {
          id: existingId,

          name:
            campaign.name.trim() ||
            "Untitled Campaign",

          campaign: {
            ...campaign,
            __draftId:
              existingId,
          },

          contacts: [
            ...contacts,
          ],

          media: media
            ? {
                name:
                  media.name,
                type:
                  media.type,
                dataUrl:
                  media.dataUrl,
              }
            : null,

          businessId,

          updatedAt: now,

          createdAt:
            existingDraft?.createdAt ||
            now,
        };

        /*
         * Put the active draft first.
         */
        const nextDrafts = [
          draft,
          ...drafts.filter(
            (item) =>
              item.id !==
              existingId
          ),
        ].slice(
          0,
          MAX_DRAFTS
        );

        writeDrafts(
          nextDrafts,
          businessId
        );

        setDrafts(
          nextDrafts
        );

        /*
         * If this was a newly created draft,
         * persist its ID in the campaign state.
         */
        if (
          campaign.__draftId !==
          existingId
        ) {
          setCampaign(
            (current) => ({
              ...current,
              __draftId:
                existingId,
            })
          );
        }
      }, DRAFT_AUTOSAVE_DELAY);

    return () => {
      if (
        autoSaveTimer.current
      ) {
        clearTimeout(
          autoSaveTimer.current
        );
      }
    };
  }, [
    campaign,
    contacts,
    media,
    business,
    loadingBusiness,
    drafts,
  ]);

  /* ==========================================================
     CASHFLOW → WHATSAPP
  ========================================================== */

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    if (
      searchParams.get(
        "source"
      ) !== "cashflow"
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
          typeof parsed ===
            "object" &&
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

    const getValue =
      (...keys) => {
        for (const key of keys) {
          const queryValue =
            searchParams.get(
              key
            );

          if (
            queryValue &&
            queryValue.trim()
          ) {
            return queryValue.trim();
          }

          const savedValue =
            saved?.[key];

          if (
            savedValue !==
              undefined &&
            savedValue !== null
          ) {
            const value =
              String(
                savedValue
              ).trim();

            if (value) {
              return value;
            }
          }
        }

        return "";
      };

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

    setCashflowLoaded(
      true
    );

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
     REUSE DRAFT
  ========================================================== */

  const reuseDraft = (
    draft
  ) => {
    const savedCampaign =
      draft?.campaign &&
      typeof draft.campaign ===
        "object"
        ? draft.campaign
        : INITIAL;

    const draftId =
      draft?.id ||
      createDraftId();

    draftIdRef.current =
      draftId;

    setCampaign({
      ...INITIAL,
      ...savedCampaign,
      __draftId: draftId,
    });

    setContacts(
      Array.isArray(
        draft.contacts
      )
        ? draft.contacts
        : []
    );

    setMedia(
      draft.media || null
    );

    setContactText("");

    setError("");

    setNotice(
      `"${draft.name || "Untitled Campaign"}" loaded. You can edit and reuse it.`
    );

    setDraftsOpen(
      false
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ==========================================================
     DELETE DRAFT
  ========================================================== */

  const deleteDraft = (
    draftId
  ) => {
    const businessId =
      business?.business_id ||
      getStoredBusinessId() ||
      "default";

    const nextDrafts =
      drafts.filter(
        (draft) =>
          draft.id !== draftId
      );

    writeDrafts(
      nextDrafts,
      businessId
    );

    setDrafts(
      nextDrafts
    );

    if (
      campaign.__draftId ===
      draftId
    ) {
      draftIdRef.current =
        null;

      setCampaign(
        (current) => {
          const next = {
            ...current,
          };

          delete next.__draftId;

          return next;
        }
      );
    }

    setNotice(
      "Draft deleted."
    );
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
          !/\d/.test(
            parts[0]
          )
            ? parts[0]
            : "";

        const contact =
          contactFrom(
            phone,
            name
          );

        if (contact) {
          next.push(
            contact
          );
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
    setCountryOverrideConfirmed(false);
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
        !["csv", "txt"].includes(
          ext
        )
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

          for (
            const line of lines
          ) {
            const matches =
              line.match(
                /\+?\d[\d\s().-]{7,}\d/g
              ) || [];

            for (
              const phone of matches
            ) {
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
            ).map(
              (x) =>
                x
                  .replace(
                    /^"|"$/g,
                    ""
                  )
                  .trim()
                  .toLowerCase()
            );

          for (
            const line of lines.slice(
              1
            )
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
                row[header] =
                  values[index] ||
                  "";
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

        setCountryOverrideConfirmed(false);
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
              const contact of next
            ) {
              const key =
                contact.phone.replace(
                  /\D/g,
                  ""
                );

              if (
                !seen.has(
                  key
                )
              ) {
                seen.add(
                  key
                );

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
        if (
          fileRef.current
        ) {
          fileRef.current.value =
            "";
        }
      }
    };

  /* ==========================================================
     SELECT TEMPLATE
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

            body: JSON.stringify({
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
          .catch(
            () => null
          );

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

      if (
        !generatedMessage
      ) {
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

      reader.onload = () => {
        setMedia({
          name: file.name,
          type: file.type,
          dataUrl: String(
            reader.result || ""
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
    if (loadingBusiness) {
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

    if (!campaign.name.trim()) {
      return "Enter a campaign name.";
    }

    if (
      !campaign.message.trim() &&
      !campaign.preparedMessage.trim()
    ) {
      return "Enter a message or choose a campaign AI template.";
    }

    if (!validContacts.length) {
      return "Add at least one valid WhatsApp contact.";
    }

    if (validContacts.length > planLimits.maxPerSend) {
      return `Your ${planLimits.name} plan allows up to ${planLimits.maxPerSend} recipients per send. You currently have ${validContacts.length}.`;
    }

    if (campaign.schedule !== "now" && validContacts.length > planLimits.scheduleContacts) {
      return `Your ${planLimits.name} plan allows up to ${planLimits.scheduleContacts} recipients in each scheduled campaign.`;
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

  const openReview = () => {
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
      setError(problem);
      return;
    }

    if (foreignContacts.length > 0 && !countryOverrideConfirmed) {
      setPendingForeignContacts(foreignContacts);
      setShowCountryWarning(true);
      return;
    }

    setReview(true);
  };

  const removeForeignContactsAndReview = () => {
    const foreignKeys = new Set(pendingForeignContacts.map((contact) => contact.phone.replace(/\D/g, "")));
    const remaining = validContacts.filter((contact) => !foreignKeys.has(contact.phone.replace(/\D/g, "")));
    setContacts(remaining);
    setCountryOverrideConfirmed(false);
    setShowCountryWarning(false);
    setPendingForeignContacts([]);
    if (remaining.length) setReview(true);
    else setError("Different-country recipients were removed. Add at least one recipient from the connected number's country to continue.");
  };

  const continueWithForeignContacts = () => {
    setCountryOverrideConfirmed(true);
    setShowCountryWarning(false);
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
        setError(problem);
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

              body: JSON.stringify({
                campaign_name:
                  campaign.name.trim(),

                message:
                  finalMessage,

                tone:
                  campaign.tone,

                followup_mode: campaign.followupMode === "reconstruct" ? "reconstruct" : "same",

                template:
                  campaign.template,

                business_id:
                  business?.business_id ||
                  getStoredBusinessId() ||
                  null,

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

                confirm_different_country_codes: countryOverrideConfirmed,

                media,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => null
            );

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

        /*
         * Remove the active draft after successful assignment.
         */
        const businessId =
          business?.business_id ||
          getStoredBusinessId() ||
          "default";

        const activeDraftId =
          campaign.__draftId ||
          draftIdRef.current;

        if (activeDraftId) {
          const nextDrafts =
            drafts.filter(
              (draft) =>
                draft.id !==
                activeDraftId
            );

          writeDrafts(
            nextDrafts,
            businessId
          );

          setDrafts(
            nextDrafts
          );

          draftIdRef.current =
            null;
        }

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

  const reset = () => {
    draftIdRef.current =
      null;

    setCampaign(INITIAL);
    setContacts([]);
    setContactText("");
    setMedia(null);
    setError("");
    setNotice("");
    setSuccess(null);
    setReview(false);
    setShowCountryWarning(false);
    setPendingForeignContacts([]);
    setCountryOverrideConfirmed(false);
    setCashflowLoaded(false);
  };

  const preview =
    campaign.preparedMessage.trim() ||
    campaign.message.trim();

  const connectedNumber =
    business?.ai_number ||
    business?.whatsapp_number ||
    business?.connected_number ||
    business?.phone_number ||
    business?.phone ||
    business?.support_number ||
    "";

  const planLimits = getPagePlanLimits(business?.subscription_plan);
  const reportEligible = ["business", "pro"].includes(planLimits.name.toLowerCase());
  const businessReportLocked = planLimits.name.toLowerCase() === "business";
  const connectedParsedNumber = connectedNumber ? parsePhoneNumberFromString(cleanPhone(connectedNumber)) : null;
  const connectedCallingCode = connectedParsedNumber?.countryCallingCode ? String(connectedParsedNumber.countryCallingCode) : "";
  const foreignContacts = validContacts.filter((contact) => {
    const recipientCode = phoneCallingCode(contact.phone, connectedParsedNumber?.country || "");
    return !connectedCallingCode || !recipientCode || recipientCode !== connectedCallingCode;
  });

  /* ============================================================
     MAIN PAGE
  ============================================================ */

  return (
    <main className="min-h-screen w-full overflow-x-clip bg-[#020810] text-slate-100">

      <div className="mx-auto w-full max-w-[1800px] px-3 pb-8 pt-2 md:px-6 lg:px-8">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="fixed inset-x-0 top-0 z-[1000] h-[76px] border-b border-white/10 bg-[#020810]/95 px-3 shadow-[0_10px_35px_rgba(0,0,0,.45)] backdrop-blur-xl md:px-6 lg:px-8">

          <div className="mx-auto flex h-full w-full max-w-[1800px] flex-row items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-xl font-black text-slate-950 shadow-lg shadow-emerald-400/10">
                S
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight md:text-2xl">
                  Sodah.io <span className="text-emerald-300">Business Tools</span>
                </h1>

                <p className="mt-0.5 hidden text-xs text-slate-400 md:block md:text-sm">
                  Messaging, scheduling and business reports in one workspace.
                </p>
              </div>

            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto whitespace-nowrap py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

              {/* BACK TO CHANNELS */}

              <button
                type="button"
                onClick={() =>
                  {
                    const id = business?.business_id || getStoredBusinessId();
                    router.push(`/channels${id ? `?business_id=${encodeURIComponent(id)}` : ""}`);
                  }
                }
                className="rounded-xl border border-white/10 bg-[#061713] px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
              >
                ← Channels
              </button>

              {/* DRAFTS */}

              <button
                type="button"
                onClick={() =>
                  setDraftsOpen(
                    true
                  )
                }
                className="rounded-xl border border-white/10 bg-[#061713] px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
              >
                ▣ Drafts

                {drafts.length >
                  0 && (
                  <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-300">
                    {drafts.length}
                  </span>
                )}
              </button>

              {/* SCHEDULE */}
              <button
                type="button"
                onClick={() => setScheduleManagerOpen(true)}
                className="rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-xs font-bold text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-400/20"
              >
                ◷ Schedule
              </button>

              {/* HISTORY */}

              <button
                type="button"
                onClick={() => {
                  const id =
                    business?.business_id ||
                    getStoredBusinessId();

                  router.push(
                    `/whatsapp-campaign/history${
                      id
                        ? `?business_id=${encodeURIComponent(
                            id
                          )}`
                        : ""
                    }`
                  );
                }}
                className="rounded-xl border border-white/10 bg-[#061713] px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
              >
                ◷ History
              </button>

              {/* CONNECTION */}

              <div
                className={`min-w-0 rounded-xl border px-4 py-2 text-xs ${
                  business?.whatsapp_connected
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "border-red-400/20 bg-red-400/10 text-red-200"
                }`}
                title={business?.whatsapp_connected ? `Connected WhatsApp number: ${connectedNumber}` : "WhatsApp is not connected"}
              >
                <div className="font-bold">
                  {loadingBusiness
                    ? "Checking WhatsApp..."
                    : business?.whatsapp_connected
                      ? "● WhatsApp Connected"
                      : "○ WhatsApp Not Connected"}
                </div>
                {business?.whatsapp_connected && (
                  <div className="mt-0.5 max-w-[190px] truncate font-medium text-emerald-100/80">
                    {connectedNumber || "Number not provided by connection API"}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-[#061713] px-4 py-2 text-xs text-slate-300">
                {validContacts.length} valid contacts
              </div>

            </div>

          </div>

        </header>
        {/* Fixed header spacer keeps page content from sliding underneath it. */}
        <div aria-hidden="true" className="h-[84px] shrink-0" />

        {/* ======================================================
            NOTICES
        ====================================================== */}

        {(error || notice) && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="presentation">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="campaign-notice-title"
              className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${error ? "border-red-400/30 bg-[#1b0b0b]" : "border-emerald-400/30 bg-[#061713]"}`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black ${error ? "bg-red-400/10 text-red-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                {error ? "!" : "✓"}
              </div>
              <h2 id="campaign-notice-title" className="mt-4 text-lg font-black">
                {error ? "Request failed" : "Success"}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                {error || notice}
              </p>
              <button
                type="button"
                autoFocus
                onClick={() => { setError(""); setNotice(""); }}
                className="mt-5 w-full rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            TWO WORKSPACES: MESSAGING + DAILY SUMMARY
        ====================================================== */}

        <div className="sticky top-[76px] z-[900] -mx-3 mb-5 border-b border-white/10 bg-[#020810]/95 px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,.35)] backdrop-blur-xl md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto grid w-full max-w-[1800px] grid-cols-2 gap-2" aria-label="Business tools">
            {[
              { id: "send", number: "01", title: "Send WhatsApp Message & Scheduler", subtitle: "Compose · Recipients · Schedule · Review", color: "emerald" },
              { id: "reports", number: "02", title: "Daily Business Summary", subtitle: "Daily reports and activity insights", color: "purple" },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => goToPanel(item.id)} aria-pressed={activePanel === item.id}
                className={`min-w-0 rounded-2xl border p-3 text-left transition duration-200 sm:p-4 ${activePanel === item.id ? (item.color === "emerald" ? "border-emerald-300/70 bg-gradient-to-br from-emerald-500/25 to-emerald-950/80 shadow-[0_0_24px_rgba(16,185,129,.16)]" : "border-purple-300/70 bg-gradient-to-br from-purple-500/25 to-purple-950/80 shadow-[0_0_24px_rgba(168,85,247,.16)]") : "border-white/10 bg-[#07121d] hover:border-white/25"}`}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black text-white sm:h-11 sm:w-11 ${item.color === "emerald" ? "bg-emerald-500" : "bg-purple-600"}`}>{item.number}</span>
                  <span className="min-w-0"><span className="block text-xs font-black sm:text-sm">{item.title}</span><span className="mt-1 hidden text-[11px] text-slate-400 sm:block">{item.subtitle}</span></span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full">
          <section id="send-panel" className={`${activePanel === "send" ? "block" : "hidden"} mx-auto w-full max-w-[1720px] space-y-4 rounded-[30px] border border-emerald-400/20 bg-gradient-to-br from-[#031e18] via-[#04140f] to-[#03110f] p-3 shadow-[0_0_45px_rgba(16,185,129,.08)] md:p-5`}>

            {/* CAMPAIGN AI */}

            <section className="rounded-[26px] border border-emerald-400/20 bg-gradient-to-br from-[#061713] to-[#03110d] p-5 shadow-xl" >

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
                        e.target
                          .value,
                      preparedMessage:
                        "",
                    })
                  )
                }
                rows={5}
                maxLength={4096}
                placeholder="Write your message here, or leave it empty and choose a template to let AI create it from your business profile."
                className="w-full resize-none rounded-2xl border border-emerald-400/30 bg-black p-5 text-sm leading-6 text-white caret-emerald-400 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
              />
              <div className="mt-1 flex justify-end text-[11px] text-slate-500">
                {(campaign.preparedMessage || campaign.message).length}/4096 characters
              </div>

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
                          : "border-white/10 bg-[#071b16] text-slate-300 hover:border-emerald-400/20 hover:bg-emerald-400/5"
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
                  className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
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

            {/* CAMPAIGN DETAILS */}

            <section className="rounded-[26px] border border-white/10 bg-[#061713] p-6">

              <SectionTitle
                title="Campaign Details"
                subtitle="Choose the message tone and give the campaign a clear name."
              />

              <div className="grid gap-4 md:grid-cols-2">
              <div>
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
                className="w-full rounded-xl border border-emerald-400/30 bg-black px-4 py-3.5 text-sm text-white caret-emerald-400 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
              />

              </div>
              <div>
              <label className="mb-2 block text-sm text-slate-400">
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
                className="w-full rounded-xl border border-emerald-400/30 bg-black px-4 py-3.5 text-sm text-white outline-none focus:border-emerald-400"
              >
                {TONES.map(
                  (tone) => (
                    <option
                      key={tone}
                      value={tone}
                      className="bg-black text-white"
                    >
                      {tone}
                    </option>
                  )
                )}
              </select>
              </div>
              </div>

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

              <div className="mt-4 rounded-2xl border border-sky-300/20 bg-gradient-to-br from-[#071b2a] to-[#07131e] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <span>24-hour follow-up</span>
                      <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-0.5 text-[10px] font-bold text-sky-200">OPTIONAL</span>
                    </div>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
                      Choose whether the follow-up repeats your original message or lets AI write a fresh version. It is scheduled after each recipient's successful first send.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-1">
                    <button type="button" aria-pressed={campaign.followupMode !== "reconstruct"} onClick={() => update("followupMode", "same")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${campaign.followupMode !== "reconstruct" ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}>Same message</button>
                    <button type="button" aria-pressed={campaign.followupMode === "reconstruct"} onClick={() => update("followupMode", "reconstruct")} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${campaign.followupMode === "reconstruct" ? "bg-sky-300 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}>✦ AI reconstruct</button>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-slate-300">
                  {campaign.followupMode === "reconstruct" ? "AI mode: creates a different, natural follow-up while preserving the original campaign's purpose and facts." : "Same-message mode: sends the exact original campaign message again."}
                </div>
              </div>

            </section>

            {/* CONTACTS */}

            <section className="rounded-[26px] border border-white/10 bg-[#061713] p-6">

              <SectionTitle
                title="Add Contacts"
                subtitle="Paste numbers, upload a CSV/TXT file, or select saved contacts. Contacts load left to right; duplicates are removed automatically."
              />
              <div className="mt-4 grid gap-2 rounded-2xl border border-emerald-300/15 bg-black/25 p-4 text-xs sm:grid-cols-4">
                <div><span className="block text-slate-500">Your plan</span><strong className="mt-1 block text-emerald-200">{planLimits.name}</strong></div>
                <div><span className="block text-slate-500">Per send</span><strong className="mt-1 block text-white">{planLimits.maxPerSend} recipients</strong></div>
                <div><span className="block text-slate-500">Daily allowance</span><strong className="mt-1 block text-white">{planLimits.dailyMessages} messages</strong></div>
                <div><span className="block text-slate-500">Scheduled campaigns</span><strong className="mt-1 block text-white">{planLimits.scheduled} × {planLimits.scheduleContacts} contacts</strong></div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={
                  uploadContacts
                }
                className="hidden"
              />

              <div className="grid gap-3 sm:grid-cols-3">

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
                      ? "border-emerald-400/40 bg-emerald-400/10"
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
                    className="w-full resize-none rounded-xl border border-emerald-400/30 bg-black p-4 text-sm leading-6 text-white caret-emerald-400 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
                  />

                  <button
                    type="button"
                    onClick={
                      addContacts
                    }
                    className="mt-3 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
                  >
                    Add Contacts
                  </button>

                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-emerald-400/20 bg-[#071b16] p-8 text-center">

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
                    className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-2.5 text-sm font-bold text-emerald-300"
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

                  <div className="mt-3 flex w-full gap-3 overflow-x-auto overscroll-x-contain pb-3 pr-1 [scrollbar-color:#047857_#061713] [scrollbar-width:thin]">
                    {contacts.map((contact, index) => (
                      <div
                        key={contact.id}
                        className="flex min-w-[190px] max-w-[245px] shrink-0 items-center gap-2 rounded-xl border border-emerald-400/20 bg-[#0a211a] px-3 py-2.5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-xs font-black text-emerald-300">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">
                            {contact.name || "WhatsApp Contact"}
                          </div>
                          <div className="truncate text-xs text-slate-400">{contact.phone}</div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${contact.phone}`}
                          onClick={() => { setCountryOverrideConfirmed(false); setContacts((current) => current.filter((item) => item.id !== contact.id)); }}
                          className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 hover:text-red-300"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </section>

            {/* IMAGE */}

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
                  className="flex min-h-[76px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-emerald-400/30 bg-[#071b16] p-4 text-center transition hover:border-emerald-400/50 hover:bg-emerald-400/[0.03]"
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

            {/* SEND OR SCHEDULE THE MESSAGE */}

          <section id="schedule-controls" className="space-y-4 rounded-[26px] border border-blue-400/25 bg-gradient-to-br from-[#061b38] via-[#061327] to-[#030d1d] p-3 shadow-[0_0_45px_rgba(59,130,246,.08)] md:p-5">

            <div className="rounded-2xl border border-blue-300/20 bg-blue-500/[.07] p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500 text-2xl">▦</span>
                <div><h2 className="text-xl font-black md:text-2xl">Schedule a Message</h2><p className="mt-1 text-sm text-slate-300">Choose whether to send this message now or schedule the same message for later.</p></div>
              </div>
            </div>

            {/* SCHEDULE */}

            <section className="rounded-[26px] border border-blue-300/20 bg-[#061326]/90 p-5 md:p-6">

              <h2 className="font-black">
                Send Now or Schedule This Message
              </h2>
              <p className="mt-2 text-xs text-slate-400">{planLimits.name}: up to {planLimits.scheduled} active scheduled campaigns, with {planLimits.scheduleContacts} recipients per scheduled campaign.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

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
                      key={
                        value
                      }
                      type="button"
                      onClick={() => update("schedule", value)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                        campaign.schedule ===
                        value
                          ? "border-emerald-400/40 bg-emerald-400/[0.08]"
                          : "border-white/10 bg-[#061713] hover:border-emerald-400/20"
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
                            ? "bg-emerald-400"
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
                        e.target
                          .value
                      )
                    }
                    className="rounded-xl border border-emerald-400/30 bg-black px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  />

                  <input
                    type="time"
                    value={
                      campaign.time
                    }
                    onChange={(e) =>
                      update(
                        "time",
                        e.target
                          .value
                      )
                    }
                    className="rounded-xl border border-emerald-400/30 bg-black px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
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
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-emerald-400/30 bg-black px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
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
                        e.target
                          .value
                      )
                    }
                    className="rounded-xl border border-emerald-400/30 bg-black px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
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
                          className="bg-black text-white"
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
                        e.target
                          .value
                      )
                    }
                    className="rounded-xl border border-emerald-400/30 bg-black px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  />

                </div>
              )}

            </section>

          </section>



            {/* SEND ACTION */}

            {/* ==================================================
                ACTION
            ================================================== */}

            <section className="rounded-2xl border border-emerald-300/25 bg-[#03140f]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <button
                type="button"
                onClick={openReview}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 px-6 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:brightness-110"
              >
                <span aria-hidden="true">➤</span>
                Review &amp; Send Campaign
              </button>
            </section>

          </section>

          <section id="reports-panel" className={`${activePanel === "reports" ? "block" : "hidden"} mx-auto w-full max-w-[1720px] space-y-4 rounded-[30px] border border-purple-400/25 bg-gradient-to-br from-[#21103b] via-[#100c22] to-[#080914] p-3 shadow-[0_0_45px_rgba(168,85,247,.08)] md:p-5`}>
            <div className="rounded-2xl border border-purple-300/20 bg-purple-500/[.08] p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-600 text-2xl">▥</span>
                <div><h2 className="text-xl font-black md:text-2xl">Daily Business Summary</h2><p className="mt-1 text-sm text-slate-300">Configure optional WhatsApp reports for authorised business-owner and team numbers.</p></div>
              </div>
            </div>

            {!reportEligible && <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[.07] p-5"><div className="font-black text-amber-200">Daily Business Summary is a Business and Pro feature</div><p className="mt-1 text-sm leading-6 text-slate-300">Upgrade your subscription to enable automatic WhatsApp reports. Your existing report history and scheduler are not changed by this page restriction.</p></div>}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
              <section className="rounded-[26px] border border-purple-300/20 bg-[#100c22]/90 p-5 md:p-6">
                <label className="flex items-start gap-3 rounded-2xl border border-purple-300/20 bg-black/20 p-4">
                  <input type="checkbox" checked={reportEnabled} disabled={!reportEligible} onChange={(e) => setReportEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-purple-500 disabled:opacity-40" />
                  <span><span className="block text-sm font-bold">Enable daily WhatsApp report</span><span className="mt-1 block text-xs leading-5 text-slate-400">When enabled, Sodah sends one summary per business day to the authorised numbers below.</span></span>
                </label>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-300">Delivery time<input type="time" value={businessReportLocked ? "18:00" : normalizeTimeInput(reportTime)} disabled={!reportEligible || businessReportLocked} onChange={(e) => setReportTime(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-purple-400 disabled:cursor-not-allowed disabled:opacity-60" />{businessReportLocked && <span className="mt-1 block text-[11px] text-purple-200">Business plan delivery is fixed at 6:00 PM Dubai time.</span>}</label>
                  <label className="text-sm font-semibold text-slate-300">Time zone<select value={businessReportLocked ? "Asia/Dubai" : reportTimeZone} disabled={!reportEligible || businessReportLocked} onChange={(e) => setReportTimeZone(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-purple-400 disabled:cursor-not-allowed disabled:opacity-60"><option value="Asia/Dubai">Dubai (Asia/Dubai)</option><option value="Asia/Qatar">Qatar (Asia/Qatar)</option><option value="Europe/London">London (Europe/London)</option><option value="America/New_York">New York (America/New_York)</option><option value="America/Chicago">Chicago (America/Chicago)</option><option value="Asia/Singapore">Singapore (Asia/Singapore)</option><option value="UTC">UTC</option></select></label>
                </div>
                <label className="mt-5 block text-sm font-semibold text-slate-300">Authorised recipient numbers<textarea value={reportRecipients} disabled={!reportEligible} onChange={(e) => setReportRecipients(e.target.value)} rows={5} placeholder={"+971501234567\n+971551234567"} className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-purple-400" /><span className="mt-1 block text-xs leading-5 text-slate-500">One number per line, including country code. Add only recipients authorised by the business owner.</span></label>
                <button type="button" disabled={savingReport || !reportEligible} onClick={saveReportSettings} className="mt-5 w-full rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-950/30 transition hover:brightness-110 disabled:opacity-60">{!reportEligible ? "Upgrade to Business or Pro to unlock reports" : savingReport ? "Saving settings…" : "▣ Save Report Settings"}</button>
              </section>

              <section className="rounded-[26px] border border-purple-300/20 bg-[#090817]/90 p-5 md:p-6">
                <h3 className="font-black">Report Preview</h3>
                <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-gradient-to-br from-[#062a22] to-[#071512] p-4 text-sm leading-6 text-slate-200">
                  <div className="font-black text-emerald-200">📊 Daily Business Summary</div>
                  <div className="mt-2">📅 Business date</div><div>💬 Customer conversations</div><div>🟢 New enquiries</div><div>📅 Appointments booked / completed</div><div>⏳ Appointments pending</div><div>🔔 Follow-ups due</div>
                  <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-slate-400">Only verified database metrics should be included. Metrics unavailable in the current deployment must be omitted rather than guessed.</p>
                </div>
                <div className="mt-4 rounded-xl border border-purple-300/15 bg-purple-500/[.06] p-3 text-xs leading-5 text-purple-100/80">Your daily summary is delivered automatically at the configured time to the authorised recipients, using your connected WhatsApp business number.</div>
              </section>
            </div>
          </section>

        </div>

      </div>

      {success && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="campaign-success-title" className="w-full max-w-lg rounded-[28px] border border-emerald-400/25 bg-[#061713] p-7 text-center shadow-2xl shadow-emerald-950/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/10 text-3xl font-black text-emerald-300">✓</div>
            <h2 id="campaign-success-title" className="mt-4 text-2xl font-black">Campaign Assigned</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {success.status === "scheduled" ? "Your campaign has been saved and scheduled." : "Your campaign has been assigned through your connected Sodah WhatsApp."}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-left">
              <Metric label="Campaign" value={campaign.name || "Campaign"} />
              <Metric label="Contacts" value={String(validContacts.length)} />
              <Metric label="Schedule" value={scheduleLabel(campaign)} />
            </div>
            <button type="button" onClick={reset} className="mt-6 w-full rounded-xl bg-emerald-400 px-6 py-3 font-black text-slate-950 transition hover:bg-emerald-300">Create Another Campaign</button>
          </div>
        </div>
      )}

      {/* ========================================================
          DRAFTS MODAL
      ======================================================== */}

      {draftsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">

          <div className="my-8 w-full max-w-3xl rounded-[30px] border border-emerald-400/15 bg-[#061713] p-7 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="text-sm font-bold text-emerald-300">
                  Automatically Saved
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Campaign Drafts
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Your campaign is saved automatically while you work. The latest 10 drafts are kept.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setDraftsOpen(
                    false
                  )
                }
                className="text-2xl text-slate-400 hover:text-white"
                aria-label="Close drafts"
              >
                ×
              </button>

            </div>

            {drafts.length ===
            0 ? (
              <div className="mt-7 rounded-2xl border border-dashed border-emerald-400/20 bg-[#071b16] p-10 text-center">

                <div className="text-4xl">
                  📝
                </div>

                <div className="mt-4 text-sm font-black">
                  No saved drafts yet
                </div>

                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">
                  Start writing a campaign and it will automatically appear here.
                </p>

              </div>
            ) : (
              <div className="mt-7 space-y-3">

                {drafts.map(
                  (draft) => {
                    const draftCampaign =
                      draft?.campaign ||
                      {};

                    const draftContacts =
                      Array.isArray(
                        draft?.contacts
                      )
                        ? draft.contacts
                        : [];

                    const draftMessage =
                      draftCampaign.preparedMessage?.trim() ||
                      draftCampaign.message?.trim() ||
                      "No message yet";

                    return (
                      <div
                        key={
                          draft.id
                        }
                        className="rounded-2xl border border-white/10 bg-[#071b16] p-5 transition hover:border-emerald-400/20"
                      >

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <h3 className="truncate text-sm font-black text-white">
                                {draft.name ||
                                  "Untitled Campaign"}
                              </h3>

                              {campaign.__draftId ===
                                draft.id && (
                                <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                                  Current
                                </span>
                              )}

                            </div>

                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                              {
                                draftMessage
                              }
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">

                              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                                {
                                  draftContacts.length
                                }{" "}
                                contacts
                              </span>

                              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                                {draftCampaign.tone ||
                                  "Friendly"}
                              </span>

                              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                                {scheduleLabel(
                                  {
                                    ...INITIAL,
                                    ...draftCampaign,
                                  }
                                )}
                              </span>

                              {draft.media && (
                                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                                  Image
                                </span>
                              )}

                              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1">
                                {draft.updatedAt
                                  ? new Date(
                                      draft.updatedAt
                                    ).toLocaleString()
                                  : "Saved draft"}
                              </span>

                            </div>

                          </div>

                          <div className="flex shrink-0 items-center gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                reuseDraft(
                                  draft
                                )
                              }
                              className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-emerald-300"
                            >
                              ↻ Reuse
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteDraft(
                                  draft.id
                                )
                              }
                              className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:border-red-400/40 hover:bg-red-400/10"
                            >
                              Delete
                            </button>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

            <div className="mt-6 flex justify-end">

              <button
                type="button"
                onClick={() =>
                  setDraftsOpen(
                    false
                  )
                }
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {showCountryWarning && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div role="alertdialog" aria-modal="true" aria-labelledby="country-warning-title" className="w-full max-w-lg rounded-[28px] border border-amber-400/30 bg-[#11151c] p-6 shadow-2xl">
            <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/10 text-2xl text-amber-300">⚠</span><div><h2 id="country-warning-title" className="text-lg font-black text-amber-200">Different country codes detected</h2><p className="text-xs text-slate-400">Connected WhatsApp number: {connectedNumber || "Not available"}</p></div></div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{pendingForeignContacts.length} recipient(s) have a country code different from, or could not be matched to, your connected WhatsApp number. If these numbers are not saved in your phone contacts, we advise removing them. Messaging people who have not saved your number or have not agreed to receive messages may increase the risk of WhatsApp restrictions.</p>
            <p className="mt-3 text-xs text-amber-200">We cannot check your phone address book automatically. Please make sure these recipients are saved and have agreed to receive your messages before continuing.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={removeForeignContactsAndReview} className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/20">Remove different-country numbers ({pendingForeignContacts.length})</button><button type="button" onClick={continueWithForeignContacts} className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300">Continue — I accept the risk</button></div>
            <button type="button" onClick={() => setShowCountryWarning(false)} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/5">Cancel</button>
          </div>
        </div>
      )}

      {/* ========================================================
          REVIEW MODAL
      ======================================================== */}

      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">

          <div className="my-8 w-full max-w-2xl rounded-[30px] border border-emerald-400/15 bg-[#061713] p-7 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="text-sm font-bold text-emerald-300">
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

            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-black p-5">

              <div className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                Exact Message
              </div>

              <div className="whitespace-pre-line text-sm leading-6 text-white">
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
                className="rounded-xl border border-white/10 px-5 py-3 text-sm transition hover:bg-white/5 disabled:opacity-50"
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
                className="rounded-xl bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                {sending
                  ? "Assigning..."
                  : "🚀 Assign Campaign"}
              </button>

            </div>

          </div>

        </div>
      )}

      {scheduleManagerOpen && (
        <ScheduleManagerPopup
          businessId={business?.business_id || getStoredBusinessId()}
          getAuthHeaders={getAuthHeaders}
          onClose={() => setScheduleManagerOpen(false)}
        />
      )}
    </main>
  );
}


/* ============================================================
   SCHEDULE MANAGER POPUP
============================================================ */
function ScheduleManagerPopup({ businessId, getAuthHeaders, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    if (!businessId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const headers = await getAuthHeaders();
      const qs = new URLSearchParams({ resource: "campaigns", business_id: businessId });
      const res = await fetch(`/api/whatsapp-campaign?${qs}`, { headers, credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Unable to load schedules.");
      setItems((data.campaigns || []).filter((c) => {
        let s = c.schedule;
        if (typeof s === "string") { try { s = JSON.parse(s); } catch { s = {}; } }
        return ["daily", "weekly"].includes(String(s?.mode || "").toLowerCase());
      }));
    } catch (e) { setError(e.message || "Unable to load schedules."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [businessId]);

  const perform = async (campaign, action, extra = {}) => {
    setBusy(campaign.id); setError(""); setNotice("");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/whatsapp-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        credentials: "include",
        body: JSON.stringify({ action, campaign_id: campaign.id, business_id: businessId, ...extra }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Unable to update schedule.");
      setNotice(data.message || "Schedule updated.");
      setEditing(null);
      await load();
    } catch (e) { setError(e.message || "Unable to update schedule."); }
    finally { setBusy(""); }
  };

  const parseSchedule = (value) => {
    if (typeof value === "string") { try { return JSON.parse(value); } catch { return {}; } }
    return value || {};
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Scheduled campaigns">
      <section className="my-5 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-sky-300/25 bg-[#071827] p-4 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[11px] font-black uppercase tracking-[.18em] text-sky-300">Campaign calendar</div>
            <h2 className="mt-1 text-xl font-black text-white md:text-2xl">Scheduled messages</h2>
            <p className="mt-1 text-sm text-slate-400">View and manage daily and weekly schedules. One-time schedules remain separate.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-3 py-2 text-slate-300">✕</button>
        </div>
        <div className="mt-4 flex justify-end"><button type="button" onClick={load} disabled={loading} className="rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-xs font-bold text-sky-200">↻ Refresh</button></div>
        {error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {notice && <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div>}
        {loading ? <div className="py-12 text-center text-sm text-slate-400">Loading schedules…</div>
          : error ? null
          : items.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-8 text-center"><div className="font-bold text-white">No daily or weekly schedules found</div><p className="mt-2 text-sm text-slate-400">Your recurring campaigns will appear here.</p></div>
          : <div className="mt-4 space-y-3">
            {items.map((c) => {
              const sch = parseSchedule(c.schedule);
              const status = String(c.status || "unknown").toLowerCase();
              const isBusy = busy === c.id;
              return <article key={c.id} className="rounded-2xl border border-white/10 bg-[#0a2030] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-white">{c.campaign_name || "Untitled campaign"}</h3><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase text-slate-200">{status}</span></div>
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{c.message}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400"><span>{sch.mode === "daily" ? "Every day" : `Every ${DAYS.find(([value]) => Number(value) === Number(sch.weekly_day))?.[1] || "week"}`}</span><span>{sch.time || "Time not set"}</span><span>Next run: {c.next_run_at ? new Date(c.next_run_at).toLocaleString() : "Not set"}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["scheduled", "paused"].includes(status) && <button type="button" disabled={isBusy} onClick={() => setEditing({ ...c, schedule: sch })} className="rounded-lg border border-sky-300/20 px-3 py-2 text-xs font-bold text-sky-200">Edit</button>}
                    {status === "scheduled" && <button type="button" disabled={isBusy} onClick={() => perform(c, "pause_campaign")} className="rounded-lg border border-amber-300/20 px-3 py-2 text-xs font-bold text-amber-200">Pause</button>}
                    {status === "paused" && <button type="button" disabled={isBusy} onClick={() => perform(c, "resume_campaign")} className="rounded-lg border border-emerald-300/20 px-3 py-2 text-xs font-bold text-emerald-200">Resume</button>}
                    {!["processing", "sending"].includes(status) && <button type="button" disabled={isBusy} onClick={() => { if (window.confirm("Delete this scheduled campaign permanently?")) perform(c, "delete_campaign"); }} className="rounded-lg border border-red-300/20 px-3 py-2 text-xs font-bold text-red-200">Delete</button>}
                  </div>
                </div>
              </article>;
            })}
          </div>}
      </section>
      {editing && <div className="fixed inset-0 z-[1400] flex items-center justify-center overflow-y-auto bg-black/85 p-3">
        <form className="my-5 w-full max-w-xl rounded-3xl border border-sky-300/20 bg-[#071827] p-5 shadow-2xl" onSubmit={(e) => { e.preventDefault(); perform(editing, "edit_campaign", { campaign_name: editing.campaign_name, message: editing.message, schedule: editing.schedule }); }}>
          <div className="flex items-center justify-between"><h3 className="text-lg font-black text-white">Edit schedule</h3><button type="button" onClick={() => setEditing(null)} className="px-3 py-2 text-slate-400">✕</button></div>
          <label className="mt-4 block text-sm font-bold text-slate-300">Campaign name<input required value={editing.campaign_name || ""} onChange={(e) => setEditing(v => ({ ...v, campaign_name: e.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label>
          <label className="mt-4 block text-sm font-bold text-slate-300">Message<textarea required rows={5} value={editing.message || ""} onChange={(e) => setEditing(v => ({ ...v, message: e.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label>
          {editing.schedule?.mode === "weekly" && <label className="mt-4 block text-sm font-bold text-slate-300">Day<select value={DAYS.find(([value]) => Number(value) === Number(editing.schedule.weekly_day))?.[0] || "1"} onChange={(e) => setEditing(v => ({ ...v, schedule: { ...v.schedule, weekly_day: Number(e.target.value) } }))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white">{[["1","Monday"],["2","Tuesday"],["3","Wednesday"],["4","Thursday"],["5","Friday"],["6","Saturday"],["0","Sunday"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          <label className="mt-4 block text-sm font-bold text-slate-300">Time<input required type="time" value={editing.schedule?.time || ""} onChange={(e) => setEditing(v => ({ ...v, schedule: { ...v.schedule, time: e.target.value } }))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label>
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300">Cancel</button><button type="submit" disabled={!!busy} className="rounded-xl bg-sky-400 px-6 py-3 text-sm font-black text-slate-950">Save changes</button></div>
        </form>
      </div>}
    </div>
  );
}

/* ============================================================
   PAGE WRAPPER
============================================================ */

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
    <div className="rounded-2xl border border-emerald-400/10 bg-[#061713] p-4 text-left">

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