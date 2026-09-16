import { NextResponse } from "next/server";
import { google, gmail_v1 } from "googleapis";
import {
  googleOAuthClient,
  db,
  encryptToken,
} from "@/lib/email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirect(path, params = {}) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.GOOGLE_REDIRECT_URI?.replace(
      "/api/email-ai/google/callback",
      ""
    ) ||
    "http://localhost:3000";

  const url = new URL(path, base);

  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  return NextResponse.redirect(url);
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const googleError = url.searchParams.get("error");

    if (googleError) {
      return redirect("/email-ai", {
        error: "Google authorization was cancelled.",
      });
    }

    if (!code || !state) {
      return redirect("/email-ai", {
        error: "Google authorization was incomplete.",
      });
    }

    let stateData;

    try {
      stateData = JSON.parse(
        Buffer.from(state, "base64url").toString("utf8")
      );
    } catch {
      return redirect("/email-ai", {
        error: "Invalid Google authorization state.",
      });
    }

    if (
      !stateData?.userId ||
      !stateData?.businessId ||
      !stateData?.timestamp ||
      Date.now() - Number(stateData.timestamp) > 10 * 60 * 1000
    ) {
      return redirect("/email-ai", {
        error: "Google authorization expired. Please try again.",
      });
    }

    const oauth2 = googleOAuthClient();

    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const oauthUser = google.oauth2({
      version: "v2",
      auth: oauth2,
    });

    const { data: profile } = await oauthUser.userinfo.get();

    if (!profile?.email) {
      return redirect("/email-ai", {
        error: "Google did not return an email address.",
      });
    }

    const client = db();

    const row = {
      business_id: stateData.businessId,
      user_id: stateData.userId,
      gmail_email: profile.email,
      gmail_name: profile.name || null,
      google_sub: profile.id || null,
      access_token_encrypted: tokens.access_token
        ? encryptToken(tokens.access_token)
        : null,
      refresh_token_encrypted: tokens.refresh_token
        ? encryptToken(tokens.refresh_token)
        : null,
      token_expires_at: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      is_connected: true,
      last_error: null,
      updated_at: new Date().toISOString(),
    };

    // Google may not return a refresh token if the account has already
    // granted access. Preserve an existing refresh token when available.
    if (!row.refresh_token_encrypted) {
      const { data: existing } = await client
        .from("email_ai_gmail_accounts")
        .select("refresh_token_encrypted")
        .eq("business_id", stateData.businessId)
        .maybeSingle();

      if (existing?.refresh_token_encrypted) {
        row.refresh_token_encrypted = existing.refresh_token_encrypted;
      }
    }

    if (!row.refresh_token_encrypted) {
      return redirect("/email-ai", {
        error: "Google did not provide a refresh token. Please reconnect and approve access again.",
      });
    }

    const { error } = await client
      .from("email_ai_gmail_accounts")
      .upsert(row, { onConflict: "business_id" });

    if (error) throw error;

    return redirect("/email-ai", {
      connected: "1",
    });
  } catch (error) {
    console.error("[Email AI] Google callback:", error);

    return redirect("/email-ai", {
      error: error.message || "Unable to connect Gmail.",
    });
  }
}
