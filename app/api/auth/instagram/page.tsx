import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/*
 * =============================================================
 * INSTAGRAM BUSINESS LOGIN
 * =============================================================
 *
 * FLOW:
 *
 * Sodah /instagram/login
 *        ↓
 * Instagram official login
 *        ↓
 * User enters Instagram credentials
 *        ↓
 * User authorizes Sodah
 *        ↓
 * Instagram redirects to INSTAGRAM_REDIRECT_URI
 *        ↓
 * Sodah callback processes the authorization code
 *
 * IMPORTANT:
 *
 * This page does NOT redirect to Sodah's login page.
 *
 * Instagram authentication happens directly on Instagram.
 *
 * Sodah never receives the Instagram password.
 */

const INSTAGRAM_AUTHORIZE_URL =
  "https://www.instagram.com/oauth/authorize";

/*
 * Instagram Business Login permissions.
 */
const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
].join(",");

/*
 * =============================================================
 * BASE64URL ENCODE
 * =============================================================
 */

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/*
 * =============================================================
 * HMAC SIGNATURE
 * =============================================================
 */

async function createSignature(
  value: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signatureBuffer =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(value)
    );

  return Buffer.from(signatureBuffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

/*
 * =============================================================
 * SIGNED OAUTH STATE
 * =============================================================
 *
 * The state protects the OAuth flow against CSRF.
 *
 * If a Sodah user session exists, we include the user ID.
 *
 * If the session is not available, we DO NOT redirect the user
 * to Sodah login.
 *
 * Instead, the callback can resolve the Sodah session after
 * Instagram returns the user.
 */

async function createSignedState(
  payload: {
    userId: string;
    businessId: string;
    businessPublicId: string;
    requestedBusinessId?: string | null;
  },
  secret: string
): Promise<string> {
  const statePayload = {
    userId: payload.userId,
    businessId: payload.businessId,
    businessPublicId: payload.businessPublicId,
    requestedBusinessId:
      payload.requestedBusinessId || null,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  };

  const encodedPayload =
    base64UrlEncode(
      JSON.stringify(statePayload)
    );

  const signature =
    await createSignature(
      encodedPayload,
      secret
    );

  return `${encodedPayload}.${signature}`;
}

/*
 * =============================================================
 * PAGE
 * =============================================================
 */

export default async function InstagramLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    businessId?: string | string[];
  }>;
}) {
  /*
   * ---------------------------------------------------------
   * SERVER CONFIGURATION
   * ---------------------------------------------------------
   */

  const instagramAppId =
    process.env.INSTAGRAM_APP_ID?.trim();

  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI?.trim();

  const stateSecret =
    process.env.INSTAGRAM_STATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  /*
   * ---------------------------------------------------------
   * CONFIGURATION CHECK
   * ---------------------------------------------------------
   */

  if (
    !instagramAppId ||
    !redirectUri ||
    !stateSecret
  ) {
    console.error(
      "[Instagram Login] Missing Instagram OAuth configuration.",
      {
        hasAppId:
          Boolean(instagramAppId),

        hasRedirectUri:
          Boolean(redirectUri),

        hasStateSecret:
          Boolean(stateSecret),
      }
    );

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
          padding: "24px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            border:
              "1px solid rgba(255,255,255,0.10)",
            borderRadius: "28px",
            background:
              "rgba(15, 23, 42, 0.88)",
            boxShadow:
              "0 25px 80px rgba(0,0,0,0.40)",
            padding: "40px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            Instagram
          </h1>

          <p
            style={{
              marginTop: "16px",
              color: "#fca5a5",
              lineHeight: 1.6,
            }}
          >
            Instagram OAuth is not configured
            correctly on this server.
          </p>
        </div>
      </main>
    );
  }

  /*
   * ---------------------------------------------------------
   * RESOLVE THE AUTHENTICATED SODAH USER
   * ---------------------------------------------------------
   *
   * The browser does not need to be the source of truth for
   * the tenant. We first identify the authenticated Sodah user
   * from the existing Supabase session.
   */

  let sodahUserId: string | null = null;

  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(
        "[Instagram Login] Sodah session unavailable:",
        authError.message
      );
    }

    if (user?.id) {
      sodahUserId = user.id;
    }
  } catch (error) {
    console.error(
      "[Instagram Login] Could not read Sodah session:",
      error
    );
  }

  /*
   * Instagram OAuth must be tenant-bound.
   *
   * If there is no authenticated Sodah user, do not create an
   * incomplete OAuth state. The callback requires a real userId
   * and businessId.
   */
  /*
   * Do not replace the Instagram login screen with a generic
   * error page when the server cannot read the Sodah session.
   *
   * Channels already supplies the tenant businessId. We will
   * resolve that business below and use its owner user_id for
   * the signed OAuth state. If a server session is available,
   * it is still preferred and used for the ownership check.
   */
  if (!sodahUserId) {
    console.warn(
      "[Instagram Login] No server-side Sodah session cookie detected. Resolving tenant from businessId."
    );
  }

  /*
   * ---------------------------------------------------------
   * RESOLVE THE EXACT BUSINESS FOR THIS USER
   * ---------------------------------------------------------
   */

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[Instagram Login] Missing Supabase admin configuration."
    );

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
          padding: "24px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            border:
              "1px solid rgba(255,255,255,0.10)",
            borderRadius: "28px",
            background:
              "rgba(15, 23, 42, 0.88)",
            padding: "40px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            Instagram
          </h1>

          <p
            style={{
              marginTop: "16px",
              color: "#fca5a5",
              lineHeight: 1.6,
            }}
          >
            Instagram connection is temporarily unavailable.
            Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const supabaseAdmin =
    createSupabaseAdmin(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  const resolvedSearchParams =
    searchParams
      ? await searchParams
      : {};

  const requestedBusinessIdRaw =
    resolvedSearchParams?.businessId;

  const requestedBusinessId =
    Array.isArray(requestedBusinessIdRaw)
      ? requestedBusinessIdRaw[0]?.trim()
      : requestedBusinessIdRaw?.trim();

  let businessQuery =
    supabaseAdmin
      .from("businesses")
      .select(
        "id, business_id, user_id"
      );

  /*
   * Prefer the authenticated user's business when the server
   * session is available. Otherwise use the businessId carried
   * from Channels to resolve the same tenant.
   */
  if (sodahUserId) {
    businessQuery =
      businessQuery.eq(
        "user_id",
        sodahUserId
      );

    if (requestedBusinessId) {
      businessQuery =
        businessQuery.or(
          `business_id.eq.${requestedBusinessId},id.eq.${requestedBusinessId}`
        );
    }
  } else if (requestedBusinessId) {
    businessQuery =
      businessQuery.or(
        `business_id.eq.${requestedBusinessId},id.eq.${requestedBusinessId}`
      );
  } else {
    console.error(
      "[Instagram Login] No session and no businessId were supplied."
    );
  }

  const {
    data: business,
    error: businessError,
  } = await businessQuery
    .limit(1)
    .maybeSingle();

  if (businessError) {
    console.error(
      "[Instagram Login] Business lookup failed:",
      businessError
    );

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
          padding: "24px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            border:
              "1px solid rgba(255,255,255,0.10)",
            borderRadius: "28px",
            background:
              "rgba(15, 23, 42, 0.88)",
            padding: "40px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            Instagram
          </h1>

          <p
            style={{
              marginTop: "16px",
              color: "#fca5a5",
              lineHeight: 1.6,
            }}
          >
            Sodah could not identify your business.
            Please return to Channels and try again.
          </p>
        </div>
      </main>
    );
  }

  if (!business) {
    console.error(
      "[Instagram Login] No business found for authenticated user.",
      {
        userId: sodahUserId,
        requestedBusinessId:
          requestedBusinessId || null,
      }
    );

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
          padding: "24px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            border:
              "1px solid rgba(255,255,255,0.10)",
            borderRadius: "28px",
            background:
              "rgba(15, 23, 42, 0.88)",
            padding: "40px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            Instagram
          </h1>

          <p
            style={{
              marginTop: "16px",
              color: "#fca5a5",
              lineHeight: 1.6,
            }}
          >
            No Sodah business could be found for this account.
            Please return to Channels and try again.
          </p>
        </div>
      </main>
    );
  }

  /*
   * If the server session was unavailable, the business row
   * supplies the owning Sodah user ID for the tenant-bound
   * OAuth state.
   */
  if (!sodahUserId) {
    sodahUserId =
      String(business.user_id);
  }

  if (
    String(business.user_id) !==
    String(sodahUserId)
  ) {
    console.error(
      "[Instagram Login] SECURITY FAILURE: business does not belong to authenticated user.",
      {
        businessId: business.id,
        businessPublicId:
          business.business_id,
        businessUserId:
          business.user_id,
        authenticatedUserId:
          sodahUserId,
      }
    );

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
          padding: "24px",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            border:
              "1px solid rgba(255,255,255,0.10)",
            borderRadius: "28px",
            background:
              "rgba(15, 23, 42, 0.88)",
            padding: "40px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            Instagram
          </h1>

          <p
            style={{
              marginTop: "16px",
              color: "#fca5a5",
              lineHeight: 1.6,
            }}
          >
            This business is not available to the
            authenticated Sodah account.
          </p>
        </div>
      </main>
    );
  }

  const businessId =
    String(business.id);

  const businessPublicId =
    String(
      business.business_id ||
        business.id
    );

  console.log(
    "[Instagram Login] Tenant resolved successfully:",
    {
      userId: sodahUserId,
      businessId,
      businessPublicId,
      requestedBusinessId:
        requestedBusinessId || null,
    }
  );

  /*
   * ---------------------------------------------------------
   * CREATE COMPLETE TENANT-BOUND SIGNED STATE
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * The callback expects userId + businessId + timestamp.
   * This state now contains all of them.
   */

  const state =
    await createSignedState(
      {
        userId:
          sodahUserId,
        businessId,
        businessPublicId,
        requestedBusinessId:
          requestedBusinessId || null,
      },
      stateSecret
    );

  /*
   * ---------------------------------------------------------
   * BUILD INSTAGRAM AUTHORIZATION URL
   * ---------------------------------------------------------
   */

  const instagramUrl =
    new URL(
      INSTAGRAM_AUTHORIZE_URL
    );

  /*
   * Instagram App ID
   */
  instagramUrl.searchParams.set(
    "client_id",
    instagramAppId
  );

  /*
   * OAuth callback.
   *
   * This MUST exactly match the redirect URI configured
   * in Meta / Instagram.
   */
  instagramUrl.searchParams.set(
    "redirect_uri",
    redirectUri
  );

  /*
   * Authorization-code flow.
   */
  instagramUrl.searchParams.set(
    "response_type",
    "code"
  );

  /*
   * Instagram permissions.
   */
  instagramUrl.searchParams.set(
    "scope",
    INSTAGRAM_SCOPES
  );

  /*
   * Signed state.
   */
  instagramUrl.searchParams.set(
    "state",
    state
  );

  /*
   * Force Instagram to show authentication/authorization
   * instead of silently reusing the existing Instagram
   * authorization session.
   */
  instagramUrl.searchParams.set(
    "force_reauth",
    "true"
  );

  /*
   * Keep authentication on Instagram rather than intentionally
   * falling back to Facebook login.
   */
  instagramUrl.searchParams.set(
    "enable_fb_login",
    "0"
  );

  const authorizationUrl =
    instagramUrl.toString();

  console.log(
    "[Instagram Login] Authorization URL prepared.",
    {
      hasSodahUser:
        Boolean(sodahUserId),

      businessId,

      businessPublicId,

      requestedBusinessId:
        requestedBusinessId || null,

      redirectUri,

      scopes:
        INSTAGRAM_SCOPES,
    }
  );

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #06120f 0%, #0b171d 50%, #111827 100%)",
        padding: "24px",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          border:
            "1px solid rgba(255,255,255,0.10)",
          borderRadius: "28px",
          background:
            "rgba(15, 23, 42, 0.88)",
          boxShadow:
            "0 25px 80px rgba(0,0,0,0.40)",
          padding: "40px",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Back */}
        <a
          href={
            businessPublicId
              ? `/channels?businessId=${encodeURIComponent(
                  businessPublicId
                )}`
              : "/channels"
          }
          style={{
            display: "inline-block",
            textDecoration: "none",
            color: "#9ca3af",
            padding: 0,
            marginBottom: "34px",
            fontSize: "14px",
          }}
        >
          ← Back to Channels
        </a>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background:
                "linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            ◎
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "26px",
                fontWeight: 800,
              }}
            >
              Instagram
            </h1>

            <p
              style={{
                margin: "5px 0 0",
                color: "#8df7b2",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing:
                  "0.20em",
              }}
            >
              CHANNEL CONNECTION
            </p>
          </div>
        </div>

        {/* Main heading */}
        <div
          style={{
            marginBottom: "28px",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "36px",
              lineHeight: 1.1,
              fontWeight: 800,
            }}
          >
            Connect Instagram
          </h2>

          <p
            style={{
              margin: 0,
              color: "#aab4c3",
              fontSize: "15px",
              lineHeight: 1.6,
            }}
          >
            Sign in to Instagram and authorize
            Sodah to manage your Instagram
            conversations.
          </p>
        </div>

        {/* What happens */}
        <div
          style={{
            borderRadius: "16px",
            border:
              "1px solid rgba(141,247,178,0.14)",
            background:
              "rgba(141,247,178,0.05)",
            padding: "18px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8df7b2",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            What happens next
          </p>

          <div
            style={{
              marginTop: "10px",
              color: "#8b97a8",
              fontSize: "12px",
              lineHeight: 1.7,
            }}
          >
            <div>
              ✓ Instagram opens directly
            </div>

            <div>
              ✓ Enter your Instagram credentials
            </div>

            <div>
              ✓ Review Sodah's requested permissions
            </div>

            <div>
              ✓ Allow Sodah to manage your messages
            </div>

            <div>
              ✓ Instagram returns you to Sodah
            </div>
          </div>
        </div>

        {/* Security */}
        <div
          style={{
            borderRadius: "16px",
            border:
              "1px solid rgba(255,255,255,0.08)",
            background:
              "rgba(255,255,255,0.03)",
            padding: "18px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            🔒 Your Instagram password stays with Instagram
          </p>

          <p
            style={{
              margin:
                "6px 0 0",
              color: "#8b97a8",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            Sodah does not collect your Instagram
            password. Instagram handles the login
            and permission approval directly.
          </p>
        </div>

        {/* =====================================================
            DIRECT INSTAGRAM AUTHORIZATION
            ===================================================== */}

        <a
          href={authorizationUrl}
          rel="noopener noreferrer"
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            border: 0,
            borderRadius: "15px",
            padding: "17px 20px",
            background:
              "linear-gradient(135deg, #8df7b2, #61e6d1)",
            color: "#062017",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: 800,
            textAlign: "center",
            textDecoration: "none",
            boxShadow:
              "0 12px 30px rgba(97,230,209,0.18)",
          }}
        >
          Continue with Instagram →
        </a>

        <p
          style={{
            margin: "20px 0 0",
            textAlign: "center",
            color: "#7f8a9a",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          You will leave Sodah and authenticate
          directly with Instagram.
        </p>
      </div>
    </main>
  );
}