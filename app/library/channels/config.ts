import { createClient } from "@/lib/supabase/server";
import type { SodahChannel } from "./types";

export type ChannelConfig = {
  business_id: string;
  channel: SodahChannel;
  connected: boolean;

  access_token: string | null;
  refresh_token: string | null;

  channel_user_id: string | null;
  channel_username: string | null;

  page_id: string | null;
  page_name: string | null;
  page_access_token: string | null;

  tiktok_open_id: string | null;
  tiktok_scope: string | null;
};

type BusinessChannelRow = {
  business_id: string;

  whatsapp_connected?: boolean | null;

  instagram_connected?: boolean | null;
  instagram_access_token?: string | null;
  instagram_user_id?: string | null;
  instagram_username?: string | null;

  facebook_connected?: boolean | null;
  facebook_access_token?: string | null;
  facebook_user_id?: string | null;
  facebook_page_id?: string | null;
  facebook_page_name?: string | null;
  facebook_page_access_token?: string | null;

  tiktok_connected?: boolean | null;
  tiktok_access_token?: string | null;
  tiktok_refresh_token?: string | null;
  tiktok_open_id?: string | null;
  tiktok_scope?: string | null;
};

const BUSINESS_COLUMNS = [
  "business_id",
  "whatsapp_connected",
  "instagram_connected",
  "facebook_connected",
  "tiktok_connected",
  "instagram_access_token",
  "instagram_user_id",
  "instagram_username",
  "facebook_access_token",
  "facebook_user_id",
  "facebook_page_id",
  "facebook_page_name",
  "facebook_page_access_token",
  "tiktok_access_token",
  "tiktok_refresh_token",
  "tiktok_open_id",
  "tiktok_scope",
].join(",");

export async function getChannelConfig(
  businessId: string,
  channel: SodahChannel
): Promise<ChannelConfig | null> {
  const id = businessId.trim();

  if (!id) {
    throw new Error(
      "business_id is required."
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("business_id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "[AUTOMATION][CHANNEL_CONFIG] Lookup failed:",
      error
    );

    throw new Error(
      "Could not load channel configuration."
    );
  }

  if (!data) {
    return null;
  }

  const business =
    data as unknown as BusinessChannelRow;

  if (channel === "whatsapp") {
    return {
      business_id:
        business.business_id,

      channel,

      connected:
        business.whatsapp_connected ===
        true,

      access_token: null,
      refresh_token: null,

      channel_user_id: null,
      channel_username: null,

      page_id: null,
      page_name: null,
      page_access_token: null,

      tiktok_open_id: null,
      tiktok_scope: null,
    };
  }

  if (channel === "instagram") {
    return {
      business_id:
        business.business_id,

      channel,

      connected:
        business.instagram_connected ===
        true,

      access_token:
        business.instagram_access_token ??
        null,

      refresh_token: null,

      channel_user_id:
        business.instagram_user_id ??
        null,

      channel_username:
        business.instagram_username ??
        null,

      page_id: null,
      page_name: null,
      page_access_token: null,

      tiktok_open_id: null,
      tiktok_scope: null,
    };
  }

  if (channel === "facebook") {
    return {
      business_id:
        business.business_id,

      channel,

      connected:
        business.facebook_connected ===
        true,

      access_token:
        business.facebook_access_token ??
        null,

      refresh_token: null,

      channel_user_id:
        business.facebook_user_id ??
        null,

      channel_username: null,

      page_id:
        business.facebook_page_id ??
        null,

      page_name:
        business.facebook_page_name ??
        null,

      page_access_token:
        business.facebook_page_access_token ??
        null,

      tiktok_open_id: null,
      tiktok_scope: null,
    };
  }

  return {
    business_id:
      business.business_id,

    channel,

    connected:
      business.tiktok_connected ===
      true,

    access_token:
      business.tiktok_access_token ??
      null,

    refresh_token:
      business.tiktok_refresh_token ??
      null,

    channel_user_id:
      business.tiktok_open_id ??
      null,

    channel_username: null,

    page_id: null,
    page_name: null,
    page_access_token: null,

    tiktok_open_id:
      business.tiktok_open_id ??
      null,

    tiktok_scope:
      business.tiktok_scope ??
      null,
  };
}