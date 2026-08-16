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

  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  /*
   * Prevent the middleware from crashing with an
   * obscure MIDDLEWARE_INVOCATION_FAILED error if
   * the Supabase environment variables are missing.
   */
  if (!supabaseUrl || !supabasePublishableKey) {
    console.error(
      "[Middleware] Missing Supabase environment variables.",
      {
        hasSupabaseUrl: !!supabaseUrl,
        hasPublishableKey: !!supabasePublishableKey,
      }
    );

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
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
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
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

  try {
    /*
     * Refresh/validate the Supabase session.
     *
     * This keeps the browser session available
     * to the server-side parts of the application.
     */
    await supabase.auth.getUser();
  } catch (error) {
    console.error(
      "[Middleware] Supabase authentication error:",
      error
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};