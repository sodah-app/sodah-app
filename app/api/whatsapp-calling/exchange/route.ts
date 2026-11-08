import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function adminDb() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error(
      "Supabase admin configuration is missing."
    );
  }

  return createSupabaseAdmin(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function authenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!token || !url || !anon) return null;

  const client = createSupabaseAdmin(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.getUser(token);
  return error ? null : data?.user || null;
}

function encryptionKey() {
  const raw =
    env("META_TOKEN_ENCRYPTION_KEY") ||
    env("SUPABASE_SERVICE_ROLE_KEY");

  return crypto
    .createHash("sha256")
    .update(raw)
    .digest();
}

function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    encryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

async function resolveBusiness(
  db: any,
  requestedBusinessId: string,
  userId: string
) {
  const first = await db
    .from("businesses")
    .select(
      "id,business_id,user_id,business_name"
    )
    .eq("id", requestedBusinessId)
    .maybeSingle();

  if (
    !first.error &&
    first.data &&
    String(first.data.user_id) ===
      String(userId)
  ) {
    return first.data;
  }

  const second = await db
    .from("businesses")
    .select(
      "id,business_id,user_id,business_name"
    )
    .eq(
      "business_id",
      requestedBusinessId
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!second.error && second.data) {
    return second.data;
  }

  return null;
}

async function discoverPhoneNumberId(
  wabaId: string,
  accessToken: string,
  graphVersion: string
) {
  if (!wabaId || !accessToken) return "";

  const url = new URL(
    `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(wabaId)}/phone_numbers`
  );
  url.searchParams.set("fields", "id,display_phone_number,verified_name,status");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.warn("[WhatsApp Calling] Phone discovery failed:", payload);
    return "";
  }

  const rows = Array.isArray(payload?.data) ? payload.data : [];
  if (rows.length === 1) return String(rows[0]?.id || "").trim();

  return "";
}

export async function POST(
  request: NextRequest
) {
  try {
    const user =
      await authenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const businessId = String(
      body?.businessId || ""
    ).trim();

    const wabaId = String(
      body?.wabaId || ""
    ).trim();

    const phoneNumberId = String(
      body?.phoneNumberId || ""
    ).trim();

    const code = String(
      body?.code || ""
    ).trim();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error: "businessId is required.",
        },
        { status: 400 }
      );
    }

    if (!wabaId && !phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meta did not return a WhatsApp account or phone number identifier.",
        },
        { status: 400 }
      );
    }

    const appId = env(
      "META_APP_ID"
    ) || env(
      "NEXT_PUBLIC_META_APP_ID"
    );

    const appSecret = env(
      "META_APP_SECRET"
    );

    const graphVersion =
      env("META_GRAPH_VERSION") ||
      env("NEXT_PUBLIC_META_GRAPH_VERSION") ||
      "v25.0";

    if (!appId || !appSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meta server credentials are not configured. Add META_APP_ID and META_APP_SECRET.",
        },
        { status: 500 }
      );
    }

    const db = adminDb();

    const business =
      await resolveBusiness(
        db,
        businessId,
        user.id
      );

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected business does not belong to the authenticated user.",
        },
        { status: 403 }
      );
    }

    /*
     * Embedded Signup returns a short-lived
     * authorization code. Exchange it immediately
     * on the server. Never put the app secret in
     * browser code.
     */
    let accessToken = "";

    if (code) {
      const tokenUrl = new URL(
        `https://graph.facebook.com/${graphVersion}/oauth/access_token`
      );

      tokenUrl.searchParams.set(
        "client_id",
        appId
      );
      tokenUrl.searchParams.set(
        "client_secret",
        appSecret
      );
      tokenUrl.searchParams.set(
        "code",
        code
      );

      const tokenResponse =
        await fetch(tokenUrl.toString(), {
          method: "GET",
          cache: "no-store",
        });

      const tokenData =
        await tokenResponse.json();

      if (
        !tokenResponse.ok ||
        !tokenData?.access_token
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              tokenData?.error?.message ||
              "Meta authorization-code exchange failed.",
            meta: tokenData?.error || null,
          },
          { status: 502 }
        );
      }

      accessToken =
        tokenData.access_token;
    }

    if (!phoneNumberId && wabaId && accessToken) {
      const discoveredPhoneNumberId = await discoverPhoneNumberId(
        wabaId,
        accessToken,
        graphVersion
      );

      if (discoveredPhoneNumberId) {
        // Keep the browser payload as the source when it exists; only fill a missing ID.
        // This is useful for the WhatsApp Business App onboarding completion event,
        // which can return the WABA ID without the phone number ID.
        (body as any).phoneNumberId = discoveredPhoneNumberId;
      }
    }

    const resolvedPhoneNumberId =
      phoneNumberId || String((body as any).phoneNumberId || "").trim();

    const encryptedToken =
      accessToken
        ? encryptToken(accessToken)
        : null;

    const { data, error } = await db
      .from(
        "whatsapp_calling_connections"
      )
      .upsert(
        {
          business_id:
            business.id,
          user_id:
            user.id,
          waba_id:
            wabaId || null,
          phone_number_id:
            resolvedPhoneNumberId || null,
          access_token_encrypted:
            encryptedToken,
          status:
            "connected",
          connected_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "business_id",
        }
      )
      .select(
        "id,business_id,waba_id,phone_number_id,status,connected_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Meta connection was received, but saving the connection failed.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      connection: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unexpected Meta connection error.",
      },
      { status: 500 }
    );
  }
}
