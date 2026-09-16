import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    service: String,
    date: String,
    time: String,
    location: String,
    customerName: String,
    customerPhone: String,
    customerEmail: String,
    status: {
      type: String,
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);