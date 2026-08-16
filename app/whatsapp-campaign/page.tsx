"use client";

import React, {
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

const WEBHOOK_URL =
  "https://solomon-n8n.duckdns.org/webhook/campaign-sender";

const INITIAL_CAMPAIGN = {
  name: "",
  instructions: "",
  messageType: "ai",
  customMessage: "",
  tone: "Friendly",

  // now | scheduled | daily | weekly
  schedule: "now",

  date: "",
  time: "",

  // Used when schedule === "weekly"
  weeklyDay: "monday",
};

const WEEK_DAYS = [
  {
    value: "monday",
    label: "Monday",
  },
  {
    value: "tuesday",
    label: "Tuesday",
  },
  {
    value: "wednesday",
    label: "Wednesday",
  },
  {
    value: "thursday",
    label: "Thursday",
  },
  {
    value: "friday",
    label: "Friday",
  },
  {
    value: "saturday",
    label: "Saturday",
  },
  {
    value: "sunday",
    label: "Sunday",
  },
];

const AI_SUGGESTIONS = [
  {
    title: "Promote an offer",
    instruction:
      "Promote our current offer. Keep the message friendly, clear, and concise. Explain the value of the offer and invite the customer to reply if they are interested.",
  },
  {
    title: "Follow up with leads",
    instruction:
      "Follow up with these leads in a friendly and professional way. Ask whether they are still interested and invite them to reply if they have any questions.",
  },
  {
    title: "Re-engage customers",
    instruction:
      "Re-engage previous customers with a warm and friendly message. Remind them that we are available to help and encourage them to get back in touch.",
  },
  {
    title: "Announce something new",
    instruction:
      "Announce something new from our business. Make the message exciting but concise, explain what is new, and encourage the customer to reply for more information.",
  },
  {
    title: "Invite customers",
    instruction:
      "Invite customers to connect with our business. Keep the message warm, professional, and easy to respond to.",
  },
];

export default function WhatsAppCampaignPage() {
  console.log(
    "🔥 WhatsAppCampaignPage RENDERED"
  );

  const fileInput =
    useRef<HTMLInputElement | null>(null);

  const [campaign, setCampaign] =
    useState(INITIAL_CAMPAIGN);

  const [contacts, setContacts] =
    useState<any[]>([]);

  const [fileName, setFileName] =
    useState("");

  const [contactInput, setContactInput] =
    useState("");

  const [contactMode, setContactMode] =
    useState("paste");

  const [aiMessage, setAiMessage] =
    useState("");

  const [aiLoading, setAiLoading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [showReview, setShowReview] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ========================================================
   * CAMPAIGN UPDATE
   * ========================================================
   */

  const updateCampaign = (
    key: string,
    value: string
  ) => {
    setCampaign((previous) => ({
      ...previous,
      [key]: value,
    }));

    /*
     * If the user changes the custom message,
     * immediately keep the preview in sync.
     */
    if (key === "customMessage") {
      setAiMessage(value);
    }

    /*
     * If the user changes away from AI mode,
     * there is no reason to keep showing an old
     * AI-generated draft.
     */
    if (
      key === "messageType" &&
      value === "custom"
    ) {
      setAiMessage(
        campaign.customMessage || ""
      );
    }

    if (
      key === "messageType" &&
      value === "ai"
    ) {
      setAiMessage("");
    }
  };

  /*
   * ========================================================
   * VALID CONTACTS
   * ========================================================
   */

  const validContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const phone = String(
        contact.phone || ""
      ).replace(/\D/g, "");

      return phone.length >= 8;
    });
  }, [contacts]);

  /*
   * ========================================================
   * GET AUTHENTICATED USER
   *
   * IMPORTANT:
   *
   * This function ONLY gets the authenticated user.
   *
   * It does NOT run when the page loads.
   * It is used when the user actually assigns/sends
   * the campaign.
   * ========================================================
   */

  const getAuthenticatedUserId =
    async (): Promise<string> => {
      const {
        data,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "SODAH CAMPAIGN SESSION ERROR:",
          sessionError
        );

        throw new Error(
          sessionError.message ||
            "Unable to load your session."
        );
      }

      const session = data?.session;

      if (!session?.user?.id) {
        throw new Error(
          "Your login session could not be identified. Please sign in again."
        );
      }

      return session.user.id;
    };

  /*
   * ========================================================
   * GET CURRENT USER'S BUSINESS
   *
   * IMPORTANT:
   *
   * This lookup happens ONLY when the campaign is
   * actually being assigned.
   *
   * Expected Supabase structure:
   *
   * businesses
   *   id
   *   user_id
   *
   * The exact business ID is then sent to n8n.
   * ========================================================
   */

  const getCurrentBusinessId =
    async (
      userId: string
    ): Promise<string> => {
      console.log(
        "SODAH CAMPAIGN: LOOKING UP BUSINESS"
      );

      console.log(
        "SODAH CAMPAIGN USER ID:",
        userId
      );

      const {
        data: business,
        error: businessError,
      } =
        await supabase
          .from("businesses")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

      if (businessError) {
        console.error(
          "SODAH BUSINESS LOOKUP ERROR:",
          businessError
        );

        throw new Error(
          businessError.message ||
            "Unable to find your business."
        );
      }

      if (!business?.id) {
        throw new Error(
          "No business is connected to your account. Please make sure your business profile is configured before running a campaign."
        );
      }

      console.log(
        "SODAH CAMPAIGN BUSINESS ID:",
        business.id
      );

      return business.id;
    };

  /*
   * ========================================================
   * AI CAMPAIGN PREPARATION
   *
   * The generated message is shown immediately in:
   *
   * 1. AI Campaign Draft
   * 2. AI Preview
   * 3. Final Review
   *
   * There is intentionally NO hardcoded:
   *
   * Hi {{name}}
   *
   * Users can add {{name}} themselves if they want
   * personalization.
   * ========================================================
   */

  const prepareCampaignWithAI =
    async (
      customInstruction?: string
    ) => {
      const instruction =
        (
          customInstruction ??
          campaign.instructions
        ).trim();

      if (!instruction) {
        setError(
          "Tell Sodah what you want the campaign to do."
        );

        return;
      }

      setError("");
      setAiLoading(true);

      try {
        /*
         * This is the client-side preparation layer.
         *
         * It creates the visible campaign draft
         * before anything is sent.
         *
         * The important part is that the generated
         * message is stored in aiMessage and displayed
         * to the user before sendCampaign() is called.
         */

        await new Promise(
          (resolve) =>
            setTimeout(resolve, 700)
        );

        const generatedMessage =
          `${instruction}

We'd love to hear from you.

Simply reply to this message if you're interested and we'll be happy to help.

Best regards`;

        setCampaign(
          (previous) => ({
            ...previous,
            instructions:
              instruction,
          })
        );

        setAiMessage(
          generatedMessage
        );
      } catch (err) {
        console.error(
          "AI PREPARATION ERROR:",
          err
        );

        setError(
          "Something went wrong while preparing the campaign."
        );
      } finally {
        setAiLoading(false);
      }
    };

  /*
   * ========================================================
   * APPLY AI TEMPLATE
   *
   * Clicking a template now:
   *
   * 1. Sets the instruction.
   * 2. Generates the message.
   * 3. Immediately shows the generated message.
   *
   * Nothing is sent at this point.
   * ========================================================
   */

  const applyAISuggestion = async (
    instruction: string
  ) => {
    setCampaign(
      (previous) => ({
        ...previous,
        instructions:
          instruction,
        messageType: "ai",
      })
    );

    await prepareCampaignWithAI(
      instruction
    );
  };

  /*
   * ========================================================
   * CSV PARSER
   * ========================================================
   */

  const parseCSVLine = (
    line: string
  ) => {
    const result: string[] = [];

    let current = "";
    let insideQuotes = false;

    for (
      let i = 0;
      i < line.length;
      i++
    ) {
      const character = line[i];

      if (character === '"') {
        if (
          insideQuotes &&
          line[i + 1] === '"'
        ) {
          current += '"';
          i++;
        } else {
          insideQuotes =
            !insideQuotes;
        }
      } else if (
        character === "," &&
        !insideQuotes
      ) {
        result.push(
          current.trim()
        );

        current = "";
      } else {
        current += character;
      }
    }

    result.push(
      current.trim()
    );

    return result;
  };

  /*
   * ========================================================
   * PHONE HELPERS
   * ========================================================
   */

  const normalizePhone = (
    value: any
  ) => {
    return String(value || "")
      .trim()
      .replace(/[^\d+]/g, "");
  };

  const isValidPhone = (
    value: any
  ) => {
    const digits = String(
      value || ""
    ).replace(/\D/g, "");

    return digits.length >= 8;
  };

  const createContact = (
    phone: string,
    name = ""
  ) => {
    const normalizedPhone =
      normalizePhone(phone);

    if (
      !isValidPhone(
        normalizedPhone
      )
    ) {
      return null;
    }

    return {
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

      name:
        name?.trim() ||
        `Contact ${
          contacts.length + 1
        }`,

      phone:
        normalizedPhone,

      email: "",
    };
  };

  /*
   * ========================================================
   * MERGE CONTACTS
   * ========================================================
   */

  const mergeContacts = (
    newContacts: any[]
  ) => {
    setContacts(
      (previous) => {
        const existingPhones =
          new Set(
            previous.map(
              (contact) =>
                String(
                  contact.phone ||
                    ""
                ).replace(
                  /\D/g,
                  ""
                )
            )
          );

        const uniqueNewContacts: any[] =
          [];

        for (const contact of newContacts) {
          if (!contact) {
            continue;
          }

          const digits = String(
            contact.phone || ""
          ).replace(
            /\D/g,
            ""
          );

          if (
            !digits ||
            existingPhones.has(
              digits
            )
          ) {
            continue;
          }

          existingPhones.add(
            digits
          );

          uniqueNewContacts.push(
            contact
          );
        }

        return [
          ...previous,
          ...uniqueNewContacts,
        ];
      }
    );
  };

  /*
   * ========================================================
   * ADD MANUAL / PASTED CONTACTS
   * ========================================================
   */

  const addContactsFromText =
    () => {
      const raw =
        contactInput.trim();

      if (!raw) {
        setError(
          "Enter or paste at least one WhatsApp number."
        );

        return;
      }

      setError("");

      const lines = raw
        .split(/\r?\n/)
        .map((line) =>
          line.trim()
        )
        .filter(Boolean);

      const parsedContacts: any[] =
        [];

      lines.forEach(
        (line) => {
          const phoneMatches =
            line.match(
              /\+?\d[\d\s().-]{7,}\d/g
            );

          if (!phoneMatches) {
            return;
          }

          phoneMatches.forEach(
            (phone) => {
              let name = "";

              const parts = line
                .split(/[|,;]/)
                .map(
                  (part) =>
                    part.trim()
                )
                .filter(Boolean);

              if (
                parts.length > 1 &&
                !/\d/.test(
                  parts[0]
                )
              ) {
                name = parts[0];
              }

              const contact =
                createContact(
                  phone,
                  name
                );

              if (contact) {
                parsedContacts.push(
                  contact
                );
              }
            }
          );
        }
      );

      if (
        !parsedContacts.length
      ) {
        setError(
          "No valid phone numbers were found. Please check the numbers and try again."
        );

        return;
      }

      mergeContacts(
        parsedContacts
      );

      setContactInput("");
    };

  /*
   * ========================================================
   * CONTACT UPLOAD
   * ========================================================
   */

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase();

      if (
        extension !== "csv" &&
        extension !== "txt"
      ) {
        setError(
          "Please upload a CSV or TXT contact file."
        );

        return;
      }

      const text =
        await file.text();

      if (!text.trim()) {
        setError(
          "The uploaded file is empty."
        );

        return;
      }

      /*
       * TXT
       */

      if (
        extension === "txt"
      ) {
        const lines = text
          .split(
            /[\r\n,;]+/
          )
          .map((line) =>
            line.trim()
          )
          .filter(Boolean);

        const parsedContacts: any[] =
          [];

        lines.forEach(
          (line) => {
            const phoneMatches =
              line.match(
                /\+?\d[\d\s().-]{7,}\d/g
              );

            if (
              !phoneMatches
            ) {
              return;
            }

            phoneMatches.forEach(
              (phone) => {
                const contact =
                  createContact(
                    phone
                  );

                if (contact) {
                  parsedContacts.push(
                    contact
                  );
                }
              }
            );
          }
        );

        if (
          !parsedContacts.length
        ) {
          setError(
            "No valid phone numbers were found in the TXT file."
          );

          return;
        }

        mergeContacts(
          parsedContacts
        );

        setFileName(
          file.name
        );

        return;
      }

      /*
       * CSV
       */

      const lines = text
        .split(/\r?\n/)
        .map((line) =>
          line.trim()
        )
        .filter(Boolean);

      if (!lines.length) {
        setError(
          "The uploaded CSV is empty."
        );

        return;
      }

      const headers =
        parseCSVLine(
          lines[0]
        ).map(
          (header) =>
            header
              .replace(
                /^"|"$/g,
                ""
              )
              .trim()
              .toLowerCase()
        );

      const rows =
        lines
          .slice(1)
          .map((line) => {
            const values =
              parseCSVLine(
                line
              );

            const row: Record<
              string,
              string
            > = {};

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

            return row;
          });

      const normalizedContacts =
        rows
          .map(
            (
              row,
              index
            ) => {
              const firstName =
                row.first_name ||
                row.firstname ||
                "";

              const lastName =
                row.last_name ||
                row.lastname ||
                "";

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

              const normalizedPhone =
                normalizePhone(
                  phone
                );

              if (
                !isValidPhone(
                  normalizedPhone
                )
              ) {
                return null;
              }

              return {
                id: `${Date.now()}-${index}-${Math.random()
                  .toString(36)
                  .slice(2)}`,

                name:
                  name ||
                  `Contact ${
                    index + 1
                  }`,

                phone:
                  normalizedPhone,

                email:
                  String(
                    email
                  ).trim(),
              };
            }
          )
          .filter(Boolean);

      if (
        !normalizedContacts.length
      ) {
        setError(
          "No valid contacts were found in the CSV file."
        );

        return;
      }

      mergeContacts(
        normalizedContacts
      );

      setFileName(
        file.name
      );
    } catch (err) {
      console.error(
        "CONTACT FILE ERROR:",
        err
      );

      setError(
        "We couldn't read this contact file. Please check the CSV format."
      );
    }
  };

  /*
   * ========================================================
   * REMOVE CONTACT
   * ========================================================
   */

  const removeContact = (
    id: string
  ) => {
    setContacts(
      (previous) =>
        previous.filter(
          (contact) =>
            contact.id !== id
        )
    );
  };

  /*
   * ========================================================
   * CLEAR CONTACTS
   * ========================================================
   */

  const clearContacts = () => {
    setContacts([]);
    setFileName("");
    setContactInput("");

    if (fileInput.current) {
      fileInput.current.value =
        "";
    }
  };

  /*
   * ========================================================
   * GET FINAL MESSAGE
   * ========================================================
   */

  const getFinalMessage = () => {
    if (
      campaign.messageType ===
      "custom"
    ) {
      return campaign.customMessage.trim();
    }

    return aiMessage.trim();
  };

  /*
   * ========================================================
   * VALIDATE CAMPAIGN
   * ========================================================
   */

  const validateCampaign =
    () => {
      if (!campaign.name.trim()) {
        return "Please give your campaign a name.";
      }

      if (!validContacts.length) {
        return "Please add at least one valid contact.";
      }

      if (
        campaign.messageType ===
        "ai"
      ) {
        if (
          !campaign.instructions.trim()
        ) {
          return "Tell the AI what you want the campaign to do.";
        }

        if (!aiMessage.trim()) {
          return "Please prepare your AI message before continuing.";
        }
      }

      if (
        campaign.messageType ===
        "custom" &&
        !campaign.customMessage.trim()
      ) {
        return "Please enter your campaign message.";
      }

      if (
        campaign.schedule ===
        "scheduled" &&
        (!campaign.date ||
          !campaign.time)
      ) {
        return "Please select the campaign date and time.";
      }

      if (
        campaign.schedule ===
        "daily" &&
        !campaign.time
      ) {
        return "Please select the time for your daily campaign.";
      }

      if (
        campaign.schedule ===
        "weekly" &&
        (!campaign.weeklyDay ||
          !campaign.time)
      ) {
        return "Please select the weekly day and time.";
      }

      return "";
    };

  /*
   * ========================================================
   * SEND / ASSIGN CAMPAIGN
   *
   * BUSINESS ID IS RESOLVED HERE.
   *
   * NOT ON PAGE LOAD.
   * NOT WHEN AI IS GENERATED.
   * NOT WHEN CONTACTS ARE ADDED.
   *
   * Only when the user actually assigns the campaign.
   * ========================================================
   */

  const sendCampaign = async () => {
    setError("");

    const validationError =
      validateCampaign();

    if (validationError) {
      setError(
        validationError
      );

      return;
    }

    setSending(true);

    try {
      /*
       * ====================================================
       * 1. GET CURRENT AUTHENTICATED USER
       * ====================================================
       */

      const userId =
        await getAuthenticatedUserId();

      /*
       * ====================================================
       * 2. GET EXACT BUSINESS ID
       * ====================================================
       *
       * This is deliberately done only now.
       *
       * user_id
       *    ↓
       * businesses
       *    ↓
       * business_id
       *    ↓
       * n8n
       */

      const businessId =
        await getCurrentBusinessId(
          userId
        );

      /*
       * ====================================================
       * 3. FINAL MESSAGE
       * ====================================================
       */

      const finalMessage =
        getFinalMessage();

      if (!finalMessage) {
        throw new Error(
          "There is no campaign message ready to send."
        );
      }

      /*
       * ====================================================
       * 4. SCHEDULE PAYLOAD
       * ====================================================
       */

      const schedulePayload = {
        mode: campaign.schedule,

        date:
          campaign.schedule ===
          "scheduled"
            ? campaign.date
            : "",

        time:
          campaign.schedule ===
            "scheduled" ||
          campaign.schedule ===
            "daily" ||
          campaign.schedule ===
            "weekly"
            ? campaign.time
            : "",

        weekly_day:
          campaign.schedule ===
          "weekly"
            ? campaign.weeklyDay
            : "",

        timezone:
          Intl.DateTimeFormat().resolvedOptions()
            .timeZone,
      };

      /*
       * ====================================================
       * 5. FINAL WEBHOOK PAYLOAD
       * ====================================================
       */

      const payload = {
        type: "whatsapp_campaign",

        /*
         * Exact authenticated user.
         */
        user_id: userId,

        /*
         * Exact business belonging to that user.
         */
        business_id: businessId,

        campaign_name:
          campaign.name.trim(),

        message_type:
          campaign.messageType,

        instructions:
          campaign.messageType ===
          "ai"
            ? campaign.instructions.trim()
            : "",

        /*
         * THIS IS THE EXACT MESSAGE THE USER
         * SAW IN THE PREVIEW.
         */
        message: finalMessage,

        /*
         * Also expose it under an explicit field
         * so n8n can clearly distinguish the
         * reviewed/generated output.
         */
        generated_message:
          finalMessage,

        tone: campaign.tone,

        contacts:
          validContacts.map(
            (contact) => ({
              name:
                contact.name || "",

              phone: String(
                contact.phone || ""
              ).replace(
                /[^\d+]/g,
                ""
              ),

              email:
                contact.email || "",
            })
          ),

        schedule:
          schedulePayload,

        /*
         * Convenience fields for n8n.
         */
        schedule_mode:
          campaign.schedule,

        schedule_time:
          schedulePayload.time,

        schedule_date:
          schedulePayload.date,

        weekly_day:
          schedulePayload.weekly_day,

        timezone:
          schedulePayload.timezone,

        total_contacts:
          validContacts.length,

        source:
          "sodah_whatsapp_campaign",

        created_at:
          new Date().toISOString(),
      };

      console.log(
        "===================================="
      );

      console.log(
        "SODAH CAMPAIGN FINAL PAYLOAD"
      );

      console.log(
        "USER ID:",
        userId
      );

      console.log(
        "BUSINESS ID:",
        businessId
      );

      console.log(
        "MESSAGE:",
        finalMessage
      );

      console.log(
        "SCHEDULE:",
        schedulePayload
      );

      console.log(
        "===================================="
      );

      /*
       * ====================================================
       * 6. SEND TO N8N
       * ====================================================
       */

      const response =
        await fetch(
          WEBHOOK_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const responseText =
        await response.text();

      console.log(
        "CAMPAIGN WEBHOOK STATUS:",
        response.status
      );

      console.log(
        "CAMPAIGN WEBHOOK RESPONSE:",
        responseText
      );

      if (!response.ok) {
        throw new Error(
          `Campaign service returned ${response.status}: ${
            responseText ||
            "Unknown error"
          }`
        );
      }

      /*
       * ====================================================
       * SUCCESS
       * ====================================================
       */

      setShowReview(false);
      setSuccess(true);
    } catch (err: any) {
      console.error(
        "CAMPAIGN SEND ERROR:",
        err
      );

      setError(
        err?.message ||
          "Sodah couldn't connect to the campaign service."
      );
    } finally {
      setSending(false);
    }
  };

  /*
   * ========================================================
   * SUCCESS SCREEN
   * ========================================================
   */

  if (success) {
    return (
      <main className="min-h-screen bg-[#050816] px-5 py-10 text-white md:px-8">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl backdrop-blur-xl md:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-4xl text-emerald-400">
              ✓
            </div>

            <h1 className="mt-7 text-3xl font-semibold">
              Campaign Assigned
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/45">
              Your campaign has been
              successfully assigned to
              Sodah. The campaign
              automation can now process
              the contacts according to
              your selected schedule.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Campaign"
                value={
                  campaign.name
                }
              />

              <Stat
                label="Contacts"
                value={
                  validContacts.length
                }
              />

              <Stat
                label="Schedule"
                value={getScheduleLabel(
                  campaign
                )}
              />
            </div>

            <button
              onClick={() => {
                setCampaign({
                  ...INITIAL_CAMPAIGN,
                });

                setContacts([]);
                setFileName("");
                setContactInput("");
                setContactMode(
                  "paste"
                );
                setAiMessage("");
                setSuccess(false);
                setError("");

                if (
                  fileInput.current
                ) {
                  fileInput.current.value =
                    "";
                }
              }}
              className="mt-8 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-7 py-3 font-semibold shadow-lg shadow-blue-500/20 transition hover:scale-[1.02]"
            >
              Create Another Campaign
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ========================================================
   * MAIN PAGE
   * ========================================================
   */

  const previewMessage =
    campaign.messageType ===
    "custom"
      ? campaign.customMessage
      : aiMessage;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-7 lg:px-10">

        {/* HEADER */}

        <header className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-xl font-bold shadow-lg shadow-blue-500/20">
                S
              </div>

              <div>
                <h1 className="text-2xl font-semibold md:text-3xl">
                  WhatsApp Campaign
                </h1>

                <p className="mt-1 text-sm text-white/40">
                  Create, review, schedule,
                  and send AI-powered
                  messages to multiple
                  WhatsApp contacts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs text-emerald-300">
              ● WhatsApp Connected
            </div>

            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/[0.06]"
            >
              Campaign History
            </button>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-white/50 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* MAIN GRID */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* LEFT COLUMN */}

          <div className="space-y-6">

            {/* AI COMMAND CENTER */}

            <section className="overflow-hidden rounded-[26px] border border-violet-400/20 bg-gradient-to-br from-violet-600/[0.12] via-blue-600/[0.06] to-transparent p-6 shadow-2xl shadow-violet-950/10">

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-xl shadow-lg shadow-violet-500/20">
                  ✦
                </div>

                <div>
                  <h2 className="text-lg font-semibold">
                    Campaign AI
                  </h2>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-white/45">
                    Choose a campaign
                    template or tell Sodah
                    what you want to
                    accomplish. The
                    generated message will
                    be shown to you before
                    anything is sent.
                  </p>
                </div>
              </div>

              <textarea
                value={
                  campaign.instructions
                }
                onChange={(event) =>
                  updateCampaign(
                    "instructions",
                    event.target.value
                  )
                }
                rows={5}
                placeholder="Example: Follow up with these customers about our new promotion. Keep the message friendly and short and invite them to reply if interested."
                className="mt-6 w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 outline-none placeholder:text-white/25 transition focus:border-violet-400/50"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {AI_SUGGESTIONS.map(
                  (suggestion) => (
                    <button
                      type="button"
                      key={
                        suggestion.title
                      }
                      disabled={aiLoading}
                      onClick={() =>
                        applyAISuggestion(
                          suggestion.instruction
                        )
                      }
                      className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-white/55 transition hover:border-violet-400/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {suggestion.title}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  prepareCampaignWithAI()
                }
                disabled={aiLoading}
                className="mt-5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-violet-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiLoading
                  ? "Preparing message..."
                  : "✦ Prepare with AI"}
              </button>

              {/* IMMEDIATE AI RESULT */}

              {aiMessage && (
                <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05]">
                  <div className="flex items-center justify-between border-b border-emerald-400/10 px-5 py-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-emerald-300">
                      Message You Will Send
                    </div>

                    <div className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-300">
                      Preview
                    </div>
                  </div>

                  <div className="whitespace-pre-line p-5 text-sm leading-6 text-white/80">
                    {aiMessage}
                  </div>

                  <div className="border-t border-white/5 px-5 py-3 text-xs text-white/30">
                    This is the message currently
                    prepared for your campaign.
                    Nothing has been sent yet.
                  </div>
                </div>
              )}
            </section>

            {/* CAMPAIGN DETAILS */}

            <section className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6">
              <SectionTitle
                title="Campaign Details"
                subtitle="Configure how Sodah should communicate."
              />

              <label className="mb-2 block text-sm text-white/60">
                Campaign Name
              </label>

              <input
                value={
                  campaign.name
                }
                onChange={(event) =>
                  updateCampaign(
                    "name",
                    event.target.value
                  )
                }
                placeholder="e.g. July Customer Promotion"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition focus:border-blue-400/50"
              />

              {/* MESSAGE TYPE */}

              <div className="mt-6">
                <label className="mb-3 block text-sm text-white/60">
                  Message Type
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <Choice
                    active={
                      campaign.messageType ===
                      "ai"
                    }
                    icon="✦"
                    title="AI Generated"
                    description="Prepare and review the AI message before sending."
                    onClick={() =>
                      updateCampaign(
                        "messageType",
                        "ai"
                      )
                    }
                  />

                  <Choice
                    active={
                      campaign.messageType ===
                      "custom"
                    }
                    icon="✉"
                    title="Custom Message"
                    description="Send the same message to everyone."
                    onClick={() =>
                      updateCampaign(
                        "messageType",
                        "custom"
                      )
                    }
                  />
                </div>
              </div>

              {/* CUSTOM MESSAGE */}

              {campaign.messageType ===
                "custom" && (
                <div className="mt-5">
                  <textarea
                    value={
                      campaign.customMessage
                    }
                    onChange={(event) =>
                      updateCampaign(
                        "customMessage",
                        event.target.value
                      )
                    }
                    rows={5}
                    placeholder="Write the WhatsApp message..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 outline-none transition focus:border-blue-400/50"
                  />

                  <div className="mt-3 rounded-xl border border-blue-400/10 bg-blue-400/[0.04] px-4 py-3 text-xs text-blue-200/60">
                    Your custom message is
                    previewed automatically before
                    you assign the campaign.
                  </div>
                </div>
              )}

              {/* TONE */}

              <div className="mt-6">
                <label className="mb-2 block text-sm text-white/60">
                  AI Tone
                </label>

                <select
                  value={
                    campaign.tone
                  }
                  onChange={(event) =>
                    updateCampaign(
                      "tone",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3.5 text-sm outline-none"
                >
                  <option>
                    Friendly
                  </option>

                  <option>
                    Professional
                  </option>

                  <option>
                    Casual
                  </option>

                  <option>
                    Warm
                  </option>

                  <option>
                    Persuasive
                  </option>

                  <option>
                    Concise
                  </option>
                </select>
              </div>
            </section>

            {/* CONTACTS */}

            <section className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6">
              <SectionTitle
                title="Add Contacts"
                subtitle="Choose how you want Sodah to reach your customers."
              />

              <input
                ref={fileInput}
                type="file"
                accept=".csv,.txt"
                onChange={
                  handleUpload
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
                  className={`rounded-2xl border p-4 text-left transition ${
                    contactMode ===
                    "paste"
                      ? "border-violet-400/50 bg-violet-500/10 shadow-lg shadow-violet-500/5"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-lg">
                      ✎
                    </div>

                    <div>
                      <div className="text-sm font-medium">
                        Type or Paste
                      </div>

                      <div className="mt-1 text-xs leading-5 text-white/35">
                        Enter one number or
                        paste many contacts at
                        once.
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setContactMode(
                      "upload"
                    )
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    contactMode ===
                    "upload"
                      ? "border-blue-400/50 bg-blue-500/10 shadow-lg shadow-blue-500/5"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-lg">
                      ↑
                    </div>

                    <div>
                      <div className="text-sm font-medium">
                        Upload File
                      </div>

                      <div className="mt-1 text-xs leading-5 text-white/35">
                        Upload a CSV or TXT
                        contact list.
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* TYPE / PASTE */}

              {contactMode ===
                "paste" && (
                <div className="mt-5">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 transition focus-within:border-violet-400/40">
                    <textarea
                      value={
                        contactInput
                      }
                      onChange={(event) =>
                        setContactInput(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();
                          addContactsFromText();
                        }
                      }}
                      rows={5}
                      placeholder={`Paste or type WhatsApp numbers...

Example:
+971501234567
+971559876543
+971523456789

You can also paste many numbers at once.`}
                      className="w-full resize-none bg-transparent text-sm leading-6 outline-none placeholder:text-white/20"
                    />

                    <div className="mt-3 flex flex-col gap-3 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-white/30">
                        Press Enter to add •
                        Shift + Enter for a
                        new line
                      </div>

                      <button
                        type="button"
                        onClick={
                          addContactsFromText
                        }
                        className="rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-violet-500/15 transition hover:scale-[1.01]"
                      >
                        + Add Contacts
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/30">
                    <span>
                      ✓ International
                      numbers supported
                    </span>

                    <span>•</span>

                    <span>
                      ✓ Duplicate numbers
                      removed
                    </span>
                  </div>
                </div>
              )}

              {/* UPLOAD */}

              {contactMode ===
                "upload" && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() =>
                      fileInput.current?.click()
                    }
                    className="group w-full rounded-2xl border border-dashed border-blue-400/30 bg-blue-500/[0.04] p-9 text-center transition hover:border-blue-400/60 hover:bg-blue-500/[0.08]"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-2xl transition group-hover:scale-105">
                      ↑
                    </div>

                    <div className="mt-4 font-medium">
                      Upload contacts
                    </div>

                    <div className="mt-1 text-xs text-white/35">
                      CSV or TXT • Click to
                      browse
                    </div>
                  </button>

                  {fileName && (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {fileName}
                        </div>

                        <div className="mt-1 text-xs text-white/40">
                          {
                            validContacts.length
                          }{" "}
                          valid contacts
                          added
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFileName("");

                          if (
                            fileInput.current
                          ) {
                            fileInput.current.value =
                              "";
                          }
                        }}
                        className="ml-4 text-white/40 transition hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CONTACT SUMMARY */}

              {contacts.length >
                0 && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        Contacts Ready
                      </div>

                      <div className="mt-1 text-xs text-white/35">
                        {
                          validContacts.length
                        }{" "}
                        valid recipients
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        clearContacts
                      }
                      className="text-xs text-white/35 transition hover:text-red-300"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    {contacts
                      .slice(0, 8)
                      .map(
                        (
                          contact
                        ) => (
                          <div
                            key={
                              contact.id
                            }
                            className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-3 last:border-0"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm text-emerald-300">
                                ✓
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-sm">
                                  {
                                    contact.name
                                  }
                                </div>

                                <div className="mt-1 truncate text-xs text-white/40">
                                  {
                                    contact.phone
                                  }
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeContact(
                                  contact.id
                                )
                              }
                              className="shrink-0 text-xs text-white/25 transition hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      )}

                    {contacts.length >
                      8 && (
                      <div className="border-t border-white/5 px-4 py-3 text-center text-xs text-white/30">
                        +
                        {contacts.length -
                          8}{" "}
                        more contacts
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] p-3">
                      <div className="text-lg font-semibold text-emerald-400">
                        {
                          validContacts.length
                        }
                      </div>

                      <div className="mt-1 text-xs text-white/35">
                        Valid contacts
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="text-lg font-semibold">
                        {
                          contacts.length
                        }
                      </div>

                      <div className="mt-1 text-xs text-white/35">
                        Total added
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!contacts.length && (
                <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.015] px-5 py-4 text-center">
                  <div className="text-sm text-white/40">
                    No contacts added yet
                  </div>

                  <div className="mt-1 text-xs text-white/20">
                    Add a few numbers manually,
                    paste a list, or upload your
                    contact file.
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN */}

          <aside className="space-y-6">

            {/* SUMMARY */}

            <section className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6">
              <h2 className="font-semibold">
                Campaign Summary
              </h2>

              <div className="mt-6 space-y-4">
                <Summary
                  label="Campaign"
                  value={
                    campaign.name ||
                    "Not configured"
                  }
                />

                <Summary
                  label="Message Type"
                  value={
                    campaign.messageType ===
                    "ai"
                      ? "AI Generated"
                      : "Custom"
                  }
                />

                <Summary
                  label="Total Contacts"
                  value={
                    validContacts.length
                  }
                  green
                />

                <Summary
                  label="AI Tone"
                  value={
                    campaign.tone
                  }
                />

                <Summary
                  label="Schedule"
                  value={getScheduleLabel(
                    campaign
                  )}
                />
              </div>
            </section>

            {/* MESSAGE PREVIEW */}

            <section className="rounded-[26px] border border-emerald-400/15 bg-white/[0.025] p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-300">
                    ✓
                  </span>

                  <h2 className="font-semibold">
                    Message Preview
                  </h2>
                </div>

                {previewMessage && (
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-300">
                    Ready
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#101827] p-4">
                {previewMessage ? (
                  <div className="whitespace-pre-line text-sm leading-6 text-white/80">
                    {previewMessage}
                  </div>
                ) : (
                  <div className="text-sm leading-6 text-white/30">
                    Your campaign message will
                    appear here before it is
                    sent.
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-blue-400/10 bg-blue-400/[0.035] px-3 py-2.5 text-xs leading-5 text-blue-200/50">
                You will always see the exact
                prepared message before the
                campaign is assigned.
              </div>
            </section>

            {/* SCHEDULE */}

            <section className="rounded-[26px] border border-white/10 bg-white/[0.025] p-6">
              <h2 className="font-semibold">
                Schedule Campaign
              </h2>

              <p className="mt-1 text-xs leading-5 text-white/35">
                Choose when Sodah should run
                this campaign.
              </p>

              <div className="mt-5 space-y-3">

                <Schedule
                  active={
                    campaign.schedule ===
                    "now"
                  }
                  title="Send Now"
                  description="Start the campaign immediately."
                  onClick={() =>
                    updateCampaign(
                      "schedule",
                      "now"
                    )
                  }
                />

                <Schedule
                  active={
                    campaign.schedule ===
                    "scheduled"
                  }
                  title="Schedule Once"
                  description="Run the campaign on a specific date and time."
                  onClick={() =>
                    updateCampaign(
                      "schedule",
                      "scheduled"
                    )
                  }
                />

                <Schedule
                  active={
                    campaign.schedule ===
                    "daily"
                  }
                  title="Every Day"
                  description="Run this campaign automatically every day."
                  onClick={() =>
                    updateCampaign(
                      "schedule",
                      "daily"
                    )
                  }
                />

                <Schedule
                  active={
                    campaign.schedule ===
                    "weekly"
                  }
                  title="Every Week"
                  description="Run this campaign automatically once every week."
                  onClick={() =>
                    updateCampaign(
                      "schedule",
                      "weekly"
                    )
                  }
                />
              </div>

              {/* ONCE */}

              {campaign.schedule ===
                "scheduled" && (
                <div className="mt-4">
                  <div className="mb-2 text-xs text-white/40">
                    Campaign date and time
                  </div>

                  <div className="grid gap-3">
                    <input
                      type="date"
                      value={
                        campaign.date
                      }
                      onChange={(event) =>
                        updateCampaign(
                          "date",
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm outline-none"
                    />

                    <input
                      type="time"
                      value={
                        campaign.time
                      }
                      onChange={(event) =>
                        updateCampaign(
                          "time",
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>
              )}

              {/* DAILY */}

              {campaign.schedule ===
                "daily" && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs text-white/40">
                    Daily campaign time
                  </label>

                  <input
                    type="time"
                    value={
                      campaign.time
                    }
                    onChange={(event) =>
                      updateCampaign(
                        "time",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm outline-none"
                  />

                  <div className="mt-3 rounded-xl border border-violet-400/10 bg-violet-400/[0.04] px-4 py-3 text-xs leading-5 text-violet-200/50">
                    This campaign will be
                    configured to run every day
                    at the selected time.
                  </div>
                </div>
              )}

              {/* WEEKLY */}

              {campaign.schedule ===
                "weekly" && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-2 block text-xs text-white/40">
                      Weekly day
                    </label>

                    <select
                      value={
                        campaign.weeklyDay
                      }
                      onChange={(event) =>
                        updateCampaign(
                          "weeklyDay",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm outline-none"
                    >
                      {WEEK_DAYS.map(
                        (day) => (
                          <option
                            key={
                              day.value
                            }
                            value={
                              day.value
                            }
                          >
                            {day.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs text-white/40">
                      Weekly time
                    </label>

                    <input
                      type="time"
                      value={
                        campaign.time
                      }
                      onChange={(event) =>
                        updateCampaign(
                          "time",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-violet-400/10 bg-violet-400/[0.04] px-4 py-3 text-xs leading-5 text-violet-200/50">
                    This campaign will be
                    configured to run every{" "}
                    {getWeeklyDayLabel(
                      campaign.weeklyDay
                    )}{" "}
                    at the selected time.
                  </div>
                </div>
              )}
            </section>

            {/* REVIEW BUTTON */}

            <button
              type="button"
              onClick={() => {
                const validationError =
                  validateCampaign();

                if (
                  validationError
                ) {
                  setError(
                    validationError
                  );

                  return;
                }

                setError("");
                setShowReview(true);
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-600 px-5 py-4 font-semibold shadow-xl shadow-blue-500/20 transition hover:scale-[1.01]"
            >
              🚀 Review Campaign Before Sending
            </button>

            <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-4 text-center">
              <div className="text-xs font-medium text-white/50">
                Nothing is sent yet
              </div>

              <div className="mt-1 text-[11px] leading-5 text-white/25">
                Your message will be displayed
                again in the final review before
                Sodah receives the campaign.
              </div>
            </div>
          </aside>
        </div>

        {/* BOTTOM METRICS */}

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            label="Total Contacts"
            value={
              validContacts.length
            }
          />

          <Metric
            label="Messages"
            value={
              validContacts.length
            }
          />

          <Metric
            label="AI"
            value={
              aiMessage
                ? "Ready"
                : "Draft"
            }
          />

          <Metric
            label="Campaign"
            value="Draft"
          />
        </div>
      </div>

      {/* ====================================================
          REVIEW MODAL
          ==================================================== */}

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="my-8 w-full max-w-2xl rounded-[30px] border border-white/10 bg-[#0a0f1f] p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-blue-300">
                  Final Review
                </div>

                <h2 className="mt-1 text-2xl font-semibold">
                  Review Your Message
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  This is exactly what Sodah
                  will receive for the campaign.
                  Nothing is assigned until you
                  confirm below.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowReview(false)
                }
                disabled={sending}
                className="text-2xl text-white/40 transition hover:text-white disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Review
                label="Campaign"
                value={
                  campaign.name ||
                  "Unnamed campaign"
                }
              />

              <Review
                label="Contacts"
                value={
                  validContacts.length
                }
              />

              <Review
                label="Message"
                value={
                  campaign.messageType ===
                  "ai"
                    ? "AI Generated"
                    : "Custom"
                }
              />

              <Review
                label="Schedule"
                value={getScheduleLabel(
                  campaign
                )}
              />
            </div>

            {/* FINAL MESSAGE */}

            <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-400/20 bg-[#101827]">
              <div className="flex items-center justify-between border-b border-emerald-400/10 px-5 py-3">
                <div className="text-xs font-medium uppercase tracking-wider text-emerald-300">
                  Message That Will Be Sent
                </div>

                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-300">
                  Final Preview
                </span>
              </div>

              <div className="whitespace-pre-line p-5 text-sm leading-6 text-white/80">
                {getFinalMessage() ||
                  "No message prepared yet."}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-blue-400/10 bg-blue-400/[0.035] px-4 py-3 text-xs leading-5 text-blue-200/50">
              You can go back and edit the
              campaign if anything needs to
              change. The business ID will be
              resolved only when you click
              <strong className="mx-1 text-blue-200/70">
                Assign Campaign
              </strong>
              below.
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowReview(false)
                }
                disabled={sending}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm transition hover:bg-white/[0.05] disabled:opacity-50"
              >
                Go Back & Edit
              </button>

              <button
                type="button"
                onClick={
                  sendCampaign
                }
                disabled={sending}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 text-sm font-semibold shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending
                  ? "Assigning Campaign..."
                  : "🚀 Confirm & Assign Campaign"}
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

function getWeeklyDayLabel(
  value: string
) {
  return (
    WEEK_DAYS.find(
      (day) =>
        day.value === value
    )?.label ||
    "Monday"
  );
}

function getScheduleLabel(
  campaign: typeof INITIAL_CAMPAIGN
) {
  switch (
    campaign.schedule
  ) {
    case "now":
      return "Send Now";

    case "scheduled":
      if (
        campaign.date &&
        campaign.time
      ) {
        return `${campaign.date} at ${campaign.time}`;
      }

      return "Scheduled Once";

    case "daily":
      if (campaign.time) {
        return `Every Day at ${campaign.time}`;
      }

      return "Every Day";

    case "weekly":
      if (campaign.time) {
        return `Every ${getWeeklyDayLabel(
          campaign.weeklyDay
        )} at ${campaign.time}`;
      }

      return `Every ${getWeeklyDayLabel(
        campaign.weeklyDay
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
      <h2 className="font-semibold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-white/40">
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
          ? "border-violet-400/50 bg-violet-500/10"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex gap-3">
        <div className="text-lg">
          {icon}
        </div>

        <div>
          <div className="text-sm font-medium">
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
  value: string | number;
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
            ? "font-medium text-emerald-400"
            : "max-w-[180px] truncate text-right text-white/80"
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
          ? "border-violet-400/40 bg-violet-500/[0.08]"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
    >
      <div>
        <div className="text-sm font-medium">
          {title}
        </div>

        <div className="mt-1 text-xs text-white/35">
          {description}
        </div>
      </div>

      <div
        className={`h-4 w-4 rounded-full border ${
          active
            ? "border-violet-400 bg-violet-500 shadow-lg shadow-violet-500/30"
            : "border-white/30"
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
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xl font-semibold">
        {value}
      </div>

      <div className="mt-1 text-xs text-white/35">
        {label}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xs text-white/35">
        {label}
      </div>

      <div className="mt-2 truncate text-sm font-medium">
        {value}
      </div>
    </div>
  );
}

function Review({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xs text-white/35">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-medium">
        {value}
      </div>
    </div>
  );
}