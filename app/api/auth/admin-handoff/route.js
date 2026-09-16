import { NextResponse } from "next/server";
import crypto from "crypto";

const SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL || "solomondagbahz@gmail.com"
)
  .trim()
  .toLowerCase();

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;

const SODAH_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.sodah.io";

function base64UrlDecode(value) {
  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

function verifyToken(token) {
  if (!token || !SESSION_SECRET) {
    return null;
  }

  try {
    const separatorIndex = token.lastIndexOf(".");

    if (separatorIndex === -1) {
      return null;
    }

    const encodedPayload = token.slice(0, separatorIndex);
    const signature = token.slice(separatorIndex + 1);

    if (!encodedPayload || !signature) {
      return null;
    }

    const payload = base64UrlDecode(encodedPayload);

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("base64url");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const parts = payload.split("|");

    if (parts.length !== 3) {
      return null;
    }

    const email = parts[0].trim().toLowerCase();
    const expiresAt = Number(parts[1]);
    const nonce = parts[2];

    if (
      !email ||
      !Number.isFinite(expiresAt) ||
      !nonce
    ) {
      return null;
    }

    if (Date.now() > expiresAt) {
      return null;
    }

    if (email !== SUPER_ADMIN_EMAIL) {
      return null;
    }

    return {
      email,
      expiresAt,
      nonce,
    };
  } catch (error) {
    console.error("Admin handoff verification failed:", error);
    return null;
  }
}

export async function GET(request) {
  try {
    if (!SESSION_SECRET) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin session security is not configured.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);

    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access token is missing.",
        },
        { status: 401 }
      );
    }

    const verified = verifyToken(token);

    if (!verified) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired admin access token.",
        },
        { status: 401 }
      );
    }

    /*
     * At this point the request has been cryptographically verified
     * as coming from the configured Super Admin.
     *
     * Store the verified Super Admin identity in a short-lived,
     * HTTP-only cookie for the main Sodah application.
     */

    const sessionPayload = JSON.stringify({
      email: SUPER_ADMIN_EMAIL,
      isSuperAdmin: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    });

    const encodedSession = Buffer.from(sessionPayload).toString(
      "base64url"
    );

    const sessionSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedSession)
      .digest("base64url");

    const superAdminSession = `${encodedSession}.${sessionSignature}`;

    const redirectUrl = new URL(
      "/channels",
      SODAH_APP_URL
    );

    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set(
      "sodahSuperAdminSession",
      superAdminSession,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      }
    );

    return response;
  } catch (error) {
    console.error("Admin handoff error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to establish Super Admin access.",
      },
      { status: 500 }
    );
  }
}