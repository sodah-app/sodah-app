import { NextRequest, NextResponse } from "next/server";

const CAMPAIGN_SERVICE_URL =
  "https://solomon-n8n.duckdns.org/webhook/campaign-sender";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid campaign.",
        },
        { status: 400 },
      );
    }

    if (!body.business_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Business context is missing.",
        },
        { status: 400 },
      );
    }

    if (!body.campaign_name) {
      return NextResponse.json(
        {
          success: false,
          message: "Campaign name is required.",
        },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(body.contacts) ||
      body.contacts.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Contacts are required.",
        },
        { status: 400 },
      );
    }

    const response = await fetch(CAMPAIGN_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Campaign service rejected the request.",
        },
        { status: 502 },
      );
    }

    let responseData: unknown = null;

    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to process the campaign.",
      },
      { status: 500 },
    );
  }
}