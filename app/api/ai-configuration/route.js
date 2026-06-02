import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const automationId =
      searchParams.get("automation_id");

    if (!automationId) {
      return NextResponse.json(
        {
          success: false,
          error: "automation_id is required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("ai_configurations")
      .select("*")
      .eq("automation_id", automationId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || null,
    });
  } catch (error) {
    console.error(
      "GET /api/ai-configuration error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      automation_id,
      provider = "openai",
      api_key = "",
      model = "gpt-4o-mini",
      system_prompt = "",
      temperature = 0.7,
      max_tokens = 1000,
      enabled = true,
    } = body;

    if (!automation_id) {
      return NextResponse.json(
        {
          success: false,
          error: "automation_id is required",
        },
        { status: 400 }
      );
    }

    const payload = {
      automation_id,
      provider,
      api_key,
      model,
      system_prompt,
      temperature,
      max_tokens,
      enabled,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("ai_configurations")
      .upsert(payload, {
        onConflict: "automation_id",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "POST /api/ai-configuration error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}