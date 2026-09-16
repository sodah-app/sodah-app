import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ============================================================
  // SUPABASE CONFIGURATION
  // ============================================================

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[Middleware] Missing Supabase environment variables."
    );

    return response;
  }

  // ============================================================
  // CREATE SUPABASE SERVER CLIENT
  // ============================================================

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          response = NextResponse.next({
            request: {
              headers:
                request.headers,
            },
          });

          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  // ============================================================
  // REFRESH SUPABASE SESSION
  // ============================================================
  //
  // IMPORTANT:
  // We do NOT redirect users here.
  // We do NOT block pages here.
  // We simply allow Supabase SSR to refresh the session
  // when a valid session exists.
  //
  // A missing session is NOT treated as a server error.
  // ============================================================

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user) {
      console.log(
        "[Middleware] Authenticated user:",
        user.id
      );
    } else if (
      error &&
      error.message !== "Auth session missing!"
    ) {
      console.error(
        "[Middleware] Supabase auth error:",
        error.message
      );
    }
  } catch (error) {
    console.error(
      "[Middleware] Supabase authentication error:",
      error
    );
  }

  // ============================================================
  // CONTINUE REQUEST
  // ============================================================

  return response;
}

// ============================================================
// MIDDLEWARE MATCHER
// ============================================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};