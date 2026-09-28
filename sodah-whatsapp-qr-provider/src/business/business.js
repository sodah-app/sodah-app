module.exports = function createBusiness(ctx) {
  const {
    AI_ENABLED,
    API_KEY,
    APPOINTMENTS_TABLE,
    APPOINTMENT_DURATION_MINUTES,
    AUTH_DIR,
    BUSINESSES_TABLE,
    CONVERSATIONS_TABLE,
    CUSTOMERS_TABLE,
    DATABASE_URL,
    DATA_DIR,
    DEFAULT_AI_PROMPT,
    DEFAULT_VOICE_PROFILE,
    DisconnectReason,
    FALLBACK_REPLY,
    FOLLOWUP_DELAY_MINUTES,
    FOLLOWUP_ENABLED,
    HANDOVER_FILE,
    HISTORY_LIMIT,
    HOST,
    IGNORE_GROUPS,
    IGNORE_STATUS,
    MEMORY_SCHEMA,
    MESSAGE_DEDUP_TTL_SECONDS,
    OPENAI_API_KEY,
    OPENAI_MAX_TOKENS,
    OPENAI_MODEL,
    OPENAI_STT_MODEL,
    OPENAI_TEMPERATURE,
    OPENAI_TTS_FORMAT,
    OPENAI_TTS_MODEL,
    OPENAI_TTS_VOICE,
    PORT,
    PRODUCTS_TABLE,
    PRODUCT_CATALOG_LIMIT,
    PRODUCT_IMAGES_TABLE,
    PRODUCT_IMAGE_BUCKET,
    QRCode,
    REMINDERS_ENABLED,
    REMINDER_HOURS_BEFORE,
    SLOT_MINUTES,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
    TIMEZONE,
    VOICE_ACCENT_INSTRUCTIONS,
    VOICE_AUTO_REPLY,
    VOICE_ENABLED,
    VOICE_GENDER_TO_TTS,
    VOICE_MAX_SECONDS,
    addMarker,
    aiMessageIds,
    app,
    appointmentDateTime,
    callOpenAI,
    cleanDecision,
    conversationMemory,
    cors,
    createSession,
    customerFacingReply,
    decideNextAction,
    downloadMediaMessage,
    express,
    extractAudioMessage,
    fallbackDecision,
    fetchLatestBaileysVersion,
    fs,
    handleAvailability,
    handleIncomingMessage,
    handoverMemory,
    isIncomingVoiceMessage,
    logger,
    makeWASocket,
    memoryPool,
    normalizeAppointmentTime,
    notesHasMarker,
    path,
    pendingAiMessages,
    pendingVoiceReplies,
    pino,
    plannerPrompt,
    processBooking,
    processCancel,
    processReschedule,
    processedMessages,
    resolveVoiceProfile,
    restorePersistedConnectedSessions,
    runAppointmentAutomationOnce,
    sendAndRemember,
    sendSafeWhatsAppReply,
    sendWhatsAppVoiceReply,
    server,
    sessions,
    setPendingVoiceReply,
    shouldReplyWithVoice,
    staffBookingReply,
    synthesizeWhatsAppVoice,
    transcribeWhatsAppAudio,
    unwrapWhatsAppMessage,
    useMultiFileAuthState,
  } = ctx;

async function initPersistentMemory() {
  if (!memoryPool || ctx.memoryReady) return;
  const client = await memoryPool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS ${MEMORY_SCHEMA}.sodah_conversation_messages (id BIGSERIAL PRIMARY KEY, business_id TEXT NOT NULL, customer_phone TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('user','assistant','system')), content TEXT NOT NULL, message_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await client.query(`CREATE INDEX IF NOT EXISTS sodah_memory_conv_idx ON ${MEMORY_SCHEMA}.sodah_conversation_messages (business_id, customer_phone, created_at DESC)`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS sodah_memory_message_idx ON ${MEMORY_SCHEMA}.sodah_conversation_messages (business_id, customer_phone, message_id) WHERE message_id IS NOT NULL`);
    await client.query(`CREATE TABLE IF NOT EXISTS ${MEMORY_SCHEMA}.sodah_appointment_drafts (business_id TEXT NOT NULL, customer_phone TEXT NOT NULL, customer_name TEXT, service TEXT, appointment_date DATE, appointment_time TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'incomplete', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (business_id, customer_phone))`);
    await client.query(`CREATE TABLE IF NOT EXISTS ${MEMORY_SCHEMA}.sodah_handover_state (business_id TEXT NOT NULL, customer_phone TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT FALSE, reason TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (business_id, customer_phone))`);
    await client.query(`CREATE TABLE IF NOT EXISTS ${MEMORY_SCHEMA}.sodah_automation_state (business_id TEXT NOT NULL, customer_phone TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, last_sent_at TIMESTAMPTZ NULL, next_allowed_at TIMESTAMPTZ NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (business_id, customer_phone, kind))`);
    await client.query(`CREATE TABLE IF NOT EXISTS ${MEMORY_SCHEMA}.sodah_whatsapp_identities (business_id TEXT NOT NULL, lid_jid TEXT NOT NULL, phone TEXT NOT NULL, customer_name TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (business_id, lid_jid))`);
    await client.query(`CREATE INDEX IF NOT EXISTS sodah_whatsapp_identity_phone_idx ON ${MEMORY_SCHEMA}.sodah_whatsapp_identities (business_id, phone)`);
    ctx.memoryReady = true;
    logger.info("Persistent Sodah memory database is ready.");
  } finally { client.release(); }
}

async function memoryQuery(text, values=[]) { if (!memoryPool) return null; await initPersistentMemory(); return memoryPool.query(text, values); }

async function loadPersistentHistory(businessId, customerPhone) {
  if (!memoryPool) return [];
  try {
    const result = await memoryQuery(`SELECT role, content, created_at FROM ${MEMORY_SCHEMA}.sodah_conversation_messages WHERE business_id=$1 AND customer_phone=$2 ORDER BY created_at DESC LIMIT $3`, [String(businessId), normalizePhone(customerPhone), HISTORY_LIMIT]);
    return result.rows.reverse().map(r => ({ role:r.role, content:r.content, at:new Date(r.created_at).toISOString() }));
  } catch (error) { logger.warn({businessId, customerPhone, error:error.message}, "Persistent conversation history load failed."); return []; }
}

async function persistMessage(businessId, customerPhone, role, text, messageId=null) {
  if (!memoryPool || !text) return;
  try { await memoryQuery(`INSERT INTO ${MEMORY_SCHEMA}.sodah_conversation_messages (business_id, customer_phone, role, content, message_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [String(businessId), normalizePhone(customerPhone), role, String(text), messageId || null]); }
  catch (error) { logger.warn({businessId, customerPhone, error:error.message}, "Persistent message save failed."); }
}

async function loadAppointmentDraft(businessId, customerPhone) {
  if (!memoryPool) return null;
  try { const r=await memoryQuery(`SELECT customer_name, service, appointment_date, appointment_time, notes, status, updated_at FROM ${MEMORY_SCHEMA}.sodah_appointment_drafts WHERE business_id=$1 AND customer_phone=$2 LIMIT 1`, [String(businessId), normalizePhone(customerPhone)]); return r.rows[0] || null; }
  catch (error) { logger.warn({businessId, customerPhone, error:error.message}, "Appointment draft load failed."); return null; }
}

async function saveAppointmentDraft(businessId, customerPhone, draft) {
  if (!memoryPool) return;
  try { await memoryQuery(`INSERT INTO ${MEMORY_SCHEMA}.sodah_appointment_drafts (business_id, customer_phone, customer_name, service, appointment_date, appointment_time, notes, status, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) ON CONFLICT (business_id, customer_phone) DO UPDATE SET customer_name=COALESCE(EXCLUDED.customer_name, ${MEMORY_SCHEMA}.sodah_appointment_drafts.customer_name), service=COALESCE(EXCLUDED.service, ${MEMORY_SCHEMA}.sodah_appointment_drafts.service), appointment_date=COALESCE(EXCLUDED.appointment_date, ${MEMORY_SCHEMA}.sodah_appointment_drafts.appointment_date), appointment_time=COALESCE(EXCLUDED.appointment_time, ${MEMORY_SCHEMA}.sodah_appointment_drafts.appointment_time), notes=COALESCE(EXCLUDED.notes, ${MEMORY_SCHEMA}.sodah_appointment_drafts.notes), status=EXCLUDED.status, updated_at=NOW()`, [String(businessId), normalizePhone(customerPhone), draft.customer_name||null, draft.service||null, draft.date||null, draft.time||null, draft.notes||null, draft.status||"incomplete"]); }
  catch (error) { logger.warn({businessId, customerPhone, error:error.message}, "Appointment draft save failed."); }
}

async function clearAppointmentDraft(businessId, customerPhone) { if (!memoryPool) return; try { await memoryQuery(`DELETE FROM ${MEMORY_SCHEMA}.sodah_appointment_drafts WHERE business_id=$1 AND customer_phone=$2`, [String(businessId), normalizePhone(customerPhone)]); } catch (error) { logger.warn({businessId, customerPhone, error:error.message}, "Appointment draft clear failed."); } }

async function getAutomationState(businessId, customerPhone, kind) {
  if (!memoryPool) return null;
  try {
    const r = await memoryQuery(
      `SELECT business_id, customer_phone, kind, count, last_sent_at, next_allowed_at, updated_at FROM ${MEMORY_SCHEMA}.sodah_automation_state WHERE business_id=$1 AND customer_phone=$2 AND kind=$3 LIMIT 1`,
      [String(businessId), normalizePhone(customerPhone), String(kind)]
    );
    return r.rows[0] || null;
  } catch (error) {
    logger.warn({ businessId, customerPhone, kind, error: error.message }, "Automation state load failed.");
    return null;
  }
}

async function setAutomationState(businessId, customerPhone, kind, patch = {}) {
  if (!memoryPool) return null;
  try {
    const current = await getAutomationState(businessId, customerPhone, kind);
    const count = Number(patch.count ?? current?.count ?? 0);
    const lastSentAt = patch.last_sent_at === undefined ? (current?.last_sent_at || null) : patch.last_sent_at;
    const nextAllowedAt = patch.next_allowed_at === undefined ? (current?.next_allowed_at || null) : patch.next_allowed_at;
    const r = await memoryQuery(
      `INSERT INTO ${MEMORY_SCHEMA}.sodah_automation_state (business_id, customer_phone, kind, count, last_sent_at, next_allowed_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT (business_id, customer_phone, kind) DO UPDATE SET count=EXCLUDED.count, last_sent_at=EXCLUDED.last_sent_at, next_allowed_at=EXCLUDED.next_allowed_at, updated_at=NOW() RETURNING business_id, customer_phone, kind, count, last_sent_at, next_allowed_at, updated_at`,
      [String(businessId), normalizePhone(customerPhone), String(kind), count, lastSentAt, nextAllowedAt]
    );
    return r.rows[0] || null;
  } catch (error) {
    logger.warn({ businessId, customerPhone, kind, error: error.message }, "Automation state save failed.");
    return null;
  }
}

async function listStaleAppointmentDrafts(olderThanIso, limit = 200) {
  if (!memoryPool) return [];
  try {
    const r = await memoryQuery(
      `SELECT business_id, customer_phone, customer_name, service, appointment_date, appointment_time, notes, status, updated_at FROM ${MEMORY_SCHEMA}.sodah_appointment_drafts WHERE updated_at <= $1 AND status NOT IN ('booked','completed','cancelled') ORDER BY updated_at ASC LIMIT $2`,
      [olderThanIso, Number(limit)]
    );
    return r.rows || [];
  } catch (error) {
    logger.warn({ error: error.message }, "Stale appointment draft lookup failed.");
    return [];
  }
}

async function listStaleCustomerChats(olderThanIso, limit = 200) {
  if (!memoryPool) return [];
  try {
    const r = await memoryQuery(
      `SELECT latest.business_id, latest.customer_phone, latest.content, latest.created_at FROM (SELECT DISTINCT ON (business_id, customer_phone) business_id, customer_phone, role, content, created_at FROM ${MEMORY_SCHEMA}.sodah_conversation_messages ORDER BY business_id, customer_phone, created_at DESC) latest WHERE latest.role='user' AND latest.created_at <= $1 ORDER BY latest.created_at ASC LIMIT $2`,
      [olderThanIso, Number(limit)]
    );
    return r.rows || [];
  } catch (error) {
    logger.warn({ error: error.message }, "Stale customer chat lookup failed.");
    return [];
  }
}


function loadHandoverFile() {
  try {
    if (!fs.existsSync(HANDOVER_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(HANDOVER_FILE, "utf8"));
    for (const [key, value] of Object.entries(parsed || {})) {
      if (value && value.active) handoverMemory.set(key, value);
    }
  } catch (error) {
    logger.warn({ error: error.message }, "Could not load handover state file.");
  }
}

function saveHandoverFile() {
  try {
    const output = Object.fromEntries(handoverMemory.entries());
    fs.writeFileSync(HANDOVER_FILE, JSON.stringify(output, null, 2));
  } catch (error) {
    logger.warn({ error: error.message }, "Could not persist handover state file.");
  }
}

function cleanupMaps() {
  const now = Date.now();
  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_TTL_SECONDS * 1000) processedMessages.delete(id);
  }
  for (const [id, timestamp] of aiMessageIds.entries()) {
    if (now - timestamp > 10 * 60 * 1000) aiMessageIds.delete(id);
  }
  for (const [key, item] of pendingAiMessages.entries()) {
    if (now - item.timestamp > 2 * 60 * 1000) pendingAiMessages.delete(key);
  }
  for (const [key, value] of handoverMemory.entries()) {
    if (value.updatedAt && now - new Date(value.updatedAt).getTime() > 180 * 24 * 60 * 60 * 1000) {
      handoverMemory.delete(key);
    }
  }
  saveHandoverFile();
}
setInterval(cleanupMaps, 30000);

