require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pino = require("pino");
const QRCode = require("qrcode");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");

/*
 * SODAH WHATSAPP AI PROVIDER
 * --------------------------
 * One Baileys socket owns the WhatsApp account, QR connection, incoming
 * messages, AI replies, human takeover, availability checks and booking.
 *
 * IMPORTANT:
 * - Business information is loaded from Supabase for the current business_id.
 * - The AI never confirms an appointment until the database confirms it.
 * - A human message from the connected WhatsApp account automatically pauses AI.
 * - AI-generated outgoing message IDs are tracked so the AI does not mistake
 *   its own messages for a human takeover.
 * - Human takeover is persistent when the conversations table is available.
 */

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || "0.0.0.0";
const API_KEY = process.env.PROVIDER_API_KEY || "";
const AUTH_DIR = path.resolve(process.env.AUTH_DIR || "./auth_sessions");
const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
const HANDOVER_FILE = path.join(DATA_DIR, "handover.json");

const AI_ENABLED = String(process.env.AI_ENABLED || "true").toLowerCase() !== "false";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OPENAI_TEMPERATURE = Number(process.env.OPENAI_TEMPERATURE || 0.4);
const OPENAI_MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 700);

// SODAH VOICE ENGINE — no n8n and no ElevenLabs required.
const VOICE_ENABLED = String(process.env.VOICE_ENABLED || "true").toLowerCase() !== "false";
const VOICE_AUTO_REPLY = String(process.env.VOICE_AUTO_REPLY || "true").toLowerCase() !== "false";
const OPENAI_STT_MODEL = process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe";
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE || "alloy";
const OPENAI_TTS_FORMAT = process.env.OPENAI_TTS_FORMAT || "opus";
const VOICE_MAX_SECONDS = Math.max(10, Number(process.env.VOICE_MAX_SECONDS || 180));

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUSINESSES_TABLE = process.env.SUPABASE_BUSINESSES_TABLE || "businesses";
const APPOINTMENTS_TABLE = process.env.SUPABASE_APPOINTMENTS_TABLE || "appointments";
const CUSTOMERS_TABLE = process.env.SUPABASE_CUSTOMERS_TABLE || "customers";
const CONVERSATIONS_TABLE = process.env.SUPABASE_CONVERSATIONS_TABLE || "conversations";
const PRODUCTS_TABLE = process.env.SUPABASE_PRODUCTS_TABLE || "business_products";
const PRODUCT_IMAGES_TABLE = process.env.SUPABASE_PRODUCT_IMAGES_TABLE || "business_product_images";
const PRODUCT_IMAGE_BUCKET = process.env.SUPABASE_PRODUCT_IMAGE_BUCKET || "business-product-images";
const PRODUCT_CATALOG_LIMIT = Math.max(20, Number(process.env.PRODUCT_CATALOG_LIMIT || 100));

const DATABASE_URL = process.env.DATABASE_URL || "";
const MEMORY_SCHEMA = process.env.MEMORY_SCHEMA || "public";
const memoryPool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }, max: Number(process.env.DATABASE_POOL_MAX || 5) }) : null;
let memoryReady = false;

const IGNORE_GROUPS = String(process.env.IGNORE_GROUPS || "true").toLowerCase() === "true";
const IGNORE_STATUS = String(process.env.IGNORE_STATUS || "true").toLowerCase() === "true";
const MESSAGE_DEDUP_TTL_SECONDS = Number(process.env.MESSAGE_DEDUP_TTL_SECONDS || 180);
const HISTORY_LIMIT = Math.max(4, Number(process.env.CONVERSATION_HISTORY_LIMIT || 12));
const SLOT_MINUTES = Math.max(15, Number(process.env.APPOINTMENT_SLOT_MINUTES || 60));
const APPOINTMENT_DURATION_MINUTES = Math.max(
  SLOT_MINUTES,
  Number(process.env.APPOINTMENT_DURATION_MINUTES || SLOT_MINUTES)
);
const TIMEZONE = process.env.BUSINESS_TIMEZONE || "Asia/Dubai";
const FOLLOWUP_DELAY_MINUTES = Math.max(5, Number(process.env.FOLLOWUP_DELAY_MINUTES || 30));
const REMINDER_HOURS_BEFORE = Math.max(1, Number(process.env.REMINDER_HOURS_BEFORE || 24));
const FOLLOWUP_ENABLED = String(process.env.FOLLOWUP_ENABLED || "true").toLowerCase() === "true";
const REMINDERS_ENABLED = String(process.env.REMINDERS_ENABLED || "true").toLowerCase() === "true";
const FALLBACK_REPLY =
  process.env.FALLBACK_REPLY ||
  "Thanks for your message. Please give us a moment and we'll get back to you shortly.";
