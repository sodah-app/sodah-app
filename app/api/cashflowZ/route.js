import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   ENVIRONMENT
   ============================================================ */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

/* ============================================================
   SUPABASE ADMIN CLIENT
   ============================================================ */

function getAdmin() {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* ============================================================
   UUID HELPER
   ============================================================ */

function isUUID(value) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value).trim()
  );
}

/* ============================================================
   SAFE NUMBER
   Handles:
   1,250.00
   $1,250.00
   AED 1,250.00
   etc.
   ============================================================ */

function toNumber(value, fallback = 0) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : fallback;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : fallback;
}

/* ============================================================
   SAFE JSON
   raw_extraction is JSONB in Supabase.
   ============================================================ */

function normalizeRawExtraction(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return {};
  }

  if (
    typeof value === "object"
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return {
        raw_text: value,
      };
    }
  }

  return {};
}

/* ============================================================
   DATE NORMALIZER
   Supports common invoice date formats.
   ============================================================ */

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  /*
   * Already YYYY-MM-DD
   */
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {
    return text;
  }

  /*
   * DD/MM/YYYY
   */
  let match =
    text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

  if (match) {
    const day =
      String(match[1]).padStart(2, "0");

    const month =
      String(match[2]).padStart(2, "0");

    const year =
      match[3];

    return `${year}-${month}-${day}`;
  }

  /*
   * DD-MM-YYYY
   */
  match =
    text.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/
    );

  if (match) {
    const day =
      String(match[1]).padStart(2, "0");

    const month =
      String(match[2]).padStart(2, "0");

    const year =
      match[3];

    return `${year}-${month}-${day}`;
  }

  /*
   * Try native Date parsing.
   */
  const parsed =
    new Date(text);

  if (
    !Number.isNaN(
      parsed.getTime()
    )
  ) {
    return parsed
      .toISOString()
      .slice(0, 10);
  }

  return null;
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

async function getAuthenticatedUser(
  request
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const token =
    authorization
      .substring(7)
      .trim();

  if (!token) {
    return null;
  }

  const admin =
    getAdmin();

  const {
    data,
    error,
  } =
    await admin.auth.getUser(
      token
    );

  if (
    error ||
    !data?.user
  ) {
    console.error(
      "[Cashflow Auth]",
      error?.message
    );

    return null;
  }

  return data.user;
}

/* ============================================================
   BUSINESS RESOLUTION

   IMPORTANT:
   businesses.id
       = UUID database primary key

   businesses.business_id
       = public Sodah business ID
         e.g. BIZ-1788298699579

   cashflow.business_id
       = UUID

   Therefore cashflow must ALWAYS receive:
       business.id

   NEVER:
       business.business_id
   ============================================================ */

async function resolveBusiness(
  admin,
  user,
  requestedBusinessId
) {
  if (!user?.id) {
    throw new Error(
      "Unable to identify the authenticated user."
    );
  }

  const requested =
    String(
      requestedBusinessId || ""
    ).trim();

  /*
   * ----------------------------------------------------------
   * 1. Resolve directly through authenticated user.
   * ----------------------------------------------------------
   */

  const {
    data: byUser,
    error: byUserError,
  } =
    await admin
      .from("businesses")
      .select(
        "id,business_id,user_id,business_name"
      )
      .eq(
        "user_id",
        user.id
      )
      .limit(1)
      .maybeSingle();

  if (
    !byUserError &&
    byUser
  ) {
    /*
     * If a business was explicitly supplied,
     * accept either:
     *
     * BIZ-xxxxxxxx
     *
     * OR
     *
     * UUID database ID
     */
    if (requested) {
      const matchesPublicId =
        String(
          byUser.business_id ||
            ""
        ).trim() ===
        requested;

      const matchesDatabaseId =
        String(
          byUser.id ||
            ""
        ).trim() ===
        requested;

      if (
        !matchesPublicId &&
        !matchesDatabaseId
      ) {
        throw new Error(
          "This business does not belong to the authenticated account."
        );
      }
    }

    return byUser;
  }

  /*
   * ----------------------------------------------------------
   * 2. Metadata fallback
   * ----------------------------------------------------------
   */

  const metadataId =
    String(
      user?.user_metadata
        ?.business_id ||
        user?.app_metadata
          ?.business_id ||
        requested ||
        ""
    ).trim();

  if (metadataId) {
    /*
     * Try public BIZ ID first.
     */
    const {
      data: byPublicId,
    } =
      await admin
        .from("businesses")
        .select(
          "id,business_id,user_id,business_name"
        )
        .eq(
          "business_id",
          metadataId
        )
        .limit(1)
        .maybeSingle();

    if (
      byPublicId &&
      String(
        byPublicId.user_id
      ) ===
        String(user.id)
    ) {
      return byPublicId;
    }

    /*
     * Only query id when the value actually
     * looks like a UUID.
     *
     * This prevents:
     *
     * invalid input syntax for type uuid:
     * "BIZ-1788298699579"
     */
    if (
      isUUID(metadataId)
    ) {
      const {
        data: byDatabaseId,
      } =
        await admin
          .from("businesses")
          .select(
            "id,business_id,user_id,business_name"
          )
          .eq(
            "id",
            metadataId
          )
          .limit(1)
          .maybeSingle();

      if (
        byDatabaseId &&
        String(
          byDatabaseId.user_id
        ) ===
          String(user.id)
      ) {
        return byDatabaseId;
      }
    }
  }

  throw new Error(
    "Unable to resolve your Sodah business."
  );
}

