import { createClient } from "@supabase/supabase-js";

function env(name) {
  return process.env[name]?.trim() || "";
}

export function adminSupabase() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Missing Supabase server configuration.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function authenticateRequest(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (!token) return null;

  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!url || !anon) throw new Error("Missing Supabase public configuration.");

  const client = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireBusinessOwner(request, businessId) {
  const user = await authenticateRequest(request);
  if (!user) return { error: "Unauthorized", status: 401 };

  if (!businessId) return { error: "Missing businessId", status: 400 };

  const db = adminSupabase();

  // Adjust this ownership lookup only if your existing businesses schema
  // uses a different owner column.
  const { data: business, error } = await db
    .from("businesses")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;
  if (!business) return { error: "Business not found", status: 404 };

  const ownerId =
    business.user_id ??
    business.owner_id ??
    business.auth_user_id ??
    business.created_by;

  if (ownerId && ownerId !== user.id) {
    return { error: "You do not have access to this business", status: 403 };
  }

  return { user, business };
}
