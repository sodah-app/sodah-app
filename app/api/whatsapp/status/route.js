import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const businessId =
      searchParams
        .get("businessId")
        ?.trim();

    if (!businessId) {
      return NextResponse.json(
        {
          connected: false,

          error:
            "businessId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const apiUrl =
      process.env.EVOLUTION_API_URL;

    const apiKey =
      process.env.EVOLUTION_API_KEY;

    if (!apiUrl) {
      return NextResponse.json(
        {
          connected: false,

          error:
            "EVOLUTION_API_URL is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          connected: false,

          error:
            "EVOLUTION_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const response =
      await fetch(
        `${apiUrl}/instance/connectionState/${encodeURIComponent(
          businessId
        )}`,
        {
          method: "GET",

          headers: {
            apikey:
              apiKey,
          },

          cache:
            "no-store",
        }
      );

    const text =
      await response.text();

    let data = {};

    try {
      data = text
        ? JSON.parse(text)
        : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      console.error(
        "[WHATSAPP][STATUS] Evolution API error:",
        data
      );

      return NextResponse.json(
        {
          connected: false,

          state:
            "unknown",

          error:
            data?.message ??
            `Evolution API returned ${response.status}`,
        },
        {
          status: 502,
        }
      );
    }

    const state =
      data?.instance?.state ??
      data?.state ??
      "unknown";

    const connected =
      state === "open";

    return NextResponse.json({
      connected,

      state,

      businessId,

      instance:
        businessId,
    });
  } catch (error) {
    console.error(
      "[WHATSAPP][STATUS] Failed:",
      error
    );

    return NextResponse.json(
      {
        connected: false,

        state:
          "unknown",

        error:
          error instanceof Error
            ? error.message
            : "Unable to check WhatsApp status.",
      },
      {
        status: 500,
      }
    );
  }
}