/* ============================================================
   STATUS CALCULATION
   ============================================================ */

function calculateStatus(
  invoice
) {
  const explicitStatus =
    String(
      invoice?.status || ""
    )
      .trim()
      .toLowerCase();

  if (
    explicitStatus ===
      "cancelled" ||
    explicitStatus ===
      "paid"
  ) {
    return explicitStatus;
  }

  const amountDue =
    toNumber(
      invoice?.amount_due ??
        invoice?.outstanding ??
        invoice?.balance_due ??
        invoice?.amount ??
        0
    );

  /*
   * No outstanding amount means paid.
   */
  if (
    amountDue <= 0
  ) {
    return "paid";
  }

  const dueDate =
    normalizeDate(
      invoice?.due_date
    );

  if (dueDate) {
    const due =
      new Date(
        `${dueDate}T23:59:59`
      );

    if (
      !Number.isNaN(
        due.getTime()
      ) &&
      due < new Date()
    ) {
      return "overdue";
    }
  }

  return "unpaid";
}

/* ============================================================
   COMMON INVOICE RECORD BUILDER
   ============================================================ */

function buildInvoiceRecord(
  body,
  business,
  user
) {
  const amount =
    toNumber(
      body?.amount ??
        body?.total ??
        body?.invoice_total ??
        body?.grand_total ??
        0
    );

  const amountDue =
    toNumber(
      body?.amount_due ??
        body?.outstanding ??
        body?.balance_due ??
        amount
    );

  const status =
    calculateStatus({
      ...body,
      amount,
      amount_due:
        amountDue,
    });

  return {
    /*
     * CRITICAL:
     *
     * cashflow.business_id is UUID.
     *
     * Therefore use business.id.
     */
    business_id:
      business.id,

    user_id:
      business.user_id ||
      user.id,

    customer_name:
      String(
        body?.customer_name ||
          body?.customer ||
          body?.client_name ||
          body?.client ||
          ""
      ).trim(),

    customer_email:
      body?.customer_email
        ? String(
            body.customer_email
          ).trim()
        : null,

    customer_phone:
      body?.customer_phone
        ? String(
            body.customer_phone
          ).trim()
        : null,

    invoice_number:
      String(
        body?.invoice_number ||
          body?.invoice ||
          body?.invoice_no ||
          body?.invoice_number ||
          ""
      ).trim(),

    invoice_date:
      normalizeDate(
        body?.invoice_date ||
          body?.invoiceDate ||
          body?.date
      ),

    due_date:
      normalizeDate(
        body?.due_date ||
          body?.payment_due ||
          body?.dueDate
      ),

    amount,

    amount_due:
      amountDue,

    currency:
      String(
        body?.currency ||
          "AED"
      )
        .trim()
        .toUpperCase(),

    payment_terms:
      body?.payment_terms ||
      body?.terms ||
      null,

    vendor_name:
      body?.vendor_name ||
      body?.vendor ||
      null,

    po_number:
      body?.po_number ||
      body?.po ||
      null,

    status,

    source_type:
      String(
        body?.source_type ||
          "manual"
      ).trim(),

    source_file_name:
      body?.source_file_name ||
      body?.file_name ||
      null,

    source_file_type:
      body?.source_file_type ||
      body?.file_type ||
      null,

    raw_extraction:
      normalizeRawExtraction(
        body?.raw_extraction
      ),
  };
}

