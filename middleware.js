import { NextResponse } from "next/server";

export function middleware(req) {
  const blocked = req.cookies.get("blocked")?.value === "true";

  const { pathname } = req.nextUrl;

  // Allow these pages even when blocked
  if (
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Subscription expired
  if (blocked) {
    return NextResponse.redirect(
      new URL("/subscription", req.url)
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