function auth(req, res, next) {
  if (req.path === "/health" || req.path === "/") return next();
  if (!API_KEY) return res.status(500).json({ success: false, message: "PROVIDER_API_KEY is not configured." });
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (token !== API_KEY) return res.status(401).json({ success: false, message: "Unauthorized." });
  next();
}
app.use(auth);

function safeId(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 180);
}
function authFolder(sessionId) {
  return path.join(AUTH_DIR, safeId(sessionId));
}
function clean(value) {
  const v = String(value ?? "").trim();
  return v || null;
}
function bool(value) {
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(String(value || "").toLowerCase());
}
function conversationKey(businessId, customerId) {
  return `${businessId}:whatsapp:${customerId}`;
}
function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}
function jidPhone(jid) {
  const value = String(jid || "").trim();
  if (!value || value.endsWith("@lid") || value.endsWith("@hosted.lid")) return "";
  return normalizePhone(value.split("@")[0].split(":")[0]);
}
function isLidJid(jid) {
  const value = String(jid || "").trim().toLowerCase();
  return value.endsWith("@lid") || value.endsWith("@hosted.lid");
}
function isPnJid(jid) {
  const value = String(jid || "").trim().toLowerCase();
  return value.endsWith("@s.whatsapp.net") || value.endsWith("@hosted");
}
function phoneFromJid(jid) {
  if (!isPnJid(jid)) return "";
  return jidPhone(jid);
}
function normalizeResolvedPhone(value) {
  const phone = normalizePhone(String(value || "").split("@")[0].split(":")[0]);
  if (!phone || phone.length < 7 || phone.length > 15) return "";
  return phone;
}
function extractPhoneNumberFromText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const matches = text.match(/(?:\+|00)?[0-9][0-9\s().-]{6,20}[0-9]/g) || [];
  for (const match of matches) {
    const digits = normalizePhone(match);
    if (digits.length >= 7 && digits.length <= 15) return digits;
  }
  return "";
}
function publicSession(session) {
  return {
    sessionId: session.sessionId,
    businessId: session.businessId,
    status: session.status,
    connected: session.status === "connected",
    phoneNumber: session.phoneNumber || null,
    qrCode: session.qrCode || null,
    lastError: session.lastError || null,
    updatedAt: session.updatedAt,
  };
}

