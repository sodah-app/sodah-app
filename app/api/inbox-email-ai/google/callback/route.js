import { NextResponse } from "next/server";
import { google } from "googleapis";
import {
  db,
  verifyOAuthState,
} from "@/lib/inbox-email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ================================================================
 * 🔵 SODAH USER PLATFORM
 * INBOX EMAIL AI — GOOGLE OAUTH CALLBACK
 * ================================================================
 *
 * IMPORTANT:
 *
 * This callback belongs ONLY to Inbox Email AI.
 *
 * Existing Email AI callback:
 *
 *   /api/email-ai/google/callback
 *
 * Inbox callback:
 *
 *   /api/inbox-email-ai/google/callback
 *
 * Do not mix the two.
 * ================================================================
 */

function inboxRedirectUri(request) {
  const configured =
    process.env.INBOX_GOOGLE_REDIRECT_URI?.trim();

  if (configured) {
    return configured;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    new URL(request.url).origin;

  return `${appUrl.replace(
    /\/+$/,
    ""
  )}/api/inbox-email-ai/google/callback`;
}

function inboxGoogleOAuthClient(request) {
  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim();

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId) {
    throw new Error(
      "GOOGLE_CLIENT_ID is not configured."
    );
  }

  if (!clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_SECRET is not configured."
    );
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    inboxRedirectUri(request)
  );
}

/*
 * ================================================================
 * REDIRECT
 * ================================================================
 */

function redirect(
  request,
  path,
  params = {}
) {
  const url = new URL(
    path,
    request.url
  );

  for (
    const [key, value] of Object.entries(
      params
    )
  ) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(
        key,
        String(value)
      );
    }
  }

  return NextResponse.redirect(
    url
  );
}

/*
 * ================================================================
 * NORMALIZE EMAIL
 * ================================================================
 */

