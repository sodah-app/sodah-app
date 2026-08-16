import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new NextResponse(
      "Instagram configuration is missing.",
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "instagram_business_basic,instagram_business_manage_messages",
  });

  const instagramUrl =
    `https://www.instagram.com/oauth/authorize?${params.toString()}`;

  return NextResponse.redirect(instagramUrl);
}