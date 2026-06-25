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

    // Automatically expire trial
    if (
      user.trialEndDate &&
      today > new Date(user.trialEndDate)
    ) {
      user.subscriptionStatus = "expired";
      await user.save();
    }

    let remainingDays = 0;

    if (user.trialEndDate) {
      remainingDays = Math.max(
        0,
        Math.ceil(
          (new Date(user.trialEndDate) - today) /
            (1000 * 60 * 60 * 24)
        )
      );
    }

    // If subscription is expired
    if (user.subscriptionStatus === "expired") {
      const response = NextResponse.json(
        {
          success: false,
          expired: true,
          message:
            "Your subscription has expired. Please renew to continue.",
        },
        { status: 403 }
      );

      response.cookies.set("blocked", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      response.cookies.set("token", user._id.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return response;
    }

    // Successful login
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      remainingDays,
      subscriptionStatus: user.subscriptionStatus,
      trialEndDate: user.trialEndDate,
      user,
    });

    response.cookies.set("token", user._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("blocked", "false", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
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