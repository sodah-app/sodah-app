import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl;

  const blocked = req.cookies.get("blocked");
  const loggedIn = req.cookies.get("token"); // Replace with your auth cookie name

  // Redirect unauthenticated users
  if (!loggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect expired subscriptions
  if (blocked?.value === "true") {
    return NextResponse.redirect(
      new URL("/subscription-expired", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/automation/:path*",
    "/chat/:path*",
    "/services/:path*",
    "/settings/:path*",
    "/analytics/:path*",
    "/profile/:path*",
    "/connect-whatsapp/:path*",
    "/setup-ai/:path*",
    "/welcome/:path*",
    "/admin/:path*",
  ],
};