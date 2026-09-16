import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // ============================================================
    // CREATE SERVER SUPABASE CLIENT
    // ============================================================

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },

          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(
                ({
                  name,
                  value,
                  options,
                }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                }
              );
            } catch (error) {
              console.log(
                "Cookie update skipped:",
                error
              );
            }
          },
        },
      }
    );

    // ============================================================
    // READ REQUEST
    // ============================================================

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return NextResponse.json(
        {
          error:
            "Please enter what you want to update.",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // AUTHENTICATION
    //
    // PRIMARY:
    // Authorization: Bearer <supabase_access_token>
    //
    // FALLBACK:
    // Supabase SSR cookie session
    // ============================================================

    const authorization =
      request.headers.get(
        "authorization"
      );

    console.log(
      "AUTHORIZATION HEADER PRESENT:",
      !!authorization
    );

    let authenticatedUser =
      null;

    // ------------------------------------------------------------
    // Bearer token
    // ------------------------------------------------------------

    if (
      authorization &&
      authorization.startsWith(
        "Bearer "
      )
    ) {
      const accessToken =
        authorization
          .slice(7)
          .trim();

      if (accessToken) {
        const {
          data: {
            user,
          },
          error,
        } =
          await supabase.auth.getUser(
            accessToken
          );

        console.log(
          "BEARER AUTH USER:",
          user?.id ||
            "NONE"
        );

        if (error) {
          console.error(
            "BEARER AUTH ERROR:",
            error.message
          );
        }

        if (user) {
          authenticatedUser =
            user;
        }
      }
    }

    // ------------------------------------------------------------
    // Cookie fallback
    // ------------------------------------------------------------

    if (!authenticatedUser) {
      const {
        data: {
          user,
        },
        error,
      } =
        await supabase.auth.getUser();

      console.log(
        "COOKIE AUTH USER:",
        user?.id ||
          "NONE"
      );

      if (error) {
        console.log(
          "COOKIE AUTH ERROR:",
          error.message
        );
      }

      if (user) {
        authenticatedUser =
          user;
      }
    }

    // ============================================================
    // FINAL AUTH CHECK
    // ============================================================

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    const userId =
      authenticatedUser.id;

    console.log(
      "AUTHENTICATED USER ID:",
      userId
    );

    // ============================================================
    // RESOLVE BUSINESS FROM AUTHENTICATED USER
    // ============================================================

    const {
      data: business,
      error: businessError,
    } =
      await supabase
        .from("businesses")
        .select("*")
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (businessError) {
      console.error(
        "BUSINESS LOOKUP ERROR:",
        businessError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load your business workspace.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !business ||
      !business.business_id
    ) {
      return NextResponse.json(
        {
          error:
            "No business workspace is linked to this account.",
        },
        {
          status: 404,
        }
      );
    }

    const businessId =
      business.business_id;

    console.log(
      "ACTIVE BUSINESS ID:",
      businessId
    );

    // ============================================================
    // OPENAI CHECK
    // ============================================================

    const openAIKey =
      process.env.OPENAI_API_KEY;

    if (!openAIKey) {
      console.error(
        "OPENAI_API_KEY is missing."
      );

      return NextResponse.json(
        {
          error:
            "AI service is not configured on the server.",
        },
        {
          status: 500,
        }
      );
    }

    // ============================================================
    // EXISTING BUSINESS COLUMNS
    //
    // We provide the current row to the model so it can only
    // request changes to fields that actually exist.
    // ============================================================

    const existingFields =
      Object.keys(
        business
      );

    const protectedFields = [
      "id",
      "business_id",
      "user_id",
      "created_at",
      "updated_at",
    ];

    const editableFields =
      existingFields.filter(
        (field) =>
          !protectedFields.includes(
            field
          )
      );

    // ============================================================
    // AI REQUEST
    // ============================================================

    const systemPrompt = `
You are Sodah Business Update AI.

Your job is to understand what the authenticated business owner wants to change in their business workspace.

The authenticated business is already resolved by the server.

IMPORTANT:
- Never invent a business_id.
- Never change user_id.
- Never change id.
- Never change created_at.
- Never change updated_at.
- Only return fields that exist in EDITABLE FIELDS.
- If the user asks for something that cannot be mapped to an existing field, do not invent a database column.
- Keep existing information unchanged unless the user specifically asks to change it.
- Understand natural language.
- Correctly handle business names, descriptions, services, packages, promotions, prices, working hours, contact details, addresses, FAQs and other available business fields.
- If the user asks to replace existing information, return the replacement.
- If the user asks to add information to a text field, preserve the existing content and append the new information when appropriate.
- Return valid JSON only.

EDITABLE FIELDS:
${JSON.stringify(
  editableFields
)}

CURRENT BUSINESS:
${JSON.stringify(
  business
)}

Return exactly this JSON structure:

{
  "reply": "short natural-language confirmation",
  "updates": {
    "field_name": "new value"
  }
}

The updates object must contain ONLY fields from EDITABLE FIELDS.
`;

    const aiResponse =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${openAIKey}`,
          },

          body: JSON.stringify({
            model:
              process.env.OPENAI_MODEL ||
              "gpt-4o-mini",

            temperature: 0.2,

            response_format: {
              type: "json_object",
            },

            messages: [
              {
                role: "system",
                content:
                  systemPrompt,
              },
              {
                role: "user",
                content:
                  message,
              },
            ],
          }),
        }
      );

    if (!aiResponse.ok) {
      const aiError =
        await aiResponse.text();

      console.error(
        "OPENAI ERROR:",
        aiError
      );

      return NextResponse.json(
        {
          error:
            "The AI service could not process your request.",
        },
        {
          status: 502,
        }
      );
    }

    const aiData =
      await aiResponse.json();

    const rawAIContent =
      aiData?.choices?.[0]?.message
        ?.content;

    if (!rawAIContent) {
      return NextResponse.json(
        {
          error:
            "The AI did not return a valid update.",
        },
        {
          status: 502,
        }
      );
    }

    // ============================================================
    // PARSE AI JSON
    // ============================================================

    let parsedAI;

    try {
      parsedAI =
        JSON.parse(
          rawAIContent
        );
    } catch (error) {
      console.error(
        "AI JSON PARSE ERROR:",
        error
      );

      console.error(
        "RAW AI CONTENT:",
        rawAIContent
      );

      return NextResponse.json(
        {
          error:
            "The AI returned an invalid update.",
        },
        {
          status: 502,
        }
      );
    }

    const requestedUpdates =
      parsedAI?.updates;

    if (
      !requestedUpdates ||
      typeof requestedUpdates !==
        "object"
    ) {
      return NextResponse.json(
        {
          error:
            "No business changes were detected.",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // SECURITY FILTER
    //
    // ONLY allow actual existing editable columns.
    // ============================================================

    const safeUpdates = {};

    for (const [
      key,
      value,
    ] of Object.entries(
      requestedUpdates
    )) {
      if (
        editableFields.includes(
          key
        )
      ) {
        safeUpdates[key] =
          value;
      }
    }

    console.log(
      "SAFE BUSINESS UPDATES:",
      safeUpdates
    );

    // ============================================================
    // NOTHING TO UPDATE
    // ============================================================

    if (
      Object.keys(
        safeUpdates
      ).length === 0
    ) {
      return NextResponse.json(
        {
          updated: false,

          message:
            parsedAI?.reply ||
            "I couldn't find a business field to update from that request.",

          businessId,
        },
        {
          status: 200,
        }
      );
    }

    // ============================================================
    // UPDATE BUSINESS
    //
    // IMPORTANT:
    // BOTH business_id AND user_id are checked.
    // ============================================================

    const {
      data: updatedBusiness,
      error: updateError,
    } =
      await supabase
        .from("businesses")
        .update(
          safeUpdates
        )
        .eq(
          "business_id",
          businessId
        )
        .eq(
          "user_id",
          userId
        )
        .select("*")
        .single();

    if (updateError) {
      console.error(
        "BUSINESS UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "The business update could not be saved.",
        },
        {
          status: 500,
        }
      );
    }

    // ============================================================
    // SUCCESS
    // ============================================================

    console.log(
      "BUSINESS UPDATED:",
      businessId
    );

    return NextResponse.json(
      {
        updated: true,

        message:
          parsedAI?.reply ||
          "Your business information has been updated successfully.",

        businessId,

        userId,

        changedFields:
          Object.keys(
            safeUpdates
          ),

        business:
          updatedBusiness,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "BUSINESS UPDATE ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "An unexpected error occurred.",
      },
      {
        status: 500,
      }
    );
  }
}