import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/* =========================================================
   CONFIG
========================================================= */

const MAX_CONTACTS = 10000;
const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

const SEND_CONCURRENCY = 1;
const CRON_BATCH_SIZE = 10;

const MEDIA_SIGNED_URL_SECONDS = 24 * 60 * 60;
const PROVIDER_TIMEOUT_MS = 120000;

const PROVIDER_URL = (
  process.env.WHATSAPP_QR_PROVIDER_URL ||
  process.env.WHATSAPP_PROVIDER_URL ||
  ""
).replace(/\/+$/, "");

const PROVIDER_API_KEY = (
  process.env.WHATSAPP_QR_PROVIDER_API_KEY ||
  process.env.PROVIDER_API_KEY ||
  ""
).trim();

/*
 * USE THE EXISTING .ENV VARIABLE.
 *
 * Example:
 *
 * CRON_SECRET=sodah-cron-9f7c2d8a6b4e1f3c7a9d5e2b800000000
 */
const CRON_SECRET = (
  process.env.CRON_SECRET || ""
).trim();

const MEDIA_BUCKET =
  process.env.WHATSAPP_CAMPAIGN_MEDIA_BUCKET ||
  "campaign-media";

/* =========================================================
   HELPERS
========================================================= */

function cleanString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function errorMessage(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  return (
    error.message ||
    error.error_description ||
    error.details ||
    error.hint ||
    "Unknown error"
  );
}

function safeJsonParse(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/* =========================================================
   CRON AUTHORIZATION
========================================================= */

/*
 * cron-job.org should send:
 *
 * x-cron-secret:
 * sodah-cron-9f7c2d8a6b4e1f3c7a9d5e2b800000000
 *
 * This is compared with:
 *
 * process.env.CRON_SECRET
 *
 * We also accept:
 *
 * Authorization: Bearer <CRON_SECRET>
 *
 * IMPORTANT:
 * This function must ALWAYS return a boolean.
 */

function isCronRequest(request) {
  if (!CRON_SECRET) {
    console.error(
      "[WhatsApp Campaign] CRON_SECRET is not configured."
    );

    return false;
  }

  const possibleHeaders = [
    request.headers.get("x-cron-secret"),
    request.headers.get("x-cronjob-secret"),
    request.headers.get("x-cron-auth"),
    request.headers.get("x-sodah-cron-secret"),
  ];

  for (const value of possibleHeaders) {
    if (
      cleanString(value) ===
      CRON_SECRET
    ) {
      return true;
    }
  }

  const authorization = cleanString(
    request.headers.get("authorization")
  );

  if (
    authorization ===
    `Bearer ${CRON_SECRET}`
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   SUPABASE
========================================================= */

function getAdminClient() {
  const url = cleanString(
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const serviceRoleKey = cleanString(
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server configuration is missing."
    );
  }

  return createSupabaseClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function getAnonClient() {
  const url = cleanString(
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  const anonKey = cleanString(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!url || !anonKey) {
    throw new Error(
      "Supabase configuration is missing."
    );
  }

  return createSupabaseClient(
    url,
    anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* =========================================================
   AUTHENTICATION
========================================================= */

async function getAuthenticatedUser(request) {
  /*
   * Normal Supabase cookie authentication.
   */
  try {
    const supabase =
      createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },

            setAll() {
              /*
               * No cookie mutation required here.
               */
            },
          },
        }
      );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return user;
    }
  } catch {
    /*
     * Continue to Bearer authentication.
     */
  }

  /*
   * Authorization: Bearer <Supabase access token>
   */
  const authorization = cleanString(
    request.headers.get("authorization")
  );

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token =
    authorization
      .slice("Bearer ".length)
      .trim();

  if (!token) {
    return null;
  }

  try {
    const supabase =
      getAnonClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(
      token
    );

    if (!error && user) {
      return user;
    }
  } catch {
    return null;
  }

  return null;
}

/* =========================================================
   BUSINESS
========================================================= */

async function resolveBusiness(
  supabase,
  userId,
  requestedBusinessId = ""
) {
  let query =
    supabase
      .from("businesses")
      .select(
        [
          "business_id",
          "business_name",
          "ai_number",
          "whatsapp_connected",
          "subscription_plan",
          "subscription_status",
          "messages_today",
          "industry",
          "location",
          "price_range",
          "capabilities",
          "services_description",
          "working_days",
          "hours",
          "created_at",
        ].join(",")
      )
      .eq(
        "user_id",
        userId
      );

  if (requestedBusinessId) {
    query =
      query.eq(
        "business_id",
        requestedBusinessId
      );
  }

  const {
    data,
    error,
  } =
    await query.order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      `Unable to load business: ${error.message}`
    );
  }

  if (
    !data ||
    data.length === 0
  ) {
    return null;
  }

  if (requestedBusinessId) {
    return data[0];
  }

  /*
   * Prefer the business that already has WhatsApp
   * connected.
   */
  const connected =
    data.find(
      (business) =>
        business.whatsapp_connected ===
        true
    );

  return connected || data[0];
}

/* =========================================================
   SUBSCRIPTION LIMITS
========================================================= */

const SUBSCRIPTION_LIMITS = {
  // maxPerSend is the maximum recipient count in one immediate or scheduled send.
  // dailyMessages counts successfully delivered messages across immediate and scheduled sends.
  // scheduled is the maximum number of active scheduled campaigns; scheduleContacts
  // is the maximum number of recipients in each scheduled campaign.
  "free": { name: "Free", maxPerSend: 20, dailyMessages: 100, scheduled: 5, scheduleContacts: 5 },
  "free trial": { name: "Free Trial", maxPerSend: 20, dailyMessages: 100, scheduled: 5, scheduleContacts: 5 },
  "starter": { name: "Starter", maxPerSend: 20, dailyMessages: 100, scheduled: 5, scheduleContacts: 5 },
  "business": { name: "Business", maxPerSend: 50, dailyMessages: 220, scheduled: 10, scheduleContacts: 5 },
  "pro": { name: "Pro", maxPerSend: 100, dailyMessages: 500, scheduled: 10, scheduleContacts: 10 },
};

function getPlanLimits(planValue) {
  const key = cleanString(planValue || "Free Trial")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+plan$/, "");
  return SUBSCRIPTION_LIMITS[key] || SUBSCRIPTION_LIMITS["free trial"];
}