/* ============================================================
   GET CASHFLOW
   ============================================================ */

export async function GET(
  request
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your session has expired. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      getAdmin();

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const requestedBusinessId =
      String(
        searchParams.get(
          "businessId"
        ) || ""
      ).trim();

    const business =
      await resolveBusiness(
        admin,
        user,
        requestedBusinessId
      );

    /*
     * IMPORTANT:
     *
     * business.id is the UUID
     * stored in cashflow.business_id.
     */
    const {
      data,
      error,
    } =
      await admin
        .from("cashflow")
        .select("*")
        .eq(
          "business_id",
          business.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (error) {
      console.error(
        "[Cashflow GET]",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Unable to load Cashflow.",
        },
        {
          status: 500,
        }
      );
    }

    const invoices =
      (data || []).map(
        (invoice) => ({
          ...invoice,

          status:
            calculateStatus(
              invoice
            ),
        })
      );

    return NextResponse.json({
      success: true,

      business: {
        id:
          business.id,

        business_id:
          business.business_id,

        business_name:
          business.business_name,
      },

      invoices,
    });
  } catch (error) {
    console.error(
      "[Cashflow GET ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to load Cashflow.",
      },
      {
        status: 500,
      }
    );
  }
}

/* ============================================================
   POST INVOICE
   ============================================================ */

