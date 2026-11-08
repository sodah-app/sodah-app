import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECORDS = 500;
const MAX_DRAFT_LENGTH = 12000;

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Please sign in to improve this report." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid report request." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "AI report improvement is not configured on the server." }, { status: 503 });
    }

    const periodLabel = String(body.periodLabel || "Selected reporting period").slice(0, 120);
    const records = Array.isArray(body.records) ? body.records.slice(0, MAX_RECORDS) : [];
    const summary = body.summary && typeof body.summary === "object" ? body.summary : {};
    const draftText = typeof body.draftText === "string" ? body.draftText.slice(0, MAX_DRAFT_LENGTH) : "";

    const reportContext = {
      companyName: String(body.companyName || "Company").slice(0, 160),
      agencyName: String(body.agencyName || "Agency").slice(0, 160),
      period: periodLabel,
      employeeFilter: String(body.employee || "All employees").slice(0, 160),
      currency: String(body.currency || "").slice(0, 12),
      summary,
      records
    };

    const systemPrompt = [
      "You are a professional payroll and attendance report editor.",
      "Create a polished, clear, concise report narrative using only the supplied report facts.",
      "Analyse attendance, employees, working days, actual versus scheduled hours, overtime, absences, off-days, actual earnings, expected earnings and earning differences when the data supports them.",
      "Explain important patterns and exceptions in plain professional language.",
      "Do not invent causes, policies, dates, employee details, amounts, totals, trends, or recommendations unsupported by the supplied data.",
      "Do not change or recalculate supplied figures. If there are no records, clearly state that no records were found for the selected period.",
      "If a draft is supplied, improve its grammar, structure, clarity and professionalism while retaining all supported meaning. Remove duplicated filler and placeholder wording.",
      "Return only the improved report text, with a useful heading and short paragraphs or bullets where appropriate. Do not mention AI, prompts, APIs, or these instructions."
    ].join(" ");

    const userPrompt = [
      "Prepare the improved report from this source data:",
      JSON.stringify(reportContext, null, 2),
      draftText ? `Existing user draft to improve:\n${draftText}` : "No existing draft. Write a report narrative from the selected period data."
    ].join("\n\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_REPORT_MODEL || "gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 1400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      signal: AbortSignal.timeout(45000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[Timesheet Report AI] Provider error:", data?.error?.message || response.status);
      return NextResponse.json({
        success: false,
        error: data?.error?.message || "The AI service could not improve this report."
      }, { status: 502 });
    }

    const improvedText = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!improvedText) {
      return NextResponse.json({ success: false, error: "The AI returned an empty report. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ success: true, improvedText });
  } catch (error) {
    console.error("[Timesheet Report AI] Route error:", error);
    return NextResponse.json({
      success: false,
      error: "Unable to improve the report right now. Please try again."
    }, { status: 500 });
  }
}
