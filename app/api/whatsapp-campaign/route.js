import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVOLUTION_URL = (
  process.env.EVOLUTION_API_URL || "https://evolution.sodah.io"
).replace(/\/+$/, "");

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY?.trim();

const MAX_CONTACTS = 10000;
const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function isValidPhone(value) {
  return normalizePhone(value).replace(/\D/g, "").length >= 8;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;

  return {
    mimeType: match[1],
    base64: match[2],
    bytes: Buffer.from(match[2], "base64"),
  };
}

async function resolveBusiness(supabase, userId, requestedBusinessId = "") {
  const requestedId = String(requestedBusinessId || "").trim();

  let query = supabase
    .from("businesses")
    .select(
      "business_id,business_name,ai_number,whatsapp_connected,industry,location,price_range,capabilities,services_description,working_days,hours,created_at"
    )
    .eq("user_id", userId);

  // If the page supplied a businessId, only return that business when it
  // belongs to the authenticated user. This keeps the URL useful without
  // allowing one user to load another user's private business data.
  if (requestedId) {
    query = query.eq("business_id", requestedId);
  } else {
    query = query.order("created_at", { ascending: true }).limit(20);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Campaign] Business lookup failed:", error);
    throw new Error("Unable to load your Sodah business.");
  }

  const businesses = data || [];

  return (
    businesses.find((item) => item.whatsapp_connected === true) ||
    businesses[0] ||
    null
  );
}


function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const result = {};
  for (const part of parts) result[part.type] = part.value;
  return result;
}

function zonedDateToUtc(dateString, timeString, timeZone) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);

  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let i = 0; i < 4; i += 1) {
    const p = localParts(guess, timeZone);
    const actual = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second)
    );
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
    guess = new Date(guess.getTime() + (wanted - actual));
  }

  return guess;
}

function dateStringInZone(date, timeZone) {
  const p = localParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

function nextRunForSchedule(schedule) {
  const mode = String(schedule?.mode || "now");
  const timeZone = String(schedule?.timezone || "UTC");
  const time = String(schedule?.time || "00:00");

  if (mode === "scheduled") {
    if (!schedule?.date || !time) return null;
    return zonedDateToUtc(schedule.date, time, timeZone);
  }

  if (mode !== "daily" && mode !== "weekly") return null;

  const now = new Date();
  const current = localParts(now, timeZone);
  const today = `${current.year}-${current.month}-${current.day}`;

  if (mode === "daily") {
    let candidate = zonedDateToUtc(today, time, timeZone);

    if (candidate <= now) {
      candidate = zonedDateToUtc(
        dateStringInZone(new Date(now.getTime() + 86400000), timeZone),
        time,
        timeZone
      );
    }

    return candidate;
  }

  const desired = String(schedule?.weekly_day || "monday").toLowerCase();
  const desiredIndex = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ].indexOf(desired);

  const currentIndex = [
    "sun",
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
  ].indexOf(String(current.weekday || "").toLowerCase());

  if (desiredIndex < 0 || currentIndex < 0) return null;

  let delta = desiredIndex - currentIndex;
  if (delta < 0) delta += 7;

  let candidateDate = new Date(now.getTime() + delta * 86400000);
  let candidate = zonedDateToUtc(
    dateStringInZone(candidateDate, timeZone),
    time,
    timeZone
  );

  if (candidate <= now) {
    candidateDate = new Date(candidateDate.getTime() + 7 * 86400000);
    candidate = zonedDateToUtc(
      dateStringInZone(candidateDate, timeZone),
      time,
      timeZone
    );
  }

  return candidate;
}

function assertBusiness(business) {
  if (!business) {
    throw new Error("No Sodah business is connected to this account.");
  }

  if (business.whatsapp_connected !== true) {
    throw new Error("Connect WhatsApp before sending a campaign.");
  }

  if (!business.business_id) {
    throw new Error("Your business is missing its WhatsApp instance.");
  }

  if (!business.ai_number) {
    throw new Error("Your business WhatsApp number is not configured.");
  }
}