function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest(table, query = "", options = {}) {
  if (!supabaseConfigured()) throw new Error("Supabase is not configured.");
  const base = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}`;
  const url = `${base}${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data?.message || data?.hint || data?.details || data?.error_description || data?.error || text;
    throw new Error(`Supabase ${table} request failed (${response.status}): ${message}`);
  }
  return data;
}

function encodeEq(column, value) {
  return `${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}`;
}

async function loadBusiness(businessId) {
  // Keep the core business lookup compatible with the production Supabase schema.
  // Some deployments do not yet have optional columns such as ai_prompt or
  // whatsapp_connected. Those fields must never make the entire business lookup fail.
  const baseColumns = [
    "id", "business_id", "user_id", "business_name", "full_name", "industry",
    "email", "location", "price_range", "ai_number", "support_number", "working_days",
    "hours", "capabilities", "services_description", "personal_goal", "status",
    "ai_enabled", "automation_enabled", "subscription_status", "subscription_expiry",
  ];
  const optionalColumns = ["ai_prompt", "whatsapp_connected", "voice_gender", "voice_accent", "voice_name"];
  let rows;
  try {
    const columns = [...baseColumns, ...optionalColumns].join(",");
    const query = `select=${encodeURIComponent(columns)}&${encodeEq("business_id", businessId)}&limit=1`;
    rows = await supabaseRequest(BUSINESSES_TABLE, query);
  } catch (error) {
    logger.warn({ businessId, error: error.message }, "Optional business fields unavailable; retrying core business lookup.");
    const columns = baseColumns.join(",");
    const query = `select=${encodeURIComponent(columns)}&${encodeEq("business_id", businessId)}&limit=1`;
    rows = await supabaseRequest(BUSINESSES_TABLE, query);
  }
  const business = Array.isArray(rows) ? rows[0] : null;
  if (!business) throw new Error(`Business not found: ${businessId}`);
  return business;
}

async function setBusinessWhatsAppConnected(businessId, connected) {
  if (!supabaseConfigured() || !businessId) return;
  try {
    await supabaseRequest(
      BUSINESSES_TABLE,
      encodeEq("business_id", businessId),
      { method: "PATCH", body: { whatsapp_connected: Boolean(connected) }, prefer: "return=minimal" }
    );
    logger.info({ businessId, connected: Boolean(connected) }, "Business WhatsApp connection state updated.");
  } catch (error) {
    logger.warn({ businessId, connected: Boolean(connected), error: error.message }, "Could not update business WhatsApp connection state.");
  }
}

function businessContext(business) {
  return {
    business_id: business.business_id,
    business_name: business.business_name,
    full_name: business.full_name,
    industry: business.industry,
    email: business.email,
    location: business.location,
    price_range: business.price_range,
    ai_number: business.ai_number,
    support_number: business.support_number,
    working_days: business.working_days,
    hours: business.hours,
    capabilities: business.capabilities,
    ai_prompt: business.ai_prompt,
    services_description: business.services_description,
    personal_goal: business.personal_goal,
    status: business.status,
    ai_enabled: business.ai_enabled,
    automation_enabled: business.automation_enabled,
    subscription_status: business.subscription_status,
    subscription_expiry: business.subscription_expiry,
  };
}

/*
 * BUSINESS PRODUCT CATALOG
 * ------------------------
 * Product information lives in business_products and images live in
 * business_product_images. The catalog is strictly scoped by business_id.
 * Private storage paths are never sent to OpenAI.
 */

