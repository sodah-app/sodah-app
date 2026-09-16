/**
 * ================================================================
 * SODAH USER PLATFORM — GMAIL CONNECTION STATUS
 * ================================================================
 *
 * File:
 *   app/api/inbox-email-ai/connection-status/route.js
 *
 * PURPOSE
 * -------
 * Provides the Welcome / Channel page with the SAME Gmail connection
 * already used by Sodah Email AI and Inbox.
 *
 * IMPORTANT
 * ---------
 * This endpoint is intentionally separate from the Welcome page UI.
 * The browser must never decide Gmail connectivity by looking at a
 * browser-supplied Gmail address or by querying a different table.
 *
 * The server authenticates the current Sodah user and uses
 * resolveAccount(), which is already the source of truth for the
 * existing Gmail connection.
 * ================================================================
 */

import { NextResponse } from "next/server";

import {
  db,
  authenticate,
  resolveAccount,
} from "@/lib/inbox-email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(error) {
  return String(
    error?.response?.data?.error?.message ||
      error?.response?.data?.error_description ||
      error?.message ||
      ""
  ).trim();
}

function errorStatus(error) {
  return Number(
    error?.response?.status ||
      error?.code ||
      0
  );
}

function getAccountEmail(account) {
  return String(
    account?.gmail_email ||
      account?.email ||
      account?.google_email ||
      account?.googleEmail ||
      account?.account_email ||
      account?.accountEmail ||
      ""
  ).trim();
}

export async function GET(request) {
  try {
    /* ============================================================
       1. AUTHENTICATE THE CURRENT SODAH USER
       ============================================================ */

    const user = await authenticate(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          message:
            "Your session has expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    /* ============================================================
       2. RESOLVE THE SAME BUSINESS + GMAIL ACCOUNT USED BY INBOX
       ============================================================ */

    const admin = db();

    let business = null;
    let account = null;

    try {
      const resolved = await resolveAccount(
        admin,
        user
      );

      business =
        resolved?.business || null;

      account =
        resolved?.account || null;
    } catch (resolutionError) {
      const resolutionMessage =
        errorMessage(resolutionError).toLowerCase();

      /*
       * A missing Gmail connection is a normal disconnected state for
       * the Welcome page. Do not turn it into a server error.
       */
      if (
        resolutionMessage.includes("connect gmail") ||
        resolutionMessage.includes("gmail") &&
          resolutionMessage.includes("connected")
      ) {
        return NextResponse.json({
          success: true,
          connected: false,
          business_id: null,
          gmail: null,
          account: null,
        });
      }

      throw resolutionError;
    }

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          message:
            "Unable to resolve your Sodah business.",
        },
        { status: 404 }
      );
    }

    /* ============================================================
       3. RETURN THE CONNECTED GMAIL ACCOUNT
       ============================================================ */

    const gmail = account
      ? getAccountEmail(account)
      : "";

    const connected = Boolean(account);

    console.log(
      "[Gmail Connection Status]",
      {
        user_id: user.id || null,
        business_id:
          business?.business_id ||
          business?.id ||
          null,
        connected,
        gmail: gmail || null,
        source: account?._source || null,
      }
    );

    return NextResponse.json({
      success: true,
      connected,
      business_id:
        business?.business_id ||
        business?.id ||
        null,
      gmail: gmail || null,
      account: connected
        ? {
            id: account?.id || null,
            gmail_email: gmail || null,
            email:
              account?.email ||
              null,
            google_email:
              account?.google_email ||
              null,
            source:
              account?._source ||
              null,
          }
        : null,
    });
  } catch (error) {
    const status = errorStatus(error);
    const message = errorMessage(error);

    console.error(
      "[Gmail Connection Status] Failed:",
      {
        status,
        message,
        error,
      }
    );

    return NextResponse.json(
      {
        success: false,
        connected: false,
        message:
          message ||
          "Unable to determine Gmail connection status.",
      },
      {
        status:
          status >= 400 && status < 600
            ? status
            : 500,
      }
    );
  }
}
