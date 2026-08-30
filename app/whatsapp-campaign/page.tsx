"use client";

import React, {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

const WEBHOOK_URL =
  "https://solomon-n8n.duckdns.org/webhook/campaign-sender";

type MessageType = "ai" | "custom";
type ScheduleMode = "now" | "scheduled" | "daily" | "weekly";

type Campaign = {
  name: string;
  instructions: string;
  template: string;
  messageType: MessageType;
  customMessage: string;
  tone: string;
  schedule: ScheduleMode;
  date: string;
  time: string;
  weeklyDay: string;
};

type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

type AIResponse = {
  error?: string;
  message?: string;
  output?: {
    message?: string;
  };
};

const INITIAL_CAMPAIGN: Campaign = {
  name: "",
  instructions: "",
  template: "",
  messageType: "custom",
  customMessage: "",
  tone: "Friendly",
  schedule: "now",
  date: "",
  time: "",
  weeklyDay: "monday",
};

const WEEK_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const AI_TEMPLATES = [
  {
    title: "Promote an offer",
    instruction:
      "Promote the offer described by the user. Make the value clear, keep it concise, and invite the customer to reply if interested.",
  },
  {
    title: "Follow up with leads",
    instruction:
      "Follow up with the leads described by the user. Be friendly and professional, ask whether they are still interested, and invite a reply.",
  },
  {
    title: "Re-engage customers",
    instruction:
      "Re-engage the customers described by the user with a warm message. Encourage them to reconnect with the business.",
  },
  {
    title: "Announce something new",
    instruction:
      "Announce the new thing described by the user. Keep the message clear and interesting without inventing facts.",
  },
  {
    title: "Invite customers",
    instruction:
      "Invite the customers described by the user to connect with the business. Keep the message warm, concise, and easy to respond to.",
  },
];

export default function WhatsAppCampaignPage() {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const [campaign, setCampaign] =
    useState<Campaign>(INITIAL_CAMPAIGN);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactInput, setContactInput] = useState("");
  const [contactMode, setContactMode] =
    useState<"paste" | "upload">("paste");
  const [fileName, setFileName] = useState("");

  const [aiMessage, setAiMessage] = useState("");
  const [userBrief, setUserBrief] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [success, setSuccess] = useState(false);

  const validContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const digits = String(contact.phone || "").replace(/\D/g, "");
      return digits.length >= 8;
    });
  }, [contacts]);

  useEffect(() => {
    if (!error) return;

    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [error]);

  const updateCampaign = <K extends keyof Campaign>(
    key: K,
    value: Campaign[K],
  ) => {
    setCampaign((previous) => ({
      ...previous,
      [key]: value,
    }));

    setError("");
  };

  const showError = (message: string) => {
    setError(message);
  };

  /*
   * --------------------------------------------------------
   * CONTACT HELPERS
   * --------------------------------------------------------
   */

  const normalizePhone = (value: unknown) => {
    return String(value || "")
      .trim()
      .replace(/[^\d+]/g, "");
  };

  const isValidPhone = (value: unknown) => {
    return String(value || "").replace(/\D/g, "").length >= 8;
  };

  const makeContact = (
    phone: string,
    name = "",
    email = "",
  ): Contact | null => {
    const normalizedPhone = normalizePhone(phone);

    if (!isValidPhone(normalizedPhone)) {
      return null;
    }

    return {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      name: name.trim() || `Contact ${contacts.length + 1}`,
      phone: normalizedPhone,
      email: email.trim(),
    };
  };

  const mergeContacts = (newContacts: Contact[]) => {
    setContacts((previous) => {
      const existingPhones = new Set(
        previous.map((contact) =>
          String(contact.phone || "").replace(/\D/g, ""),
        ),
      );

      const unique: Contact[] = [];

      for (const contact of newContacts) {
        const digits = String(contact.phone || "").replace(/\D/g, "");

        if (!digits || existingPhones.has(digits)) {
          continue;
        }

        existingPhones.add(digits);
        unique.push(contact);
      }

      return [...previous, ...unique];
    });
  };

  /*
   * --------------------------------------------------------
   * CONTACT TEXT
   * --------------------------------------------------------
   */

  const addContactsFromText = () => {
    const raw = contactInput.trim();

    if (!raw) {
      showError("Enter or paste at least one WhatsApp number.");
      return;
    }

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: Contact[] = [];

    for (const line of lines) {
      const phoneMatches =
        line.match(/\+?\d[\d\s().-]{7,}\d/g) || [];

      for (const phone of phoneMatches) {
        const parts = line
          .split(/[|,;]/)
          .map((part) => part.trim())
          .filter(Boolean);

        const name =
          parts.length > 1 && !/\d/.test(parts[0])
            ? parts[0]
            : "";

        const contact = makeContact(phone, name);

        if (contact) {
          parsed.push(contact);
        }
      }
    }

    if (!parsed.length) {
      showError(
        "No valid phone numbers were found. Please check the numbers.",
      );
      return;
    }

    mergeContacts(parsed);
    setContactInput("");
    setError("");
  };

  /*
   * --------------------------------------------------------
   * CSV PARSER
   * --------------------------------------------------------
   */

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const character = line[i];

      if (character === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (character === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }

    result.push(current.trim());

    return result;
  };

  /*
   * --------------------------------------------------------
   * CONTACT UPLOAD
   * --------------------------------------------------------
   */

  const handleUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "";

    if (extension !== "csv" && extension !== "txt") {
      showError("Please upload a CSV or TXT contact file.");
      return;
    }

    try {
      const text = await file.text();

      if (!text.trim()) {
        showError("The uploaded file is empty.");
        return;
      }

      const parsed: Contact[] = [];

      if (extension === "txt") {
        const lines = text
          .split(/[\r\n,;]+/)
          .map((line) => line.trim())
          .filter(Boolean);

        for (const line of lines) {
          const matches =
            line.match(/\+?\d[\d\s().-]{7,}\d/g) || [];

          for (const phone of matches) {
            const contact = makeContact(phone);

            if (contact) {
              parsed.push(contact);
            }
          }
        }
      } else {
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          showError("The CSV needs a header and at least one row.");
          return;
        }

        const headers = parseCSVLine(lines[0]).map((header) =>
          header
            .replace(/^"|"$/g, "")
            .trim()
            .toLowerCase(),
        );

        for (const line of lines.slice(1)) {
          const values = parseCSVLine(line);
          const row: Record<string, string> = {};

          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          const firstName =
            row.first_name || row.firstname || "";

          const lastName =
            row.last_name || row.lastname || "";

          const name =
            row.name ||
            row.full_name ||
            row.fullname ||
            `${firstName} ${lastName}`.trim();

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

          const contact = makeContact(
            phone,
            name,
            email,
          );

          if (contact) {
            parsed.push(contact);
          }
        }
      }

      if (!parsed.length) {
        showError(
          "No valid WhatsApp contacts were found in the file.",
        );
        return;
      }

      mergeContacts(parsed);
      setFileName(file.name);
      setError("");
    } catch (uploadError) {
      console.error(uploadError);
      showError(
        "We couldn't read this contact file. Please check its format.",
      );
    }
  };

  const removeContact = (id: string) => {
    setContacts((previous) =>
      previous.filter((contact) => contact.id !== id),
    );
  };

  const clearContacts = () => {
    setContacts([]);
    setFileName("");
    setContactInput("");

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  /*
   * --------------------------------------------------------
   * SUPABASE
   * --------------------------------------------------------
   */

  const getCurrentUserId = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(authError);
      throw new Error("Unable to verify your account.");
    }

    if (!user) {
      throw new Error(
        "You must be signed in to create a campaign.",
      );
    }

    return user.id;
  };

  const getBusinessId = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(authError);
      throw new Error("Unable to verify your account.");
    }

    if (!user) {
      throw new Error(
        "You must be signed in to create a campaign.",
      );
    }

    const metadataBusinessId =
      user.user_metadata?.business_id ||
      user.app_metadata?.business_id ||
      "";

    if (metadataBusinessId) {
      return String(metadataBusinessId);
    }

    const { data: business, error: businessError } =
      await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (businessError) {
      console.error(businessError);
      throw new Error(
        "We couldn't find your Sodah business.",
      );
    }

    if (!business?.id) {
      throw new Error(
        "No business is connected to your Sodah account.",
      );
    }

    return String(business.id);
  };

  /*
   * --------------------------------------------------------
   * AI PREPARATION
   * --------------------------------------------------------
   */

  const prepareCampaignWithAI = async () => {
    const instruction = campaign.instructions.trim();

    if (!instruction) {
      showError(
        "Tell the AI what you want the campaign to do first.",
      );
      return;
    }

    setError("");
    setAiLoading(true);

    try {
      const businessId = await getBusinessId();
      const userId = await getCurrentUserId();

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          type: "whatsapp_campaign_preview",
          mode: "preview",
          business_id: businessId,
          user_id: userId,
          campaign_name: campaign.name.trim(),
          campaign_template: campaign.template,
          campaign_instructions: instruction,
          user_message: userBrief.trim() || instruction,
          instructions: instruction,
          tone: campaign.tone,
          current_message: aiMessage.trim(),
          improve: Boolean(aiMessage.trim()),
        }),
      });

      const responseText = await response.text();

      let data: AIResponse = {};

      try {
        data = responseText
          ? (JSON.parse(responseText) as AIResponse)
          : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            `AI service returned ${response.status}.`,
        );
      }

      const generatedMessage = String(
        data.message ||
          data.output?.message ||
          "",
      ).trim();

      if (!generatedMessage) {
        throw new Error(
          "The AI did not return a campaign message.",
        );
      }

      setAiMessage(generatedMessage);
    } catch (aiError) {
      console.error("CAMPAIGN AI ERROR:", aiError);

      showError(
        aiError instanceof Error
          ? aiError.message
          : "Something went wrong while preparing the message.",
      );
    } finally {
      setAiLoading(false);
    }
  };

  /*
   * --------------------------------------------------------
   * VALIDATION
   * --------------------------------------------------------
   */

  const validateCampaign = () => {
    if (!campaign.name.trim()) {
      return "Please give your campaign a name.";
    }

    if (!validContacts.length) {
      return "Please add at least one valid WhatsApp contact.";
    }

    /*
     * IMPORTANT:
     *
     * AI mode requires an AI message.
     * Custom mode DOES NOT require AI.
     */

    if (campaign.messageType === "ai") {
      if (!campaign.instructions.trim()) {
        return "Tell the AI what you want the campaign to do.";
      }

      if (!aiMessage.trim()) {
        return "Prepare the AI message before assigning an AI campaign.";
      }
    }

    if (
      campaign.messageType === "custom" &&
      !campaign.customMessage.trim()
    ) {
      return "Please enter your campaign message.";
    }

    if (
      campaign.schedule === "scheduled" &&
      (!campaign.date || !campaign.time)
    ) {
      return "Please select the campaign date and time.";
    }

    if (
      campaign.schedule === "daily" &&
      !campaign.time
    ) {
      return "Please select the daily campaign time.";
    }

    if (
      campaign.schedule === "weekly" &&
      (!campaign.weeklyDay || !campaign.time)
    ) {
      return "Please select the weekly day and time.";
    }

    return "";
  };

  /*
   * --------------------------------------------------------
   * REVIEW
   * --------------------------------------------------------
   */

  const openReview = () => {
    const validationError = validateCampaign();

    if (validationError) {
      showError(validationError);
      return;
    }

    setError("");
    setShowReview(true);
  };

  /*
   * --------------------------------------------------------
   * SEND CAMPAIGN
   * --------------------------------------------------------
   */

  const sendCampaign = async () => {
    const validationError = validateCampaign();

    if (validationError) {
      setShowReview(false);
      showError(validationError);
      return;
    }

    setError("");
    setSending(true);

    try {
      const businessId = await getBusinessId();
      const userId = await getCurrentUserId();

      const finalMessage =
        campaign.messageType === "ai"
          ? aiMessage.trim()
          : campaign.customMessage.trim();

      const schedule = {
        mode: campaign.schedule,
        date:
          campaign.schedule === "scheduled"
            ? campaign.date
            : "",
        time:
          ["scheduled", "daily", "weekly"].includes(
            campaign.schedule,
          )
            ? campaign.time
            : "",
        weekly_day:
          campaign.schedule === "weekly"
            ? campaign.weeklyDay
            : "",
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const payload = {
        type: "whatsapp_campaign",
        business_id: businessId,
        user_id: userId,

        campaign_name: campaign.name.trim(),

        message_type: campaign.messageType,

        campaign_template:
          campaign.template || "",

        instructions:
          campaign.messageType === "ai"
            ? campaign.instructions.trim()
            : "",

        /*
         * EXACT MESSAGE THE USER APPROVED.
         *
         * Custom mode sends the raw custom message.
         * AI mode sends the AI-generated message.
         */
        message: finalMessage,
        generated_message: finalMessage,

        tone: campaign.tone,

        contacts: validContacts.map((contact) => ({
          name: contact.name || "",
          phone: String(contact.phone || "").replace(
            /[^\d+]/g,
            "",
          ),
          email: contact.email || "",
        })),

        schedule,
        schedule_mode: campaign.schedule,
        schedule_time: schedule.time,
        schedule_date: schedule.date,
        weekly_day: schedule.weekly_day,
        timezone: schedule.timezone,

        total_contacts: validContacts.length,

        media: null,

        source: "sodah_whatsapp_campaign",

        created_at: new Date().toISOString(),
      };

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `Campaign service returned ${response.status}: ${
            responseText || "Unknown error"
          }`,
        );
      }

      setShowReview(false);
      setSuccess(true);
    } catch (sendError) {
      console.error("CAMPAIGN SEND ERROR:", sendError);

      showError(
        sendError instanceof Error
          ? sendError.message
          : "Sodah couldn't connect to the campaign service.",
      );
    } finally {
      setSending(false);
    }
  };

  /*
   * --------------------------------------------------------
   * RESET
   * --------------------------------------------------------
   */

  const resetCampaign = () => {
    setCampaign(INITIAL_CAMPAIGN);
    setContacts([]);
    setContactInput("");
    setFileName("");
    setAiMessage("");
    setUserBrief("");
    setError("");
    setSuccess(false);
    setShowReview(false);

    if (fileInput.current) {
      fileInput.current.value = "";
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
   * --------------------------------------------------------
   * SUCCESS
   * --------------------------------------------------------
   */

  if (success) {
    return (
      <main className="min-h-screen bg-[#050816] px-5 py-10 text-white md:px-8">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-white/10 bg-[#0a1020] p-8 text-center shadow-2xl md:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-4xl text-emerald-400">
              ✓
            </div>

            <h1 className="mt-7 text-3xl font-bold">
              Campaign Assigned
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/50">
              Your WhatsApp campaign has been successfully
              submitted to the Sodah automation system.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Metric
                label="Campaign"
                value={campaign.name}
              />

              <Metric
                label="Contacts"
                value={String(validContacts.length)}
              />

              <Metric
                label="Mode"
                value={
                  campaign.messageType === "ai"
                    ? "AI"
                    : "Custom"
                }
              />
            </div>

            <button
              type="button"
              onClick={resetCampaign}
              className="mt-8 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 px-7 py-3 font-bold text-slate-950 shadow-lg transition hover:scale-[1.02]"
            >
              Create Another Campaign
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * --------------------------------------------------------
   * MAIN PAGE
   * --------------------------------------------------------
   */

  const previewMessage =
    campaign.messageType === "ai"
      ? aiMessage
      : campaign.customMessage;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-7 lg:px-10">
        {/* HEADER */}

        <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 via-cyan-400 to-blue-600 text-2xl font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              S
            </div>

            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                WhatsApp Campaign
              </h1>

              <p className="mt-1 text-sm text-white/40">
                Build, review and assign WhatsApp campaigns
                with complete control over your message.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300">
              ● WhatsApp Connected
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0a1020] px-4 py-2 text-xs text-white/50">
              {validContacts.length} valid contacts
            </div>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-950/60 px-4 py-3 text-sm text-red-200"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-xl leading-none text-white/40 hover:text-white"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* ==================================================
            MAIN GRID
            IMPORTANT:
            Sidebar is NORMAL FLOW.
            NO sticky.
            NO fixed.
            NO transparent floating layer.
        ================================================== */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* LEFT COLUMN */}

          <div className="min-w-0 space-y-6">
            {/* AI */}

            <section className="rounded-[26px] border border-violet-400/20 bg-[#0a1020] p-6 shadow-2xl shadow-violet-950/20">
              <SectionTitle
                title="Campaign AI"
                subtitle="Use AI when you want help writing or improving your campaign. It is optional when using a custom message."
              />

              <textarea
                value={campaign.instructions}
                onChange={(event) => {
                  const value = event.target.value;

                  setUserBrief(value);

                  updateCampaign(
                    "instructions",
                    value,
                  );
                }}
                rows={5}
                placeholder="Example: Promote our new package to existing customers. Keep it friendly, short and encourage customers to reply."
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#060b18] p-5 text-sm leading-6 outline-none placeholder:text-white/20 transition focus:border-violet-400/50"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {AI_TEMPLATES.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => {
                      const existing = userBrief.trim();

                      const instruction = existing
                        ? `${template.instruction}\n\nUser-provided campaign details:\n${existing}`
                        : template.instruction;

                      updateCampaign(
                        "template",
                        template.title,
                      );

                      updateCampaign(
                        "instructions",
                        instruction,
                      );

                      updateCampaign(
                        "messageType",
                        "ai",
                      );

                      setAiMessage("");
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-white/55 transition hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white"
                  >
                    {template.title}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={prepareCampaignWithAI}
                disabled={aiLoading}
                className="mt-5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-5 py-2.5 text-sm font-bold shadow-lg shadow-violet-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiLoading
                  ? "Preparing..."
                  : aiMessage
                    ? "✦ Improve with AI"
                    : "✦ Prepare with AI"}
              </button>

              {aiMessage && (
                <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-950/20 p-5">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    AI Campaign Draft
                  </div>

                  <div className="whitespace-pre-line text-sm leading-6 text-white/80">
                    {aiMessage}
                  </div>
                </div>
              )}
            </section>

            {/* CAMPAIGN DETAILS */}

            <section className="rounded-[26px] border border-white/10 bg-[#0a1020] p-6">
              <SectionTitle
                title="Campaign Details"
                subtitle="Choose exactly how the campaign should be sent."
              />

              <label className="mb-2 block text-sm text-white/60">
                Campaign Name
              </label>

              <input
                value={campaign.name}
                onChange={(event) =>
                  updateCampaign(
                    "name",
                    event.target.value,
                  )
                }
                placeholder="e.g. July Customer Promotion"
                className="w-full rounded-xl border border-white/10 bg-[#060b18] px-4 py-3.5 text-sm outline-none transition focus:border-blue-400/50"
              />

              {/* MESSAGE MODE */}

              <div className="mt-6">
                <label className="mb-3 block text-sm font-medium text-white/60">
                  Message Mode
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <Choice
                    active={
                      campaign.messageType === "custom"
                    }
                    icon="✉"
                    title="Custom Message"
                    description="Send exactly the message you write. AI is completely optional."
                    onClick={() => {
                      updateCampaign(
                        "messageType",
                        "custom",
                      );
                    }}
                  />

                  <Choice
                    active={
                      campaign.messageType === "ai"
                    }
                    icon="✦"
                    title="AI Generated"
                    description="Let Sodah prepare and improve the campaign message."
                    onClick={() => {
                      updateCampaign(
                        "messageType",
                        "ai",
                      );
                    }}
                  />
                </div>
              </div>

              {/* CUSTOM MESSAGE */}

              {campaign.messageType === "custom" && (
                <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">
                        Your message
                      </div>

                      <div className="mt-1 text-xs text-white/35">
                        This exact text will be sent. No AI approval is required.
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                      Direct Send
                    </span>
                  </div>

                  <textarea
                    value={campaign.customMessage}
                    onChange={(event) =>
                      updateCampaign(
                        "customMessage",
                        event.target.value,
                      )
                    }
                    rows={7}
                    placeholder="Write your WhatsApp campaign message here..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#060b18] p-4 text-sm leading-6 outline-none transition focus:border-cyan-400/50"
                  />
                </div>
              )}

              {/* AI MODE */}

              {campaign.messageType === "ai" && (
                <div className="mt-5 rounded-2xl border border-violet-400/15 bg-violet-400/[0.03] p-4">
                  <div className="text-sm font-semibold text-white">
                    AI message mode
                  </div>

                  <p className="mt-1 text-xs leading-5 text-white/40">
                    Prepare the message above, review the generated
                    version, then assign the campaign.
                  </p>
                </div>
              )}

              {/* TONE */}

              <div className="mt-6">
                <label className="mb-2 block text-sm text-white/60">
                  AI Tone
                </label>

                <select
                  value={campaign.tone}
                  onChange={(event) =>
                    updateCampaign(
                      "tone",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#060b18] px-4 py-3.5 text-sm outline-none"
                >
                  <option>Friendly</option>
                  <option>Professional</option>
                  <option>Casual</option>
                  <option>Warm</option>
                  <option>Persuasive</option>
                  <option>Concise</option>
                </select>
              </div>
            </section>

            {/* CONTACTS */}

            <section className="rounded-[26px] border border-white/10 bg-[#0a1020] p-6">
              <SectionTitle
                title="Add Contacts"
                subtitle="Enter WhatsApp numbers manually, paste a list, or upload a CSV/TXT file."
              />

              <input
                ref={fileInput}
                type="file"
                accept=".csv,.txt"
                onChange={handleUpload}
                className="hidden"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setContactMode("paste")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    contactMode === "paste"
                      ? "border-violet-400/50 bg-violet-500/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="text-sm font-semibold">
                    ✎ Type or Paste
                  </div>

                  <div className="mt-1 text-xs leading-5 text-white/35">
                    Enter one number per line or paste many.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setContactMode("upload")}
                  className={`rounded-2xl border p-4 text-left transition ${
                    contactMode === "upload"
                      ? "border-cyan-400/50 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="text-sm font-semibold">
                    ↑ Upload File
                  </div>

                  <div className="mt-1 text-xs leading-5 text-white/35">
                    CSV or TXT contacts.
                  </div>
                </button>
              </div>

              {contactMode === "paste" && (
                <div className="mt-5">
                  <textarea
                    value={contactInput}
                    onChange={(event) =>
                      setContactInput(event.target.value)
                    }
                    rows={6}
                    placeholder={
                      "John, +971501234567\nMary, +971501234568\n+971501234569"
                    }
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#060b18] p-4 text-sm leading-6 outline-none placeholder:text-white/20 focus:border-violet-400/50"
                  />

                  <button
                    type="button"
                    onClick={addContactsFromText}
                    className="mt-3 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold transition hover:bg-violet-400"
                  >
                    Add Contacts
                  </button>
                </div>
              )}

              {contactMode === "upload" && (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/10 p-8 text-center">
                  <div className="text-3xl">📄</div>

                  <div className="mt-3 text-sm font-semibold">
                    Upload contacts
                  </div>

                  <p className="mt-1 text-xs text-white/35">
                    CSV and TXT files are supported.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      fileInput.current?.click()
                    }
                    className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
                  >
                    Choose File
                  </button>

                  {fileName && (
                    <div className="mt-3 text-xs text-emerald-300">
                      {fileName}
                    </div>
                  )}
                </div>
              )}

              {contacts.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      Contacts
                    </div>

                    <button
                      type="button"
                      onClick={clearContacts}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#060b18] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {contact.name}
                          </div>

                          <div className="mt-0.5 text-xs text-white/35">
                            {contact.phone}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeContact(contact.id)
                          }
                          className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-red-400/10"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Metric
                      label="Valid Contacts"
                      value={String(validContacts.length)}
                    />

                    <Metric
                      label="Total Added"
                      value={String(contacts.length)}
                    />
                  </div>
                </div>
              )}

              {!contacts.length && (
                <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.015] px-5 py-4 text-center">
                  <div className="text-sm text-white/40">
                    No contacts added yet
                  </div>

                  <div className="mt-1 text-xs text-white/20">
                    Add contacts to continue.
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ==================================================
              RIGHT COLUMN
              NORMAL DOCUMENT FLOW — NOT STICKY.
          ================================================== */}

          <aside className="min-w-0 space-y-6 self-start">
            {/* CAMPAIGN SUMMARY */}

            <section className="rounded-[26px] border border-white/10 bg-[#0a1020] p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">
                  Campaign Summary
                </h2>

                <span className="rounded-full bg-blue-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  Draft
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <Summary
                  label="Campaign"
                  value={
                    campaign.name || "Not configured"
                  }
                />

                <Summary
                  label="Message"
                  value={
                    campaign.messageType === "ai"
                      ? "AI Generated"
                      : "Custom"
                  }
                />

                <Summary
                  label="Contacts"
                  value={String(validContacts.length)}
                  green
                />

                <Summary
                  label="Mode"
                  value={
                    campaign.messageType === "ai"
                      ? "AI"
                      : "Direct"
                  }
                />

                <Summary
                  label="Tone"
                  value={campaign.tone}
                />

                <Summary
                  label="Status"
                  value="Ready for review"
                  green
                />

                <Summary
                  label="Schedule"
                  value={getScheduleLabel(campaign)}
                />
              </div>
            </section>

            {/* MESSAGE PREVIEW */}

            <section className="rounded-[26px] border border-white/10 bg-[#0a1020] p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-violet-300">
                    {campaign.messageType === "ai"
                      ? "✦"
                      : "✉"}
                  </span>

                  <h2 className="font-bold">
                    Message Preview
                  </h2>
                </div>

                <span className="text-[10px] uppercase tracking-wider text-white/25">
                  {campaign.messageType === "ai"
                    ? "AI"
                    : "Custom"}
                </span>
              </div>

              <div className="mt-4 min-h-[130px] rounded-2xl border border-white/10 bg-[#060b18] p-4">
                {previewMessage ? (
                  <div className="whitespace-pre-line text-sm leading-6 text-white/80">
                    {previewMessage}
                  </div>
                ) : (
                  <div className="text-sm leading-6 text-white/25">
                    Your message preview will appear here.
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-white/30">
                {campaign.messageType === "custom"
                  ? "Your exact custom message will be submitted without AI modification."
                  : "This is the AI message that will be submitted after review."}
              </p>
            </section>

            {/* SCHEDULE */}

            <section className="rounded-[26px] border border-white/10 bg-[#0a1020] p-6">
              <h2 className="font-bold">
                Schedule Campaign
              </h2>

              <div className="mt-5 space-y-3">
                <Schedule
                  active={campaign.schedule === "now"}
                  title="Send Now"
                  description="Start the campaign immediately."
                  onClick={() =>
                    updateCampaign(
                      "schedule",
                      "now",
                    )
                  }
                />

                <Schedule
                  active={
                    campaign.schedule === "scheduled"
                  }
                  title="Schedule Once"
                  description="Run on a specific date and time."
                  onClick={() =>
                    updateCampaign(
                      "schedule",
                      "scheduled",
                    )
                  }
                />

                <Schedule
                  active={
                    campaign.schedule === "daily"
                  }
                  title="Every Day"
                  description="Automatically run every day."
                  onClick={() =>
                    updateCampaign(
                      "schedule",
                      "daily",
                    )
                  }
                />

                <Schedule
                  active={
                    campaign.schedule === "weekly"
                  }
                  title="Every Week"
                  description="Automatically run once every week."
                  onClick={() =>
                    updateCampaign(
                      "schedule",
                      "weekly",
                    )
                  }
                />
              </div>

              {campaign.schedule === "scheduled" && (
                <div className="mt-4 grid gap-3">
                  <input
                    type="date"
                    value={campaign.date}
                    onChange={(event) =>
                      updateCampaign(
                        "date",
                        event.target.value,
                      )
                    }
                    className="rounded-xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm outline-none"
                  />

                  <input
                    type="time"
                    value={campaign.time}
                    onChange={(event) =>
                      updateCampaign(
                        "time",
                        event.target.value,
                      )
                    }
                    className="rounded-xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm outline-none"
                  />
                </div>
              )}

              {campaign.schedule === "daily" && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs text-white/40">
                    Daily campaign time
                  </label>

                  <input
                    type="time"
                    value={campaign.time}
                    onChange={(event) =>
                      updateCampaign(
                        "time",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm outline-none"
                  />
                </div>
              )}

              {campaign.schedule === "weekly" && (
                <div className="mt-4 grid gap-3">
                  <select
                    value={campaign.weeklyDay}
                    onChange={(event) =>
                      updateCampaign(
                        "weeklyDay",
                        event.target.value,
                      )
                    }
                    className="rounded-xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm outline-none"
                  >
                    {WEEK_DAYS.map((day) => (
                      <option
                        key={day.value}
                        value={day.value}
                      >
                        {day.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="time"
                    value={campaign.time}
                    onChange={(event) =>
                      updateCampaign(
                        "time",
                        event.target.value,
                      )
                    }
                    className="rounded-xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm outline-none"
                  />
                </div>
              )}
            </section>

            {/* FINAL ACTION */}

            <section className="rounded-[26px] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] via-blue-500/[0.06] to-violet-500/[0.08] p-6 shadow-xl">
              <div className="text-sm font-bold">
                Ready to continue?
              </div>

              <p className="mt-2 text-xs leading-5 text-white/40">
                Review your contacts, message and schedule
                before assigning the campaign.
              </p>

              <button
                type="button"
                onClick={openReview}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 px-5 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-blue-500/20 transition hover:scale-[1.01]"
              >
                🚀 Review & Assign Campaign
              </button>
            </section>
          </aside>
        </div>

        {/* BOTTOM METRICS */}

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            label="Total Contacts"
            value={String(validContacts.length)}
          />

          <Metric
            label="Messages"
            value={String(validContacts.length)}
          />

          <Metric
            label="Message Mode"
            value={
              campaign.messageType === "ai"
                ? "AI"
                : "Direct"
            }
          />

          <Metric
            label="Campaign"
            value={
              campaign.name
                ? "Configured"
                : "Draft"
            }
          />
        </div>
      </div>

      {/* ==================================================
          REVIEW MODAL
      ================================================== */}

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">
          <div className="my-8 w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#080d1b] p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-cyan-300">
                  Final Review
                </div>

                <h2 className="mt-1 text-2xl font-bold">
                  Ready to assign?
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  Check the campaign details before sending
                  them to the connected automation.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !sending && setShowReview(false)
                }
                className="text-2xl text-white/40 transition hover:text-white"
                aria-label="Close review"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-400/20 bg-red-950/50 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Review
                label="Campaign"
                value={
                  campaign.name || "Unnamed campaign"
                }
              />

              <Review
                label="Contacts"
                value={String(validContacts.length)}
              />

              <Review
                label="Message"
                value={
                  campaign.messageType === "ai"
                    ? "AI Generated"
                    : "Custom / Direct"
                }
              />

              <Review
                label="Schedule"
                value={getScheduleLabel(campaign)}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-[#101827] p-5">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/30">
                Exact Campaign Message
              </div>

              <div className="whitespace-pre-line text-sm leading-6 text-white/80">
                {previewMessage ||
                  "No message prepared yet."}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
              <div className="text-xs font-bold text-emerald-300">
                {campaign.messageType === "custom"
                  ? "Direct custom message"
                  : "AI-generated message"}
              </div>

              <div className="mt-1 text-xs leading-5 text-white/35">
                {campaign.messageType === "custom"
                  ? "The message above will be sent exactly as written. It will not be rewritten by AI."
                  : "The AI-generated message above will be sent after this review."}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  !sending && setShowReview(false)
                }
                disabled={sending}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={sendCampaign}
                disabled={sending}
                className="rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600 px-6 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
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

/*
 * ========================================================
 * HELPERS
 * ========================================================
 */

function getWeeklyDayLabel(value: string) {
  return (
    WEEK_DAYS.find((day) => day.value === value)?.label ||
    "Monday"
  );
}

function getScheduleLabel(campaign: Campaign) {
  switch (campaign.schedule) {
    case "now":
      return "Send Now";

    case "scheduled":
      return campaign.date && campaign.time
        ? `${campaign.date} at ${campaign.time}`
        : "Scheduled Once";

    case "daily":
      return campaign.time
        ? `Every Day at ${campaign.time}`
        : "Every Day";

    case "weekly":
      return campaign.time
        ? `Every ${getWeeklyDayLabel(
            campaign.weeklyDay,
          )} at ${campaign.time}`
        : `Every ${getWeeklyDayLabel(
            campaign.weeklyDay,
          )}`;

    default:
      return "Not configured";
  }
}

/*
 * ========================================================
 * UI COMPONENTS
 * ========================================================
 */

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="font-bold">
        {title}
      </h2>

      <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
        {subtitle}
      </p>
    </div>
  );
}

function Choice({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-violet-400/50 bg-violet-500/10 shadow-lg shadow-violet-500/5"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex gap-3">
        <div className="text-lg">
          {icon}
        </div>

        <div>
          <div className="text-sm font-semibold">
            {title}
          </div>

          <div className="mt-1 text-xs leading-5 text-white/40">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

function Summary({
  label,
  value,
  green = false,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/40">
        {label}
      </span>

      <span
        className={
          green
            ? "max-w-[210px] truncate text-right font-semibold text-emerald-400"
            : "max-w-[210px] truncate text-right text-white/80"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Schedule({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
        active
          ? "border-cyan-400/40 bg-cyan-400/[0.08]"
          : "border-white/10 bg-[#060b18] hover:bg-white/[0.04]"
      }`}
    >
      <div>
        <div className="text-sm font-semibold">
          {title}
        </div>

        <div className="mt-1 text-xs leading-5 text-white/35">
          {description}
        </div>
      </div>

      <div
        className={`h-3 w-3 rounded-full ${
          active
            ? "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.7)]"
            : "bg-white/15"
        }`}
      />
    </button>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a1020] p-4">
      <div className="text-lg font-bold text-white">
        {value}
      </div>

      <div className="mt-1 text-xs text-white/35">
        {label}
      </div>
    </div>
  );
}

function Review({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xs text-white/30">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-semibold text-white/80">
        {value}
      </div>
    </div>
  );
}