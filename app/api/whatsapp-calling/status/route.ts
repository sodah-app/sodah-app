import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   ENVIRONMENT
============================================================ */

function env(name: string) {
  return process.env[name]?.trim() || "";
}

/* ============================================================
   BUSINESS TYPE
============================================================ */

type BusinessRecord = {
  id: string;
  user_id: string;
};

/* ============================================================
   WHATSAPP CALLING CONNECTION TYPE
============================================================ */

type CallingConnection = {
  id: string;
  business_id: string;
  waba_id: string | null;
  phone_number_id: string | null;
  status: string | null;
  connected_at: string | null;
  updated_at: string | null;
};

/* ============================================================
   SUPABASE ADMIN CLIENT
============================================================ */

function adminDb() {
  const url =
    env("NEXT_PUBLIC_SUPABASE_URL");

  const serviceRoleKey =
    env("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin configuration is missing."
    );
  }

  return createSupabaseClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* ============================================================
   AUTHENTICATE USER

   The WhatsApp Calling page sends:

   Authorization: Bearer <supabase-access-token>

   We validate that token against Supabase.
============================================================ */

async function authenticatedUser(
  request: NextRequest
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
      .slice(7)
      .trim();

  const url =
    env(
      "NEXT_PUBLIC_SUPABASE_URL"
    );

  const anonKey =
    env(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );

  if (
    !token ||
    !url ||
    !anonKey
  ) {
    return null;
  }

  try {
    const client =
      createSupabaseClient(
        url,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },

          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const {
      data,
      error,
    } =
      await client.auth.getUser(
        token
      );

    if (error) {
      console.error(
        "[WhatsApp Calling] Supabase user validation failed:",
        error.message
      );

      return null;
    }

    return data?.user || null;
  } catch (error: any) {
    console.error(
      "[WhatsApp Calling] Authentication exception:",
      error?.message || error
    );

    return null;
  }
}

/* ============================================================
   GET CALLING CONNECTION STATUS
============================================================ */

export async function GET(
  request: NextRequest
) {
  try {
    /* --------------------------------------------------------
       1. AUTHENTICATE
    -------------------------------------------------------- */

    const user =
      await authenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "AUTH_REQUIRED",
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    /* --------------------------------------------------------
       2. BUSINESS ID
    -------------------------------------------------------- */

    const businessId =
      request.nextUrl.searchParams
        .get("businessId")
        ?.trim() || "";

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "businessId is required.",
        },
        {
          status: 400,
        }
      );
    }

    /* --------------------------------------------------------
       3. DATABASE
    -------------------------------------------------------- */

    const db = adminDb();

    /*
     * IMPORTANT:
     *
     * Explicitly tell TypeScript that business can be:
     *
     * BusinessRecord
     *
     * OR
     *
     * null.
     */

    let business:
      | BusinessRecord
      | null = null;

    /* --------------------------------------------------------
       4. TRY INTERNAL DATABASE ID
    -------------------------------------------------------- */

    const byId =
      await db
        .from("businesses")
        .select(
          "id,user_id"
        )
        .eq(
          "id",
          businessId
        )
        .maybeSingle();

    if (
      !byId.error &&
      byId.data &&
      String(
        byId.data.user_id
      ) ===
        String(user.id)
    ) {
      business = {
        id: String(
          byId.data.id
        ),

        user_id: String(
          byId.data.user_id
        ),
      };
    }

    /* --------------------------------------------------------
       5. TRY PUBLIC BUSINESS ID

       Example:

       BIZ-1788298699579
    -------------------------------------------------------- */

    if (!business) {
      const byBusinessId =
        await db
          .from("businesses")
          .select(
            "id,user_id"
          )
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (
        !byBusinessId.error &&
        byBusinessId.data
      ) {
        business = {
          id: String(
            byBusinessId.data.id
          ),

          user_id: String(
            byBusinessId.data.user_id
          ),
        };
      }
    }

    /* --------------------------------------------------------
       6. BUSINESS NOT FOUND
    -------------------------------------------------------- */

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business not found for this user.",
        },
        {
          status: 404,
        }
      );
    }

    /* --------------------------------------------------------
       7. LOAD CALLING CONNECTION

       The project does not currently have generated
       Supabase database types for the new calling table.

       Therefore we explicitly type the successful result
       here so TypeScript knows that `data` contains:

       id
       business_id
       waba_id
       phone_number_id
       status
       connected_at
       updated_at
    -------------------------------------------------------- */

    const connectionQuery =
      db
        .from(
          "whatsapp_calling_connections"
        )
        .select(
          [
            "id",
            "business_id",
            "waba_id",
            "phone_number_id",
            "status",
            "connected_at",
            "updated_at",
          ].join(",")
        )
        .eq(
          "business_id",
          business.id
        )
        .maybeSingle();

    const connectionResult =
      (await connectionQuery) as unknown as {
        data:
          | CallingConnection
          | null;

        error:
          | {
              message: string;
              code?: string;
              details?: string;
              hint?: string;
            }
          | null;
      };

    /* --------------------------------------------------------
       8. DATABASE ERROR
    -------------------------------------------------------- */

    if (
      connectionResult.error
    ) {
      console.error(
        "[WhatsApp Calling] Connection lookup failed:",
        connectionResult.error
      );

      return NextResponse.json(
        {
          success: false,

          error:
            connectionResult.error
              .message,

          code:
            connectionResult.error
              .code || null,

          details:
            connectionResult.error
              .details || null,

          hint:
            connectionResult.error
              .hint || null,
        },
        {
          status: 500,
        }
      );
    }

    /* --------------------------------------------------------
       9. NORMALIZE CONNECTION
    -------------------------------------------------------- */

    const connection =
      connectionResult.data;

    /* --------------------------------------------------------
       10. SUCCESS
    -------------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        connected:
          connection?.status ===
          "connected",

        connection:
          connection || null,

        businessId:
          business.id,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",

          Pragma:
            "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "[WhatsApp Calling] Status route failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to load WhatsApp Calling status.",
      },
      {
        status: 500,
      }
    );
  }
}