function utcDayKey(date = new Date()) {
  // Sodah's target market is Dubai; daily allowances reset at Dubai midnight.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function reserveDailyMessage(supabase, business) {
  const limits = getPlanLimits(business.subscription_plan);
  const { data, error } = await supabase.rpc("reserve_whatsapp_campaign_message", {
    p_business_id: String(business.business_id),
    p_usage_day: utcDayKey(),
    p_daily_limit: limits.dailyMessages,
  });

  if (error) {
    throw new Error(`Unable to verify today's campaign message allowance. Please try again or contact support. (${error.message})`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.allowed !== true) {
    throw new Error(`Your ${limits.name} plan allows ${limits.dailyMessages.toLocaleString()} campaign messages per day. Your daily allowance has been reached.`);
  }
  return true;
}

async function releaseDailyMessage(supabase, business) {
  try {
    await supabase.rpc("release_whatsapp_campaign_message", {
      p_business_id: String(business.business_id),
      p_usage_day: utcDayKey(),
    });
  } catch (error) {
    console.error("Unable to release unused campaign message reservation:", error);
  }
}

async function checkScheduledCampaignLimit(supabase, business) {
  const limits = getPlanLimits(business.subscription_plan);
  const { count, error } = await supabase
    .from("whatsapp_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.business_id)
    .in("status", ["scheduled", "processing"]);

  if (error) {
    throw new Error(`Unable to verify scheduled campaign allowance: ${error.message}`);
  }
  if ((count || 0) >= limits.scheduled) {
    throw new Error(`Your ${limits.name} plan allows up to ${limits.scheduled} scheduled campaigns. You currently have ${count || 0}. Remove or complete a scheduled campaign before adding another.`);
  }
}

/* =========================================================
   PHONE
========================================================= */

function normalizePhone(value) {
  const raw =
    cleanString(value);

  if (!raw) {
    return "";
  }

  const digits =
    raw.replace(/\D/g, "");

  if (digits.length < 8) {
    return "";
  }

  return digits;
}

function phoneCountry(value, defaultCountry = "") {
  const raw = cleanString(value);
  if (!raw) return "";
  const normalized = raw.replace(/[\s().-]/g, "");
  const international = normalized.startsWith("00") ? `+${normalized.slice(2)}` : normalized;
  const candidates = [];
  if (international.startsWith("+")) candidates.push(international);
  else {
    const digits = normalized.replace(/\D/g, "");
    if (digits) candidates.push(`+${digits}`);
    if (defaultCountry && digits) candidates.push(digits);
  }
  for (const candidate of candidates) {
    try {
      const parsed = candidate.startsWith("+")
        ? parsePhoneNumberFromString(candidate)
        : parsePhoneNumberFromString(candidate, defaultCountry || undefined);
      if (parsed?.isValid() && parsed.country) return parsed.country;
    } catch {}
  }
  return "";
}

function phoneCallingCode(value, defaultCountry = "") {
  const raw = cleanString(value);
  if (!raw) return "";
  try {
    const international = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
    let parsed = international.startsWith("+") ? parsePhoneNumberFromString(international) : null;
    if (!parsed && !international.startsWith("+")) {
      const digits = international.replace(/\D/g, "");
      parsed = digits ? parsePhoneNumberFromString(`+${digits}`) : null;
      if (!parsed?.isValid() && defaultCountry) parsed = parsePhoneNumberFromString(international, defaultCountry);
    }
    return parsed?.isValid() ? String(parsed.countryCallingCode || "") : "";
  } catch {
    return "";
  }
}

function filterContactsToConnectedCountry(contacts, connectedNumber) {
  const country = phoneCountry(connectedNumber);
  const callingCode = phoneCallingCode(connectedNumber);
  if (!country || !callingCode) {
    throw new Error("We couldn't identify the country code of your connected WhatsApp number. Please check the connected number before creating a campaign.");
  }
  const eligible = [];
  const excluded = [];
  for (const contact of contacts) {
    const recipientCallingCode = phoneCallingCode(contact.phone, country);
    if (recipientCallingCode === callingCode) eligible.push(contact);
    else excluded.push({ ...contact, exclusionReason: recipientCallingCode ? "different_country_code" : "country_code_unidentified", detectedCallingCode: recipientCallingCode || null });
  }
  return { country, callingCode, eligible, excluded };
}

/* =========================================================
   CONTACTS
========================================================= */

function normalizeContacts(
  contacts
) {
  if (!Array.isArray(contacts)) {
    return [];
  }

  const normalized = [];

  for (
    const contact of contacts
  ) {
    if (
      !contact ||
      typeof contact !==
        "object"
    ) {
      continue;
    }

    const phone =
      normalizePhone(
        contact.phone
      );

    if (!phone) {
      continue;
    }

    normalized.push({
      name:
        cleanString(
          contact.name
        ),

      phone,

      email:
        cleanString(
          contact.email
        ),
    });

    if (
      normalized.length >=
      MAX_CONTACTS
    ) {
      break;
    }
  }

  return normalized;
}

/* =========================================================
   SCHEDULE
========================================================= */

function normalizeSchedule(
  schedule
) {
  if (
    !schedule ||
    typeof schedule !==
      "object" ||
    Array.isArray(schedule)
  ) {
    return {
      mode: "now",
    };
  }

  const mode =
    cleanString(
      schedule.mode ||
        "now"
    ).toLowerCase();

  return {
    mode:
      [
        "scheduled",
        "daily",
        "weekly",
      ].includes(mode)
        ? mode
        : "now",

    timezone:
      cleanString(
        schedule.timezone
      ) || "UTC",

    date:
      cleanString(
        schedule.date
      ),

    time:
      cleanString(
        schedule.time
      ) || "00:00",

    weekly_day:
      schedule.weekly_day ===
        undefined ||
      schedule.weekly_day ===
        null
        ? null
        : Number(
            schedule.weekly_day
          ),
  };
}

function getDatePartsInTimeZone(
  date,
  timeZone
) {
  try {
    const parts =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23",
        }
      ).formatToParts(date);

    const result = {};

    for (
      const part of parts
    ) {
      if (
        part.type !==
        "literal"
      ) {
        result[part.type] =
          part.value;
      }
    }

    return {
      year: Number(
        result.year
      ),
      month: Number(
        result.month
      ),
      day: Number(
        result.day
      ),
      hour: Number(
        result.hour
      ),
      minute: Number(
        result.minute
      ),
      second: Number(
        result.second
      ),
    };
  } catch {
    return null;
  }
}

function getTimeZoneOffsetMinutes(
  date,
  timeZone
) {
  const parts =
    getDatePartsInTimeZone(
      date,
      timeZone
    );

  if (!parts) {
    return 0;
  }

  const utcRepresentation =
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );

  return Math.round(
    (utcRepresentation -
      date.getTime()) /
      60000
  );
}

function zonedDateTimeToUtc(
  dateString,
  timeString,
  timeZone
) {
  const date =
    cleanString(
      dateString
    );

  const time =
    cleanString(
      timeString
    );

  if (!date || !time) {
    return null;
  }

  const timeMatch =
    time.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

  if (!timeMatch) {
    return null;
  }

  const hour =
    Number(
      timeMatch[1]
    );

  const minute =
    Number(
      timeMatch[2]
    );

  const second =
    Number(
      timeMatch[3] || 0
    );

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const dateMatch =
    date.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!dateMatch) {
    return null;
  }

  const year =
    Number(
      dateMatch[1]
    );

  const month =
    Number(
      dateMatch[2]
    );

  const day =
    Number(
      dateMatch[3]
    );

  const naiveUtc =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    );

  let utc =
    new Date(
      naiveUtc
    );

  const offset1 =
    getTimeZoneOffsetMinutes(
      utc,
      timeZone
    );

  utc =
    new Date(
      naiveUtc -
        offset1 * 60000
    );

  const offset2 =
    getTimeZoneOffsetMinutes(
      utc,
      timeZone
    );

  if (
    offset1 !== offset2
  ) {
    utc =
      new Date(
        naiveUtc -
          offset2 * 60000
      );
  }

  return utc;
}

