import { createClient } from "@/lib/supabase/server";
import type {
  SodahChannel,
  SodahTenantContext,
} from "./types";

const CHANNEL_CONNECTION_COLUMNS: Record<
  SodahChannel,
  keyof BusinessRow
> = {
  whatsapp: "whatsapp_connected",
  instagram: "instagram_connected",
  facebook: "facebook_connected",
  tiktok: "tiktok_connected",
};

type BusinessRow = {
  id: string;
  business_id: string;
  business_name?: string | null;
  setup_type?: string | null;
  status?: string | null;
  ai_enabled?: boolean | null;
  automation_enabled?: boolean | null;
  whatsapp_connected?: boolean | null;
  instagram_connected?: boolean | null;
  facebook_connected?: boolean | null;
  tiktok_connected?: boolean | null;
};

const BUSINESS_COLUMNS = [
  "id",
  "business_id",
  "business_name",
  "setup_type",
  "status",
  "ai_enabled",
  "automation_enabled",
  "whatsapp_connected",
  "instagram_connected",
  "facebook_connected",
  "tiktok_connected",
].join(",");

export async function resolveTenant(
  businessId: string,
  channel: SodahChannel
): Promise<SodahTenantContext | null> {
  const normalizedBusinessId =
    businessId.trim();

  if (!normalizedBusinessId) {
    return null;
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq(
      "business_id",
      normalizedBusinessId
    )
    .maybeSingle();

  if (error) {
    console.error(
      "[AUTOMATION][TENANT] Lookup failed:",
      error
    );

    throw new Error(
      "Could not resolve business."
    );
  }

  if (!data) {
    return null;
  }

  const business =
    data as unknown as BusinessRow;

  const connectionColumn =
    CHANNEL_CONNECTION_COLUMNS[
      channel
    ];

  return {
    business_id:
      business.business_id,

    channel,

    account_id:
      business.business_id,

    channel_connected:
      business[
        connectionColumn
      ] === true,

    business: {
      id:
        business.id,

      business_id:
        business.business_id,

      business_name:
        business.business_name ??
        null,

      setup_type:
        business.setup_type ??
        null,

      status:
        business.status ??
        null,

      ai_enabled:
        business.ai_enabled ??
        null,

      automation_enabled:
        business.automation_enabled ??
        null,
    },
  };
}