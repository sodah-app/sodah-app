"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

/* ============================================================
   EMAIL TEMPLATES
   ============================================================ */

const templates = [
  [
    "promotion",
    "Promotion",
    "Promote an offer, service, product, or special deal.",
  ],
  [
    "followup",
    "Follow-up",
    "Follow up with a lead or customer naturally.",
  ],
  [
    "appointment",
    "Appointment",
    "Invite, confirm, or remind someone about an appointment.",
  ],
  [
    "introduction",
    "Introduction",
    "Introduce your business to a potential customer.",
  ],
  [
    "announcement",
    "Announcement",
    "Share an important business update.",
  ],
  [
    "thankyou",
    "Thank You",
    "Send a genuine customer thank-you email.",
  ],
];

const templatePrompts = {
  promotion:
    "Create a professional promotional email that presents a product, service, offer, or special deal in a valuable and convincing way. Focus on the benefits and give the reader a clear reason to take action. Do not invent specific prices, discounts, product names, dates, or claims that were not provided. Keep the email natural and ready to send.",

  followup:
    "Create a professional and natural follow-up email for a lead or customer after a previous conversation or contact. Briefly reconnect, remind them of the previous conversation without inventing details, provide value, and invite them to take the next step. Keep it friendly, concise, and ready to send.",

  appointment:
    "Create a professional appointment email that can be used to invite, confirm, remind, or follow up about an appointment. Keep the wording useful even when appointment details are not provided. Do not invent a date, time, location, or appointment details. Make the next step clear.",

  introduction:
    "Create a professional introductory email that introduces a business to a potential customer. Explain the business value clearly and naturally without inventing specific business facts. Build interest and finish with a simple call to action.",

  announcement:
    "Create a clear and professional business announcement email. Present the update in a useful, easy-to-understand way and explain what the recipient needs to know or do next. Do not invent specific announcement details that were not provided.",

  thankyou:
    "Create a warm, genuine, and professional thank-you email for a customer. Show appreciation, keep the message personal and natural, and strengthen the customer relationship. Do not invent specific purchases, events, or details that were not provided.",
};

/* ============================================================
   SAFE STRING HELPERS
   ============================================================ */

function safeString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function cleanEmail(value) {
  return safeString(value).trim().toLowerCase();
}

