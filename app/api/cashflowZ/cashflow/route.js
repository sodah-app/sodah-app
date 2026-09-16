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
   ADMIN CLIENT
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
   AUTH
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
   UUID
   ============================================================ */

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

/* ============================================================
   BUSINESS RESOLUTION

   IMPORTANT:

   businesses.id
     = UUID
     = value stored in cashflow.business_id

   businesses.business_id
     = public Sodah ID such as BIZ-1788298699579
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
      requestedBusinessId ||
        ""
    ).trim();

  /*
   * First resolve the business belonging
   * to the authenticated user.
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
    byUserError
  ) {
    console.error(
      "[Cashflow Business]",
      byUserError
    );
  }

  if (byUser) {
    /*
     * If a requested business ID was supplied,
     * allow either:
     *
     * 1. Public BIZ-... ID
     * 2. Database UUID
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

  /* ============================================================
     METADATA FALLBACK
     ============================================================ */

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
     * Public Sodah ID
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
     * Database UUID
     */

    if (
      isUuid(
        metadataId
      )
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
   STATUS
   ============================================================ */

function calculateStatus(
  invoice
) {
  if (
    invoice.status ===
      "paid" ||
    invoice.status ===
      "cancelled"
  ) {
    return invoice.status;
  }

  const amountDue =
    Number(
      invoice.amount_due ??
        invoice.amount ??
        0
    );

  if (
    amountDue <= 0
  ) {
    return "paid";
  }

  if (
    invoice.due_date
  ) {
    const due =
      new Date(
        `${invoice.due_date}T23:59:59`
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
   GET
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
     * CRITICAL:
     *
     * cashflow.business_id is UUID.
     *
     * Therefore use:
     * business.id
     *
     * NOT:
     * business.business_id
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
   POST
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
        .catch(() => ({}));

    const business =
      await resolveBusiness(
        admin,
        user,
        body?.business_id
      );

    const amount =
      Number(
        body?.amount || 0
      );

    const amountDue =
      Number(
        body?.amount_due ??
          amount
      );

    const customerName =
      String(
        body?.customer_name ||
          ""
      ).trim();

    const invoiceNumber =
      String(
        body?.invoice_number ||
          ""
      ).trim();

    if (!customerName) {
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

    if (!invoiceNumber) {
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
        amount
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
        amountDue
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

    const status =
      calculateStatus({
        ...body,
        amount,
        amount_due:
          amountDue,
      });

    /*
     * IMPORTANT:
     *
     * source_type is intentionally normalized to
     * "manual" because your current database has
     * a source_type CHECK constraint and previous
     * "ai_document" inserts were rejected.
     *
     * source_file_name and raw_extraction still
     * preserve the document origin/data.
     */

    const record = {
      /*
       * UUID ONLY
       */
      business_id:
        business.id,

      user_id:
        business.user_id ||
        user.id,

      customer_name:
        customerName,

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
        invoiceNumber,

      invoice_date:
        body?.invoice_date ||
        null,

      due_date:
        body?.due_date ||
        null,

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
        null,

      vendor_name:
        body?.vendor_name ||
        null,

      po_number:
        body?.po_number ||
        null,

      status,

      /*
       * Safe value for the existing
       * source_type constraint.
       */
      source_type:
        "manual",

      source_file_name:
        body?.source_file_name ||
        null,

      raw_extraction:
        body?.raw_extraction ||
        null,
    };

    /* ========================================================
       DUPLICATE CHECK
       ======================================================== */

    const {
      data: existing,
      error:
        existingError,
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
          invoiceNumber
        )
        .limit(1)
        .maybeSingle();

    if (existingError) {
      console.error(
        "[Cashflow Duplicate Check]",
        existingError
      );
    }

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Invoice ${invoiceNumber} already exists in Cashflow.`,
        },
        {
          status: 409,
        }
      );
    }

    /* ========================================================
       INSERT
       ======================================================== */

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
      invoice: data,
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
   PATCH
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
        .catch(() => ({}));

    if (!body?.id) {
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

    const business =
      await resolveBusiness(
        admin,
        user,
        body.business_id
      );

    const updates = {};

    if (
      body.status !==
      undefined
    ) {
      updates.status =
        body.status;

      if (
        body.status ===
        "paid"
      ) {
        updates.amount_due =
          0;

        updates.paid_at =
          new Date().toISOString();
      }
    }

    if (
      body.amount_due !==
      undefined
    ) {
      const amountDue =
        Number(
          body.amount_due
        );

      if (
        !Number.isFinite(
          amountDue
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

      updates.amount_due =
        amountDue;
    }

    if (
      body.due_date !==
      undefined
    ) {
      updates.due_date =
        body.due_date;
    }

    if (
      !Object.keys(
        updates
      ).length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No invoice changes were provided.",
        },
        {
          status: 400,
        }
      );
    }

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
      invoice: data,
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

/* ============================================================
   DELETE
   ============================================================ */

export async function DELETE(
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
        .catch(() => ({}));

    if (!body?.id) {
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

    const business =
      await resolveBusiness(
        admin,
        user,
        body.business_id
      );

    /*
     * Delete ONLY from this authenticated
     * business.
     */

    const {
      data,
      error,
    } =
      await admin
        .from("cashflow")
        .delete()
        .eq(
          "id",
          body.id
        )
        .eq(
          "business_id",
          business.id
        )
        .select("id")
        .maybeSingle();

    if (error) {
      console.error(
        "[Cashflow DELETE]",
        error
      );

      return NextResponse.json(
        {
          success: false,
          message:
            error.message ||
            "Unable to delete invoice.",
        },
        {
          status: 500,
        }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invoice not found or does not belong to this business.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_id:
        data.id,
    });
  } catch (error) {
    console.error(
      "[Cashflow DELETE ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to delete invoice.",
      },
      {
        status: 500,
      }
    );
  }
}