async function loadBusinessCatalog(businessId) {
  if (!supabaseConfigured() || !businessId) return [];

  try {
    const productColumns = [
      "id", "business_id", "product_name", "description", "price",
      "currency", "availability", "promotion", "category", "sku",
      "active", "created_at", "updated_at",
    ].join(",");

    const productQuery = [
      `select=${encodeURIComponent(productColumns)}`,
      encodeEq("business_id", businessId),
      "active=eq.true",
      `limit=${PRODUCT_CATALOG_LIMIT}`,
      "order=product_name.asc",
    ].join("&");

    const products = await supabaseRequest(PRODUCTS_TABLE, productQuery) || [];
    if (!Array.isArray(products) || !products.length) return [];

    const imageColumns = [
      "id", "product_id", "business_id", "image_url", "storage_path", "alt_text", "sort_order",
    ].join(",");

    const imageQuery = [
      `select=${encodeURIComponent(imageColumns)}`,
      encodeEq("business_id", businessId),
      `limit=${Math.max(PRODUCT_CATALOG_LIMIT * 3, 100)}`,
      "order=sort_order.asc",
    ].join("&");

    let images = [];
    try {
      images = await supabaseRequest(PRODUCT_IMAGES_TABLE, imageQuery) || [];
    } catch (error) {
      logger.warn({ businessId, error: error.message }, "Product images could not be loaded; catalog will continue without images.");
    }

    const imagesByProduct = new Map();
    for (const image of Array.isArray(images) ? images : []) {
      if (!image?.product_id) continue;
      const list = imagesByProduct.get(image.product_id) || [];
      list.push({
        id: image.id || null,
        image_url: image.image_url || null,
        storage_path: image.storage_path || null,
        alt_text: image.alt_text || null,
        sort_order: Number(image.sort_order || 0),
      });
      imagesByProduct.set(image.product_id, list);
    }

    return products.map((product) => ({
      ...product,
      images: (imagesByProduct.get(product.id) || []).sort((a, b) => a.sort_order - b.sort_order),
      has_image: Boolean((imagesByProduct.get(product.id) || []).length),
    }));
  } catch (error) {
    logger.warn({ businessId, error: error.message }, "Business product catalog lookup failed; AI will continue without catalog data.");
    return [];
  }
}

