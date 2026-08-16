import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SodaAIRequest = {
  businessName?: string;
  campaignName?: string;
  prompt?: string;
  tone?: string;
  template?: string;
  message?: string;
  customPrompt?: string;
};

function getSodaAIUrl(): string {
  const rawUrl = process.env.SODA_AI_API_URL?.trim();

  if (!rawUrl) {
    throw new Error(
      "SODA_AI_API_URL is not configured. Add the Soda AI/n8n webhook URL to .env.local."
    );
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(
      `SODA_AI_API_URL is invalid: ${rawUrl}`
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(
      "SODA_AI_API_URL must start with http:// or https://."
    );
  }

  return url.toString();
}

function getOptionalApiKey(): string | undefined {
  const key = process.env.SODA_AI_API_KEY?.trim();

  return key || undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SodaAIRequest;

    const sodaAIUrl = getSodaAIUrl();
    const apiKey = getOptionalApiKey();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
        headers["x-api-key"] = apiKey;
      }

      const upstreamResponse = await fetch(sodaAIUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          businessName: body.businessName ?? "",
          campaignName: body.campaignName ?? "",
          prompt: body.prompt ?? body.customPrompt ?? body.message ?? "",
          tone: body.tone ?? "Friendly",
          template: body.template ?? "",
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      const responseText = await upstreamResponse.text();

      let responseData: unknown = null;

      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = {
            message: responseText,
          };
        }
      }

      if (!upstreamResponse.ok) {
        console.error(
          "[/api/soda-ai] Upstream request failed:",
          upstreamResponse.status,
          responseData
        );

        return NextResponse.json(
          {
            error:
              typeof responseData === "object" &&
              responseData !== null &&
              "error" in responseData
                ? String(
                    (responseData as { error?: unknown }).error
                  )
                : `Soda AI returned HTTP ${upstreamResponse.status}.`,
            status: upstreamResponse.status,
            details: responseData,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(responseData ?? {}, {
        status: 200,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[/api/soda-ai] Upstream request timed out.");

        return NextResponse.json(
          {
            error:
              "Soda AI took too long to respond. Check that the n8n workflow is running and reachable.",
          },
          { status: 504 }
        );
      }

      console.error(
        "[/api/soda-ai] Could not connect to Soda AI:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Could not connect to the Soda AI service. Check SODA_AI_API_URL and make sure the n8n webhook/service is running.",
          details:
            error instanceof Error ? error.message : String(error),
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[/api/soda-ai] Request processing failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid Soda AI request.",
      },
      { status: 400 }
    );
  }
}