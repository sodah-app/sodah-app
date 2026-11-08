import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MEDIA_BUCKET =
  process.env.WHATSAPP_CAMPAIGN_MEDIA_BUCKET ||
  "campaign-media";

/* =========================================================
   AUTH
========================================================= */

async function getRequestSupabase(request) {
  try {
    const serverClient = await createServerClient();
    const serverAuth = await serverClient.auth.getUser();

    if (serverAuth?.data?.user) {
      return {
        supabase: serverClient,
        user: serverAuth.data.user,
      };
    }
  } catch (error) {
    console.error(
      "[Campaign History] Server auth check failed:",
      error
    );
  }

  const authorization =
    request.headers.get("authorization") || "";

  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    return {
      supabase: null,
      user: null,
    };
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return {
      supabase: null,
      user: null,
    };
  }

  const tokenClient = createSupabaseClient(
    url,
    anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const { data, error } =
    await tokenClient.auth.getUser();

  if (error || !data?.user) {
    return {
      supabase: null,
      user: null,
    };
  }

  return {
    supabase: tokenClient,
    user: data.user,
  };
}

/* =========================================================
   ADMIN CLIENT
   Used for campaign history because campaigns are saved
   using the service-role client.
========================================================= */

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase service-role configuration is missing."
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

/* =========================================================
   BUSINESS
========================================================= */

async function resolveBusiness(
  supabase,
  userId,
  requestedBusinessId = ""
) {
  const requestedId =
    String(requestedBusinessId || "").trim();

  let query = supabase
    .from("businesses")
    .select(
      [
        "business_id",
        "business_name",
        "whatsapp_connected",
        "ai_number",
        "created_at",
      ].join(",")
    )
    .eq("user_id", userId);

  if (requestedId) {
    query = query.eq(
      "business_id",
      requestedId
    );
  } else {
    query = query
      .order("created_at", {
        ascending: true,
      })
      .limit(20);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "[Campaign History] Business lookup failed:",
      error
    );

    throw new Error(
      "Unable to load your Sodah business."
    );
  }

  const businesses = data || [];

  if (requestedId) {
    return businesses[0] || null;
  }

  return (
    businesses.find(
      (item) =>
        item.whatsapp_connected === true
    ) ||
    businesses[0] ||
    null
  );
}

/* =========================================================
   CAMPAIGN COLUMNS
========================================================= */

const CAMPAIGN_COLUMNS = [
  "id",
  "user_id",
  "business_id",
  "campaign_name",
  "message",
  "message_type",
  "template",
  "tone",
  "contacts",
  "media",
  "schedule",
  "status",
  "created_at",
  "last_run_at",
  "next_run_at",
].join(",");

/* =========================================================
   HELPERS
========================================================= */

function normalizeStatus(status) {
  const value =
    String(status || "").toLowerCase();

  /*
   * Older/current campaign save logic may store
   * "completed" for an immediately sent campaign.
   *
   * The History UI expects "sent".
   */
  if (
    value === "completed" ||
    value === "complete"
  ) {
    return "sent";
  }

  return value || "unknown";
}

function normalizeCampaign(campaign) {
  if (!campaign) return null;

  return {
    ...campaign,

    /*
     * Make the History UI understand immediately
     * completed campaigns as "Sent".
     */
    status: normalizeStatus(campaign.status),

    /*
     * Keep contact_count available as a convenient
     * fallback for the frontend.
     */
    contact_count: Array.isArray(campaign.contacts)
      ? campaign.contacts.length
      : Number(campaign.contact_count || 0),
  };
}

/* =========================================================
   MEDIA URL
========================================================= */

async function addMediaUrl(
  admin,
  campaign
) {
  if (!campaign) return campaign;

  const media = campaign.media;

  if (!media || typeof media !== "object") {
    return campaign;
  }

  /*
   * If the saved media already has a URL,
   * keep it.
   */
  if (media.url) {
    return campaign;
  }

  const storagePath =
    media.storage_path ||
    media.path ||
    media.file_path ||
    "";

  if (!storagePath) {
    return campaign;
  }

  try {
    const { data, error } =
      await admin.storage
        .from(
          media.bucket ||
            MEDIA_BUCKET
        )
        .createSignedUrl(
          storagePath,
          60 * 60
        );

    if (error) {
      console.error(
        "[Campaign History] Media signed URL failed:",
        error
      );

      return campaign;
    }

    if (data?.signedUrl) {
      return {
        ...campaign,
        media: {
          ...media,
          url: data.signedUrl,
        },
      };
    }
  } catch (error) {
    console.error(
      "[Campaign History] Media URL error:",
      error
    );
  }

  return campaign;
}

