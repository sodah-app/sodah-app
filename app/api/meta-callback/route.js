import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  console.log("✅ Meta Auth Code:", code);

  // TEMP: redirect back to dashboard
  return NextResponse.redirect("http://localhost:3000/dashboard");
}