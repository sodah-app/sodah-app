import { supabase } from "@/lib/supabase";

export async function getAuthenticatedBusiness() {
  // 1. Verify authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();

    return {
      authenticated: false,
      error: "No authenticated user.",
    };
  }

  // 2. Load business linked to this user
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

 if (businessError || !business) {
  console.log("Business Error:", businessError);
  console.log("Business:", business);

  return {
    authenticated: false,
    error: "Business not linked to this account.",
  };
}

  // 3. Success
  return {
    authenticated: true,

    user,

    business,

    businessId: business.business_id,

    businessName: business.business_name,

    email: user.email,

    fullName:
      business.full_name ||
      user.user_metadata?.full_name ||
      "",

    phone:
      business.support_number ||
      "",

    setupType:
      business.setup_type,

    subscription:
      business.subscription_status,

    whatsappConnected:
      business.whatsapp_connected,
  };
}