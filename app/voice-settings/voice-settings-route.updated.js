import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================================================
   DEFAULT VOICE SETTINGS
============================================================ */

const DEFAULTS = {
  voice_gender: "female",
  voice_accent: "american",
  voice_name: "coral",
};

const ALLOWED_GENDERS = new Set([
  "female",
  "male",
]);

const ALLOWED_ACCENTS = new Set([
  "american",
  "uk",
  "dubai",
  "african",
  "nigerian",
  "ghanaian",
]);

const VOICES = {
  female: "coral",
  male: "onyx",
};

/* ============================================================
   AUTHENTICATED USER
============================================================ */

async function resolveUser(supabase, request) {
  try {
    /*
     * First try the Authorization header.
     *
     * The Voice Settings page sends:
     *
     * Authorization: Bearer <supabase-access-token>
     */

    const authorization =
      request.headers.get("authorization") || "";

    const bearer = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (bearer) {
      const {
        data,
        error,
      } = await supabase.auth.getUser(bearer);

      if (!error && data?.user) {
        return data.user;
      }
    }

    /*
     * Fall back to the server-side Supabase cookie session.
     */

    const {
      data,
      error,
    } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error(
      "[Voice Settings] Authentication failed:",
      error
    );

    return null;
  }
}

/* ============================================================
   BUSINESS LOOKUP
============================================================ */

async function resolveBusiness(
  supabase,
  request,
  requestedBusinessId
) {
  const user = await resolveUser(
    supabase,
    request
  );

  if (!user) {
    return {
      user: null,
      business: null,
      error: "Unauthorized.",
    };
  }

  const cleanBusinessId =
    String(
      requestedBusinessId || ""
    ).trim();

  let business = null;
  let lookupError = null;

  /*
   * IMPORTANT:
   *
   * Do NOT select voice_gender / voice_accent here.
   *
   * Those columns may not exist yet in an older
   * production businesses table.
   *
   * Loading the basic business first prevents the entire
   * Voice Settings page from failing.
   */

  if (cleanBusinessId) {
    const result = await supabase
      .from("businesses")
      .select(
        [
          "id",
          "business_id",
          "user_id",
          "business_name",
          "whatsapp_connected",
          "subscription_plan",
          "subscription_status",
          "subscription_expiry",
        ].join(",")
      )
      .eq(
        "business_id",
        cleanBusinessId
      )
      .maybeSingle();

    business = result.data;
    lookupError = result.error;
  }

  /*
   * If business_id lookup did not find anything,
   * resolve the authenticated user's business.
   *
   * This follows the same business relationship used
   * elsewhere in Sodah.
   */

  if (!business && !lookupError && !cleanBusinessId) {
    const result = await supabase
      .from("businesses")
      .select(
        [
          "id",
          "business_id",
          "user_id",
          "business_name",
          "whatsapp_connected",
          "subscription_plan",
          "subscription_status",
          "subscription_expiry",
        ].join(",")
      )
      .eq(
        "user_id",
        user.id
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      )
      .limit(1)
      .maybeSingle();

    business = result.data;
    lookupError = result.error;
  }

  /*
   * Supabase query failed.
   */

  if (lookupError) {
    console.error(
      "[Voice Settings] Business lookup failed:",
      lookupError
    );

    return {
      user,
      business: null,
      error:
        lookupError.message ||
        "Unable to load your business.",
    };
  }

  /*
   * No business found.
   */

  if (!business) {
    return {
      user,
      business: null,
      error: "Business not found.",
    };
  }

  /*
   * SECURITY:
   *
   * If the business contains a user_id, make sure it belongs
   * to the authenticated user.
   *
   * Some older Sodah records may not have user_id populated,
   * so only enforce this when the value exists.
   */

  if (
    business.user_id &&
    String(business.user_id) !==
      String(user.id)
  ) {
    console.warn(
      "[Voice Settings] Business ownership mismatch:",
      {
        requestedBusinessId:
          cleanBusinessId,
        businessUserId:
          business.user_id,
        authenticatedUserId:
          user.id,
      }
    );

    return {
      user,
      business: null,
      error: "Business not found.",
    };
  }

  return {
    user,
    business,
    error: null,
  };
}

/* ============================================================
   LOAD OPTIONAL VOICE SETTINGS
============================================================ */

