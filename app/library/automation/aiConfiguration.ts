import { createClient } from "@/lib/supabase/server";

export type SodahAIConfiguration = {
  id: string;
  automation_id: string;
  provider: string;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
  business_id: string;
  created_at?: string | null;
  updated_at?: string | null;
};

const AI_CONFIGURATION_COLUMNS = [
  "id",
  "automation_id",
  "provider",
  "model",
  "system_prompt",
  "temperature",
  "max_tokens",
  "enabled",
  "business_id",
  "created_at",
  "updated_at",
].join(",");

export async function getAIConfiguration(
  businessId: string
): Promise<SodahAIConfiguration | null> {
  const id = businessId.trim();

  if (!id) {
    throw new Error("business_id is required.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_configurations")
    .select(AI_CONFIGURATION_COLUMNS)
    .eq("business_id", id)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[AUTOMATION][AI_CONFIG] Lookup failed:",
      error
    );
    throw new Error("Could not load AI configuration.");
  }

  return (data as SodahAIConfiguration | null) ?? null;
}
