"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

import {
  ArrowLeft,
  Plus,
  Upload,
  Camera,
  Sparkles,
  Search,
  CheckCircle2,
  FileText,
  X,
  Copy,
  Mail,
  MessageCircle,
  Loader2,
  FileUp,
  Trash2,
} from "lucide-react";

/* ============================================================
   CURRENCIES
   ============================================================ */

const CURRENCY_OPTIONS = [
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق" },
];

const emptyForm = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  invoice_number: "",
  amount: "",
  amount_due: "",
  invoice_date: "",
  due_date: "",
  currency: "AED",
};

/* ============================================================
   FILE TYPES
   ============================================================ */

const SPREADSHEET_EXTENSIONS = ["csv", "xlsx", "xls"];

const DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
];

/* ============================================================
   HEADER ALIASES
   ============================================================ */

const FIELD_ALIASES = {
  customer_name: [
    "customer",
    "customer_name",
    "customername",
    "customer_full_name",
    "client",
    "client_name",
    "clientname",
    "name",
    "company",
    "company_name",
    "companyname",
    "buyer",
    "debtor",
    "debtor_name",
    "account_name",
  ],

  customer_email: [
    "email",
    "email_address",
    "customer_email",
    "customer_email_address",
    "client_email",
  ],

  customer_phone: [
    "phone",
    "phone_number",
    "mobile",
    "mobile_number",
    "customer_phone",
    "customer_phone_number",
    "client_phone",
  ],

  invoice_number: [
    "invoice",
    "invoice_number",
    "invoice_no",
    "invoice_num",
    "invoice_id",
    "invoice_number_no",
    "invoice_number_",
    "bill_number",
    "bill_no",
  ],

  amount: [
    "amount",
    "total",
    "total_amount",
    "invoice_amount",
    "grand_total",
    "gross_total",
    "price",
  ],

  amount_due: [
    "amount_due",
    "outstanding",
    "outstanding_amount",
    "balance",
    "balance_due",
    "payment_due_amount",
    "remaining",
    "remaining_balance",
  ],

  invoice_date: [
    "invoice_date",
    "date",
    "issue_date",
    "issued_date",
    "created_date",
  ],

  due_date: [
    "due_date",
    "due",
    "payment_due",
    "payment_due_date",
    "due_on",
    "deadline",
  ],

  currency: [
    "currency",
    "currency_code",
    "invoice_currency",
  ],
};

/* ============================================================
   NORMALIZERS
   ============================================================ */

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/#/g, " number ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!text) return null;

  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");

  if (comma > dot) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(/,/g, "");
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : null;
}