function calculateNextRunAt(
  schedule,
  fromDate = new Date()
) {
  const normalized =
    normalizeSchedule(
      schedule
    );

  if (
    normalized.mode ===
    "now"
  ) {
    return null;
  }

  const timezone =
    normalized.timezone ||
    "UTC";

  /*
   * One-time scheduled campaign.
   */
  if (
    normalized.mode ===
    "scheduled"
  ) {
    const date =
      zonedDateTimeToUtc(
        normalized.date,
        normalized.time,
        timezone
      );

    if (!date) {
      throw new Error(
        "Invalid scheduled date, time, or timezone."
      );
    }

    return date.toISOString();
  }

  const nowParts =
    getDatePartsInTimeZone(
      fromDate,
      timezone
    );

  if (!nowParts) {
    throw new Error(
      "Invalid campaign timezone."
    );
  }

  /*
   * Daily.
   */
  if (
    normalized.mode ===
    "daily"
  ) {
    const today =
      `${nowParts.year}-${String(
        nowParts.month
      ).padStart(
        2,
        "0"
      )}-${String(
        nowParts.day
      ).padStart(
        2,
        "0"
      )}`;

    let candidate =
      zonedDateTimeToUtc(
        today,
        normalized.time,
        timezone
      );

    if (
      !candidate ||
      candidate.getTime() <=
        fromDate.getTime()
    ) {
      const tomorrow =
        new Date(
          fromDate.getTime() +
            24 *
              60 *
              60 *
              1000
        );

      const parts =
        getDatePartsInTimeZone(
          tomorrow,
          timezone
        );

      const tomorrowString =
        `${parts.year}-${String(
          parts.month
        ).padStart(
          2,
          "0"
        )}-${String(
          parts.day
        ).padStart(
          2,
          "0"
        )}`;

      candidate =
        zonedDateTimeToUtc(
          tomorrowString,
          normalized.time,
          timezone
        );
    }

    return candidate
      ? candidate.toISOString()
      : null;
  }

  /*
   * Weekly.
   */
  if (
    normalized.mode ===
    "weekly"
  ) {
    const desiredDay =
      Number.isFinite(
        normalized.weekly_day
      )
        ? normalized.weekly_day
        : 1;

    const currentLocalDate =
      new Date(
        Date.UTC(
          nowParts.year,
          nowParts.month - 1,
          nowParts.day
        )
      );

    const currentDay =
      currentLocalDate.getUTCDay();

    let daysUntil =
      desiredDay -
      currentDay;

    if (daysUntil < 0) {
      daysUntil += 7;
    }

    if (daysUntil === 0) {
      const today =
        `${nowParts.year}-${String(
          nowParts.month
        ).padStart(
          2,
          "0"
        )}-${String(
          nowParts.day
        ).padStart(
          2,
          "0"
        )}`;

      const candidate =
        zonedDateTimeToUtc(
          today,
          normalized.time,
          timezone
        );

      if (
        candidate &&
        candidate.getTime() >
          fromDate.getTime()
      ) {
        return candidate.toISOString();
      }

      daysUntil = 7;
    }

    const target =
      new Date(
        currentLocalDate.getTime() +
          daysUntil *
            24 *
            60 *
            60 *
            1000
      );

    const targetDate =
      `${target.getUTCFullYear()}-${String(
        target.getUTCMonth() + 1
      ).padStart(
        2,
        "0"
      )}-${String(
        target.getUTCDate()
      ).padStart(
        2,
        "0"
      )}`;

    const candidate =
      zonedDateTimeToUtc(
        targetDate,
        normalized.time,
        timezone
      );

    return candidate
      ? candidate.toISOString()
      : null;
  }

  return null;
}

/* =========================================================
   MEDIA
========================================================= */

function parseDataUrl(
  dataUrl
) {
  const value =
    cleanString(
      dataUrl
    );

  const match =
    value.match(
      /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i
    );

  if (!match) {
    return null;
  }

  const mimeType =
    cleanString(
      match[1]
    ) ||
    "application/octet-stream";

  const base64 =
    cleanString(
      match[2]
    );

  if (!base64) {
    return null;
  }

  try {
    return {
      mimeType,
      buffer:
        Buffer.from(
          base64,
          "base64"
        ),
    };
  } catch {
    return null;
  }
}

function safeFileName(
  name
) {
  return (
    cleanString(
      name
    ) ||
    "campaign-media"
  )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .slice(
      0,
      150
    );
}

async function uploadCampaignMedia(
  supabase,
  userId,
  media
) {
  if (
    !media ||
    typeof media !==
      "object"
  ) {
    return null;
  }

  if (!media.dataUrl) {
    return null;
  }

  const parsed =
    parseDataUrl(
      media.dataUrl
    );

  if (!parsed) {
    throw new Error(
      "Invalid media data."
    );
  }

  if (
    parsed.buffer.length >
    MEDIA_MAX_BYTES
  ) {
    throw new Error(
      "Campaign media is larger than the 5 MB limit."
    );
  }

  const fileName =
    safeFileName(
      media.name
    );

  const path =
    `${userId}/${Date.now()}-${randomUUID()}-${fileName}`;

  const {
    error,
  } =
    await supabase.storage
      .from(
        MEDIA_BUCKET
      )
      .upload(
        path,
        parsed.buffer,
        {
          contentType:
            cleanString(
              media.type
            ) ||
            parsed.mimeType,
          upsert: false,
        }
      );

  if (error) {
    throw new Error(
      `Media upload failed: ${error.message}`
    );
  }

  return {
    bucket:
      MEDIA_BUCKET,

    path,

    name:
      fileName,

    type:
      cleanString(
        media.type
      ) ||
      parsed.mimeType,

    size:
      parsed.buffer.length,
  };
}

async function getMediaUrl(
  supabase,
  media
) {
  if (!media) {
    return null;
  }

  if (
    typeof media ===
    "string"
  ) {
    return media;
  }

  if (
    media.publicUrl
  ) {
    return media.publicUrl;
  }

  if (
    media.url
  ) {
    return media.url;
  }

  const bucket =
    cleanString(
      media.bucket
    ) ||
    MEDIA_BUCKET;

  const path =
    cleanString(
      media.path
    );

  if (!path) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase.storage
      .from(bucket)
      .createSignedUrl(
        path,
        MEDIA_SIGNED_URL_SECONDS
      );

  if (error) {
    throw new Error(
      `Unable to create media URL: ${error.message}`
    );
  }

  return (
    data?.signedUrl ||
    null
  );
}

/* =========================================================
   WHATSAPP PROVIDER
========================================================= */

