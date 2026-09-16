/**
 * ================================================================
 * 🔵 SODAH USER PLATFORM — INBOX EMAIL AI
 * ================================================================
 *
 * File:
 *   app/api/inbox-email-ai/action/route.js
 *
 * Gmail actions:
 *   - read
 *   - unread
 *   - star
 *   - unstar
 *   - archive
 *   - trash
 *
 * ================================================================
 */

import { NextResponse } from "next/server";

import {
  db,
  authenticate,
  resolveAccount,
  gmail,
} from "@/lib/inbox-email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================================================================
   HELPERS
================================================================ */

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

function normalizeId(value) {
  return String(value || "").trim();
}

function isInvalidGrant(error) {
  const message = errorMessage(error).toLowerCase();

  return (
    message.includes("invalid_grant") ||
    message.includes("invalid grant") ||
    message.includes("token has been expired") ||
    message.includes("token has expired") ||
    message.includes("token has been revoked") ||
    message.includes("invalid authentication credentials")
  );
}

function isPermissionError(error) {
  const status = errorStatus(error);
  const message = errorMessage(error).toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    message.includes("permission") ||
    message.includes("insufficient") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  );
}

function isNotFoundError(error) {
  const status = errorStatus(error);
  const message = errorMessage(error).toLowerCase();

  return (
    status === 404 ||
    message.includes("not found") ||
    message.includes("requested entity was not found") ||
    message.includes("message not found")
  );
}

/* ================================================================
   POST
================================================================ */

