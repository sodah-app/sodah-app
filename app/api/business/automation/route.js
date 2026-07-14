import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function generateBusinessId() {
  return "BIZ-" + Date.now();
}

export async function POST(request) {
  try {
    const body = await request.json();

    console.log("REQUEST BODY:", body);
    console.log("PRICE:", body.priceRange);
    console.log("AI:", body.aiNumber);
    console.log("SUPPORT:", body.supportNumber);
    console.log("WORKING:", body.workingDays);
    console.log("FULL NAME:", body.fullName);
    console.log("BUSINESS:", body.businessName);

    // ==========================================================
    // 1. CHECK LIVE WHATSAPP SESSION BEFORE SAVING ANY DATA
    // ==========================================================
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://sodah-app.vercel.app";

    console.log("APP URL =", appUrl);

    try {
      const checkResponse = await fetch(
        `${appUrl}/api/connect-whatsapp`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();

        const isConnected =
          checkData?.connected === true ||
          checkData?.isConnected === true ||
          checkData?.status === "connected" ||
          checkData?.whatsapp_connected === true;

        if (isConnected) {
          return NextResponse.json(
            {
              success: false,
              alreadyConnected: true,
              message:
                "WhatsApp is already connected. Disconnect the current session before creating a new setup.",
            },
            { status: 400 }
          );
        }
      }
    } catch (sessionCheckError) {
      console.warn(
        "WhatsApp session check failed:",
        sessionCheckError.message
      );
    }

    // ==========================================================
    // 2. EXTRACT REQUEST DATA
    // ==========================================================
   const {
  email,
  businessName,
  fullName,
  industry,
  location,
  priceRange,
  aiNumber,
  supportNumber,
  workingDays,
  hours,
  capabilities,
  personalGoal,
  setupType = "business",
  userId,
} = body;
if (!userId) {
  return NextResponse.json(
    {
      success: false,
      message: "User ID missing.",
    },
    { status: 400 }
  );
}

    // ==========================================================
    // 3. CHECK FOR EXISTING BUSINESS
    // ==========================================================
    const { data: existingBusiness, error: existingBusinessError } =
      await supabase
        .from("businesses")
        .select("*")
        .or(
          `ai_number.eq.${aiNumber},support_number.eq.${supportNumber}`
        )
        .maybeSingle();

    if (existingBusinessError) {
      return NextResponse.json(
        {
          success: false,
          message: existingBusinessError.message,
        },
        { status: 500 }
      );
    }

    if (existingBusiness) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        whatsappConnected:
          existingBusiness.whatsapp_connected === true,
        business_id: existingBusiness.business_id,
        message:
          existingBusiness.whatsapp_connected
            ? "WhatsApp already connected."
            : "Information already saved. Continue to connect WhatsApp.",
      });
    }

    // ==========================================================
    // 4. GENERATE BUSINESS ID
    // ==========================================================
    const business_id = generateBusinessId();

    // ==========================================================
    // 5. FREE TRIAL SUBSCRIPTION (7 DAYS)
    // ==========================================================
    const subscriptionPlan = "free_trial";
    const subscriptionStatus = "active";

    const subscriptionStart = new Date();

    const subscriptionExpiry = new Date(subscriptionStart);
    subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 7);

    const renewalDate = new Date(subscriptionExpiry);

    // ==========================================================
    // 6. INSERT BUSINESS
    // ==========================================================
    const { data, error } =
  await supabase
    .from("businesses")
    .insert([
      {
        user_id: userId,

        business_id,

        setup_type: setupType,

        business_name:
          setupType === "business"
            ? businessName
            : fullName,

        full_name: fullName,

        industry,
        email,
        location,

        price_range: priceRange,

        services_description:
          body.serviceDescription,

        ai_number: aiNumber,

        support_number:
          supportNumber,

        working_days:
          workingDays,

        hours,

        capabilities,

        personal_goal:
          personalGoal,

        subscription_plan:
          subscriptionPlan,

        subscription_status:
          subscriptionStatus,

        subscription_start:
          subscriptionStart,

        subscription_expiry:
          subscriptionExpiry,

        renewal_date:
          renewalDate,

        whatsapp_connected:
          false,

        status: "active",
      },
    ])
    .select()
    .single();

    // ==========================================================
    // 7. HANDLE ERRORS
    // ==========================================================
    if (error) {
      console.error("Supabase error:", error);

      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("duplicate")
      ) {
        return NextResponse.json(
          {
            success: false,
            duplicate: true,
            message:
              "This WhatsApp support number has already been registered.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    // ==========================================================
    // 8. SUCCESS
    // ==========================================================
    return NextResponse.json({
      success: true,
      alreadyExists: false,
      message: "Business setup saved successfully.",
      business_id: data.business_id,
      data,
    });
  } catch (error) {
    console.error("Setup API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}