function normalizeEmail(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

/*
 * ================================================================
 * GET — GOOGLE CALLBACK
 * ================================================================
 */

export async function GET(request) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const code =
      searchParams.get("code");

    const state =
      searchParams.get("state");

    const oauthError =
      searchParams.get("error");

    /*
     * ============================================================
     * GOOGLE DENIED
     * ============================================================
     */

    if (oauthError) {
      console.error(
        "[Inbox Email AI] Google OAuth error:",
        oauthError
      );

      return redirect(
        request,
        "/inbox",
        {
          error:
            `Google authorization was not completed: ${oauthError}`,
        }
      );
    }

    /*
     * ============================================================
     * CODE CHECK
     * ============================================================
     */

    if (!code) {
      return redirect(
        request,
        "/inbox",
        {
          error:
            "Google did not return an authorization code.",
        }
      );
    }

    /*
     * ============================================================
     * STATE CHECK
     * ============================================================
     */

    if (!state) {
      return redirect(
        request,
        "/inbox",
        {
          error:
            "Missing Google authorization state.",
        }
      );
    }

    /*
     * ============================================================
     * VERIFY SIGNED INBOX STATE
     * ============================================================
     *
     * We intentionally do NOT call authenticate(request) here.
     *
     * Google redirects directly to this URL, so the Supabase
     * Authorization header is not present.
     *
     * The signed state contains:
     *
     *   userId
     *   businessId
     *   businessPublicId
     *
     * and is verified cryptographically.
     */

    const stateData =
      verifyOAuthState(
        state
      );

    if (!stateData?.userId) {
      throw new Error(
        "Invalid Gmail OAuth state: user is missing."
      );
    }

    console.log(
      "[Inbox Email AI] Verified OAuth state:",
      {
        user_id:
          stateData.userId,

        business_id:
          stateData.businessPublicId ||
          stateData.businessId ||
          null,
      }
    );

    /*
     * ============================================================
     * DATABASE
     * ============================================================
     */

    const admin = db();

    /*
     * ============================================================
     * RESOLVE BUSINESS
     * ============================================================
     */

    let business = null;

    /*
     * First try internal business UUID.
     */

    if (
      stateData.businessId
    ) {
      const {
        data,
        error,
      } = await admin
        .from("businesses")
        .select(
          "id,business_id,user_id,business_name"
        )
        .eq(
          "id",
          stateData.businessId
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      business = data;
    }

    /*
     * Then try public BIZ-... ID.
     */

    if (
      !business &&
      stateData.businessPublicId
    ) {
      const {
        data,
        error,
      } = await admin
        .from("businesses")
        .select(
          "id,business_id,user_id,business_name"
        )
        .eq(
          "business_id",
          stateData.businessPublicId
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      business = data;
    }

    if (!business) {
      return redirect(
        request,
        "/inbox",
        {
          error:
            "Unable to resolve your Sodah business.",
        }
      );
    }

    /*
     * ============================================================
     * BUSINESS OWNERSHIP CHECK
     * ============================================================
     */

    if (
      business.user_id &&
      String(
        business.user_id
      ) !==
        String(
          stateData.userId
        )
    ) {
      console.error(
        "[Inbox Email AI] Business ownership mismatch:",
        {
          business_user:
            business.user_id,

          oauth_user:
            stateData.userId,
        }
      );

      return redirect(
        request,
        "/inbox",
        {
          error:
            "This business does not belong to the authenticated Sodah account.",
        }
      );
    }

    /*
     * ============================================================
     * EXCHANGE GOOGLE AUTHORIZATION CODE
     * ============================================================
     */

    const oauth2 =
      inboxGoogleOAuthClient(
        request
      );

    const {
      tokens,
    } =
      await oauth2.getToken(
        code
      );

    if (
      !tokens?.access_token
    ) {
      throw new Error(
        "Google did not return an access token."
      );
    }

    console.log(
      "[Inbox Email AI] Google token exchange successful:",
      {
        has_access_token:
          Boolean(
            tokens.access_token
          ),

        has_refresh_token:
          Boolean(
            tokens.refresh_token
          ),

        scope:
          tokens.scope ||
          null,
      }
    );

    /*
     * ============================================================
     * GET AUTHORIZED GOOGLE EMAIL
     * ============================================================
     */

    oauth2.setCredentials(
      tokens
    );

    const oauthUser =
      google.oauth2({
        version: "v2",
        auth: oauth2,
      });

    const {
      data: googleUser,
    } =
      await oauthUser.userinfo.get();

    const gmailEmail =
      normalizeEmail(
        googleUser?.email
      );

    if (!gmailEmail) {
      throw new Error(
        "Google did not return the Gmail account email."
      );
    }

    console.log(
      "[Inbox Email AI] Google account authorized:",
      gmailEmail
    );

    /*
     * ============================================================
     * FIND EXISTING GMAIL CONNECTION
     * ============================================================
     *
     * We intentionally search in this order:
     *
     * 1. Current Sodah user
     * 2. Exact Gmail address
     *
     * The exact Gmail address is important because your existing
     * Email AI already recognizes dagbahs@gmail.com.
     */

    let existing = null;

    /*
     * ------------------------------------------------------------
     * 1. CURRENT SODAH USER
     * ------------------------------------------------------------
     */

    const {
      data: existingByUser,
      error:
        existingByUserError,
    } = await admin
      .from("gmail_accounts")
      .select("*")
      .eq(
        "user_id",
        stateData.userId
      )
      .limit(1)
      .maybeSingle();

    if (
      existingByUserError
    ) {
      console.error(
        "[Inbox Email AI] Gmail lookup by user failed:",
        existingByUserError
      );
    }

    if (
      existingByUser
    ) {
      existing =
        existingByUser;
    }

    /*
     * ------------------------------------------------------------
     * 2. EXACT GMAIL EMAIL
     * ------------------------------------------------------------
     */

    if (!existing) {
      const {
        data: existingByEmail,
        error:
          existingByEmailError,
      } = await admin
        .from("gmail_accounts")
        .select("*")
        .eq(
          "gmail_email",
          gmailEmail
        )
        .limit(1)
        .maybeSingle();

      if (
        existingByEmailError
      ) {
        console.error(
          "[Inbox Email AI] Gmail lookup by email failed:",
          existingByEmailError
        );
      }

      if (
        existingByEmail
      ) {
        existing =
          existingByEmail;
      }
    }

    /*
     * ============================================================
     * IMPORTANT CHANGE
     * ============================================================
     *
     * We DO NOT reject the account merely because the existing
     * gmail_accounts row has a different user_id.
     *
     * Why?
     *
     * This exact Gmail account was just authorized by the current
     * Sodah user through Google's OAuth consent flow.
     *
     * The signed OAuth state also proves which Sodah business
     * initiated the connection.
     *
     * Therefore the fresh OAuth authorization is used to repair
     * the existing Gmail connection ownership.
     *
     * This fixes the stale user_id problem that is currently
     * preventing Inbox from reauthorizing dagbahs@gmail.com.
     */

    if (
      existing &&
      existing.user_id &&
      String(
        existing.user_id
      ) !==
        String(
          stateData.userId
        )
    ) {
      console.warn(
        "[Inbox Email AI] Rebinding existing Gmail connection to current Sodah user:",
        {
          account_id:
            existing.id,

          gmail:
            gmailEmail,

          previous_user_id:
            existing.user_id,

          new_user_id:
            stateData.userId,

          business_id:
            business.business_id ||
            business.id,
        }
      );
    }

    /*
     * ============================================================
     * REFRESH TOKEN
     * ============================================================
     *
     * Google should return a fresh refresh token because the
     * connect route uses:
     *
     *   access_type=offline
     *   prompt=consent
     *
     * If Google does not return a new refresh token, preserve the
     * existing one.
     */

    const refreshToken =
      tokens.refresh_token ||
      existing?.refresh_token ||
      null;

    if (!refreshToken) {
      return redirect(
        request,
        "/inbox",
        {
          error:
            "Google did not return a refresh token. Please reconnect Gmail and approve the requested permissions.",
        }
      );
    }

    /*
     * ============================================================
     * BUILD DATABASE UPDATE
     * ============================================================
     */

    const payload = {
  user_id: stateData.userId,
  gmail_email: gmailEmail,
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
};

    /*
     * ============================================================
     * UPDATE EXISTING CONNECTION
     * ============================================================
     */

    if (
      existing?.id
    ) {
      const {
        data,
        error,
      } = await admin
        .from("gmail_accounts")
        .update(
          payload
        )
        .eq(
          "id",
          existing.id
        )
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      console.log(
        "[Inbox Email AI] Existing Gmail connection repaired:",
        {
          account_id:
            data?.id ||
            existing.id,

          gmail:
            gmailEmail,

          previous_user_id:
            existing.user_id,

          current_user_id:
            stateData.userId,

          business_id:
            business.business_id ||
            business.id,
        }
      );
    }

    /*
     * ============================================================
     * CREATE ONLY IF NOTHING EXISTS
     * ============================================================
     */

    else {
      const {
        data,
        error,
      } = await admin
        .from("gmail_accounts")
        .insert({
          ...payload,

          created_at:
            new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      console.log(
        "[Inbox Email AI] New Gmail connection created:",
        {
          account_id:
            data?.id ||
            null,

          gmail:
            gmailEmail,

          user_id:
            stateData.userId,

          business_id:
            business.business_id ||
            business.id,
        }
      );
    }

    /*
     * ============================================================
     * SUCCESS
     * ============================================================
     */

    return redirect(
      request,
      "/inbox",
      {
        gmail_connected:
          "true",

        businessId:
          business.business_id ||
          business.id,

        email:
          gmailEmail,
      }
    );
  } catch (error) {
    console.error(
      "[Inbox Email AI] Gmail OAuth callback error:",
      error
    );

    return redirect(
      request,
      "/inbox",
      {
        error:
          error?.message ||
          "Unable to complete Gmail authorization.",
      }
    );
  }
}