async function evolutionRequest(path, body) {
  if (!EVOLUTION_API_KEY) {
    throw new Error("WhatsApp sending is not configured.");
  }

  const response = await fetch(`${EVOLUTION_URL}${path}`, {
    method: "POST",
    headers: {
      apikey: EVOLUTION_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    console.error("[Campaign] Evolution error:", {
      status: response.status,
      data,
    });

    throw new Error(
      data?.message ||
        data?.error ||
        `WhatsApp service returned ${response.status}.`
    );
  }

  return data;
}

async function sendOne({ instance, contact, message, media }) {
  const number = normalizePhone(contact.phone);

  if (!isValidPhone(number)) {
    return {
      phone: number,
      success: false,
      error: "Invalid phone number.",
    };
  }

  try {
    if (media?.url) {
      await evolutionRequest(`/message/sendMedia/${encodeURIComponent(instance)}`, {
        number,
        mediatype: "image",
        mimetype: media.mime_type || "image/jpeg",
        caption: message || "",
        media: media.url,
        fileName: media.file_name || "campaign-image",
      });
    } else {
      await evolutionRequest(`/message/sendText/${encodeURIComponent(instance)}`, {
        number,
        text: message,
      });
    }

    return {
      phone: number,
      success: true,
    };
  } catch (error) {
    return {
      phone: number,
      success: false,
      error: error instanceof Error ? error.message : "Send failed.",
    };
  }
}

async function sendBatch({ business, contacts, message, media }) {
  const results = [];
  const concurrency = 10;

  for (let i = 0; i < contacts.length; i += concurrency) {
    const batch = contacts.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map((contact) =>
        sendOne({
          instance: business.business_id,
          contact,
          message,
          media,
        })
      )
    );

    results.push(...batchResults);
  }

  return results;
}

async function uploadCampaignMedia(dataUrl, fileName, mimeType, userId) {
  const parsed = parseDataUrl(dataUrl);

  if (!parsed) {
    throw new Error("The campaign image is invalid.");
  }

  if (parsed.bytes.length > MEDIA_MAX_BYTES) {
    throw new Error("The campaign image must be smaller than 5 MB.");
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Campaign media storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const safeName = String(fileName || "campaign-image")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-100);

  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error } = await admin.storage
    .from("campaign-media")
    .upload(path, parsed.bytes, {
      contentType: mimeType || parsed.mimeType,
      upsert: false,
    });

  if (error) {
    console.error("[Campaign] Media upload failed:", error);
    throw new Error("Unable to upload the campaign image.");
  }

  const { data } = admin.storage
    .from("campaign-media")
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Unable to create the campaign image URL.");
  }

  return {
    url: data.publicUrl,
    mime_type: mimeType || parsed.mimeType,
    file_name: safeName,
  };
}


