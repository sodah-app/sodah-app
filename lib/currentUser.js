import { supabase } from "@/lib/supabase";

export async function getCurrentUser() {
  /*
   * ---------------------------------------------------------
   * FIRST: CHECK SECURE SUPER ADMIN SESSION
   * ---------------------------------------------------------
   *
   * The server verifies the signed HttpOnly cookie.
   * We do NOT trust localStorage or a client-provided email.
   */

  try {
    const response = await fetch(
      "/api/auth/current-user",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    if (response.ok) {
      const adminAuth =
        await response.json();

      if (
        adminAuth?.authenticated &&
        adminAuth?.isSuperAdmin
      ) {
        return adminAuth;
      }
    }
  } catch (error) {
    console.error(
      "[Current User] Super Admin session check failed:",
      error
    );
  }

  /*
   * ---------------------------------------------------------
   * NORMAL SUPABASE AUTHENTICATION
   * ---------------------------------------------------------
   */

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      authenticated: false,
      isSuperAdmin: false,
    };
  }

  return {
    authenticated: true,
    isSuperAdmin: false,

    user,

    profile: {
      id: user.id,
      email: user.email,
      fullName:
        user.user_metadata?.full_name ||
        "",
      phone:
        user.user_metadata?.phone ||
        "",
      avatar:
        user.user_metadata?.avatar_url ||
        "",
    },
  };
}