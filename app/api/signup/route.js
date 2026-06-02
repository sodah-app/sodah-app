import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../../../models/User.js";

// adjust if your path is different

// connect DB
async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;

  return mongoose.connect(process.env.MONGODB_URI, {
    dbName: "sodahDB",
  });
}

export async function POST(req) {
  try {
    await connectDB();

    const { fullName, phone, email, password } = await req.json();

    // 🔥 1. Validate
    if (!fullName || !phone || !email || !password) {
      return NextResponse.json(
        { message: "All fields required" },
        { status: 400 }
      );
    }

    // 🔥 2. Check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 400 }
      );
    }

    // 🔥 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔥 4. Create user
    const user = await User.create({
      fullName,
      phone,
      email,
      password: hashedPassword,
    });

    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 }
    );

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}