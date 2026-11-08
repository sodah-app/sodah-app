import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    console.log("Received request:", body);

    return NextResponse.json({
      success: true,
      reply: "Hello from Sodah AI! Your webhook is working perfectly.",
      received: body,
    });
  } catch (error) {
    console.error("API Test Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}