import { NextResponse } from "next/server";

import {
  authenticate,
  resolveAccount,
  createOAuthState,
  INBOX_GOOGLE_SCOPES,
  db,
} from "@/lib/inbox-email-ai";

import { google } from "googleapis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ================================================================
 * SODAH USER PLATFORM
 * INBOX EMAIL AI — GOOGLE GMAIL CONNECT
 * ================================================================
 *
 * File:
 *   app/api/inbox-email-ai/google/connect/route.js
 *
 * PURPOSE:
 *   Starts the dedicated Gmail OAuth connection for Inbox Email AI.
 *
 * IMPORTANT:
 *   This is separate from the existing Email AI OAuth flow.
 *
 * Inbox callback:
 *   /api/inbox-email-ai/google/callback
 *
 * Existing Email AI callback:
 *   /api/email-ai/google/callback
 *
 * DO NOT use GOOGLE_REDIRECT_URI here.
 * ================================================================
 */

/**
 * ================================================================
 * INBOX GOOGLE REDIRECT URI
 * ================================================================
 */

function inboxRedirectUri() {
  const configured =
    process.env.INBOX_GOOGLE_REDIRECT_URI?.trim();

  if (configured) {
    return configured;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";

  return `${appUrl.replace(
    /\/+$/,
    ""
  )}/api/inbox-email-ai/google/callback`;
}

/**
 * ================================================================
 * GOOGLE OAUTH CLIENT
 * ================================================================
 */

function inboxGoogleOAuthClient() {
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
    inboxRedirectUri()
  );
}

/**
 * ================================================================
 * GET — START GMAIL OAUTH
 * ================================================================
 */

export async function GET(request) {
  try {
    /**
     * ============================================================
     * 1. AUTHENTICATE CURRENT SODAH USER
     * ============================================================
     */

    const user =
      await authenticate(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED",
          message:
            "Your Sodah session has expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    console.log(
      "[Inbox Email AI] Starting Gmail OAuth:",
      {
        user_id:
          user?.id || null,

        email:
          user?.email || null,
      }
    );

    /**
     * ============================================================
     * 2. RESOLVE BUSINESS + ACCOUNT
     * ============================================================
     *
     * IMPORTANT:
     *
     * Use the same account-resolution system used by the working
     * Inbox routes.
     *
     * This keeps business resolution consistent across:
     *
     *   Inbox
     *   Gmail
     *   Email AI
     *   Channel page
     * ============================================================
     */

    const admin =
      db();

    const {
      business,
      account,
    } =
      await resolveAccount(
        admin,
        user
      );

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          code:
            "BUSINESS_NOT_FOUND",
          message:
            "Unable to resolve your Sodah business.",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * ============================================================
     * 3. LOG EXISTING ACCOUNT
     * ============================================================
     *
     * This does NOT block reconnection.
     *
     * If Gmail is already connected, Google OAuth can still be
     * started so the user can reconnect or authorize again.
     */

    console.log(
      "[Inbox Email AI] Existing Gmail account:",
      {
        business_id:
          business?.business_id ||
          business?.id ||
          null,

        account_id:
          account?.id ||
          null,

        gmail:
          account?.gmail_email ||
          account?.email ||
          null,
      }
    );

    /**
     * ============================================================
     * 4. CREATE OAUTH STATE
     * ============================================================
     *
     * The state carries the Sodah user/business information through
     * Google's OAuth redirect.
     *
     * The callback verifies this state before storing the Gmail
     * connection.
     */

    const state =
      createOAuthState({
        userId:
          user.id,

        businessId:
          business.id,

        businessPublicId:
          business.business_id ||
          business.id,
      });

    /**
     * ============================================================
     * 5. CREATE GOOGLE OAUTH CLIENT
     * ============================================================
     */

    const oauth2 =
      inboxGoogleOAuthClient();

    const redirectUri =
      inboxRedirectUri();

    /**
     * ============================================================
     * 6. CREATE GOOGLE AUTHORIZATION URL
     * ============================================================
     *
     * offline:
     *   Allows Gmail access through a refresh token.
     *
     * prompt: consent
     *   Forces Google to show the consent screen and return a
     *   fresh refresh token when necessary.
     *
     * include_granted_scopes:
     *   Keeps previously granted scopes where appropriate.
     */

    const url =
      oauth2.generateAuthUrl({
        access_type:
          "offline",

        prompt:
          "consent",

        scope:
          INBOX_GOOGLE_SCOPES,

        state,

        include_granted_scopes:
          true,
      });

    /**
     * ============================================================
     * 7. LOG OAUTH CONFIGURATION
     * ============================================================
     */

    console.log(
      "[Inbox Email AI] Gmail OAuth configuration:",
      {
        redirect_uri:
          redirectUri,

        scopes:
          INBOX_GOOGLE_SCOPES,

        business_id:
          business?.business_id ||
          business?.id ||
          null,

        user_id:
          user?.id ||
          null,
      }
    );

    /**
     * ============================================================
     * 8. RETURN AUTHORIZATION URL
     * ============================================================
     */

    return NextResponse.json({
      success: true,

      url,

      business_id:
        business?.business_id ||
        business?.id ||
        null,
    });
  } catch (error) {
    console.error(
      "[Inbox Email AI] Gmail OAuth connect error:",
      {
        message:
          error?.message ||
          "Unknown error",

        stack:
          error?.stack ||
          null,

        error,
      }
    );

    return NextResponse.json(
      {
        success: false,

        code:
          "GMAIL_OAUTH_START_FAILED",

        message:
          error?.message ||
          "Unable to start Gmail OAuth.",
      },
      {
        status: 500,
      }
    );
  }
}