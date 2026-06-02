import bcrypt from "bcryptjs";
import { connectDB } from "../../../../lib/mongodb";
import User from "../../../../models/User";

export async function POST(req) {
  try {
    // CONNECT DATABASE
    await connectDB();

    // GET REQUEST BODY
    const body = await req.json();

    let {
      fullName,
      phone,
      email,
      password,
    } = body;

    // CLEAN INPUTS
    fullName = fullName?.trim();

    phone = phone?.trim();

    email = email
      ?.trim()
      .toLowerCase();

    password = password?.trim();

    // VALIDATION
    if (
      !fullName ||
      !phone ||
      !email ||
      !password
    ) {
      return Response.json(
        {
          success: false,

          message:
            "Please fill all fields.",
        },
        {
          status: 400,
        }
      );
    }

    // PASSWORD LENGTH
    if (password.length < 6) {
      return Response.json(
        {
          success: false,

          message:
            "Password must be at least 6 characters.",
        },
        {
          status: 400,
        }
      );
    }

    // CHECK EXISTING USER
    const existingUser =
      await User.findOne({
        email,
      });

    if (existingUser) {
      return Response.json(
        {
          success: false,

          message:
            "Email already exists.",
        },
        {
          status: 400,
        }
      );
    }

    // HASH PASSWORD
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // CREATE TRIAL DATES
    const trialStartDate =
      new Date();

    const trialEndDate =
      new Date();

    // ADD 7 DAYS
    trialEndDate.setDate(
      trialEndDate.getDate() + 7
    );

    // CREATE USER
    const newUser =
      await User.create({
        fullName,

        phone,

        email,

        password:
          hashedPassword,

        // SUBSCRIPTION
        subscriptionStatus:
          "trial",

        plan:
          "7-days-trial",

        trialStartDate,

        trialEndDate,
      });

    // REMOVE PASSWORD
    const userResponse =
      newUser.toObject();

    delete userResponse.password;

    // SUCCESS RESPONSE
    return Response.json(
      {
        success: true,

        message:
          "Account created successfully.",

        user: userResponse,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.log(
      "REGISTER ERROR:",
      error
    );

    return Response.json(
      {
        success: false,

        message:
          "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}