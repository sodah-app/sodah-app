import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `
You are Sodah AI, the campaign-writing assistant for Sodah.io.

You create ready-to-send WhatsApp campaign messages for the authenticated business.

BUSINESS CONTEXT RULES:
- The business context supplied by the server is authoritative.
- Use the business name and the available business information naturally.
- You may mention the business industry, location, services, capabilities and price range only when those details are actually supplied.
- Never invent discounts, prices, dates, guarantees, links, services, results, products or features.
- If the user asks to promote the business but gives no message, create a complete, persuasive campaign message from the supplied business context.
- If there is not enough factual information for a specific claim, keep the message general rather than making up details.

MESSAGE RULES:
- Correct grammar, spelling, clarity and awkward wording.
- Preserve factual information supplied by the user.
- Follow the selected campaign style/instruction.
- Keep the result natural for WhatsApp and easy to read.
- Use the requested tone.
- Make the message convincing and action-oriented without sounding spammy.
- When a template is selected, the template purpose is the primary objective.
- If the user message/draft is empty, generate the complete message from the supplied business context.
- Return only the final message. No explanation, labels, quotation marks or markdown wrappers.
`;

async function resolveBusiness(
  supabase,
  userId,
  requestedBusinessId = ""
) {
  const requestedId =
    String(requestedBusinessId || "").trim();

  let query = supabase
    .from("businesses")
    .select(
      "business_id,business_name,ai_number,whatsapp_connected,industry,location,price_range,capabilities,services_description,working_days,hours,created_at"
    )
    .eq("user_id", userId);

  if (requestedId) {
    query = query.eq(
      "business_id",
      requestedId
    );
  } else {
    query = query
      .order("created_at", {
        ascending: true,
      })
      .limit(20);
  }

  const { data, error } =
    await query;

  if (error) {
    console.error(
      "[Campaign AI] Business lookup failed:",
      error
    );

    throw new Error(
      "Unable to load your business."
    );
  }

  const businesses = data || [];

  if (requestedId) {
    return businesses[0] || null;
  }

  return (
    businesses.find(
      (item) =>
        item.whatsapp_connected === true
    ) ||
    businesses[0] ||
    null
  );
}

async function getRequestSupabase(request) {
  try {
    const serverClient =
      await createServerClient();

    const serverAuth =
      await serverClient.auth.getUser();

    if (serverAuth?.data?.user) {
      return {
        supabase: serverClient,
        user: serverAuth.data.user,
      };
    }
  } catch (error) {
    console.error(
      "[Campaign AI] Server auth check failed:",
      error
    );
  }

  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

  const token =
    authorization.startsWith(
      "Bearer "
    )
      ? authorization
          .slice(7)
          .trim()
      : "";

  if (!token) {
    return {
      supabase: null,
      user: null,
    };
  }

  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      supabase: null,
      user: null,
    };
  }

  const tokenClient =
    createSupabaseClient(
      url,
      anonKey,
      {
        global: {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      }
    );

  const {
    data,
    error,
  } =
    await tokenClient.auth.getUser();

  if (
    error ||
    !data?.user
  ) {
    return {
      supabase: null,
      user: null,
    };
  }

  return {
    supabase: tokenClient,
    user: data.user,
  };
}

function buildBusinessContext(
  business,
  suppliedBusinessContext,
  businessName
) {
  const supplied =
    suppliedBusinessContext &&
    typeof suppliedBusinessContext ===
      "object"
      ? suppliedBusinessContext
      : {};

  return {
    business_name:
      business?.business_name ||
      supplied.business_name ||
      businessName ||
      "",

    industry:
      business?.industry ||
      supplied.industry ||
      "",

    location:
      business?.location ||
      supplied.location ||
      "",

    services_description:
      business?.services_description ||
      supplied.services_description ||
      "",

    capabilities:
      business?.capabilities ||
      supplied.capabilities ||
      "",

    price_range:
      business?.price_range ||
      supplied.price_range ||
      "",

    working_days:
      business?.working_days ||
      supplied.working_days ||
      "",

    hours:
      business?.hours ||
      supplied.hours ||
      "",
  };
}

export async function POST(request) {
  try {
    const {
      supabase,
      user,
    } =
      await getRequestSupabase(
        request
      );

    if (!supabase || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please sign in to use Campaign AI.",
        },
        { status: 401 }
      );
    }

    let body;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid campaign AI request.",
        },
        { status: 400 }
      );
    }

    const message =
      String(
        body?.message || ""
      ).trim();

    const instruction =
      String(
        body?.instruction || ""
      ).trim();

    const tone =
      String(
        body?.tone || "Friendly"
      ).trim();

    const businessName =
      String(
        body?.business_name || ""
      ).trim();

    const suppliedBusinessContext =
      body?.business_context ||
      {};

    const requestedBusinessId =
      String(
        body?.business_id || ""
      ).trim();

    if (message.length > 12000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The message is too long.",
        },
        { status: 400 }
      );
    }

    const business =
      await resolveBusiness(
        supabase,
        user.id,
        requestedBusinessId
      );

    if (
      requestedBusinessId &&
      !business
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected Sodah business could not be found for this account.",
        },
        { status: 404 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          error:
            "We couldn't find your Sodah business.",
        },
        { status: 404 }
      );
    }

    const apiKey =
      process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Campaign AI is not configured.",
        },
        { status: 500 }
      );
    }

    const businessContext =
      buildBusinessContext(
        business,
        suppliedBusinessContext,
        businessName
      );

    const context = [
      `Business context (authoritative):
${JSON.stringify(
  businessContext,
  null,
  2
)}`,

      `Tone: ${tone}`,

      instruction
        ? `Campaign instruction: ${instruction}`
        : "",

      message
        ? `User message/draft:
${message}`
        : "User message/draft: None. Create the message from the business context and campaign instruction.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const response =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model:
              process.env
                .OPENAI_CAMPAIGN_MODEL ||
              "gpt-4o-mini",

            messages: [
              {
                role: "system",
                content:
                  SYSTEM_PROMPT,
              },

              {
                role: "user",
                content:
                  context,
              },
            ],
          }),
        }
      );

    const responseText =
      await response.text();

    let data = {};

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      console.error(
        "[Campaign AI] OpenAI returned non-JSON:",
        responseText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Campaign AI returned an invalid response.",
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error(
        "[Campaign AI] OpenAI error:",
        data
      );

      return NextResponse.json(
        {
          success: false,
          error:
            data?.error?.message ||
            "Campaign AI request failed.",
        },
        { status: 502 }
      );
    }

    const result =
      String(
        data?.choices?.[0]
          ?.message?.content ||
          ""
      ).trim();

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Campaign AI returned an empty message.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[Campaign AI] Route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare the campaign.",
      },
      { status: 500 }
    );
  }
}