function normalizeDate(value) {
  if (!value) return "";

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return `${value.getFullYear()}-${String(
      value.getMonth() + 1
    ).padStart(2, "0")}-${String(
      value.getDate()
    ).padStart(2, "0")}`;
  }

  const text = String(value).trim();

  const iso = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/
  );

  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(
      2,
      "0"
    )}-${String(iso[3]).padStart(2, "0")}`;
  }

  const slash = text.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
  );

  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = slash[3];

    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;

    return `${year}-${String(month).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
  }

  const parsed = new Date(text);

  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(
      parsed.getMonth() + 1
    ).padStart(2, "0")}-${String(
      parsed.getDate()
    ).padStart(2, "0")}`;
  }

  return "";
}

/* ============================================================
   HELPERS
   ============================================================ */

function getCurrencyInfo(code) {
  return (
    CURRENCY_OPTIONS.find(
      (item) => item.code === code
    ) || CURRENCY_OPTIONS[0]
  );
}

function getStatus(invoice) {
  if (invoice.status === "cancelled") {
    return "cancelled";
  }

  if (invoice.status === "paid") {
    return "paid";
  }

  const due = Number(
    invoice.amount_due ??
      invoice.amount ??
      0
  );

  if (due <= 0) {
    return "paid";
  }

  if (invoice.due_date) {
    const end = new Date(
      `${invoice.due_date}T23:59:59`
    );

    if (
      !Number.isNaN(end.getTime()) &&
      end < new Date()
    ) {
      return "overdue";
    }
  }

  return "unpaid";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function CashflowPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");

  const [currency, setCurrency] = useState("AED");
  const [rates, setRates] = useState({});
  const [rateDate, setRateDate] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [showDropzone, setShowDropzone] =
    useState(false);

  const [ai, setAi] = useState(null);
  const [businessName, setBusinessName] = useState("");

  const uploadRef = useRef(null);
  const scanRef = useRef(null);
  const spreadsheetRef = useRef(null);

  /* ==========================================================
     AUTHENTICATED FETCH
     ========================================================== */

  async function cashflowFetch(
    url,
    options = {}
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers = new Headers(
      options.headers || {}
    );

    headers.set(
      "Accept",
      "application/json"
    );

    if (
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers.set(
        "Content-Type",
        "application/json"
      );
    }

    if (session?.access_token) {
      headers.set(
        "Authorization",
        `Bearer ${session.access_token}`
      );
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  }

  /* ==========================================================
     BUSINESS ID
     ========================================================== */

  function getBusinessId() {
    try {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const value =
        params.get("businessId") ||
        window.localStorage.getItem(
          "sodah_business_id"
        ) ||
        "";

      return isUuid(value) ? value : "";
    } catch {
      return "";
    }
  }

  /* ==========================================================
     JSON RESPONSE
     ========================================================== */

  async function readJson(response) {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `Cashflow server returned an invalid response (HTTP ${response.status}).`
      );
    }
  }

  /* ==========================================================
     LOAD BUSINESS NAME
     ========================================================== */

  async function loadBusinessProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const metadata =
        user.user_metadata || {};

      const metadataName = String(
        metadata.business_name ||
          metadata.businessName ||
          ""
      ).trim();

      if (metadataName) {
        setBusinessName(metadataName);
      }

      const { data, error } =
        await supabase
          .from("businesses")
          .select("business_id, business_name, user_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (!error && data?.business_name) {
        setBusinessName(
          String(data.business_name).trim()
        );
      }
    } catch (e) {
      console.error(
        "[Cashflow business profile]",
        e
      );
    }
  }

  /* ==========================================================
     LOAD INVOICES
     ========================================================== */

  async function load() {
    setLoading(true);
    setError("");

    try {
      const businessId =
        getBusinessId();

      const url = businessId
        ? `/api/cashflow?businessId=${encodeURIComponent(
            businessId
          )}`
        : "/api/cashflow";

      const response =
        await cashflowFetch(url);

      const data =
        await readJson(response);

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Unable to load Cashflow."
        );
      }

      setInvoices(
        (data.invoices || []).map(
          (invoice) => ({
            ...invoice,
            status:
              getStatus(invoice),
          })
        )
      );
    } catch (e) {
      setError(
        e?.message ||
          "Unable to load Cashflow."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadBusinessProfile();

    try {
      const saved =
        window.localStorage.getItem(
          "sodah_cashflow_currency"
        );

      if (
        saved &&
        CURRENCY_OPTIONS.some(
          (x) => x.code === saved
        )
      ) {
        setCurrency(saved);

        setForm((current) => ({
          ...current,
          currency: saved,
        }));
      }
    } catch {}
  }, []);

  /* ==========================================================
     LOAD EXCHANGE RATES
     ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      const invoiceCurrencies = [
        ...new Set(
          invoices
            .map((invoice) =>
              String(
                invoice.currency ||
                  "AED"
              ).toUpperCase()
            )
            .filter(Boolean)
        ),
      ];

      const bases =
        invoiceCurrencies.length
          ? invoiceCurrencies
          : ["AED"];

      try {
        const responses =
          await Promise.all(
            bases.map((base) =>
              fetch(
                `/api/cashflow/rates?base=${encodeURIComponent(
                  base
                )}&quotes=${encodeURIComponent(
                  currency
                )}`,
                {
                  cache: "no-store",
                }
              ).then((response) =>
                response.json()
              )
            )
          );

        if (cancelled) return;

        const next = {};
        let date = "";

        for (const item of responses) {
          if (item?.success) {
            const rate =
              Number(
                item?.rates?.[
                  currency
                ]
              );

            if (
              Number.isFinite(rate)
            ) {
              next[item.base] =
                rate;
            }

            date =
              item.date || date;
          }
        }

        setRates(next);
        setRateDate(date);
      } catch {
        if (!cancelled) {
          setRates({});
          setRateDate("");
        }
      }
    }

    loadRates();

    return () => {
      cancelled = true;
    };
  }, [invoices, currency]);

  /* ==========================================================
     CURRENCY CONVERSION
     ========================================================== */

  function convertAmount(
    amount,
    fromCurrency
  ) {
    const number =
      Number(amount || 0);

    const from = String(
      fromCurrency || "AED"
    ).toUpperCase();

    if (from === currency) {
      return number;
    }

    const rate =
      Number(rates[from]);

    if (
      !Number.isFinite(rate)
    ) {
      return number;
    }

    return number * rate;
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }
    ).format(
      Number(amount || 0)
    );
  }

  /* ==========================================================
     COMPUTED INVOICES
     ========================================================== */

  const computedInvoices =
    useMemo(
      () =>
        invoices.map(
          (invoice) => ({
            ...invoice,

            status:
              getStatus(invoice),

            displayAmount:
              convertAmount(
                invoice.amount,
                invoice.currency
              ),

            displayDue:
              convertAmount(
                invoice.amount_due ??
                  invoice.amount,
                invoice.currency
              ),
          })
        ),
      [invoices, rates, currency]
    );

  const unpaid =
    computedInvoices.filter(
      (invoice) =>
        invoice.status !== "paid"
    );

  const overdue =
    unpaid.filter(
      (invoice) =>
        invoice.status ===
        "overdue"
    );

  const outstanding =
    unpaid.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.displayDue || 0
        ),
      0
    );

  const overdueTotal =
    overdue.reduce(
      (sum, invoice) =>
        sum +
        Number(
          invoice.displayDue || 0
        ),
      0
    );

  const filtered =
    useMemo(() => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return computedInvoices;
      }

      return computedInvoices.filter(
        (invoice) =>
          `${invoice.customer_name || ""} ${
            invoice.invoice_number || ""
          } ${
            invoice.customer_email || ""
          } ${
            invoice.customer_phone || ""
          }`
            .toLowerCase()
            .includes(query)
      );
    }, [computedInvoices, search]);

  /* ==========================================================
     CHANGE DISPLAY CURRENCY
     ========================================================== */

  function changeCurrency(value) {
    setCurrency(value);

    setForm((current) => ({
      ...current,
      currency: value,
    }));

    try {
      window.localStorage.setItem(
        "sodah_cashflow_currency",
        value
      );
    } catch {}
  }

  /* ==========================================================
     ADD MANUAL INVOICE
     ========================================================== */

  async function addInvoice(event) {
    event.preventDefault();

    setError("");
    setNotice("");

    try {
      const payload = {
        ...form,

        amount:
          normalizeAmount(
            form.amount
          ),

        amount_due:
          form.amount_due === ""
            ? normalizeAmount(
                form.amount
              )
            : normalizeAmount(
                form.amount_due
              ),

        currency:
          form.currency ||
          currency,

        source_type: "manual",
      };

      const businessId =
        getBusinessId();

      if (businessId) {
        payload.business_id =
          businessId;
      }

      const response =
        await cashflowFetch(
          "/api/cashflow",
          {
            method: "POST",
            body: JSON.stringify(
              payload
            ),
          }
        );

      const data =
        await readJson(response);

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Unable to save invoice."
        );
      }

      setShowAdd(false);

      setForm({
        ...emptyForm,
        currency,
      });

      setNotice(
        "Invoice added successfully."
      );

      await load();
    } catch (e) {
      setError(
        e?.message ||
          "Unable to save invoice."
      );
    }
  }

  /* ==========================================================
     MARK PAID
     ========================================================== */

  async function markPaid(invoice) {
    setError("");

    try {
      const response =
        await cashflowFetch(
          "/api/cashflow",
          {
            method: "PATCH",
            body: JSON.stringify({
              id: invoice.id,
              status: "paid",
            }),
          }
        );

      const data =
        await readJson(response);

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Unable to mark invoice as paid."
        );
      }

      setNotice(
        `Invoice ${invoice.invoice_number} marked as paid.`
      );

      await load();
    } catch (e) {
      setError(
        e?.message ||
          "Unable to update invoice."
      );
    }
  }

  /* ==========================================================
     DELETE INVOICE
     ========================================================== */

  async function deleteInvoice(invoice) {
    if (!invoice?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete invoice ${invoice.invoice_number || ""}? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response =
        await cashflowFetch(
          `/api/cashflow?id=${encodeURIComponent(
            invoice.id
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await readJson(response);

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Unable to delete invoice."
        );
      }

      setNotice(
        "Invoice deleted successfully."
      );

      await load();
    } catch (e) {
      setError(
        e?.message ||
          "Unable to delete invoice."
      );
    }
  }

  /* ==========================================================
     FIND SPREADSHEET HEADER
     ========================================================== */

  function findHeaderRow(rows) {
    let best = {
      index: -1,
      score: 0,
    };

    rows
      .slice(0, 25)
      .forEach(
        (row, index) => {
          const headers =
            row.map(
              normalizeHeader
            );

          const has =
            (aliases) =>
              aliases.some(
                (alias) =>
                  headers.includes(
                    alias
                  )
              );

          let score = 0;

          if (
            has(
              FIELD_ALIASES.customer_name
            )
          ) {
            score++;
          }

          if (
            has(
              FIELD_ALIASES.invoice_number
            )
          ) {
            score++;
          }

          if (
            has(
              FIELD_ALIASES.amount
            )
          ) {
            score++;
          }

          if (
            has(
              FIELD_ALIASES.due_date
            )
          ) {
            score++;
          }

          if (
            score > best.score
          ) {
            best = {
              index,
              score,
            };
          }
        }
      );

    return best.score >= 3
      ? best.index
      : 0;
  }

  /* ==========================================================
     GET SPREADSHEET VALUE
     ========================================================== */

  function rowValue(
    row,
    headers,
    field
  ) {
    const aliases =
      FIELD_ALIASES[field] ||
      [];

    for (
      const alias of aliases
    ) {
      const index =
        headers.indexOf(alias);

      if (index >= 0) {
        const value =
          row[index];

        if (
          value !==
            undefined &&
          value !== null &&
          String(value).trim()
        ) {
          return String(
            value
          ).trim();
        }
      }
    }

    return "";
  }

  /* ==========================================================
     CONVERT SPREADSHEET
     ========================================================== */

  function spreadsheetToInvoices(
    rows
  ) {
    const headerIndex =
      findHeaderRow(rows);

    const headers =
      rows[headerIndex].map(
        normalizeHeader
      );

    const output = [];

    for (
      const row of rows.slice(
        headerIndex + 1
      )
    ) {
      const customer =
        rowValue(
          row,
          headers,
          "customer_name"
        );

      const invoiceNumber =
        rowValue(
          row,
          headers,
          "invoice_number"
        );

      const amountRaw =
        rowValue(
          row,
          headers,
          "amount"
        );

      const outstandingRaw =
        rowValue(
          row,
          headers,
          "amount_due"
        );

      const due =
        normalizeDate(
          rowValue(
            row,
            headers,
            "due_date"
          )
        );

      if (
        !customer &&
        !invoiceNumber &&
        !amountRaw &&
        !due
      ) {
        continue;
      }

      const amount =
        normalizeAmount(
          amountRaw
        );

      const amountDue =
        normalizeAmount(
          outstandingRaw
        ) ?? amount;

      output.push({
        customer_name:
          customer,

        customer_email:
          rowValue(
            row,
            headers,
            "customer_email"
          ) || null,

        customer_phone:
          rowValue(
            row,
            headers,
            "customer_phone"
          ) || null,

        invoice_number:
          invoiceNumber,

        amount,

        amount_due:
          amountDue,

        invoice_date:
          normalizeDate(
            rowValue(
              row,
              headers,
              "invoice_date"
            )
          ) || null,

        due_date: due,

        currency:
          String(
            rowValue(
              row,
              headers,
              "currency"
            ) ||
              currency
          ).toUpperCase(),
      });
    }

    return {
      invoices: output,
      headers,
      headerIndex,
    };
  }

  /* ==========================================================
     IMPORT SPREADSHEET
     ========================================================== */

  async function importSpreadsheet(
    file
  ) {
    const buffer =
      await file.arrayBuffer();

    const workbook =
      XLSX.read(buffer, {
        type: "array",
        cellDates: true,
        raw: false,
      });

    if (
      !workbook.SheetNames?.length
    ) {
      throw new Error(
        "The spreadsheet does not contain a worksheet."
      );
    }

    const allInvoices = [];

    for (
      const sheetName of
        workbook.SheetNames
    ) {
      const sheet =
        workbook.Sheets[
          sheetName
        ];

      const rows =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            header: 1,
            defval: "",
            raw: false,
            blankrows: false,
          }
        );

      if (rows.length < 2) {
        continue;
      }

      const parsed =
        spreadsheetToInvoices(
          rows
        );

      allInvoices.push(
        ...parsed.invoices
      );
    }

    const valid =
      allInvoices.filter(
        (invoice) =>
          invoice.customer_name &&
          invoice.invoice_number &&
          Number.isFinite(
            Number(
              invoice.amount
            )
          ) &&
          invoice.due_date
      );

    if (!valid.length) {
      await importWithAI(file);
      return;
    }

    await saveInvoices(
      valid,
      file.name,
      "spreadsheet"
    );
  }

  /* ==========================================================
     SAVE IMPORTED INVOICES
     ========================================================== */

  async function saveInvoices(
    items,
    sourceFileName,
    sourceType
  ) {
    let imported = 0;
    let skipped = 0;
    let firstError = "";

    for (
      const item of items
    ) {
      try {
        const businessId =
          getBusinessId();

        const payload = {
          ...item,
          source_file_name:
            sourceFileName,
          source_type:
            sourceType,
        };

        if (businessId) {
          payload.business_id =
            businessId;
        }

        const response =
          await cashflowFetch(
            "/api/cashflow",
            {
              method: "POST",
              body: JSON.stringify(
                payload
              ),
            }
          );

        const data =
          await readJson(
            response
          );

        if (
          response.ok &&
          data?.success
        ) {
          imported++;
        } else {
          skipped++;

          if (!firstError) {
            firstError =
              data?.message ||
              `Invoice ${
                item.invoice_number ||
                ""
              } could not be imported.`;
          }
        }
      } catch (e) {
        skipped++;

        if (!firstError) {
          firstError =
            e?.message ||
            "Invoice import failed.";
        }
      }
    }

    if (!imported) {
      throw new Error(
        firstError ||
          "No invoices could be imported. Required information: Customer/Client, Invoice/Invoice Number, Amount/Total, and Due Date/Payment Due."
      );
    }

    if (skipped) {
      setNotice(
        `${imported} invoice${
          imported === 1
            ? ""
            : "s"
        } imported. ${skipped} row${
          skipped === 1
            ? ""
            : "s"
        } were skipped.`
      );
    } else {
      setNotice(
        `${imported} invoice${
          imported === 1
            ? ""
            : "s"
        } imported successfully.`
      );
    }

    await load();
  }

  /* ==========================================================
     AI DOCUMENT EXTRACTION
     ========================================================== */

  async function importWithAI(
    file
  ) {
    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    const response =
      await cashflowFetch(
        "/api/cashflow/extract",
        {
          method: "POST",
          body: formData,
        }
      );

    const data =
      await readJson(response);

    if (
      !response.ok ||
      !data?.success ||
      !data?.invoice
    ) {
      throw new Error(
        data?.message ||
          "The invoice document could not be read. Please check the document and try again."
      );
    }

    const businessId =
      getBusinessId();

    const payload = {
      ...data.invoice,

      source_type:
        "ai_document",

      source_file_name:
        data.source_file_name ||
        file.name,

      raw_extraction:
        data.raw_extraction ||
        null,
    };

    if (businessId) {
      payload.business_id =
        businessId;
    }

    const saveResponse =
      await cashflowFetch(
        "/api/cashflow",
        {
          method: "POST",
          body: JSON.stringify(
            payload
          ),
        }
      );

    const saveData =
      await readJson(
        saveResponse
      );

    if (
      !saveResponse.ok ||
      !saveData?.success
    ) {
      throw new Error(
        saveData?.message ||
          "The document was read but could not be saved."
      );
    }

    setNotice(
      `Invoice ${data.invoice.invoice_number} was read and added automatically.`
    );

    await load();
  }

  /* ==========================================================
     UNIVERSAL FILE HANDLER
     ========================================================== */

  async function handleFile(
    file
  ) {
    if (!file) return;

    setError("");
    setNotice("");
    setImporting(true);

    try {
      const extension =
        file.name
          .toLowerCase()
          .split(".")
          .pop() || "";

      if (
        SPREADSHEET_EXTENSIONS.includes(
          extension
        )
      ) {
        await importSpreadsheet(
          file
        );
      } else if (
        DOCUMENT_EXTENSIONS.includes(
          extension
        )
      ) {
        await importWithAI(file);
      } else if (
        file.type?.startsWith(
          "image/"
        ) ||
        file.type ===
          "application/pdf"
      ) {
        await importWithAI(file);
      } else {
        throw new Error(
          "Unsupported file. Upload an image, PDF, Word document, CSV, or Excel file."
        );
      }
    } catch (e) {
      console.error(
        "[Cashflow file import]",
        e
      );

      setError(
        e?.message ||
          "Unable to process the uploaded invoice."
      );
    } finally {
      setImporting(false);
      setShowDropzone(false);
    }
  }

  /* ==========================================================
     BUSINESS SIGNATURE
     ========================================================== */

  function withBusinessSignature(message) {
    const text = String(message || "").trim();
    const name = String(businessName || "").trim();

    if (!text || !name) return text;

    const withoutTrailingSignature = text
      .replace(/\s*(?:best regards|kind regards|regards)[,!:;]?\s*(?:\r?\n\s*[^\r\n]+)?\s*$/i, "")
      .trim();

    return `${withoutTrailingSignature}\n\nBest regards,\n${name}`;
  }

  /* ==========================================================
     GENERATE AI REMINDER
     ========================================================== */

  async function generateAI(invoice) {
    setAi({
      invoice,
      loading: true,
      ownerName: businessName,
      signature: `Best regards,\n${businessName || ""}`.trim(),
    });

    try {
      const response = await cashflowFetch(
        "/api/cashflow/ai",
        {
          method: "POST",
          body: JSON.stringify({
            invoice,
            owner_name: businessName,
            signature: `Best regards,\n${businessName || ""}`.trim(),
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message ||
            "Unable to generate payment reminder."
        );
      }

      setAi({
        invoice,
        reply: withBusinessSignature(data.reply),
        analysis: data.analysis,
        loading: false,
        ownerName: businessName,
        signature: `Best regards,\n${businessName || ""}`.trim(),
      });
    } catch (e) {
      setAi({
        invoice,
        loading: false,
        error:
          e?.message ||
          "Unable to generate payment reminder.",
        ownerName: businessName,
        signature: `Best regards,\n${businessName || ""}`.trim(),
      });
    }
  }

  /* ==========================================================
     REGENERATE AI
     ========================================================== */

  async function regenerateAI() {
    if (!ai?.invoice) {
      return;
    }

    setAi((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const response =
        await cashflowFetch(
          "/api/cashflow/ai",
          {
            method: "POST",
            body: JSON.stringify({
              invoice:
                ai.invoice,

              owner_name:
                ai.ownerName ||
                businessName,

              signature:
                ai.signature ||
                `Best regards,\n${businessName}`.trim(),
            }),
          }
        );

      const data =
        await readJson(response);

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Unable to generate payment reminder."
        );
      }

      setAi((current) => ({
        ...current,

        reply:
          withBusinessSignature(data.reply),

        analysis:
          data.analysis,

        loading: false,
      }));
    } catch (e) {
      setAi((current) => ({
        ...current,

        loading: false,

        error:
          e?.message ||
          "Unable to generate payment reminder.",
      }));
    }
  }

  /* ==========================================================
     COPY MESSAGE
     ========================================================== */

  async function copyMessage() {
    const message = String(ai?.reply || "");

    if (!message.trim()) {
      setError("There is no payment reminder to copy.");
      return;
    }

    try {
      let copied = false;

      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(message);
          copied = true;
        } catch {}
      }

      if (!copied) {
        const textarea = document.createElement("textarea");
        textarea.value = message;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        copied = document.execCommand("copy");
        textarea.remove();
      }

      if (!copied) {
        throw new Error("Copy command was rejected by the browser.");
      }

      setError("");
      setNotice("Payment reminder copied exactly.");
    } catch (e) {
      console.error("[Cashflow copy]", e);
      setError(
        "Unable to copy automatically. Please select the message and copy it manually."
      );
    }
  }

  /* ==========================================================
     OPEN WHATSAPP CAMPAIGN
     ========================================================== */

  function openWhatsAppCampaign() {
    if (!ai?.reply) {
      setError(
        "There is no approved payment reminder to send."
      );
      return;
    }

    const invoice = ai.invoice || {};
    const message = String(ai.reply).trim();
    const params = new URLSearchParams();

    params.set("source", "cashflow");
    params.set("message", message);
    params.set("preparedMessage", message);
    params.set("aiMessage", message);
    params.set("campaign_message", message);

    if (invoice.customer_name) {
      params.set("customer_name", invoice.customer_name);
      params.set("name", invoice.customer_name);
    }

    if (invoice.customer_phone) {
      params.set("customer_phone", invoice.customer_phone);
      params.set("phone", invoice.customer_phone);
    }

    if (invoice.customer_email) {
      params.set("customer_email", invoice.customer_email);
      params.set("email", invoice.customer_email);
    }

    if (invoice.invoice_number) {
      params.set("invoice_number", invoice.invoice_number);
    }

    if (invoice.amount !== undefined && invoice.amount !== null) {
      params.set("amount", String(invoice.amount));
    }

    if (invoice.amount_due !== undefined && invoice.amount_due !== null) {
      params.set("amount_due", String(invoice.amount_due));
    }

    if (invoice.due_date) {
      params.set("due_date", String(invoice.due_date));
    }

    if (invoice.currency) {
      params.set("currency", String(invoice.currency));
    }

    if (businessName) {
      params.set("business_name", businessName);
    }

    try {
      sessionStorage.setItem(
        "sodah_cashflow_campaign_message",
        JSON.stringify({
          message,
          customer_name: invoice.customer_name || "",
          customer_phone: invoice.customer_phone || "",
          customer_email: invoice.customer_email || "",
          invoice_number: invoice.invoice_number || "",
          amount: invoice.amount ?? "",
          amount_due: invoice.amount_due ?? "",
          due_date: invoice.due_date || "",
          currency: invoice.currency || "",
          business_name: businessName || "",
          source: "cashflow",
        })
      );
    } catch {}

    router.push(
      `/whatsapp-campaign?${params.toString()}`
    );
  }

  /* ==========================================================
     OPEN EMAIL AI CAMPAIGN
     ========================================================== */

  function openEmailCampaign() {
    if (!ai?.reply) {
      setError(
        "There is no approved payment reminder to send."
      );
      return;
    }

    const invoice = ai.invoice || {};
    const message = String(ai.reply).trim();

    if (!invoice.customer_email) {
      setError(
        "This customer does not have an email address. Add the customer's email before opening the email campaign."
      );
      return;
    }

    const subject =
      `Payment reminder — Invoice ${invoice.invoice_number || ""}`.trim();

    const params = new URLSearchParams();

    params.set("source", "cashflow");
    params.set("message", message);
    params.set("email_message", message);
    params.set("body", message);
    params.set("subject", subject);
    params.set("customer_name", invoice.customer_name || "");
    params.set("customer_email", invoice.customer_email);
    params.set("to", invoice.customer_email);
    params.set("invoice_number", invoice.invoice_number || "");

    if (invoice.amount !== undefined && invoice.amount !== null) {
      params.set("amount", String(invoice.amount));
    }

    if (invoice.amount_due !== undefined && invoice.amount_due !== null) {
      params.set("amount_due", String(invoice.amount_due));
    }

    if (invoice.due_date) {
      params.set("due_date", String(invoice.due_date));
    }

    if (invoice.currency) {
      params.set("currency", String(invoice.currency));
    }

    if (businessName) {
      params.set("business_name", businessName);
    }

    try {
      sessionStorage.setItem(
        "sodah_cashflow_email_campaign",
        JSON.stringify({
          message,
          subject,
          customer_name: invoice.customer_name || "",
          customer_email: invoice.customer_email || "",
          invoice_number: invoice.invoice_number || "",
          amount: invoice.amount ?? "",
          amount_due: invoice.amount_due ?? "",
          due_date: invoice.due_date || "",
          currency: invoice.currency || "",
          business_name: businessName || "",
          source: "cashflow",
        })
      );
    } catch {}

    router.push(
      `/email-ai/new-campaign?${params.toString()}`
    );
  }

  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] p-8 text-white">
        Loading Cashflow...
      </main>
    );
  }

  const selectedCurrency =
    getCurrencyInfo(currency);

  /* ==========================================================
     PAGE
     ========================================================== */

  return (
    <main className="min-h-screen bg-[#050816] px-5 py-7 text-white md:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="mb-4 flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="text-sm font-black tracking-[.2em] text-emerald-300">
              SODAH CASHFLOW
            </div>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              Get control of money owed to you.
            </h1>

            <p className="mt-2 max-w-3xl text-slate-400">
              Upload invoices, scan paper documents,
              track outstanding payments and
              automatically identify overdue invoices.
            </p>
          </div>

          {/* ==================================================
              HEADER ACTIONS
          ================================================== */}

          <div className="flex flex-wrap items-center gap-2">

            {/* CURRENCY */}

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2">
              <span className="text-xs font-semibold text-slate-500">
                Currency
              </span>

              <select
                value={currency}
                onChange={(event) =>
                  changeCurrency(
                    event.target.value
                  )
                }
                className="cursor-pointer bg-transparent text-sm font-bold text-white outline-none"
              >
                {CURRENCY_OPTIONS.map(
                  (item) => (
                    <option
                      key={item.code}
                      value={item.code}
                      className="bg-[#0b1526] text-white"
                    >
                      {item.code}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* SCAN */}

            <button
              type="button"
              onClick={() =>
                scanRef.current?.click()
              }
              disabled={importing}
              className="flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera size={16} />
              Scan invoice
            </button>

            {/* UPLOAD */}

            <button
              type="button"
              onClick={() =>
                uploadRef.current?.click()
              }
              disabled={importing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={16} />
              Upload invoice
            </button>

            {/* SPREADSHEET */}

            <button
              type="button"
              onClick={() =>
                spreadsheetRef.current?.click()
              }
              disabled={importing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold transition hover:bg-white/[.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText size={16} />
              Import spreadsheet
            </button>

            {/* MANUAL */}

            <button
              type="button"
              onClick={() =>
                setShowAdd(true)
              }
              className="flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-200"
            >
              <Plus size={16} />
              Add invoice
            </button>

            {/* HIDDEN SCAN INPUT */}

            <input
              ref={scanRef}
              type="file"
              accept="image/*,application/pdf,.pdf,.doc,.docx"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  handleFile(file);
                }

                event.target.value =
                  "";
              }}
            />

            {/* HIDDEN GENERAL UPLOAD */}

            <input
              ref={uploadRef}
              type="file"
              accept="image/*,application/pdf,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              className="hidden"
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  handleFile(file);
                }

                event.target.value =
                  "";
              }}
            />

            {/* HIDDEN SPREADSHEET */}

            <input
              ref={spreadsheetRef}
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  handleFile(file);
                }

                event.target.value =
                  "";
              }}
            />
          </div>
        </div>

        {/* ====================================================
            ERROR / NOTICE
        ==================================================== */}

        {(error || notice) && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-400/20 bg-red-400/10 text-red-200"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {error || notice}
          </div>
        )}

        {/* ====================================================
            IMPORTING
        ==================================================== */}

        {importing && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 py-3 text-sm text-cyan-100">
            <Loader2
              size={17}
              className="animate-spin"
            />

            Reading the invoice/document and extracting
            customer, invoice, amount, outstanding balance
            and due date...
          </div>
        )}

        {/* ====================================================
            DROPZONE
        ==================================================== */}

        <section className="mt-6 rounded-3xl border border-dashed border-cyan-300/20 bg-cyan-300/[.025] p-5">
          <div
            onDragOver={(event) =>
              event.preventDefault()
            }
            onDrop={(event) => {
              event.preventDefault();

              const file =
                event.dataTransfer.files?.[0];

              if (file) {
                handleFile(file);
              }
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl px-5 py-7 text-center"
            onClick={() =>
              setShowDropzone(
                (current) =>
                  !current
              )
            }
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.05]">
              <FileUp
                size={22}
                className="text-cyan-300"
              />
            </div>

            <div className="mt-3 font-bold">
              Drop any invoice document here
            </div>

            <div className="mt-1 text-sm text-slate-500">
              Image, scanned PDF, Word, CSV or Excel.
              SODAH will read the document and load
              the invoice fields automatically.
            </div>

            {showDropzone && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs text-slate-400">
                Click to use the Upload Invoice picker.
              </div>
            )}
          </div>
        </section>

        {/* ====================================================
            STATS
        ==================================================== */}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Stat
            label="Outstanding"
            value={formatMoney(
              outstanding
            )}
          />

          <Stat
            label="Overdue"
            value={formatMoney(
              overdueTotal
            )}
            danger
          />

          <Stat
            label="Customers owing"
            value={
              new Set(
                unpaid.map(
                  (invoice) =>
                    invoice.customer_name
                )
              ).size
            }
          />

          <Stat
            label="Invoices"
            value={
              invoices.length
            }
          />
        </section>

        <div className="mt-3 text-xs text-slate-600">
          Display currency:{" "}
          {selectedCurrency.code}

          {rateDate
            ? ` • Rates dated ${rateDate}`
            : ""}
        </div>

        {/* ====================================================
            TABLE
        ==================================================== */}

        <section className="mt-4 rounded-3xl border border-white/10 bg-white/[.035] p-5 shadow-2xl">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-3.5 text-slate-500"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search customer, invoice, email or phone..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-white outline-none"
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="border-b border-white/10 text-slate-500">
                <tr>
                  <th className="p-3">
                    Customer
                  </th>

                  <th>
                    Invoice
                  </th>

                  <th>
                    Total
                  </th>

                  <th>
                    Outstanding
                  </th>

                  <th>
                    Due
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(
                  (invoice) => (
                    <tr
                      key={
                        invoice.id
                      }
                      className="border-b border-white/5"
                    >
                      <td className="p-3">
                        <div className="font-bold text-white">
                          {
                            invoice.customer_name
                          }
                        </div>

                        {invoice.customer_email && (
                          <div className="mt-1 text-xs text-slate-500">
                            {
                              invoice.customer_email
                            }
                          </div>
                        )}

                        {invoice.customer_phone && (
                          <div className="mt-1 text-xs text-slate-600">
                            {
                              invoice.customer_phone
                            }
                          </div>
                        )}
                      </td>

                      <td>
                        {
                          invoice.invoice_number
                        }
                      </td>

                      <td>
                        {formatMoney(
                          invoice.displayAmount
                        )}
                      </td>

                      <td className="font-bold">
                        {formatMoney(
                          invoice.displayDue
                        )}
                      </td>

                      <td>
                        {
                          invoice.due_date
                        }
                      </td>

                      <td
                        className={
                          invoice.status ===
                          "overdue"
                            ? "text-red-300"
                            : invoice.status ===
                              "paid"
                            ? "text-emerald-300"
                            : "text-slate-300"
                        }
                      >
                        {invoice.status ===
                        "paid"
                          ? "Paid"
                          : invoice.status ===
                            "overdue"
                          ? "Overdue"
                          : "Unpaid"}
                      </td>

                      <td>
                        <div className="flex gap-2">
                          {/* AI */}

                          <button
                            type="button"
                            onClick={() =>
                              generateAI(
                                invoice
                              )
                            }
                            className="flex items-center gap-1 rounded-lg border border-cyan-300/20 px-3 py-2 text-cyan-300 transition hover:bg-cyan-300/10"
                          >
                            <Sparkles
                              size={14}
                            />
                            AI
                          </button>

                          {/* PAID */}

                          {invoice.status !==
                            "paid" && (
                            <button
                              type="button"
                              onClick={() =>
                                markPaid(
                                  invoice
                                )
                              }
                              className="flex items-center gap-1 rounded-lg border border-emerald-300/20 px-3 py-2 text-emerald-300 transition hover:bg-emerald-300/10"
                            >
                              <CheckCircle2
                                size={14}
                              />
                              Paid
                            </button>
                          )}

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              deleteInvoice(
                                invoice
                              )
                            }
                            className="flex items-center gap-1 rounded-lg border border-red-300/20 px-3 py-2 text-red-300 transition hover:bg-red-300/10"
                          >
                            <Trash2
                              size={14}
                            />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {!filtered.length && (
              <div className="py-12 text-center text-slate-500">
                <FileText
                  size={28}
                  className="mx-auto mb-3 opacity-50"
                />

                No invoices found.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ======================================================
          ADD INVOICE MODAL
      ====================================================== */}

      {showAdd && (
        <Modal
          title="Add invoice"
          close={() =>
            setShowAdd(false)
          }
        >
          <form
            onSubmit={addInvoice}
            className="space-y-3"
          >
            <Field
              label="Customer name"
              value={
                form.customer_name
              }
              required
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  customer_name:
                    value,
                }))
              }
            />

            <Field
              label="Customer email"
              type="email"
              value={
                form.customer_email
              }
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  customer_email:
                    value,
                }))
              }
            />

            <Field
              label="Customer phone"
              value={
                form.customer_phone
              }
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  customer_phone:
                    value,
                }))
              }
            />

            <Field
              label="Invoice number"
              value={
                form.invoice_number
              }
              required
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  invoice_number:
                    value,
                }))
              }
            />

            <Field
              label="Invoice total"
              type="number"
              step="0.01"
              value={
                form.amount
              }
              required
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  amount: value,
                }))
              }
            />

            <Field
              label="Outstanding amount"
              type="number"
              step="0.01"
              value={
                form.amount_due
              }
              placeholder="Leave empty to use invoice total"
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  amount_due:
                    value,
                }))
              }
            />

            <Field
              label="Invoice date"
              type="date"
              value={
                form.invoice_date
              }
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  invoice_date:
                    value,
                }))
              }
            />

            <Field
              label="Due date"
              type="date"
              value={
                form.due_date
              }
              required
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  due_date:
                    value,
                }))
              }
            />

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                Invoice currency
              </label>

              <select
                value={
                  form.currency
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currency:
                      event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
              >
                {CURRENCY_OPTIONS.map(
                  (item) => (
                    <option
                      key={
                        item.code
                      }
                      value={
                        item.code
                      }
                    >
                      {item.name} (
                      {item.code})
                    </option>
                  )
                )}
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-300 py-3 font-black text-slate-950 transition hover:bg-emerald-200"
            >
              Save invoice
            </button>
          </form>
        </Modal>
      )}

      {/* ======================================================
          AI PAYMENT ASSISTANT
      ====================================================== */}

      {ai && (
        <Modal
          title="AI payment assistant"
          close={() =>
            setAi(null)
          }
          wide
        >
          {ai.loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2
                size={24}
                className="mx-auto mb-3 animate-spin"
              />

              Generating payment reminder...
            </div>
          ) : ai.error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
              {ai.error}
            </div>
          ) : (
            <div className="space-y-5">

              {/* =================================================
                  BUSINESS SIGNATURE
              ================================================= */}

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500">
                  Business name
                </label>

                <input
                  value={businessName || ""}
                  readOnly
                  placeholder="Business name from your Sodah business profile"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                />

                <p className="mt-2 text-xs text-slate-600">
                  Payment reminders use the actual business name saved in your Sodah business profile.
                </p>
              </div>

              {/* =================================================
                  APPROVED MESSAGE
              ================================================= */}

              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Payment reminder
                </div>

                <textarea
                  value={
                    ai.reply || ""
                  }
                  onChange={(event) =>
                    setAi(
                      (current) => ({
                        ...current,
                        reply:
                          event.target
                            .value,
                      })
                    )
                  }
                  rows={9}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-5 leading-7 text-white outline-none"
                />
              </div>

              {/* =================================================
                  ANALYSIS
              ================================================= */}

              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4 text-sm text-slate-400">
                {ai.analysis}
              </div>

              {/* =================================================
                  ACTION BUTTONS
              ================================================= */}

              <div className="grid gap-2 sm:grid-cols-2">

                {/* COPY MESSAGE */}

                <button
                  type="button"
                  onClick={
                    copyMessage
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 font-semibold transition hover:bg-white/[.05]"
                >
                  <Copy
                    size={16}
                  />
                  Copy message
                </button>

                {/* REGENERATE */}

                <button
                  type="button"
                  onClick={
                    regenerateAI
                  }
                  className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-300/10"
                >
                  <Sparkles
                    size={16}
                  />
                  Regenerate
                </button>

                {/* WHATSAPP CAMPAIGN */}
                <button
                  type="button"
                  onClick={openWhatsAppCampaign}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-300 py-3 font-black text-slate-950 transition hover:bg-emerald-200"
                >
                  <MessageCircle size={16} />
                  Send WhatsApp message
                </button>

                {/* EMAIL AI CAMPAIGN */}
                <button
                  type="button"
                  onClick={openEmailCampaign}
                  className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-300/10"
                >
                  <Mail size={16} />
                  Send direct email
                </button>
              </div>

              {/* =================================================
                  HELPER TEXT
              ================================================= */}

              <div className="text-xs leading-5 text-slate-600">
                <strong className="text-slate-500">
                  Send WhatsApp message
                </strong>{" "}
                opens the existing WhatsApp Campaign page with the exact approved payment reminder and customer details.

                <br />

                <strong className="text-slate-500">
                  Send direct email
                </strong>{" "}
                opens the existing Email AI campaign page with the exact approved reminder, recipient and subject already loaded.
              </div>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}

/* ============================================================
   FIELD
   ============================================================ */

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  step,
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      <input
        type={type}
        step={step}
        required={required}
        value={value}
        placeholder={
          placeholder || label
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
      />
    </div>
  );
}

/* ============================================================
   STAT
   ============================================================ */

function Stat({
  label,
  value,
  danger,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="text-sm text-slate-500">
        {label}
      </div>

      <div
        className={`mt-2 text-2xl font-black ${
          danger
            ? "text-red-300"
            : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   MODAL
   ============================================================ */

function Modal({
  title,
  close,
  children,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <div
        className={`w-full ${
          wide
            ? "max-w-3xl"
            : "max-w-lg"
        } max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0b1526] p-6 shadow-2xl`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">
            {title}
          </h2>

          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        <div className="mt-5">
          {children}
        </div>
      </div>
    </div>
  );
}