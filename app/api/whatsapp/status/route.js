import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { success: false },
      { status: 400 }
    );
  }

  const apiUrl = process.env.EVOLUTION_API_URL!;
  const apiKey = process.env.EVOLUTION_API_KEY!;

  const response = await fetch(
    `${apiUrl}/instance/connectionState/${businessId}`,
    {
      headers: {
        apikey: apiKey
      },
      cache: "no-store"
    }
  );

  const data = await response.json();

  return NextResponse.json({
    connected:
      data?.instance?.state === "open" ||
      data?.state === "open"
  });
}