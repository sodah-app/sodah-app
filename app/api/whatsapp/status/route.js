import { NextResponse } from "next/server";

export async function GET(req) {

  try {

    const { searchParams } =
      new URL(req.url);

    const businessId =
      searchParams.get("businessId");

    if (!businessId) {

      return NextResponse.json({
        connected: false
      });
    }

    const instanceName =
      `sodah_${businessId}`;

    const EVOLUTION_URL =
      process.env.EVOLUTION_API_URL;

    const EVOLUTION_KEY =
      process.env.EVOLUTION_API_KEY;

    const response = await fetch(
      `${EVOLUTION_URL}/instance/connectionState/${instanceName}`,
      {
        method: "GET",

        headers: {
          apikey: EVOLUTION_KEY
        }
      }
    );

    const data =
      await response.json();

    console.log(data);

    const connected =
      data?.instance?.state ===
      "open";

    return NextResponse.json({
      connected
    });

  } catch (error) {

    console.log(error);

    return NextResponse.json({
      connected: false
    });
  }
}