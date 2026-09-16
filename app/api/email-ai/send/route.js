import { NextResponse } from "next/server";
import {
  authenticate,
  businessIdForUser,
  db,
  gmailClientFromTokens,
  buildRawEmail,
  validEmail,
} from "@/lib/email-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const user = await authenticate(request);
    const client = db();
    const businessId = await businessIdForUser(client, user);
    const body = await request.json();

    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    const recipients = [...new Set(
      (Array.isArray(body.recipients)
        ? body.recipients
        : String(body.recipients || "").split(/[\n,;]+/)
      )
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean)
    )];

    if (!subject) return NextResponse.json({ success: false, message: "Subject is required." }, { status: 400 });
    if (!message) return NextResponse.json({ success: false, message: "Email message is required." }, { status: 400 });
    if (!recipients.length) return NextResponse.json({ success: false, message: "Paste at least one recipient Gmail address." }, { status: 400 });
    if (recipients.length > 100) return NextResponse.json({ success: false, message: "Maximum 100 recipients per send request." }, { status: 400 });

    const invalid = recipients.find((x) => !validEmail(x));
    if (invalid) return NextResponse.json({ success: false, message: `Invalid email address: ${invalid}` }, { status: 400 });

    const { data: account, error: accountError } = await client
      .from("email_ai_gmail_accounts")
      .select("*")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("is_connected", true)
      .maybeSingle();

    if (accountError) throw accountError;

    if (!account) {
      return NextResponse.json({ success: false, message: "Connect Gmail before sending." }, { status: 400 });
    }

    const gmail = gmailClientFromTokens(account);
    const results = [];

    for (const recipient of recipients) {
      try {
        const raw = buildRawEmail({
          from: account.gmail_email,
          to: recipient,
          subject,
          body: message,
        });

        const response = await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw },
        });

        results.push({
          recipient,
          status: "sent",
          messageId: response.data.id || null,
        });
      } catch (error) {
        results.push({
          recipient,
          status: "failed",
          error: error?.message || "Gmail send failed.",
        });
      }
    }

    const sent = results.filter((x) => x.status === "sent").length;
    const failed = results.length - sent;

    const { data: history, error: historyError } = await client
      .from("email_ai_history")
      .insert({
        business_id: businessId,
        user_id: user.id,
        gmail_account_id: account.id,
        template_key: body.templateKey || null,
        title: body.title || subject,
        subject,
        body: message,
        recipients,
        sent_count: sent,
        failed_count: failed,
        status: failed === 0 ? "sent" : sent > 0 ? "partial" : "failed",
      })
      .select("*")
      .single();

    if (historyError) throw historyError;

    return NextResponse.json({
      success: sent > 0,
      message:
        failed === 0
          ? `Sent to ${sent} recipient${sent === 1 ? "" : "s"}.`
          : `Sent to ${sent}; ${failed} failed.`,
      sent,
      failed,
      results,
      history,
    });
  } catch (error) {
    console.error("[Email AI] Send:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Unable to send email." },
      { status: error.message === "Unauthorized." ? 401 : 500 }
    );
  }
}