async function getRequestSupabase(request) {
  const serverClient = await createServerClient();
  const serverAuth = await serverClient.auth.getUser();

  if (serverAuth?.data?.user) {
    return { supabase: serverClient, user: serverAuth.data.user };
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) return { supabase: null, user: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return { supabase: null, user: null };

  const tokenClient = createSupabaseClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await tokenClient.auth.getUser();

  if (error || !data?.user) return { supabase: null, user: null };

  return { supabase: tokenClient, user: data.user };
}

export async function GET(request) {
  try {
    const { supabase, user } = await getRequestSupabase(request);

    if (!supabase || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const requestedBusinessId = String(
      request.nextUrl?.searchParams?.get("businessId") ||
      request.nextUrl?.searchParams?.get("business_id") ||
      ""
    ).trim();


    const business = await resolveBusiness(
      supabase,
      user.id,
      requestedBusinessId
    );

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error: requestedBusinessId
            ? "The supplied business ID is not associated with this account."
            : "No business is associated with this account.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business: {
        business_id: business.business_id,
        business_name: business.business_name,
        whatsapp_connected: business.whatsapp_connected === true,
        ai_number: business.ai_number || null,
        industry: business.industry || null,
        location: business.location || null,
        price_range: business.price_range || null,
        capabilities: business.capabilities || null,
        services_description: business.services_description || null,
        working_days: business.working_days || null,
        hours: business.hours || null,
      },
    });
  } catch (error) {
    console.error("[Campaign] GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load campaign workspace.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getRequestSupabase(request);

    if (!supabase || !user) {
      return NextResponse.json(
        { success: false, error: "Please sign in before creating a campaign." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const campaignName = String(body?.campaign_name || "").trim();
    const message = String(body?.message || "").trim();
    const contacts = Array.isArray(body?.contacts) ? body.contacts : [];
    const schedule = body?.schedule || { mode: "now" };

    if (!campaignName) {
      return NextResponse.json(
        { success: false, error: "Campaign name is required." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Campaign message is required." },
        { status: 400 }
      );
    }

    if (contacts.length < 1) {
      return NextResponse.json(
        { success: false, error: "Add at least one contact." },
        { status: 400 }
      );
    }

    if (contacts.length > MAX_CONTACTS) {
      return NextResponse.json(
        {
          success: false,
          error: `A single campaign can contain up to ${MAX_CONTACTS} contacts.`,
        },
        { status: 400 }
      );
    }

    const requestedBusinessId = String(body?.business_id || "").trim();
    const business = await resolveBusiness(
      supabase,
      user.id,
      requestedBusinessId
    );
    assertBusiness(business);

    const normalizedContacts = contacts
      .map((contact) => ({
        name: String(contact?.name || "").trim(),
        phone: normalizePhone(contact?.phone),
        email: String(contact?.email || "").trim(),
      }))
      .filter((contact) => isValidPhone(contact.phone));

    if (!normalizedContacts.length) {
      return NextResponse.json(
        { success: false, error: "No valid WhatsApp contacts were supplied." },
        { status: 400 }
      );
    }

    let media = null;

    if (body?.media?.dataUrl) {
      media = await uploadCampaignMedia(
        body.media.dataUrl,
        body.media.name,
        body.media.type,
        user.id
      );
    }

    const mode = String(schedule?.mode || "now");

    if (mode !== "now") {
      const nextRun = nextRunForSchedule(schedule);
      const nextRunAt = nextRun ? nextRun.toISOString() : null;

      if (!nextRunAt) {
        throw new Error("The campaign schedule is incomplete or invalid.");
      }

      const campaignRow = {
        user_id: user.id,
        business_id: business.business_id,
        campaign_name: campaignName,
        message,
        message_type: body?.template ? "ai_or_template" : "custom",
        template: String(body?.template || ""),
        tone: String(body?.tone || "Friendly"),
        contacts: normalizedContacts,
        media,
        schedule,
        status: "scheduled",
        next_run_at: nextRunAt,
      };

      const { data, error } = await supabase
        .from("whatsapp_campaigns")
        .insert(campaignRow)
        .select("id,status,next_run_at")
        .single();

      if (error) {
        console.error("[Campaign] Schedule insert failed:", error);
        throw new Error(
          "The campaign could not be scheduled. Make sure the whatsapp_campaigns table has been created."
        );
      }

      return NextResponse.json({
        success: true,
        status: "scheduled",
        campaign_id: data.id,
        next_run_at: data.next_run_at,
      });
    }

    const results = await sendBatch({
      business,
      contacts: normalizedContacts,
      message,
      media,
    });

    const sent = results.filter((item) => item.success).length;
    const failed = results.length - sent;
    const status = failed ? "partial" : "sent";

    const { data: savedCampaign, error: saveError } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        user_id: user.id,
        business_id: business.business_id,
        campaign_name: campaignName,
        message,
        message_type: body?.template ? "ai_or_template" : "custom",
        template: String(body?.template || ""),
        tone: String(body?.tone || "Friendly"),
        contacts: normalizedContacts,
        media,
        schedule,
        status,
        last_run_at: new Date().toISOString(),
        next_run_at: null,
      })
      .select("id,status")
      .single();

    if (saveError) {
      console.error("[Campaign] History insert failed:", saveError);
    }

    if (!sent) {
      return NextResponse.json(
        {
          success: false,
          error:
            results[0]?.error ||
            "WhatsApp could not send any of the campaign messages.",
          results,
          campaign_id: savedCampaign?.id || null,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      status,
      campaign_id: savedCampaign?.id || null,
      total: results.length,
      sent,
      failed,
      results,
    });
  } catch (error) {
    console.error("[Campaign] POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to assign the WhatsApp campaign.",
      },
      { status: 500 }
    );
  }
}
