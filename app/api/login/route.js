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
          message: "User not found.",
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
          message: "Invalid password.",
        },
        { status: 401 }
      );
    }

    const now = new Date();

    // =====================================
    // Automatically expire trial
    // =====================================

    if (
      user.trialEndDate &&
      now > new Date(user.trialEndDate)
    ) {
      user.subscriptionStatus = "expired";
      await user.save();
    }

    // =====================================
    // Remaining time
    // =====================================

    let remainingDays = 0;
    let remainingHours = 0;

    if (user.trialEndDate) {
      const diff =
        new Date(user.trialEndDate).getTime() -
        now.getTime();

      remainingDays = Math.max(
        0,
        Math.ceil(diff / (1000 * 60 * 60 * 24))
      );

      remainingHours = Math.max(
        0,
        Math.ceil(diff / (1000 * 60 * 60))
      );
    }

    // =====================================
    // Subscription check
    // =====================================

    const expired =
      user.subscriptionStatus === "expired" ||
      user.plan === "Expired";

    if (expired) {
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
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      response.cookies.set("token", user._id.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });

      return response;
    }

    // =====================================
    // Remove password
    // =====================================

    const {
      password: _password,
      ...safeUser
    } = user.toObject();

    // =====================================
    // Successful login
    // =====================================

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      remainingDays,
      remainingHours,
      subscriptionStatus:
        user.subscriptionStatus,
      trialEndDate:
        user.trialEndDate,
      user: safeUser,
    });

    response.cookies.set("token", user._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set("blocked", "false", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error.",
      },
      { status: 500 }
    );
  }
}