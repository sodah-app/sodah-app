import { supabase } from "@/lib/supabase";

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      authenticated: false,
    };
  }

  return {
    authenticated: true,
    user,
    profile: {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || "",
      phone: user.user_metadata?.phone || "",
      avatar: user.user_metadata?.avatar_url || "",
    },
  };
}