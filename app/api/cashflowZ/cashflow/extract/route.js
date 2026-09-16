import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL =
  process.env.OPENAI_CASHFLOW_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-5.6-luna";

function getAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getUser(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const admin = getAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

function safeJson(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]);
    } catch {}
  }
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(raw.slice(first, last + 1));
    } catch {}
  }
  throw new Error("The AI could not return valid invoice data.");
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value).trim().replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!s) return null;
  const comma = s.lastIndexOf(",");
  const dot = s.lastIndexOf(".");
  if (comma > dot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso)
    return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(
      iso[3]
    ).padStart(2, "0")}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeResult(value) {
  const v = value || {};
  return {
    customer_name: String(
      v.customer_name || v.customer || v.client || v.company_name || ""
    ).trim(),
    customer_email: String(v.customer_email || v.email || "").trim() || null,
    customer_phone: String(v.customer_phone || v.phone || "").trim() || null,
    invoice_number: String(
      v.invoice_number || v.invoice || v.invoice_no || v.bill_number || ""
    ).trim(),
    invoice_date: normalizeDate(v.invoice_date || v.invoiceDate),
    due_date: normalizeDate(
      v.due_date || v.payment_due || v.payment_due_date || v.due
    ),
    amount: normalizeAmount(
      v.amount || v.total || v.total_amount || v.invoice_amount
    ),
    amount_due: normalizeAmount(
      v.amount_due || v.outstanding || v.balance_due || v.balance
    ),
    currency: String(v.currency || "AED").trim().toUpperCase(),
    payment_terms: String(v.payment_terms || "").trim() || null,
    vendor_name: String(v.vendor_name || v.supplier || "").trim() || null,
    po_number: String(v.po_number || v.purchase_order || "").trim() || null,
    notes: String(v.notes || "").trim() || null,
  };
}

export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice AI extraction is not configured. Add OPENAI_API_KEY to the server environment.",
        },
        { status: 500 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No invoice file was uploaded." },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { success: false, message: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Invoice files must be 25 MB or smaller." },
        { status: 400 }
      );
    }

    const mime = file.type || "application/octet-stream";
    const lowerName = file.name.toLowerCase();
    const isImage =
      IMAGE_TYPES.has(mime) ||
      /\.(png|jpe?g|webp|gif)$/i.test(lowerName);
    const isFile =
      FILE_TYPES.has(mime) ||
      /\.(pdf|doc|docx|xls|xlsx|csv|txt)$/i.test(lowerName);

    if (!isImage && !isFile) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unsupported invoice file. Use an image, PDF, Word document, CSV, Excel file, or text document.",
        },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    /*
     * OpenAI accepts uploaded files as multimodal inputs. We upload the
     * original file first so PDFs, Word files and spreadsheets do not need
     * to be converted by the browser. Images are sent as image inputs.
     */
    const upload = new FormData();
    upload.append(
      "file",
      new Blob([bytes], { type: mime }),
      file.name
    );
    upload.append("purpose", isImage ? "vision" : "user_data");

    const uploadResponse = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: upload,
      cache: "no-store",
    });

    const uploadText = await uploadResponse.text();
    let uploadData = {};
    try {
      uploadData = uploadText ? JSON.parse(uploadText) : {};
    } catch {}

    if (!uploadResponse.ok || !uploadData?.id) {
      throw new Error(
        uploadData?.error?.message ||
          `OpenAI file upload failed with HTTP ${uploadResponse.status}.`
      );
    }

    const fileId = uploadData.id;

    const extractionPrompt = `
You are SODAH Cashflow's invoice document extraction engine.

Read the supplied invoice/document/spreadsheet carefully. Extract the actual
invoice information. Do not invent values.

Return ONLY JSON with these keys:
customer_name, customer_email, customer_phone, invoice_number,
invoice_date, due_date, amount, amount_due, currency, payment_terms,
vendor_name, po_number, notes.

Rules:
- customer_name is the customer/client/buyer/debtor receiving the invoice.
- invoice_number must be the invoice identifier, not a purchase order number.
- amount is the full invoice total.
- amount_due is the unpaid/outstanding balance. If the document gives only
  the invoice total and no payment information, use the invoice total.
- If the invoice is fully paid, amount_due must be 0.
- Preserve the currency actually printed on the invoice. Use ISO codes such as
  AED, USD, SAR, EUR, GBP when possible.
- Convert dates to YYYY-MM-DD.
- Do not treat a phone number, tax number, VAT number, bank account number,
  TRN, or PO number as an invoice number.
- If a field is not present, return null.
- For a spreadsheet containing multiple invoices, return the first invoice
  only in this request. The UI can process spreadsheet rows separately.
`.trim();

    const content = [
      { type: "input_text", text: extractionPrompt },
      isImage
        ? {
            type: "input_image",
            file_id: fileId,
            detail: "high",
          }
        : {
            type: "input_file",
            file_id: fileId,
          },
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "cashflow_invoice",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                customer_name: { type: ["string", "null"] },
                customer_email: { type: ["string", "null"] },
                customer_phone: { type: ["string", "null"] },
                invoice_number: { type: ["string", "null"] },
                invoice_date: { type: ["string", "null"] },
                due_date: { type: ["string", "null"] },
                amount: { type: ["number", "null"] },
                amount_due: { type: ["number", "null"] },
                currency: { type: ["string", "null"] },
                payment_terms: { type: ["string", "null"] },
                vendor_name: { type: ["string", "null"] },
                po_number: { type: ["string", "null"] },
                notes: { type: ["string", "null"] },
              },
              required: [
                "customer_name",
                "customer_email",
                "customer_phone",
                "invoice_number",
                "invoice_date",
                "due_date",
                "amount",
                "amount_due",
                "currency",
                "payment_terms",
                "vendor_name",
                "po_number",
                "notes",
              ],
            },
          },
        },
        store: false,
      }),
      cache: "no-store",
    });

    const responseText = await response.text();
    let responseData = {};
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {}

    if (!response.ok) {
      throw new Error(
        responseData?.error?.message ||
          `OpenAI extraction failed with HTTP ${response.status}.`
      );
    }

    const outputText =
      responseData?.output_text ||
      responseData?.output
        ?.flatMap((item) => item?.content || [])
        ?.find((part) => part?.type === "output_text")?.text ||
      "";

    const extracted = normalizeResult(safeJson(outputText));

    if (!extracted.customer_name || !extracted.invoice_number || extracted.amount === null || !extracted.due_date) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The document was read, but the required invoice fields could not be identified. Please check that it contains the customer, invoice number, total/outstanding amount, and due date.",
          extracted,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      source_file_name: file.name,
      source_file_type: mime,
      raw_extraction: responseData,
      invoice: extracted,
    });
  } catch (error) {
    console.error("[Cashflow Extract ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to read this invoice document.",
      },
      { status: 500 }
    );
  }
}