const DEFAULT_AI_PROMPT = process.env.DEFAULT_AI_PROMPT ||
  `Act as a real member of the business staff, such as a receptionist or front-desk representative.
Never present yourself as an AI, bot, software, system, assistant app, or automated service.
Speak as someone working for the business and helping the customer directly.
Use the configured business name naturally when it is relevant, especially in the welcome message, but do not repeat it unnecessarily.
Do not say phrases such as "I am the AI", "the AI will", "the system needs", or "the app" unless the customer explicitly asks about the technology.
When collecting information, ask naturally and directly, as a staff member would. For example: "Okay, Chris. Could you please share your WhatsApp number with the country code so we can proceed?"
If the customer has already provided something, acknowledge it instead of asking for it again.
Always understand the customer's language and reply in the same language unless they ask to switch languages.
Keep replies natural, concise, warm, professional, and suitable for WhatsApp.
Never invent business facts or claim an action was completed unless the server/database confirms it.`;

fs.mkdirSync(AUTH_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: "2mb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

const sessions = new Map();
const processedMessages = new Map();
const aiMessageIds = new Map();
const pendingAiMessages = new Map();
const pendingVoiceReplies = new Map();
const conversationMemory = new Map();
const handoverMemory = new Map();



// ---------------------------------------------------------------------------
// SODAH MODULAR RUNTIME
// ---------------------------------------------------------------------------
// server.js owns only the application shell and shared runtime state.
// Feature logic lives in core/, ai/, voice/ and business/.

const runtime = {
  app,
  logger,
  PORT,
  HOST,
  API_KEY,
  AUTH_DIR,
  DATA_DIR,
  HANDOVER_FILE,
  AI_ENABLED,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  OPENAI_TEMPERATURE,
  OPENAI_MAX_TOKENS,
  VOICE_ENABLED,
  VOICE_AUTO_REPLY,
  OPENAI_STT_MODEL,
  OPENAI_TTS_MODEL,
  OPENAI_TTS_VOICE,
  OPENAI_TTS_FORMAT,
  VOICE_MAX_SECONDS,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  BUSINESSES_TABLE,
  APPOINTMENTS_TABLE,
  CUSTOMERS_TABLE,
  CONVERSATIONS_TABLE,
  PRODUCTS_TABLE,
  PRODUCT_IMAGES_TABLE,
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_CATALOG_LIMIT,
  DATABASE_URL,
  MEMORY_SCHEMA,
  memoryPool,
  memoryReady,
  IGNORE_GROUPS,
  IGNORE_STATUS,
  MESSAGE_DEDUP_TTL_SECONDS,
  HISTORY_LIMIT,
  SLOT_MINUTES,
  APPOINTMENT_DURATION_MINUTES,
  TIMEZONE,
  FOLLOWUP_DELAY_MINUTES,
  REMINDER_HOURS_BEFORE,
  FOLLOWUP_ENABLED,
  REMINDERS_ENABLED,
  INCOMPLETE_REMINDER_DELAY_MINUTES: Math.max(5, Number(process.env.INCOMPLETE_REMINDER_DELAY_MINUTES || 30)),
  INCOMPLETE_CHAT_REMINDER_DELAY_MINUTES: Math.max(5, Number(process.env.INCOMPLETE_CHAT_REMINDER_DELAY_MINUTES || 60)),
  AUTOMATION_REMINDER_COOLDOWN_HOURS: Math.max(1, Number(process.env.AUTOMATION_REMINDER_COOLDOWN_HOURS || 24)),
  MAX_INCOMPLETE_REMINDERS: Math.max(1, Number(process.env.MAX_INCOMPLETE_REMINDERS || 2)),
  MAX_APPOINTMENT_FOLLOWUPS: Math.max(1, Number(process.env.MAX_APPOINTMENT_FOLLOWUPS || 2)),
  FALLBACK_REPLY,
  DEFAULT_AI_PROMPT,

  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  QRCode,
  fs,
  path,
  express,
  cors,
  pino,
  Pool,

  sessions: new Map(),
  processedMessages: new Map(),
  aiMessageIds: new Map(),
  pendingAiMessages: new Map(),
  pendingVoiceReplies: new Map(),
  conversationMemory: new Map(),
  handoverMemory: new Map(),
};

const createBusiness = require("./business/business");
const createAI = require("./ai/ai");
const createVoice = require("./voice/voice");
const createCore = require("./core/whatsapp");

// Business/data layer first. AI and voice receive its exported functions.
Object.assign(runtime, createBusiness(runtime));
runtime.loadHandoverFile();

Object.assign(runtime, createAI(runtime));
Object.assign(runtime, createVoice(runtime));

// Core is last because it coordinates WhatsApp + AI + Voice + Business.
Object.assign(runtime, createCore(runtime));

// Keep the provider process alive and restore persisted sessions after startup.
// The core module owns the HTTP server and graceful shutdown.
