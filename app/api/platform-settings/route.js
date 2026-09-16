import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const SUPER_ADMIN_EMAIL =
  (
    process.env.SUPER_ADMIN_EMAIL ||
    "solomondagbahz@gmail.com"
  )
    .trim()
    .toLowerCase();

const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET?.trim();

function verifySuperAdminSession(token) {
  try {
    if (!token || !ADMIN_SESSION_SECRET) {
      return false;
    }

    const separator = token.lastIndexOf(".");
    if (separator <= 0) {
      return false;
    }

    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        ADMIN_SESSION_SECRET
      )
      .update(payload)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return false;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString(
        "utf8"
      )
    );

    if (
      !data ||
      data.isSuperAdmin !== true ||
      String(data.email || "")
        .trim()
        .toLowerCase() !== SUPER_ADMIN_EMAIL
    ) {
      return false;
    }

    if (
      data.expiresAt &&
      Date.now() > Number(data.expiresAt)
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "[Platform Settings] Super Admin verification failed:",
      error
    );

    return false;
  }
}

export async function GET(request) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase server configuration is missing.",
        },
        { status: 500 }
      );
    }

    /*
     * =========================================================
     * 1. AUTHENTICATE REQUEST
     * =========================================================
     */

    let authenticated = false;

    /*
     * SUPER ADMIN
     */

    const superAdminSession =
      request.cookies.get(
        "sodahSuperAdminSession"
      )?.value;

    if (
      verifySuperAdminSession(
        superAdminSession
      )
    ) {
      authenticated = true;
    }

    /*
     * NORMAL SODAH USER
     *
     * The channels page sends:
     *
     * Authorization: Bearer <supabase access token>
     */

    if (!authenticated) {
      const authorization =
        request.headers.get(
          "authorization"
        ) || "";

      const accessToken =
        authorization
          .replace(/^Bearer\s+/i, "")
          .trim();

      if (accessToken) {
        const supabaseAdmin =
          createSupabaseAdmin(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            }
          );

        const {
          data: { user },
          error: userError,
        } =
          await supabaseAdmin.auth.getUser(
            accessToken
          );

        if (!userError && user) {
          authenticated = true;
        }
      }
    }

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    /*
     * =========================================================
     * 2. READ SETTINGS WITH SERVICE ROLE
     * =========================================================
     */

    const supabaseAdmin =
      createSupabaseAdmin(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const {
      data: settings,
      error: settingsError,
    } = await supabaseAdmin
      .from("settings")
      .select(
        "maintenance_mode, notifications, maintenance_message, notification_message, updated_at"
      )
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "[Platform Settings] Database error:",
        settingsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to load platform settings.",
        },
        { status: 500 }
      );
    }

    /*
     * =========================================================
     * 3. RETURN SETTINGS
     * =========================================================
     */

    return NextResponse.json(
      {
        success: true,

        settings: {
          maintenance_mode: Boolean(
            settings?.maintenance_mode
          ),

          notifications: Boolean(
            settings?.notifications
          ),

          maintenance_message:
            settings?.maintenance_message ||
            "We are currently performing scheduled maintenance. Some services may be temporarily unavailable. Please check back shortly.",

          notification_message:
            settings?.notification_message ||
            "We have an important update for you. Please check this message for the latest information.",

          updated_at:
            settings?.updated_at || null,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "[Platform Settings] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load platform settings.",
      },
      { status: 500 }
    );
  }
}