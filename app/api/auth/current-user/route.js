import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL ||
  "solomondagbahz@gmail.com"
)
  .trim()
  .toLowerCase();

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.ADMIN_PASSWORD;

function verifySuperAdminSession(cookieValue) {
  if (!cookieValue || !SESSION_SECRET) {
    return null;
  }

  try {
    const separatorIndex = cookieValue.lastIndexOf(".");

    if (separatorIndex === -1) {
      return null;
    }

    const encodedSession =
      cookieValue.slice(0, separatorIndex);

    const signature =
      cookieValue.slice(separatorIndex + 1);

    if (!encodedSession || !signature) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedSession)
      .digest("base64url");

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer =
      Buffer.from(expectedSignature);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(
        actualBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const sessionJson = Buffer
      .from(encodedSession, "base64url")
      .toString("utf8");

    const session = JSON.parse(sessionJson);

    if (!session || typeof session !== "object") {
      return null;
    }

    const email = String(
      session.email || ""
    )
      .trim()
      .toLowerCase();

    const expiresAt =
      Number(session.expiresAt);

    if (!email || !Number.isFinite(expiresAt)) {
      return null;
    }

    if (Date.now() > expiresAt) {
      return null;
    }

    if (email !== SUPER_ADMIN_EMAIL) {
      return null;
    }

    if (session.isSuperAdmin !== true) {
      return null;
    }

    return {
      email,
      isSuperAdmin: true,
      expiresAt,
    };
  } catch (error) {
    console.error(
      "Super Admin session verification failed:",
      error
    );

    return null;
  }
}

async function getBusinessForSuperAdmin(email) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  try {
    const adminSupabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const { data, error } =
      await adminSupabase
        .from("businesses")
        .select(
          "id,business_id,user_id,business_name,email,full_name"
        )
        .eq("email", email)
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "Super Admin business lookup failed:",
        error
      );

      return null;
    }

    return data || null;
  } catch (error) {
    console.error(
      "Super Admin business lookup error:",
      error
    );

    return null;
  }
}

export async function GET() {
  try {
    /*
     * FIRST:
     * Check the secure Super Admin handoff session.
     *
     * This is the session created when the Super Admin
     * enters the main Sodah application from the Admin
     * Dashboard.
     */
    const { cookies } = await import("next/headers");

    const cookieStore = await cookies();

    const superAdminCookie =
      cookieStore.get(
        "sodahSuperAdminSession"
      )?.value;

    const superAdminSession =
      verifySuperAdminSession(
        superAdminCookie
      );

    if (superAdminSession) {
      const business =
        await getBusinessForSuperAdmin(
          superAdminSession.email
        );

      return NextResponse.json({
        authenticated: true,

        isSuperAdmin: true,

        user: {
          id: business?.user_id || null,
          email: superAdminSession.email,

          user_metadata: {
            full_name:
              business?.full_name ||
              business?.business_name ||
              "",
          },
        },

        profile: {
          id: business?.user_id || null,
          email: superAdminSession.email,
          fullName:
            business?.full_name ||
            business?.business_name ||
            "",
          phone: "",
          avatar: "",
        },

        business: business
          ? {
              id: business.id,
              business_id:
                business.business_id,
              business_name:
                business.business_name,
              user_id:
                business.user_id,
            }
          : null,

        access: {
          maintenanceBypass: true,
          subscriptionBypass: true,
          trialBypass: true,
          planBypass: true,
          featureBypass: true,
          channelBypass: true,
        },
      });
    }

    /*
     * NORMAL USER FLOW
     *
     * If there is no Super Admin session,
     * continue with normal Supabase authentication.
     */
    const {
      createClient: createSupabaseClient,
    } = await import("@/lib/supabase");

    const supabase =
      createSupabaseClient ||
      null;

    /*
     * Use the existing application Supabase client.
     */
    if (!supabase) {
      return NextResponse.json({
        authenticated: false,
        isSuperAdmin: false,
      });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({
        authenticated: false,
        isSuperAdmin: false,
      });
    }

    return NextResponse.json({
      authenticated: true,
      isSuperAdmin: false,

      user,

      profile: {
        id: user.id,
        email: user.email,
        fullName:
          user.user_metadata?.full_name ||
          "",
        phone:
          user.user_metadata?.phone ||
          "",
        avatar:
          user.user_metadata?.avatar_url ||
          "",
      },

      access: {
        maintenanceBypass: false,
        subscriptionBypass: false,
        trialBypass: false,
        planBypass: false,
        featureBypass: false,
        channelBypass: false,
      },
    });
  } catch (error) {
    console.error(
      "Current user API error:",
      error
    );

    return NextResponse.json(
      {
        authenticated: false,
        isSuperAdmin: false,
      },
      { status: 500 }
    );
  }
}