async function providerRequest(
  path,
  options = {}
) {
  if (!PROVIDER_URL) {
    throw new Error(
      "WhatsApp provider URL is not configured."
    );
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      PROVIDER_TIMEOUT_MS
    );

  try {
    const headers = {
      "Content-Type":
        "application/json",
      ...(options.headers || {}),
    };

    if (
      PROVIDER_API_KEY
    ) {
      headers.Authorization =
        `Bearer ${PROVIDER_API_KEY}`;

      headers["x-api-key"] =
        PROVIDER_API_KEY;
    }

    const response =
      await fetch(
        `${PROVIDER_URL}${path}`,
        {
          ...options,
          headers,
          signal:
            controller.signal,
          cache:
            "no-store",
        }
      );

    const text =
      await response.text();

    let body;

    try {
      body =
        text
          ? JSON.parse(text)
          : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      const message =
        typeof body ===
          "object" &&
        body
          ? body.message ||
            body.error ||
            body.detail ||
            `Provider returned ${response.status}`
          : cleanString(
              body
            ) ||
            `Provider returned ${response.status}`;

      throw new Error(
        message
      );
    }

    return body;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

/* =========================================================
   SEND USING EXISTING WHATSAPP SESSION
========================================================= */

async function sendWhatsAppMessage({
  business,
  phone,
  message,
  mediaUrl,
  media,
}) {
  if (
    !business ||
    !business.business_id
  ) {
    throw new Error(
      "Business ID is missing."
    );
  }

  if (
    business.whatsapp_connected !==
    true
  ) {
    throw new Error(
      "WhatsApp is not connected for this business."
    );
  }

  if (
    !business.ai_number
  ) {
    throw new Error(
      "Connected WhatsApp AI number is missing."
    );
  }

  const recipient =
    normalizePhone(
      phone
    );

  if (!recipient) {
    throw new Error(
      "Invalid recipient phone number."
    );
  }

  /*
   * VERY IMPORTANT:
   *
   * business.business_id is the EXISTING
   * connected WhatsApp session.
   *
   * We do NOT:
   *
   * - create a session
   * - generate a QR
   * - create another WhatsApp connection
   * - call Evolution
   *
   * The provider's existing endpoint:
   *
   * POST /session/:sessionId/send
   *
   * is used.
   */

  const sessionId =
    encodeURIComponent(
      String(
        business.business_id
      )
    );

  const payload = {
    phone:
      recipient,

    message:
      cleanString(
        message
      ),
  };

  if (mediaUrl) {
    payload.mediaUrl =
      mediaUrl;

    if (media) {
      payload.media = {
        name:
          cleanString(
            media.name
          ),

        type:
          cleanString(
            media.type
          ),

        url:
          mediaUrl,
      };
    }
  }

  return providerRequest(
    `/session/${sessionId}/send`,
    {
      method:
        "POST",

      body:
        JSON.stringify(
          payload
        ),
    }
  );
}

/* =========================================================
   CONCURRENCY
========================================================= */

async function runWithConcurrency(
  items,
  concurrency,
  worker
) {
  const results =
    new Array(
      items.length
    );

  let nextIndex = 0;

  async function runner() {
    while (true) {
      const index =
        nextIndex++;

      if (
        index >=
        items.length
      ) {
        return;
      }

      try {
        results[index] =
          await worker(
            items[index],
            index
          );
      } catch (error) {
        results[index] = {
          success:
            false,

          error:
            errorMessage(
              error
            ),
        };
      }
    }
  }

  const workers =
    Math.min(
      Math.max(
        1,
        concurrency
      ),
      Math.max(
        1,
        items.length
      )
    );

  await Promise.all(
    Array.from(
      {
        length:
          workers,
      },
      () =>
        runner()
    )
  );

  return results;
}

/* =========================================================
   SEND CAMPAIGN
========================================================= */

function buildCampaignFailureMessage(result) {
  const failures = Array.isArray(result?.results)
    ? result.results.filter((item) => item?.success !== true)
    : [];
  const reasons = [...new Set(failures.map((item) => cleanString(item?.error)).filter(Boolean))];
  const failedCount = Number(result?.failed || failures.length || 0);
  const total = Number(result?.total || 0);

  if (!failedCount) return "The campaign could not be completed. No recipient was confirmed as sent.";
  if (reasons.length === 1) {
    return `${failedCount} of ${total} recipient(s) could not be sent. Reason: ${reasons[0]}`;
  }
  if (reasons.length > 1) {
    const detail = reasons.slice(0, 4).map((reason, index) => `${index + 1}. ${reason}`).join("\n");
    const extra = reasons.length > 4 ? `\nAnd ${reasons.length - 4} other reason(s).` : "";
    return `${failedCount} of ${total} recipient(s) could not be sent.\nReasons:\n${detail}${extra}`;
  }
  return `${failedCount} of ${total} recipient(s) could not be sent. Check the campaign results for recipient details.`;
}

async function sendCampaign(
  supabase,
  campaign
) {
  const userId =
    cleanString(
      campaign.user_id
    );

  const businessId =
    cleanString(
      campaign.business_id
    );

  if (!userId) {
    throw new Error(
      "Campaign user ID is missing."
    );
  }

  if (!businessId) {
    throw new Error(
      "Campaign business ID is missing."
    );
  }

  const business =
    await resolveBusiness(
      supabase,
      userId,
      businessId
    );

  if (!business) {
    throw new Error(
      "Business could not be found."
    );
  }

  if (
    business.whatsapp_connected !==
    true
  ) {
    throw new Error(
      "WhatsApp is not connected for this business."
    );
  }

  if (
    !business.business_id
  ) {
    throw new Error(
      "Business session ID is missing."
    );
  }

  if (
    !business.ai_number
  ) {
    throw new Error(
      "Connected WhatsApp AI number is missing."
    );
  }

  const suppliedContacts =
    normalizeContacts(
      safeJsonParse(
        campaign.contacts,
        []
      )
    );
  const countryFilter = filterContactsToConnectedCountry(suppliedContacts, business.ai_number);
  const allowDifferentCountryCodes = safeJsonParse(campaign.schedule, campaign.schedule || {})?.allow_different_country_codes === true;
  const contacts = allowDifferentCountryCodes ? suppliedContacts : countryFilter.eligible;
  if (countryFilter.excluded.length && !allowDifferentCountryCodes) {
    console.warn(`[WhatsApp Campaign] Excluded ${countryFilter.excluded.length} non-${countryFilter.country} or unidentifiable recipient(s) from campaign ${campaign.id}; no cross-country confirmation was stored.`);
  }

  if (
    contacts.length === 0
  ) {
    throw new Error(
      "Campaign has no valid contacts."
    );
  }

  const executionLimits = getPlanLimits(business.subscription_plan);
  if (contacts.length > executionLimits.maxPerSend) {
    throw new Error(`Your ${executionLimits.name} plan allows up to ${executionLimits.maxPerSend} recipients per send. This campaign currently contains ${contacts.length}.`);
  }
  const executionSchedule = safeJsonParse(campaign.schedule, campaign.schedule || {});
  if (executionSchedule?.mode && executionSchedule.mode !== "now" && contacts.length > executionLimits.scheduleContacts) {
    throw new Error(`Your ${executionLimits.name} plan allows up to ${executionLimits.scheduleContacts} recipients in each scheduled campaign.`);
  }

  const message =
    cleanString(
      campaign.message
    );

  if (!message) {
    throw new Error(
      "Campaign message is empty."
    );
  }

  const media =
    safeJsonParse(
      campaign.media,
      campaign.media ||
        null
    );

  const mediaUrl =
    await getMediaUrl(
      supabase,
      media
    );

  const results =
    await runWithConcurrency(
      contacts,
      SEND_CONCURRENCY,
      async (
        contact
      ) => {
        let quotaReserved = false;
        try {
          await reserveDailyMessage(supabase, business);
          quotaReserved = true;

          const response =
            await sendWhatsAppMessage(
              {
                business,
                phone: contact.phone,
                message,
                mediaUrl,
                media,
              }
            );

          return {
            success: true,
            contact,
            response,
            sentAt: new Date().toISOString(),
          };
        } catch (error) {
          if (quotaReserved) {
            await releaseDailyMessage(supabase, business);
          }
          return {
            success: false,
            contact,
            error: errorMessage(error),
          };
        }
      }
    );

  const successful =
    results.filter(
      (result) =>
        result?.success ===
        true
    ).length;

  const failed =
    results.length -
    successful;

  // Queue one 24-hour follow-up for each successfully contacted recipient.
  // The queue is optional for older deployments until the migration is applied.
  const followupMode = executionSchedule?.followup_mode === "reconstruct" ? "reconstruct" : "same";
  const successfulResults = results.filter((result) => result?.success === true);
  if (successfulResults.length) {
    const followups = successfulResults.map((result) => {
      const sentAt = result.sentAt || new Date().toISOString();
      const dueAt = new Date(new Date(sentAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
      return ({
      campaign_id: campaign.id,
      user_id: userId,
      business_id: businessId,
      contact_phone: result.contact.phone,
      contact_name: result.contact.name || null,
      original_message: message,
      followup_mode: followupMode,
      tone: cleanString(campaign.tone) || "Friendly",
      status: "pending",
      first_sent_at: sentAt,
      due_at: dueAt,
      created_at: sentAt,
      updated_at: sentAt,
      });
    });
    const { error: followupInsertError } = await supabase
      .from("whatsapp_campaign_followups")
      .upsert(followups, { onConflict: "campaign_id,contact_phone,first_sent_at", ignoreDuplicates: true });
    if (followupInsertError) {
      console.error("[WhatsApp Campaign] Follow-up queue insert failed:", followupInsertError);
    }
  }

  return {
    success:
      failed === 0,

    total:
      results.length,

    successful,

    failed,

    results,
  };
}

/* =========================================================
   CLAIM DUE CAMPAIGNS
========================================================= */

async function claimDueCampaigns(
  supabase
) {
  const now =
    new Date().toISOString();

  console.log(
    "[WhatsApp Campaign Scheduler] Checking campaigns due before:",
    now
  );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "whatsapp_campaigns"
      )
      .select("*")
      .eq(
        "status",
        "scheduled"
      )
      .lte(
        "next_run_at",
        now
      )
      .order(
        "next_run_at",
        {
          ascending:
            true,
        }
      )
      .limit(
        CRON_BATCH_SIZE
      );

  if (error) {
    throw new Error(
      `Unable to load due campaigns: ${error.message}`
    );
  }

  console.log(
    "[WhatsApp Campaign Scheduler] Due campaigns found:",
    data?.length || 0
  );

  if (
    !data ||
    data.length === 0
  ) {
    return [];
  }

  const claimed = [];

  for (
    const campaign of data
  ) {
    /*
     * Atomic status transition:
     *
     * scheduled -> processing
     *
     * This prevents two scheduler requests from
     * processing the same campaign simultaneously.
     */
    const {
      data:
        updated,
      error:
        updateError,
    } =
      await supabase
        .from(
          "whatsapp_campaigns"
        )
        .update({
          status:
            "processing",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          campaign.id
        )
        .eq(
          "status",
          "scheduled"
        )
        .select("*")
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "[WhatsApp Campaign Scheduler] Failed to claim campaign:",
        campaign.id,
        updateError
      );

      continue;
    }

    if (!updated) {
      console.log(
        "[WhatsApp Campaign Scheduler] Campaign already claimed:",
        campaign.id
      );

      continue;
    }

    claimed.push(
      updated
    );
  }

  return claimed;
}

/* =========================================================
   24-HOUR FOLLOW-UP QUEUE
========================================================= */

async function generateCampaignFollowup(business, originalMessage, tone) {
  const apiKey = cleanString(process.env.OPENAI_API_KEY);
  if (!apiKey) throw new Error("Campaign AI is not configured.");
  const context = {
    business_name: business.business_name || "",
    industry: business.industry || "",
    location: business.location || "",
    services_description: business.services_description || "",
    capabilities: business.capabilities || "",
    price_range: business.price_range || "",
    working_days: business.working_days || "",
    hours: business.hours || "",
  };
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_CAMPAIGN_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You write a second WhatsApp follow-up message. Reconstruct the original message into a clearly different, natural continuation. Do not copy the original wording or resend it verbatim. Keep the same purpose and preserve every factual detail. Use only the supplied business facts. Never invent prices, discounts, promotions, services, dates, guarantees, links or claims. Keep it concise and natural. Return only the message." },
        { role: "user", content: `Tone: ${tone || "Friendly"}\nBusiness facts: ${JSON.stringify(context)}\nOriginal campaign message: ${originalMessage}\nWrite a distinct 24-hour follow-up that continues this campaign naturally.` },
      ],
    }),
  });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error("Campaign AI returned an invalid response."); }
  if (!response.ok) throw new Error(data?.error?.message || "Could not generate follow-up message.");
  const generated = cleanString(data?.choices?.[0]?.message?.content);
  if (!generated || generated === cleanString(originalMessage)) throw new Error("AI did not create a distinct follow-up message.");
  return generated;
}

