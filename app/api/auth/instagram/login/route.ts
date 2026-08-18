import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type LoginBody = {
  username?: string;
  password?: string;
};

function jsonResponse(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    /*
     * ---------------------------------------------------------
     * ENVIRONMENT
     * ---------------------------------------------------------
     */

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabaseServiceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error(
        "Missing NEXT_PUBLIC_SUPABASE_URL"
      );

      return jsonResponse(
        {
          error:
            "Server configuration error: Supabase URL is missing.",
        },
        500
      );
    }

    if (!supabaseAnonKey) {
      console.error(
        "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );

      return jsonResponse(
        {
          error:
            "Server configuration error: Supabase anonymous key is missing.",
        },
        500
      );
    }

    if (!supabaseServiceRoleKey) {
      console.error(
        "Missing SUPABASE_SERVICE_ROLE_KEY"
      );

      return jsonResponse(
        {
          error:
            "Server configuration error: Supabase service role key is missing.",
        },
        500
      );
    }

    /*
     * ---------------------------------------------------------
     * READ REQUEST
     * ---------------------------------------------------------
     */

    let body: LoginBody;

    try {
      body = (await request.json()) as LoginBody;
    } catch (error) {
      console.error(
        "Invalid login request JSON:",
        error
      );

      return jsonResponse(
        {
          error:
            "Invalid login request.",
        },
        400
      );
    }

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!username || !password) {
      return jsonResponse(
        {
          error:
            "Username and password are required.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------------------
     * ADMIN CLIENT
     * ---------------------------------------------------------
     *
     * Used only to find the Supabase email belonging to the
     * supplied Sodah username.
     */

    const admin =
      createSupabaseAdmin(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    /*
     * ---------------------------------------------------------
     * FIND USER
     * ---------------------------------------------------------
     *
     * We support:
     *
     * 1. User entering their actual Supabase email
     * 2. User entering a username stored in user_metadata
     *
     * This avoids requiring a specific profiles table.
     */

    let matchedEmail: string | null = null;

    /*
     * First, if the supplied value looks like an email,
     * use it directly.
     */

    if (
      username.includes("@") &&
      username.includes(".")
    ) {
      matchedEmail = username;
    }

    /*
     * Otherwise search Supabase Auth users for the username.
     *
     * NOTE:
     * This is suitable for a small/medium application.
     * For a large application, store username -> user_id/email
     * in a dedicated table with an index.
     */

    if (!matchedEmail) {
      let page = 1;
      const perPage = 1000;

      while (!matchedEmail) {
        const {
          data,
          error,
        } = await admin.auth.admin.listUsers({
          page,
          perPage,
        });

        if (error) {
          console.error(
            "Unable to search Supabase users:",
            error
          );

          return jsonResponse(
            {
              error:
                "Unable to look up the Sodah account.",
            },
            500
          );
        }

        const users = data.users;

        const normalizedUsername =
          username.toLowerCase();

        const matchedUser =
          users.find((user) => {
            const metadata =
              user.user_metadata || {};

            const metadataUsername =
              typeof metadata.username ===
              "string"
                ? metadata.username.trim().toLowerCase()
                : "";

            const metadataUserName =
              typeof metadata.user_name ===
              "string"
                ? metadata.user_name.trim().toLowerCase()
                : "";

            const metadataHandle =
              typeof metadata.handle ===
              "string"
                ? metadata.handle.trim().toLowerCase()
                : "";

            return (
              metadataUsername ===
                normalizedUsername ||
              metadataUserName ===
                normalizedUsername ||
              metadataHandle ===
                normalizedUsername
            );
          });

        if (matchedUser?.email) {
          matchedEmail =
            matchedUser.email;
          break;
        }

        if (
          users.length < perPage
        ) {
          break;
        }

        page++;
      }
    }

    if (!matchedEmail) {
      console.warn(
        "Sodah login username not found:",
        username
      );

      return jsonResponse(
        {
          error:
            "Invalid username or password.",
        },
        401
      );
    }

    /*
     * ---------------------------------------------------------
     * AUTHENTICATE WITH SUPABASE
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     *
     * We use the ANON key for signInWithPassword.
     * We do NOT use the service-role key to authenticate the
     * user's password.
     */

    const authClient =
      createSupabaseAdmin(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    const {
      data: authData,
      error: authError,
    } =
      await authClient.auth.signInWithPassword({
        email: matchedEmail,
        password,
      });

   if (
  authError ||
  !authData.session ||
  !authData.user
) {
  console.error("========== SODAH AUTH FAILURE ==========");
  console.error("Username:", username);
  console.error("Matched email:", matchedEmail);
  console.error("Supabase auth error:", authError);
  console.error("Supabase auth error message:", authError?.message);
  console.error("Supabase auth error code:", authError?.code);
  console.error("Has session:", Boolean(authData.session));
  console.error("Has user:", Boolean(authData.user));
  console.error("=========================================");

  return jsonResponse(
    {
      error: authError?.message || "Supabase authentication failed.",
      code: authError?.code || "AUTH_FAILED",
    },
    401
  );
}
    /*
     * ---------------------------------------------------------
     * IMPORTANT
     * ---------------------------------------------------------
     *
     * The session returned above belongs to the server-side
     * auth client. We still need to establish the browser's
     * Supabase session.
     *
     * Return the credentials to the browser so the client
     * can call supabase.auth.setSession().
     */

    return jsonResponse({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      session: {
        access_token:
          authData.session.access_token,
        refresh_token:
          authData.session.refresh_token,
      },
    });
  } catch (error) {
    console.error(
      "Instagram Sodah login route crashed:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sign in.",
      },
      500
    );
  }
}