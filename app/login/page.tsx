import { createClient } from "@/lib/supabase/server";

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
  userId: string | null,
  secret: string
): Promise<string> {
  const payload = {
    /*
     * null means the callback must resolve the current
     * authenticated Sodah user from the Supabase session.
     */
    userId: userId || null,

    timestamp: Date.now(),

    nonce: crypto.randomUUID(),
  };

  const encodedPayload =
    base64UrlEncode(
      JSON.stringify(payload)
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

export default async function InstagramLoginPage() {
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
   * TRY TO READ THE SODAH SESSION
   * ---------------------------------------------------------
   *
   * We DO NOT redirect if the session is missing.
   *
   * This is the important change.
   *
   * Instagram must be allowed to open directly.
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
      console.warn(
        "[Instagram Login] Sodah session unavailable:",
        authError.message
      );
    }

    if (user?.id) {
      sodahUserId = user.id;
    }
  } catch (error) {
    console.warn(
      "[Instagram Login] Could not read Sodah session:",
      error
    );
  }

  /*
   * ---------------------------------------------------------
   * CREATE SIGNED STATE
   * ---------------------------------------------------------
   *
   * If the Sodah session exists:
   *
   * state.userId = actual Sodah user ID
   *
   * If it does not:
   *
   * state.userId = null
   *
   * The callback must then resolve the Sodah user from
   * the current authenticated session.
   */

  const state =
    await createSignedState(
      sodahUserId,
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
          href="/channels"
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