function formatMoney(amount, currency = "AED") {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${numeric.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function buildPaymentSubject(invoiceNumber) {
  const invoice = safeString(invoiceNumber).trim();

  if (!invoice) {
    return "Payment Reminder";
  }

  return `Payment Reminder — Invoice ${invoice}`;
}

/* ============================================================
   MAIN CONTENT
   ============================================================ */

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [account, setAccount] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [templateKey, setTemplateKey] =
    useState("promotion");

  const [instruction, setInstruction] =
    useState("");

  const [subject, setSubject] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [recipients, setRecipients] =
    useState("");

  /* ==========================================================
     CASHFLOW CONTEXT
     ========================================================== */

  const [cashflowContext, setCashflowContext] =
    useState({
      customerName: "",
      invoiceNumber: "",
      amount: "",
      dueDate: "",
      currency: "",
      businessName: "",
      approvedMessage: "",
    });

  /* ==========================================================
     SESSION TOKEN
     ========================================================== */

  const token = useCallback(async () => {
    const {
      data,
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !data?.session?.access_token
    ) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    return data.session.access_token;
  }, []);

  /* ==========================================================
     API HELPER
     ========================================================== */

  const api = useCallback(
    async (url, options = {}) => {
      const accessToken =
        await token();

      const response = await fetch(
        url,
        {
          ...options,

          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${accessToken}`,
          },

          cache: "no-store",
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          safeString(
            data?.message ||
              data?.error ||
              "Request failed."
          ) ||
            "Request failed."
        );
      }

      return data;
    },
    [token]
  );

  /* ==========================================================
     LOAD CONNECTED EMAIL ACCOUNT
     ========================================================== */

  const loadAccount =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await api(
            "/api/email-ai/account"
          );

        const connectedAccount =
          data?.account || null;

        setAccount(
          connectedAccount
        );

        if (!connectedAccount) {
          setNotice(
            "Connect Gmail before creating an email."
          );

          setTimeout(() => {
            router.replace(
              "/email-ai"
            );
          }, 900);
        }
      } catch (e) {
        console.error(
          "[Email AI] Account load failed:",
          e
        );

        setError(
          safeString(e?.message) ||
            "Unable to load Gmail account."
        );
      } finally {
        setLoading(false);
      }
    }, [api, router]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  /* ==========================================================
     LOAD CASHFLOW HANDOFF
     ========================================================== */

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const recipient =
      cleanEmail(
        searchParams.get("recipient") ||
          searchParams.get("email") ||
          ""
      );

    const customerName =
      safeString(
        searchParams.get(
          "customerName"
        )
      ).trim();

    const invoiceNumber =
      safeString(
        searchParams.get(
          "invoiceNumber"
        )
      ).trim();

    const amount =
      safeString(
        searchParams.get(
          "amount"
        )
      ).trim();

    const dueDate =
      safeString(
        searchParams.get(
          "dueDate"
        )
      ).trim();

    const currency =
      safeString(
        searchParams.get(
          "currency"
        )
      )
        .trim()
        .toUpperCase();

    const businessName =
      safeString(
        searchParams.get(
          "businessName"
        )
      ).trim();

    const approvedMessage =
      safeString(
        searchParams.get(
          "approvedMessage"
        ) ||
          searchParams.get(
            "message"
          )
      );

    const fromCashflow =
      searchParams.get(
        "from"
      ) === "cashflow" ||
      Boolean(
        recipient ||
          invoiceNumber ||
          approvedMessage
      );

    if (!fromCashflow) {
      return;
    }

    setCashflowContext({
      customerName,
      invoiceNumber,
      amount,
      dueDate,
      currency,
      businessName,
      approvedMessage,
    });

    if (recipient) {
      setRecipients(
        recipient
      );
    }

    /*
     * Exact approved Cashflow message.
     * No AI rewriting happens here.
     */

    if (approvedMessage) {
      setMessage(
        approvedMessage
      );

      setInstruction(
        approvedMessage
      );

      setNotice(
        "Approved Cashflow reminder loaded exactly as written. You can edit it or choose Generate with AI if you want AI to improve it."
      );
    }

    if (invoiceNumber) {
      setSubject(
        buildPaymentSubject(
          invoiceNumber
        )
      );
    }
  }, [searchParams]);

  /* ==========================================================
     PARSE RECIPIENTS
     ========================================================== */

  const parsedRecipients =
    useMemo(() => {
      return [
        ...new Set(
          recipients
            .split(/[\n,;]+/)
            .map((item) =>
              cleanEmail(item)
            )
            .filter(Boolean)
        ),
      ];
    }, [recipients]);

  /* ==========================================================
     GENERATE WITH AI
     ========================================================== */

  const generate = async (
    selectedTemplateKey = templateKey,
    selectedInstruction = instruction
  ) => {
    try {
      if (!account) {
        throw new Error(
          "Connect Gmail before generating an email."
        );
      }

      const selectedKey =
        safeString(
          selectedTemplateKey
        ).trim() ||
        "promotion";

      const userInstruction =
        safeString(
          selectedInstruction
        ).trim();

      const prompt =
        userInstruction ||
        safeString(
          templatePrompts[
            selectedKey
          ]
        ) ||
        templatePrompts.promotion;

      setGenerating(true);
      setError("");
      setNotice("");

      /*
       * Only primitive strings are placed
       * into the request body.
       */

      const contextParts = [];

      if (
        cashflowContext.customerName
      ) {
        contextParts.push(
          `Customer name: ${safeString(
            cashflowContext.customerName
          )}`
        );
      }

      if (
        cashflowContext.invoiceNumber
      ) {
        contextParts.push(
          `Invoice number: ${safeString(
            cashflowContext.invoiceNumber
          )}`
        );
      }

      if (
        cashflowContext.amount
      ) {
        contextParts.push(
          `Invoice amount: ${safeString(
            cashflowContext.amount
          )}`
        );
      }

      if (
        cashflowContext.currency
      ) {
        contextParts.push(
          `Currency: ${safeString(
            cashflowContext.currency
          )}`
        );
      }

      if (
        cashflowContext.dueDate
      ) {
        contextParts.push(
          `Due date: ${safeString(
            cashflowContext.dueDate
          )}`
        );
      }

      if (
        cashflowContext.businessName
      ) {
        contextParts.push(
          `Business name: ${safeString(
            cashflowContext.businessName
          )}`
        );
      }

      const finalPrompt =
        contextParts.length
          ? `${prompt}\n\nInvoice context:\n${contextParts.join(
              "\n"
            )}`
          : prompt;

      const requestBody = {
        templateKey: selectedKey,

        instruction: finalPrompt,

        businessName:
          safeString(
            cashflowContext.businessName
          ) ||
          safeString(
            account?.gmail_name
          ) ||
          "your business",
      };

      const data =
        await api(
          "/api/email-ai/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              requestBody
            ),
          }
        );

      const generatedSubject =
        safeString(
          data?.subject
        ).trim();

      const generatedBody =
        safeString(
          data?.body
        );

      if (
        generatedSubject
      ) {
        setSubject(
          generatedSubject
        );
      }

      setMessage(
        generatedBody
      );

      setNotice(
        "AI prepared your email. Review and edit it before sending."
      );
    } catch (e) {
      console.error(
        "[Email AI] Generate failed:",
        e
      );

      setError(
        safeString(e?.message) ||
          "Unable to generate the email."
      );
    } finally {
      setGenerating(false);
    }
  };

  /* ==========================================================
     TEMPLATE CLICK
     ========================================================== */

  const handleTemplateClick = (
    key
  ) => {
    const selectedKey =
      safeString(key).trim();

    const prompt =
      safeString(
        templatePrompts[
          selectedKey
        ]
      ) ||
      templatePrompts.promotion;

    setTemplateKey(
      selectedKey
    );

    setInstruction(
      prompt
    );

    generate(
      selectedKey,
      prompt
    );
  };

  /* ==========================================================
     COPY MESSAGE
     ========================================================== */

  const copyMessage =
    async () => {
      try {
        const text =
          safeString(
            message
          );

        if (!text.trim()) {
          throw new Error(
            "There is no message to copy."
          );
        }

        await navigator.clipboard.writeText(
          text
        );

        setCopied(true);

        setNotice(
          "Message copied."
        );

        setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch (e) {
        console.error(
          "[Email AI] Copy failed:",
          e
        );

        try {
          const textarea =
            document.createElement(
              "textarea"
            );

          textarea.value =
            safeString(
              message
            );

          textarea.style.position =
            "fixed";

          textarea.style.opacity =
            "0";

          document.body.appendChild(
            textarea
          );

          textarea.focus();
          textarea.select();

          document.execCommand(
            "copy"
          );

          textarea.remove();

          setCopied(true);

          setNotice(
            "Message copied."
          );

          setTimeout(() => {
            setCopied(false);
          }, 1800);
        } catch {
          setError(
            "Unable to copy the message. Please select and copy it manually."
          );
        }
      }
    };

  /* ==========================================================
     SEND EMAIL
     ========================================================== */

  const send = async () => {
    try {
      if (!account) {
        throw new Error(
          "Connect Gmail before sending."
        );
      }

      if (
        !parsedRecipients.length
      ) {
        throw new Error(
          "Paste at least one email address."
        );
      }

      if (
        !safeString(
          subject
        ).trim()
      ) {
        throw new Error(
          "Add an email subject."
        );
      }

      if (
        !safeString(
          message
        ).trim()
      ) {
        throw new Error(
          "Add an email message."
        );
      }

      setSending(true);
      setError("");
      setNotice("");

      const requestBody = {
        subject:
          safeString(
            subject
          ).trim(),

        message:
          safeString(
            message
          ),

        recipients:
          parsedRecipients.map(
            (email) =>
              cleanEmail(email)
          ),

        templateKey:
          safeString(
            templateKey
          ).trim(),

        title:
          safeString(
            subject
          ).trim(),
      };

      const data =
        await api(
          "/api/email-ai/send",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              requestBody
            ),
          }
        );

      setNotice(
        safeString(
          data?.message
        ) ||
          "Email sent successfully."
      );

      /*
       * Keep the exact message visible
       * after sending.
       */

      setRecipients("");
    } catch (e) {
      console.error(
        "[Email AI] Send failed:",
        e
      );

      setError(
        safeString(e?.message) ||
          "Unable to send the email."
      );
    } finally {
      setSending(false);
    }
  };

  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <main className="page">
        <div className="loading-screen">
          <div className="loading-spinner">
            ✨
          </div>

          <h2>
            Loading Email AI...
          </h2>

          <p>
            Checking your connected Gmail.
          </p>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background: #020617;
            color: white;
          }

          .loading-screen {
            min-height: 70vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .loading-spinner {
            font-size: 34px;
            margin-bottom: 15px;
          }

          h2 {
            margin: 0;
            font-size: 22px;
          }

          p {
            color: #64748b;
            font-size: 12px;
            margin-top: 8px;
          }
        `}</style>
      </main>
    );
  }

  /* ==========================================================
     PAGE
     ========================================================== */

  return (
    <main className="page">
      <div className="shell">

        {/* HEADER */}

        <header className="header">
          <div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/email-ai"
                )
              }
              className="back"
            >
              ← Email AI
            </button>

            <div className="eyebrow">
              <i />
              SODAH EMAIL AI
            </div>

            <h1>
              Send Email{" "}
              <span>✨</span>
            </h1>

            <p>
              Create a professional email
              with AI and send it directly
              from your connected Gmail.
            </p>
          </div>

          <div className="header-status">
            <span>
              CONNECTED
            </span>

            <strong>
              ✓{" "}
              {safeString(
                account?.gmail_email
              )}
            </strong>
          </div>
        </header>

        {/* NOTICE / ERROR */}

        {(notice || error) && (
          <div
            className={
              error
                ? "notice error"
                : "notice"
            }
          >
            {error || notice}
          </div>
        )}

        {/* CASHFLOW CONTEXT */}

        {cashflowContext.invoiceNumber && (
          <div className="cashflow-context">

            <div>
              <span>
                CASHFLOW INVOICE
              </span>

              <strong>
                {cashflowContext.invoiceNumber}
              </strong>
            </div>

            {cashflowContext.customerName && (
              <div>
                <span>
                  CUSTOMER
                </span>

                <strong>
                  {cashflowContext.customerName}
                </strong>
              </div>
            )}

            {cashflowContext.amount && (
              <div>
                <span>
                  AMOUNT
                </span>

                <strong>
                  {formatMoney(
                    cashflowContext.amount,
                    cashflowContext.currency ||
                      "AED"
                  )}
                </strong>
              </div>
            )}

            {cashflowContext.dueDate && (
              <div>
                <span>
                  DUE
                </span>

                <strong>
                  {cashflowContext.dueDate}
                </strong>
              </div>
            )}

          </div>
        )}

        {/* AI WRITER */}

        <section className="ai-panel">

          <div className="panel-heading">
            <div>
              <small>
                AI EMAIL WRITER
              </small>

              <h2>
                What do you want to send?
              </h2>

              <p>
                Choose a template or tell
                the AI exactly what you want
                the email to say.
              </p>
            </div>

            <div className="spark">
              ✦
            </div>
          </div>

          {/* TEMPLATES */}

          <div className="templates">
            {templates.map(
              ([
                key,
                name,
                description,
              ]) => (
                <button
                  key={key}
                  type="button"
                  disabled={
                    generating
                  }
                  onClick={() =>
                    handleTemplateClick(
                      key
                    )
                  }
                  className={
                    templateKey === key
                      ? "template active"
                      : "template"
                  }
                >
                  <div className="template-icon">
                    {templateIcon(
                      key
                    )}
                  </div>

                  <div>
                    <strong>
                      {name}
                    </strong>

                    <span>
                      {description}
                    </span>
                  </div>
                </button>
              )
            )}
          </div>

          {/* AI INSTRUCTION */}

          <div className="field">
            <label>
              Tell AI what you want
            </label>

            <textarea
              value={instruction}
              onChange={(e) =>
                setInstruction(
                  safeString(
                    e.target.value
                  )
                )
              }
              placeholder="Example: Tell customers about our September offer and invite them to contact us on WhatsApp..."
            />
          </div>

          <button
            type="button"
            className="generate"
            disabled={
              !account ||
              generating
            }
            onClick={() =>
              generate(
                templateKey,
                instruction
              )
            }
          >
            {generating
              ? "Preparing your email..."
              : "✦ Generate with AI"}
          </button>

        </section>

        {/* COMPOSER */}

        <section className="composer">

          <div className="section-heading">
            <div>
              <small>
                READY TO SEND
              </small>

              <h2>
                Email Composer
              </h2>

              <p>
                Review the email, add your
                recipients, then send it.
              </p>
            </div>

            <div className="ready">
              ● Ready
            </div>
          </div>

          {/* FROM + RECIPIENTS */}

          <div className="form-grid">

            <div className="field">
              <label>
                From
              </label>

              <div className="from">
                <span>
                  ✓
                </span>

                {safeString(
                  account?.gmail_email
                )}
              </div>
            </div>

            <div className="field">
              <label>
                Recipients
              </label>

              <textarea
                value={recipients}
                onChange={(e) =>
                  setRecipients(
                    safeString(
                      e.target.value
                    )
                  )
                }
                className="recipients"
                placeholder={
                  "Paste email addresses here\none per line, or separated by commas"
                }
              />

              <div className="count">
                {parsedRecipients.length}{" "}
                recipient
                {parsedRecipients.length ===
                1
                  ? ""
                  : "s"}
              </div>
            </div>

          </div>

          {/* SUBJECT */}

          <div className="field">
            <label>
              Subject
            </label>

            <input
              value={subject}
              onChange={(e) =>
                setSubject(
                  safeString(
                    e.target.value
                  )
                )
              }
              placeholder="Email subject"
            />
          </div>

          {/* MESSAGE */}

          <div className="field">
            <label>
              Message
            </label>

            <textarea
              className="message"
              value={message}
              onChange={(e) =>
                setMessage(
                  safeString(
                    e.target.value
                  )
                )
              }
              placeholder="Your email message will appear here..."
            />
          </div>

          {/* SEND */}

          <div className="composer-footer">

            <div className="recipient-info">
              {parsedRecipients.length >
              0
                ? `${parsedRecipients.length} recipient${
                    parsedRecipients.length ===
                    1
                      ? ""
                      : "s"
                  } ready`
                : "No recipients added"}
            </div>

            <div className="actions">

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  router.push(
                    "/email-ai"
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="send"
                disabled={
                  !account ||
                  sending ||
                  !safeString(
                    subject
                  ).trim() ||
                  !safeString(
                    message
                  ).trim() ||
                  !parsedRecipients.length
                }
                onClick={send}
              >
                {sending
                  ? "Sending..."
                  : "Send Email →"}
              </button>

            </div>

          </div>

        </section>

      </div>

      {/* =======================================================
          STYLES
          ======================================================= */}

      <style jsx>{`

        .page {
          min-height: 100vh;

          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(74,222,128,.07),
              transparent 27%
            ),
            radial-gradient(
              circle at 90% 15%,
              rgba(99,102,241,.07),
              transparent 25%
            ),
            #020617;

          color: #f8fafc;

          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 25px 28px 60px;
        }

        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          padding-bottom: 28px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .back {
          border: none;
          background: transparent;
          color: #cbd5e1;
          padding: 0;
          margin-bottom: 25px;
          font-size: 14px;
          cursor: pointer;
        }

        .back:hover {
          color: white;
        }

        .eyebrow {
          color: #86efac;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .18em;
        }

        .eyebrow i {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          margin-right: 8px;
        }

        h1 {
          margin: 13px 0 8px;
          font-size: clamp(38px,5vw,54px);
          line-height: 1;
          letter-spacing: -.05em;
          font-weight: 900;
        }

        h1 span {
          color: #86efac;
        }

        .header p {
          margin: 0;
          max-width: 650px;
          color: #cbd5e1;
          font-size: 15px;
          line-height: 1.7;
        }

        .header-status {
          min-width: 220px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(74,222,128,.05);
          border: 1px solid rgba(74,222,128,.15);
        }

        .header-status span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .14em;
          margin-bottom: 7px;
        }

        .header-status strong {
          display: block;
          color: #86efac;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notice {
          margin: 20px 0;
          padding: 13px 15px;
          border-radius: 12px;
          background: rgba(74,222,128,.06);
          border: 1px solid rgba(74,222,128,.18);
          color: #dcfce7;
          font-size: 14px;
        }

        .notice.error {
          background: rgba(248,113,113,.06);
          border-color: rgba(248,113,113,.20);
          color: #fecaca;
        }

        .cashflow-context {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);

          gap: 10px;

          margin: 20px 0;

          padding: 15px;

          border-radius: 15px;

          background:
            rgba(74,222,128,.035);

          border:
            1px solid
            rgba(74,222,128,.12);
        }

        .cashflow-context div {
          min-width: 0;
        }

        .cashflow-context span {
          display: block;
          margin-bottom: 5px;
          color: #64748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .cashflow-context strong {
          display: block;
          color: #d1fae5;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ai-panel,
        .composer {
          margin-top: 20px;
          padding: 24px;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,.10);

          background:
            linear-gradient(
              145deg,
              rgba(30,41,59,.72),
              rgba(15,23,42,.88)
            );

          backdrop-filter: blur(20px);
        }

        .panel-heading,
        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .panel-heading small,
        .section-heading small {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .15em;
        }

        .panel-heading h2,
        .section-heading h2 {
          margin: 7px 0 5px;
          font-size: 25px;
          font-weight: 800;
        }

        .panel-heading p,
        .section-heading p {
          margin: 0;
          color: #a8b4c7;
          font-size: 14px;
        }

        .spark {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(124,58,237,.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c4b5fd;
          font-size: 25px;
        }

        .templates {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 23px 0;
        }

        .template {
          min-height: 104px;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          text-align: left;
          padding: 13px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,.08);
          background: #0f172a;
          color: #e2e8f0;
          cursor: pointer;
          transition: .18s ease;
        }

        .template:hover:not(:disabled) {
          border-color: rgba(139,92,246,.30);
          transform: translateY(-1px);
        }

        .template:disabled {
          opacity: .65;
          cursor: wait;
        }

        .template.active {
          border-color: rgba(74,222,128,.35);

          background:
            linear-gradient(
              145deg,
              rgba(74,222,128,.07),
              rgba(15,23,42,.95)
            );
        }

        .template-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 9px;
          background: rgba(139,92,246,.12);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
        }

        .template strong {
          display: block;
          color: #f8fafc;
          font-size: 14px;
          margin-bottom: 5px;
        }

        .template span {
          display: block;
          color: #b6c2d4;
          font-size: 12px;
          line-height: 1.45;
        }

        .field {
          margin-top: 17px;
        }

        .field label {
          display: block;
          margin-bottom: 7px;
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 800;
        }

        .field input,
        .field textarea {
          box-sizing: border-box;
          width: 100%;
          border: 1px solid rgba(255,255,255,.13);
          background: #020617;
          color: #f8fafc;
          border-radius: 11px;
          outline: none;
          padding: 13px;
          font: inherit;
          font-size: 14px;
          transition: .15s ease;
        }

        .field input:focus,
        .field textarea:focus {
          border-color: rgba(74,222,128,.35);
        }

        .field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .generate {
          width: 100%;
          height: 46px;
          margin-top: 11px;
          border: none;
          border-radius: 12px;

          background:
            linear-gradient(
              90deg,
              #06b6d4,
              #8b5cf6,
              #ec4899
            );

          color: white;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .generate:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .composer {
          margin-top: 14px;
        }

        .ready {
          padding: 7px 10px;
          border-radius: 9px;
          background: rgba(74,222,128,.07);
          border: 1px solid rgba(74,222,128,.16);
          color: #86efac;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .from {
          min-height: 44px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,.10);
          background: #0f172a;
          color: #86efac;
          font-size: 14px;
        }

        .recipients {
          height: 100px;
        }

        .count {
          margin-top: 5px;
          color: #94a3b8;
          text-align: right;
          font-size: 12px;
        }

        .message {
          min-height: 240px !important;
        }

        .composer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,.07);
        }

        .recipient-info {
          color: #a8b4c7;
          font-size: 13px;
        }

        .actions {
          display: flex;
          gap: 9px;
        }

        .secondary,
        .send {
          min-height: 44px;
          padding: 0 17px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .secondary {
          border: 1px solid rgba(255,255,255,.10);
          background: #0f172a;
          color: #cbd5e1;
        }

        .send {
          border: none;

          background:
            linear-gradient(
              90deg,
              #06b6d4,
              #8b5cf6,
              #ec4899
            );

          color: white;
        }

        .send:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        @media (max-width: 850px) {

          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-status {
            width: 100%;
            box-sizing: border-box;
          }

          .templates {
            grid-template-columns: 1fr 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .cashflow-context {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {

          .shell {
            padding: 20px 15px 40px;
          }

          .templates {
            grid-template-columns: 1fr;
          }

          .cashflow-context {
            grid-template-columns: 1fr;
          }

          .panel-heading h2,
          .section-heading h2 {
            font-size: 23px;
          }

          .composer-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .actions {
            width: 100%;
          }

          .secondary,
          .send {
            flex: 1;
          }
        }

      `}</style>
    </main>
  );
}

/* ============================================================
   SUSPENSE WRAPPER
   ============================================================ */

export default function NewCampaignPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            background: "#020617",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily:
              "Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          <div
            style={{
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 34,
                marginBottom: 15,
              }}
            >
              ✨
            </div>

            <h2
              style={{
                margin: 0,
              }}
            >
              Loading Email AI...
            </h2>

            <p
              style={{
                color: "#64748b",
                fontSize: 12,
                marginTop: 8,
              }}
            >
              Preparing your campaign.
            </p>
          </div>
        </main>
      }
    >
      <NewCampaignContent />
    </Suspense>
  );
}

/* ============================================================
   TEMPLATE ICON
   ============================================================ */

function templateIcon(key) {
  switch (key) {
    case "promotion":
      return "🎯";

    case "followup":
      return "↩️";

    case "appointment":
      return "📅";

    case "introduction":
      return "👋";

    case "announcement":
      return "📢";

    case "thankyou":
      return "💚";

    default:
      return "✉️";
  }
}