import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase admin configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getAuthenticatedUser(request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase public configuration is missing.");
  }

  const token = (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.getUser();

  if (error) {
    console.error("Authentication error:", error.message);
    return null;
  }

  return data?.user || null;
}

function generateBusinessId() {
  return `BIZ-${Date.now()}`;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function completeOnboarding(admin, user, email, businessName) {
  const { data: existingOnboarding, error: lookupError } = await admin
    .from("sodah_onboarding")
    .select("followup_stage")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    console.error("Onboarding lookup failed:", lookupError);
  }

  const followupStage = existingOnboarding?.followup_stage ?? 0;

  // full_name is retained ONLY for sodah_onboarding, not businesses.
  const onboardingFullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    businessName ||
    "";

  const { error } = await admin
    .from("sodah_onboarding")
    .upsert(
      {
        user_id: user.id,
        email: email || user.email || "",
        full_name: onboardingFullName,
        status: "completed",
        followup_stage: followupStage,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("Onboarding completion update failed:", error);
  }

  return !error;
}

export async function POST(request) {
  try {
    // ==========================================================
    // 1. AUTHENTICATE USER
    // ==========================================================
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    // ==========================================================
    // 2. READ REQUEST
    // ==========================================================
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    // ==========================================================
    // 3. EXTRACT AND NORMALIZE REQUEST DATA
    // ==========================================================
    const {
      email,
      businessName,
      industry,
      location,
      priceRange,
      aiNumber,
      supportNumber,
      workingDays,
      hours,
      capabilities,
      setupType = "business",
      userId,
    } = body;

    const businessEmail = cleanString(email) || authenticatedUser.email || "";
    const normalizedBusinessName = cleanString(businessName);
    const normalizedIndustry = cleanString(industry);
    const normalizedLocation = cleanString(location);
    const normalizedPriceRange = cleanString(priceRange);
    const normalizedAiNumber = cleanString(aiNumber);
    const normalizedSupportNumber =
      cleanString(supportNumber) || normalizedAiNumber;
    const normalizedWorkingDays = cleanString(workingDays);
    const normalizedHours = cleanString(hours);
    const normalizedCapabilities = cleanString(capabilities);
    const normalizedDescription = cleanString(body.serviceDescription);
    const normalizedSetupType = setupType === "personal" ? "personal" : "business";

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID missing." },
        { status: 400 }
      );
    }

    // ==========================================================
    // 4. VERIFY CLIENT USER ID AGAINST AUTHENTICATED USER
    // ==========================================================
    if (userId !== authenticatedUser.id) {
      return NextResponse.json(
        { success: false, message: "User authentication mismatch." },
        { status: 403 }
      );
    }

    if (!normalizedBusinessName) {
      return NextResponse.json(
        { success: false, message: "Business name is required." },
        { status: 400 }
      );
    }

    if (!normalizedAiNumber) {
      return NextResponse.json(
        { success: false, message: "Business WhatsApp number is required." },
        { status: 400 }
      );
    }

    // ==========================================================
    // 5. CHECK EXISTING WHATSAPP SESSION
    // ==========================================================
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://sodah-app.vercel.app";

    try {
      const checkResponse = await fetch(`${appUrl}/api/connect-whatsapp`, {
        method: "GET",
        cache: "no-store",
      });

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
        sessionCheckError?.message || sessionCheckError
      );
    }

    const admin = adminClient();

    // ==========================================================
    // 6. CHECK FOR EXISTING BUSINESS BY WHATSAPP NUMBER
    // ==========================================================
    const { data: existingBusiness, error: existingBusinessError } =
      await admin
        .from("businesses")
        .select(
          "id,business_id,user_id,business_name,whatsapp_connected,ai_number,support_number"
        )
        .or(
          `ai_number.eq.${normalizedAiNumber},support_number.eq.${normalizedSupportNumber}`
        )
        .maybeSingle();

    if (existingBusinessError) {
      console.error("Existing business lookup failed:", existingBusinessError);
      return NextResponse.json(
        { success: false, message: existingBusinessError.message },
        { status: 500 }
      );
    }

    // ==========================================================
    // 7. HANDLE EXISTING BUSINESS
    // ==========================================================
    if (existingBusiness) {
      if (existingBusiness.user_id !== authenticatedUser.id) {
        return NextResponse.json(
          {
            success: false,
            message: "This business information belongs to another account.",
          },
          { status: 403 }
        );
      }

      const onboardingCompleted = await completeOnboarding(
        admin,
        authenticatedUser,
        businessEmail,
        existingBusiness.business_name || normalizedBusinessName
      );

      return NextResponse.json({
        success: true,
        alreadyExists: true,
        onboarding_completed: onboardingCompleted,
        whatsappConnected: existingBusiness.whatsapp_connected === true,
        business_id: existingBusiness.business_id,
        business_name: existingBusiness.business_name,
        message: existingBusiness.whatsapp_connected
          ? "WhatsApp already connected."
          : "Information already saved. Continue to connect WhatsApp.",
      });
    }

    // ==========================================================
    // 8. GENERATE BUSINESS ID
    // ==========================================================
    const business_id = generateBusinessId();

    // ==========================================================
    // 9. CREATE SEVEN-DAY FREE TRIAL DATES
    // ==========================================================
    const subscriptionPlan = "free_trial";
    const subscriptionStatus = "active";
    const subscriptionStart = new Date();
    const subscriptionExpiry = new Date(subscriptionStart);
    subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 7);
    const renewalDate = new Date(subscriptionExpiry);

    // ==========================================================
    // 10. INSERT BUSINESS
    // ==========================================================
    // businesses uses business_name. There is NO full_name column
    // in this insert, and personal_goal is omitted because it is
    // not in the businesses schema supplied for this fix.
    const { data, error } = await admin
      .from("businesses")
      .insert([
        {
          user_id: authenticatedUser.id,
          business_id,
          setup_type: normalizedSetupType,
          business_name: normalizedBusinessName,
          industry: normalizedIndustry || null,
          email: businessEmail,
          location: normalizedLocation,
          price_range: normalizedPriceRange,
          services_description: normalizedDescription,
          ai_number: normalizedAiNumber,
          support_number: normalizedSupportNumber,
          working_days: normalizedWorkingDays,
          hours: normalizedHours,
          capabilities: normalizedCapabilities,
          subscription_plan: subscriptionPlan,
          subscription_status: subscriptionStatus,
          subscription_start: subscriptionStart.toISOString(),
          subscription_expiry: subscriptionExpiry.toISOString(),
          renewal_date: renewalDate.toISOString(),
          whatsapp_connected: false,
          status: "active",
        },
      ])
      .select()
      .single();

    // ==========================================================
    // 11. HANDLE BUSINESS INSERT ERROR
    // ==========================================================
    if (error) {
      console.error("Supabase business insert error:", error);

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
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    // ==========================================================
    // 12. MARK ONBOARDING COMPLETE
    // ==========================================================
    const onboardingCompleted = await completeOnboarding(
      admin,
      authenticatedUser,
      businessEmail,
      data.business_name
    );

    if (!onboardingCompleted) {
      return NextResponse.json({
        success: true,
        alreadyExists: false,
        onboarding_completed: false,
        onboarding_update_failed: true,
        message: "Business setup saved successfully.",
        business_id: data.business_id,
        business_name: data.business_name,
        data,
      });
    }

    // ==========================================================
    // 13. FINAL SUCCESS
    // ==========================================================
    return NextResponse.json({
      success: true,
      alreadyExists: false,
      onboarding_completed: true,
      message: "Business setup saved successfully.",
      business_id: data.business_id,
      business_name: data.business_name,
      data,
    });
  } catch (error) {
    console.error("Setup API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
