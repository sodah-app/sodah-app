import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getAuthenticatedUser(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;

  const admin = getAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    console.error("[Cashflow Auth]", error?.message);
    return null;
  }
  return data.user;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveBusiness(admin, user, requestedBusinessId) {
  if (!user?.id) throw new Error("Unable to identify the authenticated user.");

  const requested = String(requestedBusinessId || "").trim();

  const { data: byUser, error: byUserError } = await admin
    .from("businesses")
    .select("id,business_id,user_id,business_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (byUserError) {
    console.error("[Cashflow business lookup]", byUserError);
  }

  if (byUser) {
    if (
      requested &&
      requested !== String(byUser.business_id || "").trim() &&
      requested !== String(byUser.id || "").trim()
    ) {
      throw new Error(
        "This business does not belong to the authenticated account."
      );
    }
    return byUser;
  }

  const metadataId = String(
    user?.user_metadata?.business_id ||
      user?.app_metadata?.business_id ||
      requested ||
      ""
  ).trim();

  if (metadataId) {
    const { data: byPublicId } = await admin
      .from("businesses")
      .select("id,business_id,user_id,business_name")
      .eq("business_id", metadataId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (byPublicId) return byPublicId;

    if (UUID_RE.test(metadataId)) {
      const { data: byDatabaseId } = await admin
        .from("businesses")
        .select("id,business_id,user_id,business_name")
        .eq("id", metadataId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (byDatabaseId) return byDatabaseId;
    }
  }

  throw new Error("Unable to resolve your Sodah business.");
}

function calculateStatus(invoice) {
  if (invoice.status === "cancelled") return "cancelled";
  if (invoice.status === "paid") return "paid";

  const amountDue = Number(invoice.amount_due ?? invoice.amount ?? 0);
  if (!Number.isFinite(amountDue) || amountDue <= 0) return "paid";

  if (invoice.due_date) {
    const end = new Date(`${invoice.due_date}T23:59:59`);
    if (!Number.isNaN(end.getTime()) && end < new Date()) return "overdue";
  }

  return "unpaid";
}

function cleanDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(
      iso[3]
    ).padStart(2, "0")}`;
  }
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function cleanNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  let text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return NaN;
  text = text.replace(/[^\d,.-]/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma > dot) text = text.replace(/\./g, "").replace(",", ".");
  else text = text.replace(/,/g, "");
  return Number(text);
}

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const admin = getAdmin();
    const { searchParams } = new URL(request.url);
    const requestedBusinessId = searchParams.get("businessId") || "";
    const business = await resolveBusiness(admin, user, requestedBusinessId);

    // cashflow.business_id is UUID. business.business_id is the public BIZ-... identifier.
    const { data, error } = await admin
      .from("cashflow")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const invoices = (data || []).map((invoice) => ({
      ...invoice,
      status: calculateStatus(invoice),
    }));

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("[Cashflow GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Unable to load Cashflow." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const admin = getAdmin();
    const body = await request.json().catch(() => ({}));
    const business = await resolveBusiness(admin, user, body?.business_id);

    const customerName = String(body?.customer_name || "").trim();
    const invoiceNumber = String(body?.invoice_number || "").trim();
    const amount = cleanNumber(body?.amount);
    const amountDueRaw =
      body?.amount_due === undefined || body?.amount_due === null
        ? amount
        : cleanNumber(body.amount_due);

    if (!customerName)
      return NextResponse.json({ success: false, message: "Customer name is required." }, { status: 400 });
    if (!invoiceNumber)
      return NextResponse.json({ success: false, message: "Invoice number is required." }, { status: 400 });
    if (!Number.isFinite(amount))
      return NextResponse.json({ success: false, message: "Invoice amount is invalid." }, { status: 400 });
    if (!Number.isFinite(amountDueRaw))
      return NextResponse.json({ success: false, message: "Outstanding amount is invalid." }, { status: 400 });

    const invoiceDate = cleanDate(body?.invoice_date);
    const dueDate = cleanDate(body?.due_date);
    const amountDue = Math.max(0, amountDueRaw);

    const status = calculateStatus({
      ...body,
      amount,
      amount_due: amountDue,
      due_date: dueDate,
    });

    const record = {
      // IMPORTANT: this is the UUID column, never the BIZ-... public identifier.
      business_id: business.id,
      user_id: business.user_id || user.id,
      customer_name: customerName,
      customer_email: body?.customer_email
        ? String(body.customer_email).trim()
        : null,
      customer_phone: body?.customer_phone
        ? String(body.customer_phone).trim()
        : null,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      amount,
      amount_due: amountDue,
      currency: String(body?.currency || "AED").trim().toUpperCase(),
      payment_terms: body?.payment_terms
        ? String(body.payment_terms).trim()
        : null,
      vendor_name: body?.vendor_name ? String(body.vendor_name).trim() : null,
      po_number: body?.po_number ? String(body.po_number).trim() : null,
      status,
      source_type: body?.source_type || "manual",
      source_file_name: body?.source_file_name
        ? String(body.source_file_name).trim()
        : null,
      raw_extraction: body?.raw_extraction || null,
    };

    const { data: existing, error: existingError } = await admin
      .from("cashflow")
      .select("id")
      .eq("business_id", business.id)
      .eq("invoice_number", invoiceNumber)
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `Invoice ${invoiceNumber} already exists in Cashflow.`,
        },
        { status: 409 }
      );
    }

    const { data, error } = await admin
      .from("cashflow")
      .insert(record)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      invoice: { ...data, status: calculateStatus(data) },
    });
  } catch (error) {
    console.error("[Cashflow POST ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Unable to save invoice." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Your session has expired." },
        { status: 401 }
      );
    }

    const admin = getAdmin();
    const body = await request.json().catch(() => ({}));
    if (!body?.id) {
      return NextResponse.json(
        { success: false, message: "Invoice ID is required." },
        { status: 400 }
      );
    }

    const business = await resolveBusiness(admin, user, body?.business_id);
    const updates = {};

    if (body.status !== undefined) {
      updates.status = String(body.status);
      if (body.status === "paid") {
        updates.amount_due = 0;
      }
    }

    if (body.amount_due !== undefined) {
      const n = cleanNumber(body.amount_due);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { success: false, message: "Outstanding amount is invalid." },
          { status: 400 }
        );
      }
      updates.amount_due = n;
    }

    if (body.due_date !== undefined) updates.due_date = cleanDate(body.due_date);

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { success: false, message: "No invoice changes were supplied." },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("cashflow")
      .update(updates)
      .eq("id", body.id)
      .eq("business_id", business.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      invoice: { ...data, status: calculateStatus(data) },
    });
  } catch (error) {
    console.error("[Cashflow PATCH ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Unable to update invoice." },
      { status: 500 }
    );
  }
}