export async function POST(
  request
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your session has expired. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      getAdmin();

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );

    /*
     * Resolve business using either:
     *
     * body.business_id
     * BIZ-...
     * OR UUID
     */
    const business =
      await resolveBusiness(
        admin,
        user,
        body?.business_id
      );

    const record =
      buildInvoiceRecord(
        body,
        business,
        user
      );

    /*
     * Validation
     */
    if (
      !record.customer_name
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !record.invoice_number
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice number is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        record.amount
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice amount is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        record.amount_due
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Outstanding amount is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * DUPLICATE CHECK
     * --------------------------------------------------------
     *
     * Use UUID business.id here.
     */
    const {
      data: existing,
      error:
        duplicateCheckError,
    } =
      await admin
        .from("cashflow")
        .select("id")
        .eq(
          "business_id",
          business.id
        )
        .eq(
          "invoice_number",
          record.invoice_number
        )
        .limit(1)
        .maybeSingle();

    if (
      duplicateCheckError
    ) {
      console.error(
        "[Cashflow Duplicate Check]",
        duplicateCheckError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            duplicateCheckError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Invoice ${record.invoice_number} already exists in Cashflow.`,
          duplicate: true,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * INSERT
     * --------------------------------------------------------
     */

    const {
      data,
      error,
    } =
      await admin
        .from("cashflow")
        .insert(
          record
        )
        .select("*")
        .single();

    if (error) {
      console.error(
        "[Cashflow POST]",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Unable to save invoice.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      invoice: {
        ...data,

        status:
          calculateStatus(
            data
          ),
      },
    });
  } catch (error) {
    console.error(
      "[Cashflow POST ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to save invoice.",
      },
      {
        status: 500,
      }
    );
  }
}

/* ============================================================
   PATCH INVOICE
   ============================================================ */

export async function PATCH(
  request
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your session has expired.",
        },
        {
          status: 401,
        }
      );
    }

    const admin =
      getAdmin();

    const body =
      await request
        .json()
        .catch(
          () => ({})
        );

    if (
      !body?.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Invoice ID must be a UUID.
     */
    if (
      !isUUID(
        body.id
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid invoice ID.",
        },
        {
          status: 400,
        }
      );
    }

    const business =
      await resolveBusiness(
        admin,
        user,
        body?.business_id
      );

    const updates =
      {};

    /*
     * Status
     */
    if (
      body.status !==
      undefined
    ) {
      updates.status =
        String(
          body.status
        )
          .trim()
          .toLowerCase();

      if (
        updates.status ===
        "paid"
      ) {
        updates.amount_due =
          0;

        updates.paid_at =
          new Date()
            .toISOString();
      }
    }

    /*
     * Amount
     */
    if (
      body.amount !==
      undefined
    ) {
      updates.amount =
        toNumber(
          body.amount
        );
    }

    /*
     * Outstanding
     */
    if (
      body.amount_due !==
        undefined ||
      body.outstanding !==
        undefined
    ) {
      updates.amount_due =
        toNumber(
          body.amount_due ??
            body.outstanding
        );
    }

    /*
     * Due date
     */
    if (
      body.due_date !==
      undefined
    ) {
      updates.due_date =
        normalizeDate(
          body.due_date
        );
    }

    /*
     * Invoice date
     */
    if (
      body.invoice_date !==
      undefined
    ) {
      updates.invoice_date =
        normalizeDate(
          body.invoice_date
        );
    }

    /*
     * Customer information
     */
    if (
      body.customer_name !==
      undefined
    ) {
      updates.customer_name =
        String(
          body.customer_name
        ).trim();
    }

    if (
      body.customer_email !==
      undefined
    ) {
      updates.customer_email =
        body.customer_email
          ? String(
              body.customer_email
            ).trim()
          : null;
    }

    if (
      body.customer_phone !==
      undefined
    ) {
      updates.customer_phone =
        body.customer_phone
          ? String(
              body.customer_phone
            ).trim()
          : null;
    }

    /*
     * Payment terms
     */
    if (
      body.payment_terms !==
      undefined
    ) {
      updates.payment_terms =
        body.payment_terms ||
        null;
    }

    /*
     * Raw extraction
     */
    if (
      body.raw_extraction !==
      undefined
    ) {
      updates.raw_extraction =
        normalizeRawExtraction(
          body.raw_extraction
        );
    }

    /*
     * Source information
     */
    if (
      body.source_type !==
      undefined
    ) {
      updates.source_type =
        body.source_type ||
        "manual";
    }

    if (
      body.source_file_name !==
      undefined
    ) {
      updates.source_file_name =
        body.source_file_name ||
        null;
    }

    if (
      body.source_file_type !==
      undefined
    ) {
      updates.source_file_type =
        body.source_file_type ||
        null;
    }

    /*
     * Recalculate status when
     * amount/due date changes.
     */
    if (
      body.amount_due !==
        undefined ||
      body.outstanding !==
        undefined ||
      body.due_date !==
        undefined ||
      body.status ===
        undefined
    ) {
      const {
        data: current,
        error:
          currentError,
      } =
        await admin
          .from("cashflow")
          .select("*")
          .eq(
            "id",
            body.id
          )
          .eq(
            "business_id",
            business.id
          )
          .maybeSingle();

      if (
        currentError
      ) {
        throw currentError;
      }

      if (
        !current
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invoice not found.",
          },
          {
            status: 404,
          }
        );
      }

      const merged = {
        ...current,
        ...updates,
      };

      if (
        body.status ===
        undefined
      ) {
        updates.status =
          calculateStatus(
            merged
          );
      }
    }

    /*
     * Nothing to update.
     */
    if (
      Object.keys(
        updates
      ).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No invoice changes were supplied.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * UPDATE USING UUID BUSINESS ID
     * --------------------------------------------------------
     */

    const {
      data,
      error,
    } =
      await admin
        .from("cashflow")
        .update(
          updates
        )
        .eq(
          "id",
          body.id
        )
        .eq(
          "business_id",
          business.id
        )
        .select("*")
        .single();

    if (error) {
      console.error(
        "[Cashflow PATCH]",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Unable to update invoice.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      invoice: {
        ...data,

        status:
          calculateStatus(
            data
          ),
      },
    });
  } catch (error) {
    console.error(
      "[Cashflow PATCH ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to update invoice.",
      },
      {
        status: 500,
      }
    );
  }
}