async function loadVoiceSettings(
  supabase,
  business
) {
  /*
   * The basic business record has already loaded.
   *
   * Voice columns are loaded separately so an older database
   * without these columns does not break the page.
   */

  try {
    const {
      data,
      error,
    } = await supabase
      .from("businesses")
      .select(
        "voice_gender,voice_accent,voice_name"
      )
      .eq(
        "id",
        business.id
      )
      .maybeSingle();

    if (!error && data) {
      return {
        voice_gender:
          data.voice_gender ||
          DEFAULTS.voice_gender,

        voice_accent:
          data.voice_accent ||
          DEFAULTS.voice_accent,

        voice_name:
          data.voice_name ||
          VOICES[
            data.voice_gender
          ] ||
          DEFAULTS.voice_name,
      };
    }

    /*
     * The voice columns probably do not exist yet.
     *
     * Do not break the Voice Settings page.
     */

    console.warn(
      "[Voice Settings] Voice columns are unavailable. Using defaults.",
      error?.message || ""
    );

    return {
      ...DEFAULTS,
    };
  } catch (error) {
    console.warn(
      "[Voice Settings] Optional voice settings lookup failed:",
      error?.message || error
    );

    return {
      ...DEFAULTS,
    };
  }
}

/* ============================================================
   SUBSCRIPTION ACCESS
============================================================ */

function normalizePlan(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getVoiceAccess(business) {
  const plan = normalizePlan(business?.subscription_plan);
  const status = String(business?.subscription_status || "")
    .trim()
    .toLowerCase();
  const expiryValue = business?.subscription_expiry;
  const expiryTime = expiryValue ? new Date(expiryValue).getTime() : null;
  const expiryValid = expiryTime === null || Number.isFinite(expiryTime);
  const notExpired = expiryTime === null || (Number.isFinite(expiryTime) && expiryTime > Date.now());
  const isBusinessPlan = plan === "business";
  const isActive = status === "active";
  const allowed = isBusinessPlan && isActive && expiryValid && notExpired;

  let reason = null;
  if (!isBusinessPlan) reason = "BUSINESS_PLAN_REQUIRED";
  else if (!isActive) reason = "SUBSCRIPTION_INACTIVE";
  else if (!expiryValid || !notExpired) reason = "SUBSCRIPTION_EXPIRED";

  return {
    allowed,
    reason,
    plan: business?.subscription_plan || "free_trial",
    status: business?.subscription_status || "inactive",
    expiry: expiryValue || null,
  };
}

/* ============================================================
   NORMALIZE SETTINGS
============================================================ */

function normalizeSettings(settings = {}) {
  const gender =
    ALLOWED_GENDERS.has(
      settings.voice_gender
    )
      ? settings.voice_gender
      : DEFAULTS.voice_gender;

  const rawAccent = String(settings.voice_accent || "").trim().toLowerCase();
  const normalizedAccent =
    rawAccent === "british" ||
    rawAccent === "uk / british" ||
    rawAccent === "uk/british"
      ? "uk"
      : rawAccent;

  const accent =
    ALLOWED_ACCENTS.has(normalizedAccent)
      ? normalizedAccent
      : DEFAULTS.voice_accent;

  return {
    voice_gender: gender,

    voice_accent: accent,

    voice_name:
      settings.voice_name ||
      VOICES[gender] ||
      DEFAULTS.voice_name,
  };
}

/* ============================================================
   UNAUTHORIZED RESPONSE
============================================================ */

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      code: "AUTH_REQUIRED",
      error:
        "Your session could not be verified. Please sign in again.",
    },
    {
      status: 401,
    }
  );
}

/* ============================================================
   GET VOICE SETTINGS
============================================================ */