/* =========================================================
   PREPARE CAMPAIGN
========================================================= */

async function prepareCampaign(
  admin,
  campaign
) {
  if (!campaign) return null;

  let result =
    normalizeCampaign(campaign);

  result =
    await addMediaUrl(
      admin,
      result
    );

  return result;
}

/* =========================================================
   GET
========================================================= */

export async function GET(request) {
  try {
    /* -----------------------------------------------------
       Authenticate the actual user first.
    ----------------------------------------------------- */

    const {
      supabase,
      user,
    } = await getRequestSupabase(
      request
    );

    if (!supabase || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    /* -----------------------------------------------------
       Request parameters
    ----------------------------------------------------- */

    const requestedBusinessId =
      String(
        request.nextUrl?.searchParams?.get(
          "businessId"
        ) ||
          request.nextUrl?.searchParams?.get(
            "business_id"
          ) ||
          ""
      ).trim();

    const campaignId =
      String(
        request.nextUrl?.searchParams?.get(
          "id"
        ) || ""
      ).trim();

    /* -----------------------------------------------------
       Resolve business using authenticated user
    ----------------------------------------------------- */

    const business =
      await resolveBusiness(
        supabase,
        user.id,
        requestedBusinessId
      );

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error: requestedBusinessId
            ? "The supplied business ID is not associated with this account."
            : "No business is associated with this account.",
        },
        {
          status: 404,
        }
      );
    }

    /* -----------------------------------------------------
       IMPORTANT:
       Read campaigns using service role.

       Campaign creation now uses the admin client, so
       history should not depend on whatsapp_campaigns
       SELECT RLS policies.
    ----------------------------------------------------- */

    const admin =
      getAdminClient();

    /* =====================================================
       SINGLE CAMPAIGN DETAILS
    ===================================================== */

    if (campaignId) {
      const {
        data: campaign,
        error,
      } = await admin
        .from("whatsapp_campaigns")
        .select(CAMPAIGN_COLUMNS)
        .eq("id", campaignId)
        .eq("user_id", user.id)
        .eq(
          "business_id",
          business.business_id
        )
        .maybeSingle();

      if (error) {
        console.error(
          "[Campaign History] Campaign detail lookup failed:",
          {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            campaignId,
            userId: user.id,
            businessId:
              business.business_id,
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to load campaign details.",
          },
          {
            status: 500,
          }
        );
      }

      if (!campaign) {
        return NextResponse.json(
          {
            success: false,
            error: "Campaign not found.",
          },
          {
            status: 404,
          }
        );
      }

      const preparedCampaign =
        await prepareCampaign(
          admin,
          campaign
        );

      return NextResponse.json({
        success: true,

        business: {
          business_id:
            business.business_id,
          business_name:
            business.business_name,
          whatsapp_connected:
            business.whatsapp_connected ===
            true,
          ai_number:
            business.ai_number ||
            null,
        },

        campaign:
          preparedCampaign,
      });
    }

    /* =====================================================
       CAMPAIGN LIST
    ===================================================== */

    const {
      data: campaigns,
      error,
    } = await admin
      .from("whatsapp_campaigns")
      .select(CAMPAIGN_COLUMNS)
      .eq("user_id", user.id)
      .eq(
        "business_id",
        business.business_id
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "[Campaign History] Campaign list lookup failed:",
        {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          userId: user.id,
          businessId:
            business.business_id,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load campaign history.",
        },
        {
          status: 500,
        }
      );
    }

    /* -----------------------------------------------------
       Prepare every campaign.

       This:
       - converts completed -> sent
       - provides contact_count
       - creates temporary signed image URLs
    ----------------------------------------------------- */

    const preparedCampaigns =
      await Promise.all(
        (campaigns || []).map(
          (campaign) =>
            prepareCampaign(
              admin,
              campaign
            )
        )
      );

    return NextResponse.json({
      success: true,

      business: {
        business_id:
          business.business_id,
        business_name:
          business.business_name,
        whatsapp_connected:
          business.whatsapp_connected ===
          true,
        ai_number:
          business.ai_number ||
          null,
      },

      campaigns:
        preparedCampaigns,
    });
  } catch (error) {
    console.error(
      "[Campaign History] GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load campaign history.",
      },
      {
        status: 500,
      }
    );
  }
}