function normalizeCatalogText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function catalogTokens(value) {
  return normalizeCatalogText(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function isCatalogQuestion(text) {
  const lower = normalizeCatalogText(text);
  return /\b(product|products|item|items|price|cost|how much|available|availability|stock|in stock|buy|purchase|order|show|catalog|catalogue|collection|model|sku|size|colour|color)\b/.test(lower);
}

function findRelevantCatalogProducts(products, text) {
  if (!Array.isArray(products) || !products.length) return [];

  const query = normalizeCatalogText(text);
  const queryTokens = new Set(catalogTokens(text));
  const genericCatalogQuestion = /\b(what|which|show|list|tell me).*(products|items|shoes|services|catalog|catalogue|collection)\b/i.test(String(text || ""));

  const scored = products.map((product) => {
    const name = normalizeCatalogText(product.product_name);
    const sku = normalizeCatalogText(product.sku);
    const category = normalizeCatalogText(product.category);
    const description = normalizeCatalogText(product.description);
    const promotion = normalizeCatalogText(product.promotion);
    let score = 0;

    if (name && query === name) score += 100;
    if (name && query.includes(name)) score += 80;
    if (sku && query.includes(sku)) score += 75;

    const nameTokens = catalogTokens(product.product_name);
    const categoryTokens = catalogTokens(product.category);
    const descriptionTokens = catalogTokens(product.description);

    for (const token of nameTokens) {
      if (queryTokens.has(token)) score += 18;
    }
    for (const token of categoryTokens) {
      if (queryTokens.has(token)) score += 7;
    }
    for (const token of descriptionTokens) {
      if (queryTokens.has(token)) score += 3;
    }
    if (promotion && query.includes(promotion)) score += 4;

    return { product, score };
  }).sort((a, b) => b.score - a.score);

  if (genericCatalogQuestion) {
    return scored.slice(0, 20).map((item) => item.product);
  }

  const matched = scored.filter((item) => item.score > 0).slice(0, 8);
  if (matched.length) return matched.map((item) => item.product);

  // For general business chat, don't dump the whole catalog into the prompt.
  // Product-oriented questions get a small catalog sample so the AI can still
  // answer broad questions such as "what do you sell?".
  if (isCatalogQuestion(text)) return scored.slice(0, 12).map((item) => item.product);
  return [];
}

function catalogForAI(products) {
  return (Array.isArray(products) ? products : []).map((product) => ({
    product_name: product.product_name || "",
    description: product.description || "",
    price: product.price ?? null,
    currency: product.currency || "AED",
    availability: product.availability || "",
    promotion: product.promotion || "",
    category: product.category || "",
    sku: product.sku || "",
    has_image: Boolean(product.has_image),
  }));
}

async function signProductImage(storagePath, expiresIn = 3600) {
  if (!supabaseConfigured() || !storagePath) return null;
  try {
    const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/sign/${encodeURIComponent(PRODUCT_IMAGE_BUCKET)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expiresIn,
        paths: [String(storagePath).replace(/^\/+/, "")],
      }),
    });

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `Storage signing failed (${response.status})`);
    }

    const signed = Array.isArray(data) ? data[0] : data;
    const url = signed?.signedURL || signed?.signedUrl || signed?.signed_url || signed?.url || null;
    if (!url) return null;

    if (/^https?:\/\//i.test(url)) return url;
    return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1${url.startsWith("/") ? url : `/${url}`}`;
  } catch (error) {
    logger.warn({ storagePath, error: error.message }, "Could not sign product image.");
    return null;
  }
}

async function getPrimaryCatalogImage(product) {
  const image = product?.images?.[0];
  if (!image) return null;
  if (image.storage_path) {
    const signedUrl = await signProductImage(image.storage_path, 3600);
    if (signedUrl) return signedUrl;
  }
  if (image.image_url && /^https?:\/\//i.test(image.image_url)) return image.image_url;
  return null;
}

function selectProductForImage(products, text) {
  const matches = findRelevantCatalogProducts(products, text);
  if (matches.length !== 1) return null;
  const product = matches[0];
  if (!product?.has_image) return null;
  return product;
}

function parseJsonMaybe(value) {
  if (value && typeof value === "object") return value;
  const text = String(value || "").trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const fenced = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(fenced); } catch {}
  const first = fenced.indexOf("{");
  const last = fenced.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(fenced.slice(first, last + 1)); } catch {}
  }
  return null;
}

function extractText(message) {
  const m = message?.message || {};
  return String(
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title ||
    m.templateButtonReplyMessage?.selectedDisplayText ||
    ""
  ).trim();
}

function rememberMessage(key, role, text, businessId=null, customerPhone=null, messageId=null) {
  if (!text) return;
  const history = conversationMemory.get(key) || [];
  history.push({ role, content: String(text), at: new Date().toISOString() });
  while (history.length > HISTORY_LIMIT) history.shift();
  conversationMemory.set(key, history);
  if (businessId && customerPhone) void persistMessage(businessId, customerPhone, role, text, messageId);
}

async function ensureConversationHistory(businessId, customerPhone) {
  const key=conversationKey(businessId, customerPhone);
  if (conversationMemory.has(key)) return conversationMemory.get(key);
  const history=await loadPersistentHistory(businessId, customerPhone);
  conversationMemory.set(key, history);
  return history;
}

function getHistory(key) { return conversationMemory.get(key) || []; }

function isExactControlCommand(text) {
  return ["AI ON", "AI OFF", "AI RESUME", "HUMAN ON", "HUMAN OFF"].includes(
    String(text || "").trim().toUpperCase()
  );
}

function pendingAiKey(sessionId, jid) {
  return `${sessionId}:${jid}`;
}

function wasAiGenerated(sessionId, message) {
  const id = message?.key?.id;
  if (id && aiMessageIds.has(id)) return true;
  const jid = message?.key?.remoteJid || "";
  const pending = pendingAiMessages.get(pendingAiKey(sessionId, jid));
  if (!pending) return false;
  const text = extractText(message);
  return Date.now() - pending.timestamp < 30000 && pending.text === text;
}

async function readConversationState(businessId, customerId) {
  const key = conversationKey(businessId, customerId);
  const memory = handoverMemory.get(key);
  if (memory) return memory;
  if (memoryPool) { try { const r=await memoryQuery(`SELECT active, reason, updated_at FROM ${MEMORY_SCHEMA}.sodah_handover_state WHERE business_id=$1 AND customer_phone=$2 LIMIT 1`, [String(businessId), normalizePhone(customerId)]); if (r.rows[0]) { const state={active:Boolean(r.rows[0].active), reason:r.rows[0].reason, updatedAt:r.rows[0].updated_at, source:"postgres"}; if (state.active) handoverMemory.set(key,state); return state; } } catch (error) { logger.warn({businessId, customerId, error:error.message}, "Dedicated handover lookup failed."); } }
  if (!supabaseConfigured()) return { active: false };
  try {
    const query = [
      // Keep this lookup compatible with the existing Supabase conversations schema.
      // Conversation state only needs status; last_message/last_reply_at are not required
      // for the handover decision and may not exist in older/production schemas.
      `select=${encodeURIComponent("id,business_id,channel,channel_conversation_id,status")}`,
      encodeEq("business_id", businessId),
      encodeEq("channel", "whatsapp"),
      encodeEq("channel_conversation_id", customerId),
      "limit=1",
    ].join("&");
    const rows = await supabaseRequest(CONVERSATIONS_TABLE, query);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return { active: false };
    const status = String(row.status || "").toLowerCase();
    const active = ["human", "human_active", "handover", "manual", "paused"].includes(status);
    const state = { active, updatedAt: new Date().toISOString(), source: "supabase" };
    if (active) handoverMemory.set(key, state);
    return state;
  } catch (error) {
    logger.warn({ businessId, customerId, error: error.message }, "Conversation state lookup failed; using local state.");
    return { active: false };
  }
}

async function setHumanHandover(businessId, customerId, active, reason = "owner_message") {
  const key = conversationKey(businessId, customerId);
  const state = {
    active: Boolean(active),
    reason,
    updatedAt: new Date().toISOString(),
  };
  if (active) handoverMemory.set(key, state);
  else handoverMemory.delete(key);
  saveHandoverFile();
  if (memoryPool) { try { await memoryQuery(`INSERT INTO ${MEMORY_SCHEMA}.sodah_handover_state (business_id, customer_phone, active, reason, updated_at) VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (business_id, customer_phone) DO UPDATE SET active=EXCLUDED.active, reason=EXCLUDED.reason, updated_at=NOW()`, [String(businessId), normalizePhone(customerId), Boolean(active), reason]); } catch (error) { logger.warn({businessId, customerId, error:error.message}, "Dedicated handover state save failed."); } }

  if (!supabaseConfigured()) return state;

  try {
    const query = [
      `select=${encodeURIComponent("id")}`,
      encodeEq("business_id", businessId),
      encodeEq("channel", "whatsapp"),
      encodeEq("channel_conversation_id", customerId),
      "limit=1",
    ].join("&");
    const rows = await supabaseRequest(CONVERSATIONS_TABLE, query);
    const existing = Array.isArray(rows) ? rows[0] : null;
    const payload = {
      business_id: businessId,
      channel: "whatsapp",
      channel_conversation_id: customerId,
      status: active ? "human" : "ai",
      last_message_at: state.updatedAt,
    };
    if (existing?.id) {
      await supabaseRequest(
        CONVERSATIONS_TABLE,
        encodeEq("id", existing.id),
        { method: "PATCH", body: payload }
      );
    } else {
      await supabaseRequest(CONVERSATIONS_TABLE, "", { method: "POST", body: payload });
    }
  } catch (error) {
    logger.warn({ businessId, customerId, error: error.message }, "Could not persist conversation handover in Supabase.");
  }
  return state;
}

async function saveWhatsAppIdentity(businessId, lidJid, phone, customerName = "") {
  const normalizedPhone = normalizeResolvedPhone(phone);
  const lid = String(lidJid || "").trim();
  if (!memoryPool || !businessId || !lid || !isLidJid(lid) || !normalizedPhone) return;
  try {
    await memoryQuery(
      `INSERT INTO ${MEMORY_SCHEMA}.sodah_whatsapp_identities (business_id, lid_jid, phone, customer_name, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (business_id, lid_jid)
       DO UPDATE SET phone=EXCLUDED.phone,
                     customer_name=COALESCE(NULLIF(EXCLUDED.customer_name,''), ${MEMORY_SCHEMA}.sodah_whatsapp_identities.customer_name),
                     updated_at=NOW()`,
      [String(businessId), lid, normalizedPhone, normalizeCustomerName(customerName)]
    );
  } catch (error) {
    logger.warn({ businessId, lidJid: lid, phone: normalizedPhone, error: error.message }, "WhatsApp LID identity persistence failed.");
  }
}

async function findSavedWhatsAppPhone(businessId, lidJid) {
  const lid = String(lidJid || "").trim();
  if (!memoryPool || !businessId || !lid || !isLidJid(lid)) return "";
  try {
    const result = await memoryQuery(
      `SELECT phone FROM ${MEMORY_SCHEMA}.sodah_whatsapp_identities WHERE business_id=$1 AND lid_jid=$2 LIMIT 1`,
      [String(businessId), lid]
    );
    return normalizeResolvedPhone(result.rows?.[0]?.phone);
  } catch (error) {
    logger.warn({ businessId, lidJid: lid, error: error.message }, "Saved WhatsApp LID lookup failed.");
    return "";
  }
}

async function resolveWhatsAppCustomerIdentity(session, message, businessId) {
  const key = message?.key || {};
  const primaryJid = String(key.remoteJid || "").trim();
  const remoteJidAlt = String(key.remoteJidAlt || "").trim();
  const participant = String(key.participant || "").trim();
  const participantAlt = String(key.participantAlt || "").trim();

  // For normal one-to-one messages, WhatsApp/Baileys may provide the real
  // phone number as remoteJidAlt while remoteJid is a privacy LID.
  let phone =
    phoneFromJid(primaryJid) ||
    phoneFromJid(remoteJidAlt) ||
    phoneFromJid(participantAlt);

  let lidJid = isLidJid(primaryJid)
    ? primaryJid
    : (isLidJid(participant) ? participant : "");

  // If WhatsApp supplied a LID without *_Alt, ask Baileys' persistent
  // LIDMappingStore for the corresponding PN.
  if (!phone && lidJid) {
    try {
      const mapping = session?.socket?.signalRepository?.lidMapping;
      if (mapping?.getPNForLID) {
        const mapped = await mapping.getPNForLID(lidJid);
        phone = normalizeResolvedPhone(mapped);
      }
    } catch (error) {
      logger.debug({ businessId, lidJid, error: error.message }, "Baileys LID-to-phone lookup was unavailable.");
    }
  }

  // Cross-pair participant/remoteJidAlt is useful for LID-addressed messages.
  if (!phone && isLidJid(participant) && isPnJid(remoteJidAlt)) {
    phone = phoneFromJid(remoteJidAlt);
    lidJid = participant;
  }

  // Last persistent fallback: use our own LID -> phone cache.
  if (!phone && lidJid) {
    phone = await findSavedWhatsAppPhone(businessId, lidJid);
  }

  const customerName = extractCustomerName(message);

  if (phone && lidJid) {
    await saveWhatsAppIdentity(businessId, lidJid, phone, customerName);
  }

  const stableCustomerId = phone || (lidJid ? `lid:${normalizePhone(lidJid)}` : primaryJid);
  return {
    primaryJid,
    lidJid,
    phone: normalizeResolvedPhone(phone),
    customerId: stableCustomerId,
    resolved: Boolean(phone),
    source: phone
      ? (phoneFromJid(primaryJid) ? "remoteJid" :
        phoneFromJid(remoteJidAlt) ? "remoteJidAlt" :
        phoneFromJid(participantAlt) ? "participantAlt" :
        "lidMapping")
      : "unresolved",
  };
}

async function upsertCustomer(business, customerId, customerName, phone) {
  if (!supabaseConfigured()) return null;
  try {
    const query = [
      `select=${encodeURIComponent("id,business_id,channel,channel_customer_id,name,phone,email,lead_status")}`,
      encodeEq("business_id", business.business_id),
      encodeEq("channel", "whatsapp"),
      encodeEq("channel_customer_id", customerId),
      "limit=1",
    ].join("&");
    const rows = await supabaseRequest(CUSTOMERS_TABLE, query);
    let existing = Array.isArray(rows) ? rows[0] : null;

    // If WhatsApp used a privacy LID as channel_customer_id, recover an
    // existing customer by the real phone number instead of creating a
    // second customer record.
    if (!existing && phone) {
      const phoneQuery = [
        `select=${encodeURIComponent("id,business_id,channel,channel_customer_id,name,phone,email,lead_status")}`,
        encodeEq("business_id", business.business_id),
        encodeEq("channel", "whatsapp"),
        encodeEq("phone", phone),
        "limit=1",
      ].join("&");
      const phoneRows = await supabaseRequest(CUSTOMERS_TABLE, phoneQuery);
      existing = Array.isArray(phoneRows) ? phoneRows[0] : null;
    }

    if (existing) {
      const patch = {};
      const existingName = normalizeCustomerName(existing.name);
      if (customerName && !existingName) patch.name = customerName;
      if (phone && !existing.phone) patch.phone = phone;
      if (phone && existing.channel_customer_id !== customerId) patch.channel_customer_id = customerId;
      if (Object.keys(patch).length) {
        await supabaseRequest(CUSTOMERS_TABLE, encodeEq("id", existing.id), { method: "PATCH", body: patch });
      }
      return { ...existing, ...patch };
    }
    const inserted = await supabaseRequest(CUSTOMERS_TABLE, "", {
      method: "POST",
      body: {
        business_id: business.business_id,
        channel: "whatsapp",
        channel_customer_id: customerId,
        name: customerName || null,
        phone: phone || null,
        lead_status: "new",
      },
    });
    return Array.isArray(inserted) ? inserted[0] : inserted;
  } catch (error) {
    logger.warn({ businessId: business.business_id, customerId, error: error.message }, "Customer upsert failed.");
    return null;
  }
}

function parseDays(value) {
  if (Array.isArray(value)) return value.map(String).map(x => x.toLowerCase());
  const text = String(value || "").toLowerCase();
  const aliases = {
    mon: "monday", monday: "monday", tue: "tuesday", tues: "tuesday", tuesday: "tuesday",
    wed: "wednesday", wednesday: "wednesday", thu: "thursday", thurs: "thursday", thursday: "thursday",
    fri: "friday", friday: "friday", sat: "saturday", saturday: "saturday", sun: "sunday", sunday: "sunday",
  };
  const found = [];
  for (const [alias, day] of Object.entries(aliases)) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(text)) found.push(day);
  }
  return [...new Set(found)];
}

function parseMinutes(value) {
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];
  if (minute > 59) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (meridiem === "pm" && hour !== 12) hour += 12;
  } else if (hour > 23) return null;
  return hour * 60 + minute;
}

function parseTimeRange(text) {
  const source = String(text || "").replace(/[–—]/g, "-").trim();
  const ranges = [];
  const regex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)[\s]*-[\s]*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
  let match;
  while ((match = regex.exec(source))) {
    const start = parseMinutes(match[1]);
    const end = parseMinutes(match[2]);
    if (start !== null && end !== null && end > start) ranges.push({ start, end });
  }
  if (!ranges.length) {
    const parts = source.split(/\b(?:to|until|through)\b/i);
    if (parts.length === 2) {
      const start = parseMinutes(parts[0]);
      const end = parseMinutes(parts[1]);
      if (start !== null && end !== null && end > start) ranges.push({ start, end });
    }
  }
  return ranges;
}

function datePartsInTimezone(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "long",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday: parts.weekday.toLowerCase() };
}
function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function shiftDate(dateString, days) {
  const d = new Date(`${dateString}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function todayDate() {
  const p = datePartsInTimezone();
  return isoDate(p.year, p.month, p.day);
}
function weekdayForDate(dateString) {
  const d = new Date(`${dateString}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(d).toLowerCase();
}

function normalizeCustomerName(value) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (!name) return "";
  if (/^\+?[0-9\s().-]{6,}$/.test(name)) return "";
  if (/^(unknown|undefined|null|customer|user|whatsapp|business)$/i.test(name)) return "";
  return name.slice(0, 120);
}

function extractCustomerName(message) {
  return normalizeCustomerName(
    message?.pushName ||
    message?.verifiedBizName ||
    message?.key?.participant?.pushName ||
    ""
  );
}

function formatAppointmentDate(dateString) {
  const text = String(dateString || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const d = new Date(`${text}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function resolveDateFromCustomerText(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";

  const base = todayDate();

  if (/\bday after tomorrow\b/.test(text)) return shiftDate(base, 2);
  if (/\btomorrow\b/.test(text)) return shiftDate(base, 1);
  if (/\btoday\b/.test(text)) return base;

  const weekdays = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };

  for (const [name, target] of Object.entries(weekdays)) {
    if (!new RegExp(`\\b${name}\\b`, "i").test(text)) continue;
    const current = new Date(`${base}T12:00:00Z`).getUTCDay();
    let delta = (target - current + 7) % 7;
    if (delta === 0 && /\bnext\b/.test(text)) delta = 7;
    return shiftDate(base, delta);
  }

  let match = text.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  if (match) {
    let a = Number(match[1]);
    let b = Number(match[2]);
    let year = match[3] ? Number(match[3]) : datePartsInTimezone().year;
    if (year < 100) year += 2000;

    // WhatsApp users commonly enter DD/MM/YYYY. If the first part is > 12,
    // it is unambiguously the day. If the second part is > 12, interpret it
    // as MM/DD/YYYY. Otherwise keep the user's common DD/MM interpretation.
    let day = a;
    let month = b;
    if (a <= 12 && b > 12) {
      month = a;
      day = b;
    }

    const candidate = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      candidate.getUTCFullYear() === year &&
      candidate.getUTCMonth() === month - 1 &&
      candidate.getUTCDate() === day &&
      month >= 1 && month <= 12
    ) {
      return isoDate(year, month, day);
    }
  }

  const monthMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i
  );
  if (monthMatch) {
    const months = {
      january: 1, february: 2, march: 3, april: 4,
      may: 5, june: 6, july: 7, august: 8,
      september: 9, october: 10, november: 11, december: 12,
    };
    const month = months[monthMatch[1].toLowerCase()];
    const day = Number(monthMatch[2]);
    const year = Number(monthMatch[3] || datePartsInTimezone().year);
    const candidate = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      candidate.getUTCFullYear() === year &&
      candidate.getUTCMonth() === month - 1 &&
      candidate.getUTCDate() === day
    ) {
      return isoDate(year, month, day);
    }
  }

  return "";
}

