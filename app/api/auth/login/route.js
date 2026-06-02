import bcrypt from "bcryptjs";

import { connectDB } from "../../../../lib/mongodb.js";

import User from "../../../../models/User.js";

export async function POST(req) {
  try {
    // CONNECT DATABASE
    await connectDB();

    // GET BODY
    const body = await req.json();

    let { email, password } = body;

    // CLEAN INPUTS
    email = email
      ?.trim()
      .toLowerCase();

    password = password?.trim();

    // VALIDATION
    if (!email || !password) {
      return Response.json(
        {
          success: false,

          message:
            "Please fill in your details.",
        },
        {
          status: 400,
        }
      );
    }

    // FIND USER
    const user = await User.findOne({
      email,
    });

    // USER NOT FOUND
    if (!user) {
      return Response.json(
        {
          success: false,

          message:
            "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    // CHECK PASSWORD
    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    // INVALID PASSWORD
    if (!validPassword) {
      return Response.json(
        {
          success: false,

          message:
            "Invalid password.",
        },
        {
          status: 401,
        }
      );
    }

    // CHECK SUBSCRIPTION
    const now = new Date();

    const trialEndDate =
      new Date(
        user.trialEndDate
      );

    // EXPIRED
    if (now > trialEndDate) {
      user.subscriptionStatus =
        "expired";

      await user.save();
    }

    // REMAINING TIME
    const remainingMs =
      trialEndDate - now;

    const remainingDays =
      Math.ceil(
        remainingMs /
          (1000 *
            60 *
            60 *
            24)
      );

    const remainingHours =
      Math.ceil(
        remainingMs /
          (1000 *
            60 *
            60)
      );

    // REMOVE PASSWORD
    const userResponse =
      user.toObject();

    delete userResponse.password;

    // SUCCESS RESPONSE
    return Response.json({
      success: true,

      message:
        "Login successful.",

      user: userResponse,

      subscriptionStatus:
        user.subscriptionStatus,

      remainingDays,

      remainingHours,

      trialEndDate:
        user.trialEndDate,
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return Response.json(
      {
        success: false,

        message:
          "Server error.",
      },
      {
        status: 500,
      }
    );
  }
}