async function processDueFollowups(supabase) {
  const now = new Date().toISOString();
  const { data: due, error } = await supabase.from("whatsapp_campaign_followups")
    .select("*").eq("status", "pending").lte("due_at", now).order("due_at", { ascending: true }).limit(50);
  if (error) throw new Error(`Unable to load due follow-ups: ${error.message}`);
  let sent = 0, failed = 0, cancelled = 0;
  for (const item of due || []) {
    const { data: claimed, error: claimError } = await supabase.from("whatsapp_campaign_followups")
      .update({ status: "processing", updated_at: now }).eq("id", item.id).eq("status", "pending").select("id").maybeSingle();
    if (claimError || !claimed) continue;
    try {
      const business = await resolveBusiness(supabase, item.user_id, item.business_id);
      if (!business || business.whatsapp_connected !== true) throw new Error("Business WhatsApp is not connected.");
      const message = item.followup_mode === "reconstruct"
        ? await generateCampaignFollowup(business, item.original_message, item.tone)
        : item.original_message;
      // Re-check after AI generation so a reply received during generation cancels the send.
      const { data: latest } = await supabase.from("whatsapp_campaign_followups")
        .select("status").eq("id", item.id).maybeSingle();
      if (!latest || latest.status !== "processing") { cancelled += 1; continue; }
      await reserveDailyMessage(supabase, business);
      try {
        await sendWhatsAppMessage({ business, phone: item.contact_phone, message, mediaUrl: null, media: null });
      } catch (sendError) {
        await releaseDailyMessage(supabase, business);
        throw sendError;
      }
      await supabase.from("whatsapp_campaign_followups").update({ status: "sent", followup_message: message, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", item.id).eq("status", "processing");
      sent += 1;
    } catch (error) {
      await supabase.from("whatsapp_campaign_followups").update({ status: "failed", last_error: errorMessage(error), updated_at: new Date().toISOString() }).eq("id", item.id);
      failed += 1;
    }
  }
  return { due: (due || []).length, sent, failed, cancelled };
}

/* =========================================================
   PROCESS DUE CAMPAIGNS
========================================================= */

async function processDueCampaigns(
  supabase
) {
  console.log(
    "[WhatsApp Campaign Scheduler] Starting scheduler..."
  );

  let followupResult = { due: 0, sent: 0, failed: 0, cancelled: 0 };
  try {
    followupResult = await processDueFollowups(supabase);
  } catch (error) {
    console.error("[WhatsApp Campaign Scheduler] Follow-up processing failed:", error);
  }

  const campaigns =
    await claimDueCampaigns(
      supabase
    );

  if (
    campaigns.length === 0
  ) {
    console.log(
      "[WhatsApp Campaign Scheduler] No campaigns are due."
    );

    return {
      processed:
        0,

      successful:
        0,

      failed:
        0,

      campaigns:
        [],
      followups: followupResult,
    };
  }

  const results = [];

  for (
    const campaign of campaigns
  ) {
    console.log(
      "[WhatsApp Campaign Scheduler] Processing campaign:",
      campaign.id
    );

    try {
      const result =
        await sendCampaign(
          supabase,
          campaign
        );

      const schedule =
        normalizeSchedule(
          safeJsonParse(
            campaign.schedule,
            campaign.schedule
          )
        );

      /*
       * DAILY / WEEKLY campaigns
       * remain scheduled.
       */
      if (
        schedule.mode ===
          "daily" ||
        schedule.mode ===
          "weekly"
      ) {
        const nextRunAt =
          calculateNextRunAt(
            schedule,
            new Date(
              Date.now() +
                1000
            )
          );

        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "whatsapp_campaigns"
            )
            .update({
              status:
                "scheduled",

              next_run_at:
                nextRunAt,

              last_run_at:
                new Date().toISOString(),

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              campaign.id
            );

        if (
          updateError
        ) {
          throw new Error(
            `Campaign sent but schedule update failed: ${updateError.message}`
          );
        }

        results.push({
          id:
            campaign.id,

          success:
            result.success,

          successful:
            result.successful,

          failed:
            result.failed,

          next_run_at:
            nextRunAt,
        });

        console.log(
          "[WhatsApp Campaign Scheduler] Recurring campaign completed:",
          campaign.id,
          "next:",
          nextRunAt
        );

        continue;
      }

      /*
       * One-time scheduled campaign.
       */
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "whatsapp_campaigns"
          )
          .update({
            status:
              "completed",

            next_run_at:
              null,

            last_run_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            campaign.id
          );

      if (
        updateError
      ) {
        throw new Error(
          `Campaign sent but completion update failed: ${updateError.message}`
        );
      }

      results.push({
        id:
          campaign.id,

        success:
          result.success,

        successful:
          result.successful,

        failed:
          result.failed,
      });

      console.log(
        "[WhatsApp Campaign Scheduler] One-time campaign completed:",
        campaign.id
      );
    } catch (error) {
      const message =
        errorMessage(
          error
        );

      console.error(
        "[WhatsApp Campaign Scheduler] Campaign failed:",
        campaign.id,
        message
      );

      /*
       * Retry in five minutes.
       */
      const retryAt =
        new Date(
          Date.now() +
            5 *
              60 *
              1000
        ).toISOString();

      await supabase
        .from(
          "whatsapp_campaigns"
        )
        .update({
          status:
            "scheduled",

          next_run_at:
            retryAt,

          last_error:
            message,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          campaign.id
        );

      results.push({
        id:
          campaign.id,

        success:
          false,

        error:
          message,

        retry_at:
          retryAt,
      });
    }
  }

  return {
    processed:
      results.length,

    successful:
      results.filter(
        (item) =>
          item.success ===
          true
      ).length,

    failed:
      results.filter(
        (item) =>
          item.success !==
          true
      ).length,

    campaigns:
      results,
    followups: followupResult,
  };
}

/* =========================================================
   CREATE CAMPAIGN
========================================================= */

async function createCampaign(
  request,
  user
) {
  const supabase =
    getAdminClient();

  const body =
    await request.json();

  const requestedBusinessId =
    cleanString(
      body.businessId ||
        body.business_id
    );

  const business =
    await resolveBusiness(
      supabase,
      user.id,
      requestedBusinessId
    );

  if (!business) {
    return json(
      {
        success:
          false,

        error:
          "No business was found for this account.",
      },
      404
    );
  }

  if (
    business.whatsapp_connected !==
    true
  ) {
    return json(
      {
        success:
          false,

        error:
          "Connect WhatsApp before creating a campaign.",
      },
      400
    );
  }

  if (
    !business.business_id
  ) {
    return json(
      {
        success:
          false,

        error:
          "Business ID is missing.",
      },
      400
    );
  }

  if (
    !business.ai_number
  ) {
    return json(
      {
        success:
          false,

        error:
          "The connected WhatsApp number is missing.",
      },
      400
    );
  }

  const campaignName =
    cleanString(
      body.campaign_name ||
        body.campaignName
    );

  const message =
    cleanString(
      body.message
    );

  if (!campaignName) {
    return json(
      {
        success:
          false,

        error:
          "Campaign name is required.",
      },
      400
    );
  }

  if (!message) {
    return json(
      {
        success:
          false,

        error:
          "Campaign message is required.",
      },
      400
    );
  }

  const suppliedContacts = normalizeContacts(body.contacts);
  let countryFilter;
  try {
    countryFilter = filterContactsToConnectedCountry(suppliedContacts, business.ai_number);
  } catch (error) {
    return json({ success: false, error: errorMessage(error), code: "CONNECTED_COUNTRY_UNKNOWN" }, 400);
  }

  const planLimits = getPlanLimits(business.subscription_plan);
  const hasDifferentCountryContacts = countryFilter.excluded.length > 0;
  const allowDifferentCountryCodes = body.confirm_different_country_codes === true;

  // Require an explicit owner decision before any non-matching or unidentified
  // country-code recipient can be included in a send or a scheduled campaign.
  if (hasDifferentCountryContacts && !allowDifferentCountryCodes) {
    const countryCounts = {};
    for (const contact of countryFilter.excluded) {
      const detected = phoneCallingCode(contact.phone, countryFilter.country);
      const label = detected ? `+${detected}` : "Unidentified";
      countryCounts[label] = (countryCounts[label] || 0) + 1;
    }
    return json({
      success: false,
      code: "COUNTRY_CODE_CONFIRMATION_REQUIRED",
      error: `${countryFilter.excluded.length} recipient(s) have a country code different from or unidentified against your connected number. Remove them or explicitly continue.`,
      excluded_contacts: countryFilter.excluded.length,
      allowed_country: countryFilter.country,
      country_counts: countryCounts,
    }, 409);
  }

  const contacts = allowDifferentCountryCodes ? suppliedContacts : countryFilter.eligible;
  const excludedContactCount = allowDifferentCountryCodes ? 0 : countryFilter.excluded.length;
  if (contacts.length === 0) {
    return json({ success: false, error: "Add at least one valid recipient.", code: "NO_VALID_CONTACTS" }, 400);
  }

  if (contacts.length > planLimits.maxPerSend) {
    return json({
      success: false,
      error: `Your ${planLimits.name} plan allows up to ${planLimits.maxPerSend} recipients per send. You added ${contacts.length}. Remove ${contacts.length - planLimits.maxPerSend} recipient(s) or upgrade your plan.`,
      code: "PLAN_SEND_LIMIT",
      limits: planLimits,
    }, 400);
  }

  const schedule = normalizeSchedule(body.schedule);
  schedule.allow_different_country_codes = allowDifferentCountryCodes;
  schedule.followup_mode = body.followup_mode === "reconstruct" ? "reconstruct" : "same";

  if (schedule.mode !== "now" && contacts.length > planLimits.scheduleContacts) {
    return json({
      success: false,
      error: `Your ${planLimits.name} plan allows up to ${planLimits.scheduleContacts} recipients in each scheduled campaign. You selected ${contacts.length}.`,
      code: "PLAN_SCHEDULE_CONTACT_LIMIT",
      limits: planLimits,
    }, 400);
  }

  let nextRunAt =
    null;

  if (
    schedule.mode !==
    "now"
  ) {
    try {
      nextRunAt =
        calculateNextRunAt(
          schedule
        );
    } catch (error) {
      return json(
        {
          success:
            false,

          error:
            errorMessage(
              error
            ),
        },
        400
      );
    }

    if (!nextRunAt) {
      return json(
        {
          success:
            false,

          error:
            "Unable to calculate the campaign schedule.",
        },
        400
      );
    }

    /*
     * One-time scheduled campaigns must be
     * in the future.
     */
    if (
      schedule.mode ===
        "scheduled" &&
      new Date(
        nextRunAt
      ).getTime() <=
        Date.now()
    ) {
      return json(
        {
          success:
            false,

          error:
            "The scheduled date and time must be in the future.",
        },
        400
      );
    }
  }

  if (schedule.mode !== "now") {
    try {
      await checkScheduledCampaignLimit(supabase, business);
    } catch (error) {
      return json({
        success: false,
        error: errorMessage(error),
        code: "PLAN_SCHEDULED_CAMPAIGN_LIMIT",
      }, 400);
    }
  }

  let media =
    null;

  if (
    body.media &&
    body.media.dataUrl
  ) {
    try {
      media =
        await uploadCampaignMedia(
          supabase,
          user.id,
          body.media
        );
    } catch (error) {
      return json(
        {
          success:
            false,

          error:
            errorMessage(
              error
            ),
        },
        400
      );
    }
  }

  /*
   * =======================================================
   * SCHEDULED CAMPAIGN
   * =======================================================
   */

  if (
    schedule.mode !==
    "now"
  ) {
    const {
      data:
        campaign,
      error,
    } =
      await supabase
        .from(
          "whatsapp_campaigns"
        )
        .insert({
          user_id:
            user.id,

          business_id:
            business.business_id,

          campaign_name:
            campaignName,

          message,

          contacts,

          schedule,

          media,

          status:
            "scheduled",

          next_run_at:
            nextRunAt,

          created_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .select("*")
        .single();

    if (error) {
      return json(
        {
          success:
            false,

          error:
            `Unable to create campaign: ${error.message}`,
        },
        500
      );
    }

    console.log(
      "[WhatsApp Campaign] Scheduled campaign created:",
      campaign.id,
      "next_run_at:",
      nextRunAt
    );

    return json({
      success:
        true,

      message:
        "Campaign scheduled successfully.",

      excluded_contacts: excludedContactCount,
      allowed_country: countryFilter.country,
      campaign,

      business: {
        business_id:
          business.business_id,

        business_name:
          business.business_name,

        ai_number:
          business.ai_number,

        whatsapp_connected:
          business.whatsapp_connected,
      },
    });
  }

  /*
   * =======================================================
   * IMMEDIATE CAMPAIGN
   * =======================================================
   */

  const {
    data:
      campaign,
    error:
      insertError,
  } =
    await supabase
      .from(
        "whatsapp_campaigns"
      )
      .insert({
        user_id:
          user.id,

        business_id:
          business.business_id,

        campaign_name:
          campaignName,

        message,

        contacts,

        // Preserve the owner's explicit cross-country confirmation.
        // The campaign worker re-checks this flag before sending; without it,
        // foreign recipients are filtered out and the worker reports
        // "Campaign has no valid contacts" even after the owner chose Continue.
        schedule: {
          ...schedule,
          mode: "now",
          allow_different_country_codes: allowDifferentCountryCodes,
        },

        media,

        status:
          "processing",

        next_run_at:
          null,

        created_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      })
      .select("*")
      .single();

  if (insertError) {
    return json(
      {
        success:
          false,

        error:
          `Unable to create campaign: ${insertError.message}`,
      },
      500
    );
  }

  try {
    const result =
      await sendCampaign(
        supabase,
        campaign
      );

    await supabase
      .from(
        "whatsapp_campaigns"
      )
      .update({
        status:
          "completed",

        last_run_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        campaign.id
      );

    return json({
      success:
        result.success,

      message:
        result.success
          ? "Campaign sent successfully."
          : buildCampaignFailureMessage(result),

      error: result.success ? null : buildCampaignFailureMessage(result),

      campaign_id:
        campaign.id,

      total:
        result.total,

      successful:
        result.successful,

      failed:
        result.failed,

      excluded_contacts: excludedContactCount,
      allowed_country: countryFilter.country,
      results:
        result.results,
    });
  } catch (error) {
    const message =
      errorMessage(
        error
      );

    await supabase
      .from(
        "whatsapp_campaigns"
      )
      .update({
        status:
          "failed",

        last_error:
          message,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        campaign.id
      );

    return json(
      {
        success:
          false,

        error:
          message,

        campaign_id:
          campaign.id,
      },
      500
    );
  }
}

/* =========================================================
   BUSINESS REPORT SETTINGS (shared WhatsApp API)
========================================================= */


function normalizeReportTime(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  // Native HTML time input and 24-hour values, optionally with seconds.
  let match = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(raw);
  if (match) {
    return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
  }

  // 12-hour values such as 8:05 PM, 08:05PM, or 8:05:00 pm.
  match = /^(0?[1-9]|1[0-2]):([0-5]\d)(?::[0-5]\d)?\s*(AM|PM)$/i.exec(raw);
  if (match) {
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return `${String(hour).padStart(2, "0")}:${match[2]}`;
  }

  return null;
}

function normaliseReportSettings(row, business) {
  return row || {
    business_id: String(business.business_id),
    enabled: false,
    report_time: "20:00",
    timezone: "Asia/Dubai",
    recipients: [],
    last_sent_date: null,
    last_status: "not_configured",
    last_error: null,
  };
}

async function getReportSettings(admin, business) {
  const { data, error } = await admin
    .from("business_report_settings")
    .select("business_id,enabled,report_time,timezone,recipients,last_sent_date,last_status,last_error,updated_at")
    .eq("business_id", String(business.business_id))
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || /business_report_settings/i.test(error.message || "")) {
      return json({ success: false, error: "The business_report_settings table is missing. Run the supplied Supabase migration.", code: "REPORT_SETTINGS_TABLE_MISSING" }, 500);
    }
    throw new Error(`Unable to load report settings: ${error.message}`);
  }

  let reportRow = data;
  const planKey = getPlanLimits(business.subscription_plan).name.toLowerCase();
  const reportAvailable = planKey === "business" || planKey === "pro";
  const businessPlan = planKey === "business";
  // If a Business account already has report settings, migrate its saved time
  // to the fixed 6 PM Dubai delivery time when the owner opens report settings.
  if (businessPlan && reportRow && (reportRow.report_time !== "18:00" || reportRow.timezone !== "Asia/Dubai")) {
    const { data: fixedRow, error: fixedError } = await admin
      .from("business_report_settings")
      .update({ report_time: "18:00", timezone: "Asia/Dubai", updated_at: new Date().toISOString() })
      .eq("business_id", String(business.business_id))
      .select("business_id,enabled,report_time,timezone,recipients,last_sent_date,last_status,last_error,updated_at")
      .single();
    if (fixedError) throw new Error(`Unable to apply the Business plan's fixed 6 PM report time: ${fixedError.message}`);
    reportRow = fixedRow;
  }
  const settings = normaliseReportSettings(reportRow, business);
  const effectiveReportTime = businessPlan ? "18:00" : (normalizeReportTime(settings.report_time) || "20:00");
  return json({
    success: true,
    report_available: reportAvailable,
    business_report_time_locked: businessPlan,
    business: {
      business_id: business.business_id,
      business_name: business.business_name,
      subscription_plan: business.subscription_plan,
      whatsapp_connected: business.whatsapp_connected,
    },
    settings: {
      ...settings,
      enabled: reportAvailable && settings.enabled === true,
      report_time: effectiveReportTime,
      delivery_time: effectiveReportTime,
      timezone: businessPlan ? "Asia/Dubai" : settings.timezone,
      time_zone: businessPlan ? "Asia/Dubai" : settings.timezone,
    },
  });
}

async function saveReportSettings(request, user, body) {
  const admin = getAdminClient();
  const requestedBusinessId = cleanString(
    body.business_id || body.businessId || new URL(request.url).searchParams.get("business_id") || new URL(request.url).searchParams.get("businessId")
  );
  const business = await resolveBusiness(admin, user.id, requestedBusinessId);
  if (!business) return json({ success: false, error: "No business was found for this account." }, 404);

  const planName = getPlanLimits(business.subscription_plan).name.toLowerCase();
  const reportAvailable = planName === "business" || planName === "pro";
  if (!reportAvailable) {
    return json({ success: false, error: "Daily Business Summary is available on Business and Pro plans. Upgrade your subscription to use reports.", code: "REPORT_PLAN_REQUIRED" }, 403);
  }
  const businessPlan = planName === "business";
  const enabled = body.enabled === true;

  // Accept the browser's native time input (HH:mm), optional seconds,
  // and 12-hour display values. Persist one canonical HH:mm value for cron.
  // An empty field is not silently replaced: the owner must choose a time.
  const rawReportTime = businessPlan ? "18:00" : (body.report_time ?? body.delivery_time);
  const reportTime = normalizeReportTime(rawReportTime);

  const timezone = businessPlan ? "Asia/Dubai" : String(body.timezone ?? body.time_zone ?? "Asia/Dubai");
  const rawRecipients = Array.isArray(body.recipients) ? body.recipients : [];
  const recipients = [...new Set(rawRecipients.map((value) => String(value ?? "").trim()).filter(Boolean))];

  if (!reportTime) {
    return json({
      success: false,
      error: "Please select a delivery time. Any time of day is allowed.",
      code: "INVALID_REPORT_TIME",
    }, 400);
  }
  if (recipients.length > 10) return json({ success: false, error: "Add no more than 10 report recipients." }, 400);
  if (recipients.some((phone) => !/^\+?[0-9 ()-]{8,20}$/.test(phone))) {
    return json({ success: false, error: "Enter valid phone numbers with country codes." }, 400);
  }
  if (enabled && !business.whatsapp_connected) {
    return json({ success: false, error: "Connect WhatsApp before enabling report delivery." }, 400);
  }
  if (enabled && recipients.length === 0) {
    return json({ success: false, error: "Add at least one authorised report recipient." }, 400);
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    return json({ success: false, error: "Choose a valid time zone." }, 400);
  }

  const payload = {
    business_id: String(business.business_id),
    user_id: user.id,
    enabled,
    report_time: reportTime,
    timezone,
    recipients,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("business_report_settings")
    .upsert(payload, { onConflict: "business_id" })
    .select("business_id,enabled,report_time,timezone,recipients,last_sent_date,last_status,last_error,updated_at")
    .single();

  if (error) {
    if (error.code === "42P01" || /business_report_settings/i.test(error.message || "")) {
      return json({ success: false, error: "The business_report_settings table is missing. Run the supplied Supabase migration.", code: "REPORT_SETTINGS_TABLE_MISSING" }, 500);
    }
    throw new Error(`Unable to save report settings: ${error.message}`);
  }

  return json({
    success: true,
    settings: { ...data, delivery_time: data.report_time, time_zone: data.timezone },
    message: businessPlan
      ? "Daily Business Summary saved. Business plan reports are fixed at 6:00 PM Dubai time."
      : "Daily Business Summary saved successfully. Automatic WhatsApp delivery is active.",
  });
}

/* =========================================================
   GET
========================================================= */


async function manageScheduledCampaign(request, user, body) {
  const supabase = getAdminClient();
  const business = await resolveBusiness(
    supabase,
    user.id,
    cleanString(body.business_id || body.businessId)
  );
  if (!business?.business_id) {
    return json({ success: false, error: "Business not found for this account." }, 404);
  }

  const campaignId = cleanString(body.campaign_id || body.campaignId);
  if (!campaignId) return json({ success: false, error: "Campaign ID is required." }, 400);

  const { data: campaign, error: findError } = await supabase
    .from("whatsapp_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("business_id", business.business_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) return json({ success: false, error: findError.message }, 500);
  if (!campaign) return json({ success: false, error: "Scheduled campaign not found." }, 404);

  const schedule = normalizeSchedule(safeJsonParse(campaign.schedule, campaign.schedule));
  if (!["daily", "weekly"].includes(schedule.mode)) {
    return json({ success: false, error: "Only daily and weekly recurring campaigns can be managed here." }, 409);
  }

  const action = cleanString(body.action).toLowerCase();
  const status = cleanString(campaign.status).toLowerCase();
  const now = new Date().toISOString();
  let patch = null;

  if (action === "pause_campaign") {
    if (status !== "scheduled") return json({ success: false, error: "Only scheduled campaigns can be paused." }, 409);
    patch = { status: "paused", updated_at: now };
  } else if (action === "resume_campaign") {
    if (status !== "paused") return json({ success: false, error: "Only paused campaigns can be resumed." }, 409);
    patch = { status: "scheduled", next_run_at: calculateNextRunAt(schedule, new Date()), updated_at: now };
  } else if (action === "edit_campaign") {
    if (!["scheduled", "paused"].includes(status)) return json({ success: false, error: "Only scheduled or paused campaigns can be edited." }, 409);
    const campaignName = cleanString(body.campaign_name || body.campaignName);
    const message = cleanString(body.message);
    const updatedSchedule = normalizeSchedule(body.schedule || schedule);
    if (!campaignName || !message) return json({ success: false, error: "Campaign name and message are required." }, 400);
    if (!["daily", "weekly"].includes(updatedSchedule.mode)) return json({ success: false, error: "This editor only supports daily and weekly schedules." }, 400);
    const nextRun = calculateNextRunAt(updatedSchedule, new Date());
    patch = {
      campaign_name: campaignName,
      message,
      schedule: updatedSchedule,
      next_run_at: nextRun,
      updated_at: now,
    };
  } else if (action === "delete_campaign") {
    if (["processing", "sending"].includes(status)) return json({ success: false, error: "A campaign that is currently sending cannot be deleted." }, 409);
    const { error: deleteError } = await supabase
      .from("whatsapp_campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("business_id", business.business_id)
      .eq("user_id", user.id);
    if (deleteError) return json({ success: false, error: deleteError.message }, 500);
    return json({ success: true, message: "Recurring schedule deleted." });
  } else {
    return json({ success: false, error: "Unsupported campaign action." }, 400);
  }

  const { data: updated, error: updateError } = await supabase
    .from("whatsapp_campaigns")
    .update(patch)
    .eq("id", campaignId)
    .eq("business_id", business.business_id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError) return json({ success: false, error: updateError.message }, 500);
  return json({ success: true, message: "Recurring schedule updated.", campaign: updated });
}

export async function GET(
  request
) {
  try {
    /*
     * =====================================================
     * EXTERNAL SCHEDULER
     * =====================================================
     *
     * cron-job.org -> GET
     *
     * Header:
     *
     * x-cron-secret:
     * <existing CRON_SECRET>
     *
     * OR:
     *
     * Authorization:
     * Bearer <existing CRON_SECRET>
     */

    if (
      isCronRequest(
        request
      )
    ) {
      console.log(
        "[WhatsApp Campaign Scheduler] Authorized cron request received."
      );

      const admin =
        getAdminClient();

      const result =
        await processDueCampaigns(
          admin
        );

      console.log(
        "[WhatsApp Campaign Scheduler] Finished:",
        result
      );

      return json({
        success:
          true,

        cron:
          true,

        ...result,

        timestamp:
          new Date().toISOString(),
      });
    }

    /*
     * IMPORTANT:
     *
     * If x-cron-secret was supplied but is wrong,
     * return a cron authorization error instead of
     * falling through to Supabase authentication.
     *
     * This makes cron-job.org errors much easier
     * to diagnose.
     */

    const suppliedCronSecret =
      cleanString(
        request.headers.get(
          "x-cron-secret"
        )
      );

    const suppliedCronJobSecret =
      cleanString(
        request.headers.get(
          "x-cronjob-secret"
        )
      );

    const suppliedCronAuth =
      cleanString(
        request.headers.get(
          "x-cron-auth"
        )
      );

    const suppliedSodahCronSecret =
      cleanString(
        request.headers.get(
          "x-sodah-cron-secret"
        )
      );

    const authorization =
      cleanString(
        request.headers.get(
          "authorization"
        )
      );

    const looksLikeCronRequest =
      Boolean(
        suppliedCronSecret ||
          suppliedCronJobSecret ||
          suppliedCronAuth ||
          suppliedSodahCronSecret
      ) ||
      authorization ===
        `Bearer ${CRON_SECRET}`;

    if (
      looksLikeCronRequest
    ) {
      return json(
        {
          success:
            false,

          error:
            "Invalid cron authorization.",
        },
        401
      );
    }

    /*
     * =====================================================
     * NORMAL AUTHENTICATED GET
     * =====================================================
     */

    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return json(
        {
          success:
            false,

          error:
            "Unauthorized.",
        },
        401
      );
    }

    const url =
      new URL(
        request.url
      );

    const requestedBusinessId =
      cleanString(
        url.searchParams.get(
          "businessId"
        ) ||
          url.searchParams.get(
            "business_id"
          )
      );

    const supabase =
      getAdminClient();

    const business =
      await resolveBusiness(
        supabase,
        user.id,
        requestedBusinessId
      );

    if (!business) {
      return json({
        success:
          true,

        business:
          null,
      });
    }

    const resource = cleanString(url.searchParams.get("resource")).toLowerCase();
    if (resource === "report-settings") {
      return await getReportSettings(supabase, business);
    }

    if (resource === "campaigns") {
      const { data: campaigns, error: campaignsError } = await supabase
        .from("whatsapp_campaigns")
        .select("*")
        .eq("business_id", business.business_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (campaignsError) {
        console.error("[WhatsApp Campaign] Could not load campaign schedules:", campaignsError);
        return json({ success: false, error: `Unable to load schedules: ${campaignsError.message}` }, 500);
      }

      return json({ success: true, campaigns: campaigns || [] });
    }

    return json({
      success:
        true,

      business: {
        business_id:
          business.business_id,

        business_name:
          business.business_name,

        ai_number:
          business.ai_number,

        whatsapp_connected:
          business.whatsapp_connected,

        subscription_plan: business.subscription_plan || "Free Trial",
        subscription_status: business.subscription_status || null,

        industry:
          business.industry,

        location:
          business.location,

        price_range:
          business.price_range,

        capabilities:
          business.capabilities,

        services_description:
          business.services_description,

        working_days:
          business.working_days,

        hours:
          business.hours,

        created_at:
          business.created_at,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/whatsapp-campaign error:",
      error
    );

    return json(
      {
        success:
          false,

        error:
          errorMessage(
            error
          ),
      },
      500
    );
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request
) {
  try {
    /*
     * POST is for creating campaigns.
     *
     * cron-job.org uses GET.
     */
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return json(
        {
          success:
            false,

          error:
            "Unauthorized.",
        },
        401
      );
    }

    const bodyPreview = await request.clone().json().catch(() => null);
    if (bodyPreview?.action === "save_report_settings") {
      return await saveReportSettings(request, user, bodyPreview);
    }
    if (bodyPreview?.action === "cancel_contact_followups") {
      const businessId = cleanString(bodyPreview.business_id);
      const phone = cleanString(bodyPreview.phone).replace(/[^\d]/g, "");
      if (!businessId || !phone) return json({ success: false, error: "Business ID and contact phone are required." }, 400);
      const admin = getAdminClient();
      const { data: business } = await admin.from("businesses").select("business_id").eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
      if (!business) return json({ success: false, error: "Business not found." }, 404);
      const { error: cancelError } = await admin.from("whatsapp_campaign_followups")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("business_id", businessId).eq("contact_phone", phone).in("status", ["pending", "processing"]);
      if (cancelError) return json({ success: false, error: cancelError.message }, 500);
      return json({ success: true, message: "Pending follow-ups cancelled for this contact." });
    }
    if (bodyPreview?.action && bodyPreview.action.endsWith("_campaign")) {
      return await manageScheduledCampaign(request, user, bodyPreview);
    }

    return await createCampaign(
      request,
      user
    );
  } catch (error) {
    console.error(
      "POST /api/whatsapp-campaign error:",
      error
    );

    return json(
      {
        success:
          false,

        error:
          errorMessage(
            error
          ),
      },
      500
    );
  }
}