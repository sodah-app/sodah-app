import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!clientId) {
    return new Response("❌ META_APP_ID missing", { status: 500 });
  }

  if (!redirectUri) {
    return new Response("❌ META_REDIRECT_URI missing", { status: 500 });
  }

  const metaURL = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=whatsapp_business_management,whatsapp_business_messaging`;

  console.log("👉 Redirecting to:", metaURL);

  return NextResponse.redirect(metaURL);
}