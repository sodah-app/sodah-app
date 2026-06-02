import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import User from "../../../models/User";
import { connectDB } from "../../../lib/mongodb";
export async function POST(req) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill in your details.",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid password",
        },
        { status: 401 }
      );
    }

    const today = new Date();

    if (
      user.trialEndDate &&
      today > new Date(user.trialEndDate)
    ) {
      user.subscriptionStatus = "expired";

      await user.save();

      return NextResponse.json(
        {
          success: false,
          expired: true,
          message:
            "Your free trial has expired. Please subscribe to continue.",
        },
        { status: 403 }
      );
    }

    let remainingDays = 0;

    if (user.trialEndDate) {
      remainingDays = Math.ceil(
        (new Date(user.trialEndDate) - today) /
          (1000 * 60 * 60 * 24)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Login successful",
      remainingDays,
      subscriptionStatus:
        user.subscriptionStatus,
      trialEndDate:
        user.trialEndDate,
      user,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}