function resolveTimeFromCustomerText(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";

  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (match) {
    const minutes = parseMinutes(`${match[1]}:${match[2] || "00"} ${match[3]}`);
    return minutes === null ? "" : formatMinutes(minutes);
  }

  const twentyFour = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFour) {
    const minutes = Number(twentyFour[1]) * 60 + Number(twentyFour[2]);
    return formatMinutes(minutes);
  }

  // A bare hour such as "10" is accepted when the message is clearly
  // an appointment-time response and not ordinary prose.
  if (/^\d{1,2}$/.test(text)) {
    const hour = Number(text);
    if (hour >= 0 && hour <= 23) return formatMinutes(hour * 60);
  }

  return "";
}

function isGreetingText(value) {
  // WhatsApp greetings frequently contain emojis, waving hands,
  // punctuation, or extra whitespace, e.g. "Hello 👋".
  // Normalize those decorations before testing the greeting so the
  // deterministic business-branded welcome runs BEFORE OpenAI.
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return false;

  const normalized = raw
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/[\u{2600}-\u{27BF}]/gu, " ")
    .replace(/[!.,?;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return /^(hi|hello|hey|hii|helo|good morning|good afternoon|good evening|good day|assalamu alaikum|salam|hola|buenos dias|buenas tardes|buenas noches|bonjour|salut|bonsoir|hallo|guten morgen|guten tag|guten abend|namaste|नमस्ते|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|olá|ola|oi|ciao|merhaba|привет|здравствуйте|你好|您好|こんにちは|안녕하세요|مرحبا|السلام عليكم)$/.test(normalized);
}

function businessWelcomeReply(business, customerName = "") {
  const businessName = normalizeCustomerName(business?.business_name);
  const name = normalizeCustomerName(customerName);

  // Never invent a business name. If the business record is missing its
  // name, keep the reply neutral instead of calling the business "Sodah.io"
  // or "Sodah app". Normally businessName is populated by loadBusiness().
  if (!businessName) {
    logger.warn({ businessId: business?.business_id }, "Business name is missing; sending neutral welcome.");
    return name
      ? `Hello ${name}! 👋 How can we help you today?`
      : `Hello! 👋 How can we help you today?`;
  }

  return name
    ? `Hello ${name}! 👋 Welcome to ${businessName}. How can we help you today?`
    : `Hello! 👋 Welcome to ${businessName}. How can we help you today?`;
}

function hasBusinessBrandedWelcome(history, business) {
  const businessName = normalizeCustomerName(business?.business_name);
  if (!businessName) return false;

  const target = businessName.toLowerCase();
  return history.some((item) => {
    if (item?.role !== "assistant") return false;
    const content = String(item?.content || "").toLowerCase();
    return content.includes(`welcome to ${target}`);
  });
}

function enforceBusinessName(reply, business) {
  const text = String(reply || "").trim();
  const businessName = normalizeCustomerName(business?.business_name);
  if (!text || !businessName) return text;

  // Prevent the model from replacing the configured business with the
  // product/company name. Only replace the known incorrect aliases.
  const aliases = [
    "Sodah app",
    "Soda app",
    "Sodah.io",
    "Soda.io",
  ];

  let result = text;
  for (const alias of aliases) {
    if (alias.toLowerCase() === businessName.toLowerCase()) continue;
    result = result.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), businessName);
  }

  return result;
}

