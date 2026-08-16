import { NextResponse } from "next/server";

function validateCampaign(campaign) {
  if (!campaign?.campaignName?.trim()) {
    return "Campaign name is required.";
  }

  if (!campaign?.message?.trim()) {
    return "Campaign message is required.";
  }

  if (!Array.isArray(campaign.contacts) || !campaign.contacts.length) {
    return "At least one contact is required.";
  }

  if (!["now", "later"].includes(campaign.schedule?.mode)) {
    return "Invalid schedule mode.";
  }

  if (
    campaign.schedule.mode === "later" &&
    (!campaign.schedule.date || !campaign.schedule.time)
  ) {
    return "Scheduled campaigns require a date and time.";
  }

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const campaign = body.campaign;

    const validationError = validateCampaign(campaign);

    if (validationError) {
      return NextResponse.json(
        {
          error: validationError,
        },
        { status: 400 },
      );
    }

    const workflowUrl = process.env.WHATSAPP_CAMPAIGN_WORKFLOW_URL;

    if (!workflowUrl) {
      return NextResponse.json(
        {
          error:
            "WHATSAPP_CAMPAIGN_WORKFLOW_URL is not configured.",
        },
        { status: 500 },
      );
    }

    const workflowPayload = {
      event: "whatsapp_campaign.created",

      campaign: {
        name: campaign.campaignName,
        businessUrl: campaign.businessUrl,
        goal: campaign.goal,
        messageMode: campaign.messageMode,
        message: campaign.message,

        contacts: campaign.contacts,

        media: campaign.imageDataUrl
          ? {
              type: "image",
              dataUrl: campaign.imageDataUrl,
            }
          : null,

        schedule: campaign.schedule,
      },
    };

    const workflowResponse = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.WHATSAPP_WORKFLOW_SECRET
          ? {
              Authorization: `Bearer ${process.env.WHATSAPP_WORKFLOW_SECRET}`,
            }
          : {}),
      },
      body: JSON.stringify(workflowPayload),
      cache: "no-store",
    });

    const workflowText = await workflowResponse.text();

    let workflowData = {};

    try {
      workflowData = workflowText
        ? JSON.parse(workflowText)
        : {};
    } catch {
      workflowData = {
        raw: workflowText,
      };
    }

    if (!workflowResponse.ok) {
      console.error(
        "WhatsApp workflow rejected campaign:",
        workflowResponse.status,
        workflowData,
      );

      return NextResponse.json(
        {
          error:
            workflowData.error ||
            workflowData.message ||
            "The WhatsApp workflow rejected the campaign.",
        },
        { status: 502 },
      );
    }

    const scheduled =
      campaign.schedule.mode === "later";

    return NextResponse.json({
      success: true,

      status: scheduled
        ? "scheduled"
        : workflowData.status || "submitted",

      message:
        workflowData.message ||
        (scheduled
          ? "Campaign successfully scheduled."
          : "Campaign successfully submitted to the WhatsApp workflow."),

      campaignId:
        workflowData.campaignId ||
        workflowData.id ||
        null,

      contactCount: campaign.contacts.length,

      submittedCount:
        workflowData.submittedCount ??
        workflowData.acceptedCount ??
        (scheduled ? 0 : campaign.contacts.length),

      workflow: workflowData,
    });
  } catch (error) {
    console.error("Campaign send error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to submit the WhatsApp campaign.",
      },
      { status: 500 },
    );
  }
}