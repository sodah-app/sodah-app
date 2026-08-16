import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings/channels?instagram=error&message=${encodeURIComponent(
          errorDescription || error
        )}`,
        request.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/settings/channels?instagram=error&message=Missing%20authorization%20code",
        request.url
      )
    );
  }

  // We will exchange this code for the Instagram access token
  // in the next step.

  return NextResponse.redirect(
    new URL(
      "/dashboard/settings/channels?instagram=authorized",
      request.url
    )
  );
}