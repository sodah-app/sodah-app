import { createClient } from "@/lib/supabase/server";
import type { SodahChannel } from "./types";

export type SodahCustomer = {
  id: string;
  business_id: string;
  channel: SodahChannel;
  channel_customer_id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  lead_status?: string | null;
  created_at?: string | null;
};

type FindOrCreateCustomerInput = {
  business_id: string;
  channel: SodahChannel;
  channel_customer_id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

function clean(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function findCustomer(
  businessId: string,
  channel: SodahChannel,
  channelCustomerId: string
): Promise<SodahCustomer | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id,business_id,channel,channel_customer_id,name,phone,email,lead_status,created_at"
    )
    .eq("business_id", businessId)
    .eq("channel", channel)
    .eq("channel_customer_id", channelCustomerId)
    .maybeSingle();

  if (error) {
    console.error("[AUTOMATION][CUSTOMER] Lookup failed:", error);
    throw new Error("Could not find customer.");
  }

  return (data as SodahCustomer | null) ?? null;
}

export async function findOrCreateCustomer(
  input: FindOrCreateCustomerInput
): Promise<SodahCustomer> {
  const businessId = input.business_id.trim();
  const channelCustomerId = input.channel_customer_id.trim();

  if (!businessId || !channelCustomerId) {
    throw new Error(
      "business_id and channel_customer_id are required."
    );
  }

  const existing = await findCustomer(
    businessId,
    input.channel,
    channelCustomerId
  );

  if (existing) {
    return existing;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      channel: input.channel,
      channel_customer_id: channelCustomerId,
      name: clean(input.name),
      phone: clean(input.phone),
      email: clean(input.email),
    })
    .select(
      "id,business_id,channel,channel_customer_id,name,phone,email,lead_status,created_at"
    )
    .single();

  if (error) {
    console.error("[AUTOMATION][CUSTOMER] Create failed:", error);
    throw new Error("Could not create customer.");
  }

  return data as SodahCustomer;
}
