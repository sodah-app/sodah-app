/**
 * Sodah Automation Engine
 * Step 1: Universal message types
 *
 * This file is the common contract for WhatsApp, Instagram,
 * Facebook, and TikTok. It does not contain channel-specific
 * API logic and does not replace the existing workflows yet.
 */

export const SODAH_CHANNELS = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
] as const;

export type SodahChannel = (typeof SODAH_CHANNELS)[number];

export type SodahMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "location"
  | "contact"
  | "interactive"
  | "unknown";

/**
 * A normalized customer message entering the Sodah engine.
 *
 * IMPORTANT:
 * - business_id is the tenant boundary.
 * - customer_id is the platform/customer identity supplied by
 *   the channel adapter; it is NOT assumed to be a phone number.
 * - raw is retained only for channel-specific processing/debugging.
 * - Access/refresh tokens must never be placed in this object.
 */
export type IncomingMessage = {
  business_id: string;

  channel: SodahChannel;
  account_id: string;

  customer_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;

  conversation_id?: string | null;
  message_id: string;

  incoming_message?: string | null;
  message_type: SodahMessageType;

  timestamp: string;

  raw?: unknown;
};

/**
 * Tenant context resolved from the authenticated/validated
 * business before automation is executed.
 */
export type SodahTenantContext = {
  business_id: string;

  channel: SodahChannel;
  account_id: string;

  channel_connected: boolean;

  business: {
    id: string;
    business_id: string;
    business_name?: string | null;
    setup_type?: string | null;
    status?: string | null;
    ai_enabled?: boolean | null;
    automation_enabled?: boolean | null;
  };
};

/**
 * Data passed to the channel adapter when Sodah needs to send
 * a reply back to the customer.
 */
export type OutgoingMessage = {
  business_id: string;

  channel: SodahChannel;
  account_id: string;

  customer_id: string;
  customer_phone?: string | null;

  conversation_id?: string | null;

  message: string;
};

/**
 * Result returned after an incoming event has been processed.
 *
 * The automation engine will eventually populate this object
 * after the tenant, customer, conversation, AI, appointment,
 * lead, and follow-up services are connected.
 */
export type AutomationResult = {
  business_id: string;

  channel: SodahChannel;

  conversation_id: string;

  handled: boolean;

  reply?: string | null;

  intent?: string | null;

  database_action?: string | null;
};