function parseDateFromAI(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return null;
}

function generateSlots(business, dateString) {
  const days = parseDays(business.working_days);
  const weekday = weekdayForDate(dateString);
  if (days.length && !days.includes(weekday)) return [];

  const hoursText = String(business.hours || "").toLowerCase();
  const is24Hours = /\b24\s*(?:hours?|hrs?)\b|\b24\s*[x/ ]\s*7\b|\b24\/7\b|\ball\s*day\b/.test(hoursText);
  const ranges = is24Hours ? [{ start: 0, end: 24 * 60 }] : parseTimeRange(business.hours);
  if (!ranges.length) return [];
  const slots = [];
  for (const range of ranges) {
    for (let start = range.start; start + APPOINTMENT_DURATION_MINUTES <= range.end; start += SLOT_MINUTES) {
      slots.push(start);
    }
  }
  return [...new Set(slots)].sort((a, b) => a - b);
}
function formatMinutes(minutes) {
  let hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  hour %= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}
function timeToComparable(value) {
  const parsed = parseMinutes(value);
  return parsed === null ? null : parsed;
}

async function getAppointmentsForDate(businessId, dateString) {
  if (!supabaseConfigured()) return [];
  const columns = [
    "appointment_id", "business_id", "customer_name", "customer_phone", "service",
    "appointment_date", "appointment_time", "status", "notes", "follow_up_count", "next_follow_up_at",
  ].join(",");
  const query = [
    `select=${encodeURIComponent(columns)}`,
    encodeEq("business_id", businessId),
    encodeEq("appointment_date", dateString),
    "limit=500",
  ].join("&");
  return (await supabaseRequest(APPOINTMENTS_TABLE, query)) || [];
}

