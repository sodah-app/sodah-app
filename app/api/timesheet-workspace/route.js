import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function getAuthenticatedSupabase(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL or public key is not configured.");
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {},
    },
  });
  const { data: { user } = {}, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Sign in to save and restore your Timesheet workspace.", status: 401 };
  return { supabase, user };
}

export async function GET(request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (auth.error) return json({ error: auth.error }, auth.status);
    const { data, error } = await auth.supabase
      .from("sodah_timesheet_workspaces")
      .select("workspace, updated_at")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    return json({ workspace: data?.workspace || {}, updatedAt: data?.updated_at || null });
  } catch (error) {
    return json({ error: error?.message || "Unable to load Timesheet workspace." }, 500);
  }
}

export async function PUT(request) {
  try {
    const auth = await getAuthenticatedSupabase(request);
    if (auth.error) return json({ error: auth.error }, auth.status);
    const partial = await request.json();
    if (!partial || typeof partial !== "object" || Array.isArray(partial)) return json({ error: "Invalid workspace payload." }, 400);
    const allowed = ["sheets", "settings", "attendanceTrash", "equipmentSheets", "equipmentRows", "generalSheets", "generalTrash"];
    const payload = Object.fromEntries(Object.entries(partial).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(payload).length) return json({ error: "No supported workspace data was supplied." }, 400);
    const { error } = await auth.supabase.rpc("save_sodah_timesheet_workspace", { p_workspace: payload });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, savedAt: new Date().toISOString() });
  } catch (error) {
    return json({ error: error?.message || "Unable to save Timesheet workspace." }, 500);
  }
}