export async function POST(request) {
  try {
    /* ============================================================
       AUTHENTICATE
    ============================================================ */

    const user = await authenticate(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "SESSION_EXPIRED",
          message:
            "Your session has expired. Please sign in again.",
        },
        {
          status: 401,
        }
      );
    }

    /* ============================================================
       REQUEST BODY
    ============================================================ */

    const body = await request.json().catch(() => ({}));

    const id = normalizeId(
      body?.id ||
        body?.messageId ||
        body?.message_id ||
        body?.gmail_message_id
    );

    const action = String(body?.action || "")
      .trim()
      .toLowerCase();

    const requestedBusinessId = normalizeId(
      body?.business_id ||
        body?.businessId
    );

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          code: "MISSING_MESSAGE_ID",
          message: "A Gmail message ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedActions = new Set([
      "read",
      "unread",
      "star",
      "unstar",
      "archive",
      "trash",
    ]);

    if (!allowedActions.has(action)) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_ACTION",
          message: "Unsupported Gmail message action.",
        },
        {
          status: 400,
        }
      );
    }

    /* ============================================================
       RESOLVE AUTHENTICATED BUSINESS + GMAIL ACCOUNT
    ============================================================ */

    const admin = db();

    const {
      business,
      account,
    } = await resolveAccount(
      admin,
      user
    );

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          code: "BUSINESS_NOT_FOUND",
          message:
            "Unable to resolve your Sodah business.",
        },
        {
          status: 404,
        }
      );
    }

    const activeBusinessId = normalizeId(
      business?.business_id ||
        business?.id
    );

    /* ============================================================
       TENANT SECURITY CHECK
    ============================================================ */

    if (
      requestedBusinessId &&
      activeBusinessId &&
      requestedBusinessId !== activeBusinessId
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "BUSINESS_MISMATCH",
          message:
            "The requested business does not match your authenticated Sodah business.",
        },
        {
          status: 403,
        }
      );
    }

    /* ============================================================
       GMAIL CONNECTION CHECK
    ============================================================ */

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          code: "GMAIL_NOT_CONNECTED",
          message:
            "Connect Gmail before using Inbox.",
        },
        {
          status: 400,
        }
      );
    }

    /* ============================================================
       CREATE GMAIL CLIENT
    ============================================================ */

    const client = gmail(account);

    console.log(
      "[Inbox Email AI] Gmail action:",
      {
        user_id: user?.id || null,
        business_id:
          activeBusinessId || null,
        message_id: id,
        action,
        gmail:
          account?.gmail_email ||
          account?.email ||
          null,
      }
    );

    /* ============================================================
       TRASH / DELETE
       
       Gmail "trash" moves the email into Gmail Trash.
       This is a real Gmail operation, not just a UI removal.
    ============================================================ */

    if (action === "trash") {
      await client.users.messages.trash({
        userId: "me",
        id,
      });

      return NextResponse.json(
        {
          success: true,
          business_id:
            activeBusinessId || null,
          message_id: id,
          action: "trash",
          message:
            "Email moved to Gmail Trash.",
        },
        {
          status: 200,
        }
      );
    }

    /* ============================================================
       OTHER GMAIL ACTIONS
    ============================================================ */

    const addLabelIds = [];
    const removeLabelIds = [];

    switch (action) {
      case "read":
        removeLabelIds.push("UNREAD");
        break;

      case "unread":
        addLabelIds.push("UNREAD");
        break;

      case "star":
        addLabelIds.push("STARRED");
        break;

      case "unstar":
        removeLabelIds.push("STARRED");
        break;

      case "archive":
        removeLabelIds.push("INBOX");
        break;

      default:
        break;
    }

    const requestBody = {};

    if (addLabelIds.length > 0) {
      requestBody.addLabelIds = addLabelIds;
    }

    if (removeLabelIds.length > 0) {
      requestBody.removeLabelIds = removeLabelIds;
    }

    await client.users.messages.modify({
      userId: "me",
      id,
      requestBody,
    });

    /* ============================================================
       SUCCESS MESSAGE
    ============================================================ */

    let successMessage = "Email updated.";

    if (action === "read") {
      successMessage = "Email marked as read.";
    }

    if (action === "unread") {
      successMessage = "Email marked as unread.";
    }

    if (action === "star") {
      successMessage = "Email starred.";
    }

    if (action === "unstar") {
      successMessage = "Email unstarred.";
    }

    if (action === "archive") {
      successMessage = "Email archived.";
    }

    return NextResponse.json(
      {
        success: true,
        business_id:
          activeBusinessId || null,
        message_id: id,
        action,
        message: successMessage,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    const status = errorStatus(error);
    const message = errorMessage(error);

    console.error(
      "[Inbox Email AI] Gmail action failed:",
      {
        status,
        message,
        error,
      }
    );

    /* ============================================================
       GMAIL AUTHORIZATION EXPIRED
    ============================================================ */

    if (isInvalidGrant(error)) {
      return NextResponse.json(
        {
          success: false,
          code: "GMAIL_REAUTH_REQUIRED",
          message:
            "Your connected Gmail authorization has expired or was revoked. Reconnect Gmail to continue using Inbox.",
        },
        {
          status: 401,
        }
      );
    }

    /* ============================================================
       GMAIL PERMISSION ERROR
    ============================================================ */

    if (isPermissionError(error)) {
      return NextResponse.json(
        {
          success: false,
          code: "GMAIL_ACTION_PERMISSION_REQUIRED",
          message:
            "Inbox does not have permission to modify this Gmail message. Reconnect Gmail and grant the requested Gmail permissions.",
        },
        {
          status: 403,
        }
      );
    }

    /* ============================================================
       MESSAGE NO LONGER EXISTS
       
       Return a clean application response instead of allowing
       "Request failed with status 404" to appear as a console
       error in the browser.
    ============================================================ */

    if (isNotFoundError(error)) {
      return NextResponse.json(
        {
          success: false,
          code: "GMAIL_MESSAGE_NOT_FOUND",
          message:
            "This email is no longer available in Gmail. Refresh your Inbox.",
          message_id: id,
        },
        {
          status: 200,
        }
      );
    }

    /* ============================================================
       GENERIC ERROR
       
       IMPORTANT:
       Return HTTP 200 so the Inbox UI can handle the response
       gracefully instead of throwing "Request failed with status".
    ============================================================ */

    return NextResponse.json(
      {
        success: false,
        code: "GMAIL_ACTION_FAILED",
        message:
          message ||
          "Unable to update this Gmail message.",
        message_id: id,
        action,
      },
      {
        status: 200,
      }
    );
  }
}