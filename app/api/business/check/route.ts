import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    /*
     * Get authenticated user.
     */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Business check auth error:", authError);
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: "Please log in again.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    const email = user.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: "No email was found on your account.",
          code: "EMAIL_REQUIRED",
        },
        { status: 400 }
      );
    }

    /*
     * First check by Supabase auth user ID.
     *
     * This is the strongest relationship.
     */
    const {
      data: businessByUser,
      error: userLookupError,
    } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (userLookupError) {
      console.error(
        "Business user lookup error:",
        userLookupError
      );
    }

    if (businessByUser) {
      return NextResponse.json({
        success: true,
        exists: true,
        businessId: businessByUser.id,
      });
    }

    /*
     * If user_id isn't attached, check the login email.
     */
    const {
      data: businessByEmail,
      error: emailLookupError,
    } = await supabase
      .from("businesses")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (emailLookupError) {
      console.error(
        "Business email lookup error:",
        emailLookupError
      );

      return NextResponse.json(
        {
          success: false,
          exists: false,
          error: "Could not check your business account.",
          code: "BUSINESS_LOOKUP_FAILED",
        },
        { status: 500 }
      );
    }

    /*
     * Existing business found.
     *
     * Attach the authenticated user ID if necessary.
     */
    if (businessByEmail) {
      const { error: repairError } = await supabase
        .from("businesses")
        .update({
          user_id: user.id,
        })
        .eq("id", businessByEmail.id);

      if (repairError) {
        console.warn(
          "Could not attach business to user:",
          repairError
        );
      }

      return NextResponse.json({
        success: true,
        exists: true,
        businessId: businessByEmail.id,
      });
    }

    /*
     * No business exists for this login.
     */
    return NextResponse.json({
      success: true,
      exists: false,
      businessId: null,
      message:
        "Please tell us about your business to continue.",
    });
  } catch (error) {
    console.error("Business check error:", error);

    return NextResponse.json(
      {
        success: false,
        exists: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not check your business account.",
        code: "UNEXPECTED_ERROR",
      },
      { status: 500 }
    );
  }
}