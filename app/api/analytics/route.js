import { connectDB } from "../../../lib/mongodb";
import Booking from "../../../models/Booking";

export async function GET() {
  try {
    await connectDB();

    const bookings = await Booking.find();

    return Response.json(bookings);
  } catch (error) {
    console.error("API ERROR:", error);

    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}