function activeAppointmentStatus(status) {
  return !["cancelled", "canceled", "completed", "rejected", "deleted"].includes(String(status || "").toLowerCase());
}

function bookedTimes(appointments) {
  return appointments
    .filter(a => activeAppointmentStatus(a.status || a.appointment_status))
    .map(a => timeToComparable(a.appointment_time || a.time))
    .filter(v => v !== null);
}

async function availability(business, dateString) {
  const slots = generateSlots(business, dateString);
  if (!slots.length) return { date: dateString, available: [], booked: [], reason: "outside_business_schedule" };
  const appointments = await getAppointmentsForDate(business.business_id, dateString);
  const booked = bookedTimes(appointments);
  const available = slots.filter(slot => !booked.some(t => Math.abs(t - slot) < APPOINTMENT_DURATION_MINUTES));
  return { date: dateString, available, booked, appointments };
}

async function slotIsAvailable(business, dateString, timeText) {
  const requested = timeToComparable(timeText);
  if (requested === null) return { ok: false, reason: "invalid_time" };
  const slots = generateSlots(business, dateString);
  const exactSlot = slots.find(slot => slot === requested);
  if (exactSlot === undefined) return { ok: false, reason: "outside_business_schedule", available: slots };
  const data = await availability(business, dateString);
  const conflict = data.appointments.find(a => {
    if (!activeAppointmentStatus(a.status || a.appointment_status)) return false;
    const existing = timeToComparable(a.appointment_time || a.time);
    return existing !== null && Math.abs(existing - requested) < APPOINTMENT_DURATION_MINUTES;
  });
  return { ok: !conflict, reason: conflict ? "already_booked" : "available", conflict, available: data.available };
}

function nearestAvailableText(slots, limit = 5) {
  return slots.slice(0, limit).map(formatMinutes).join(", ");
}

function appointmentId() {
  return `APT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function createAppointment(business, customer, appointment) {
  if (!supabaseConfigured()) throw new Error("Supabase is required to create an appointment.");
  const customerPhone = normalizeResolvedPhone(customer?.phone || appointment.customer_phone);
  if (!customerPhone) throw new Error("A real WhatsApp phone number is required before creating an appointment.");
  const check = await slotIsAvailable(business, appointment.date, appointment.time);
  if (!check.ok) return { success: false, reason: check.reason, conflict: check.conflict || null, available: check.available || [] };

  const id = appointment.appointment_id || appointmentId();
  const payload = {
    appointment_id: id,
    business_id: business.business_id,
    customer_name: customer?.name || appointment.customer_name || "Customer",
    customer_phone: customerPhone,
    service: appointment.service || "General appointment",
    appointment_date: appointment.date,
    appointment_time: appointment.time,
    status: "Booked",
    notes: appointment.notes || null,
    follow_up_count: 0,
    next_follow_up_at: null,
  };
  const inserted = await supabaseRequest(APPOINTMENTS_TABLE, "", { method: "POST", body: payload });
  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  return { success: true, appointment: row || payload };
}

async function updateAppointmentById(id, patch) {
  if (!supabaseConfigured()) throw new Error("Supabase is required for appointment updates.");
  const rows = await supabaseRequest(APPOINTMENTS_TABLE, encodeEq("appointment_id", id), { method: "PATCH", body: patch });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function findCustomerAppointments(businessId, customerPhone) {
  if (!supabaseConfigured()) return [];
  const query = [
    `select=${encodeURIComponent("appointment_id,business_id,customer_name,customer_phone,service,appointment_date,appointment_time,status,notes,follow_up_count,next_follow_up_at")}`,
    encodeEq("business_id", businessId),
    encodeEq("customer_phone", customerPhone),
    "limit=50",
  ].join("&");
  return (await supabaseRequest(APPOINTMENTS_TABLE, query)) || [];
}

  return {
    activeAppointmentStatus,
    appointmentId,
    auth,
    authFolder,
    availability,
    bookedTimes,
    bool,
    businessContext,
    businessWelcomeReply,
    catalogForAI,
    catalogTokens,
    clean,
    cleanupMaps,
    clearAppointmentDraft,
    conversationKey,
    createAppointment,
    datePartsInTimezone,
    encodeEq,
    enforceBusinessName,
    ensureConversationHistory,
    extractCustomerName,
    extractPhoneNumberFromText,
    extractText,
    findCustomerAppointments,
    findRelevantCatalogProducts,
    findSavedWhatsAppPhone,
    formatAppointmentDate,
    formatMinutes,
    generateSlots,
    getAppointmentsForDate,
    getHistory,
    getAutomationState,
    setAutomationState,
    listStaleAppointmentDrafts,
    listStaleCustomerChats,
    getPrimaryCatalogImage,
    hasBusinessBrandedWelcome,
    initPersistentMemory,
    isCatalogQuestion,
    isExactControlCommand,
    isGreetingText,
    isLidJid,
    isPnJid,
    isoDate,
    jidPhone,
    loadAppointmentDraft,
    loadBusiness,
    loadBusinessCatalog,
    loadHandoverFile,
    loadPersistentHistory,
    memoryQuery,
    nearestAvailableText,
    normalizeCatalogText,
    normalizeCustomerName,
    normalizePhone,
    normalizeResolvedPhone,
    parseDateFromAI,
    parseDays,
    parseJsonMaybe,
    parseMinutes,
    parseTimeRange,
    pendingAiKey,
    persistMessage,
    phoneFromJid,
    publicSession,
    readConversationState,
    rememberMessage,
    resolveDateFromCustomerText,
    resolveTimeFromCustomerText,
    resolveWhatsAppCustomerIdentity,
    safeId,
    saveAppointmentDraft,
    saveHandoverFile,
    saveWhatsAppIdentity,
    selectProductForImage,
    setBusinessWhatsAppConnected,
    setHumanHandover,
    shiftDate,
    signProductImage,
    slotIsAvailable,
    supabaseConfigured,
    supabaseRequest,
    timeToComparable,
    todayDate,
    updateAppointmentById,
    upsertCustomer,
    wasAiGenerated,
    weekdayForDate,
  };
};
