import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/welcome",
    "/subscription",
    "/payment-success",
    "/api",
  ];

  if (
    publicRoutes.some((route) =>
      pathname.startsWith(route)
    )
  ) {
    return NextResponse.next();
  }

  // Authentication only
  const token =
    request.cookies.get("sb-access-token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico).*)",
  ],
};