export async function GET(request) {
  try {
    const supabase =
      await createClient();

    const requestedBusinessId =
      new URL(request.url)
        .searchParams
        .get("businessId")
        ?.trim() || "";

    const {
      business,
      error,
    } = await resolveBusiness(
      supabase,
      request,
      requestedBusinessId
    );

    if (error) {
      if (
        error ===
        "Unauthorized."
      ) {
        return unauthorizedResponse();
      }

      return NextResponse.json(
        {
          success: false,
          error,
        },
        {
          status:
            error ===
            "Business not found."
              ? 404
              : 500,
        }
      );
    }

    /*
     * WhatsApp connection status is available from the core
     * businesses columns.
     */

    const whatsappConnected =
      business.whatsapp_connected === true;

    /*
     * Voice settings are optional.
     */

    const rawSettings =
      await loadVoiceSettings(
        supabase,
        business
      );

    const settings =
      normalizeSettings(
        rawSettings
      );

    return NextResponse.json(
      {
        success: true,

        businessId:
          business.business_id,

        businessName:
          business.business_name ||
          "Your Business",

        whatsappConnected,

        subscription: getVoiceAccess(business),

        settings,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error(
      "[Voice Settings] GET failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to load voice settings.",
      },
      {
        status: 500,
      }
    );
  }
}

/* ============================================================
   PATCH VOICE SETTINGS
============================================================ */

export async function PATCH(request) {
  try {
    const supabase =
      await createClient();

    const body =
      await request
        .json()
        .catch(() => ({}));

    const requestedBusinessId =
      String(
        body.businessId || ""
      ).trim();

    const {
      business,
      error,
    } = await resolveBusiness(
      supabase,
      request,
      requestedBusinessId
    );

    if (error) {
      if (
        error ===
        "Unauthorized."
      ) {
        return unauthorizedResponse();
      }

      return NextResponse.json(
        {
          success: false,
          error,
        },
        {
          status:
            error ===
            "Business not found."
              ? 404
              : 500,
        }
      );
    }

    /*
     * Voice selection is restricted to an active Business plan.
     * This check is server-side and cannot be bypassed by the UI.
     */

    const voiceAccess = getVoiceAccess(business);

    if (!voiceAccess.allowed) {
      const isExpired = voiceAccess.reason === "SUBSCRIPTION_EXPIRED";
      return NextResponse.json(
        {
          success: false,
          code: voiceAccess.reason,
          subscription: voiceAccess,
          error: isExpired
            ? "Your subscription has expired. Renew your Business plan to change voice settings."
            : voiceAccess.reason === "SUBSCRIPTION_INACTIVE"
              ? "Your subscription is not active. Activate your Business plan to change voice settings."
              : "Voice selection is available only on an active Business plan. Please upgrade to Business.",
        },
        { status: 403 }
      );
    }

    /*
     * WhatsApp must also be connected before voice settings can be saved.
     */

    const whatsappConnected =
      business.whatsapp_connected === true;

    if (!whatsappConnected) {
      return NextResponse.json(
        {
          success: false,
          code:
            "WHATSAPP_NOT_CONNECTED",
          error:
            "Connect WhatsApp first before changing voice settings.",
        },
        {
          status: 409,
        }
      );
    }

    /* --------------------------------------------------------
       VALIDATE GENDER
    -------------------------------------------------------- */

    const gender =
      String(
        body.voice_gender || ""
      )
        .trim()
        .toLowerCase();

    if (
      !ALLOWED_GENDERS.has(
        gender
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid voice gender.",
        },
        {
          status: 400,
        }
      );
    }

    /* --------------------------------------------------------
       VALIDATE ACCENT
    -------------------------------------------------------- */

    const requestedAccent =
      String(
        body.voice_accent || ""
      )
        .trim()
        .toLowerCase();

    const accent =
      requestedAccent === "british" ||
      requestedAccent === "uk / british" ||
      requestedAccent === "uk/british"
        ? "uk"
        : requestedAccent;

    if (
      !ALLOWED_ACCENTS.has(
        accent
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid voice accent.",
        },
        {
          status: 400,
        }
      );
    }

    const voiceName =
      VOICES[gender];

    /* --------------------------------------------------------
       SAVE
    -------------------------------------------------------- */

    const {
      data,
      error: updateError,
    } = await supabase
      .from("businesses")
      .update({
        voice_gender:
          gender,

        voice_accent:
          accent,

        voice_name:
          voiceName,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        business.id
      )
      .select(
        [
          "business_id",
          "whatsapp_connected",
          "voice_gender",
          "voice_accent",
          "voice_name",
        ].join(",")
      )
      .single();

    if (updateError) {
      console.error(
        "[Voice Settings] Update failed:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,

          code:
            "VOICE_COLUMNS_REQUIRED",

          error:
            "The Voice Settings database fields are not installed yet. Run the supplied Supabase voice-settings migration.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        businessId:
          data.business_id,

        whatsappConnected:
          data.whatsapp_connected ===
          true,

        subscription: voiceAccess,

        settings:
          normalizeSettings(
            data
          ),
      }
    );
  } catch (error) {
    console.error(
      "[Voice Settings] PATCH failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to save voice settings.",
      },
      {
        status: 500,
      }
    );
  }
}