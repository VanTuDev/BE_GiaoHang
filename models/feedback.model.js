import mongoose from "mongoose";

// Đánh giá dịch vụ
const feedbackSchema = new mongoose.Schema({
   orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
   customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
   rating: { type: Number, min: 1, max: 5 },
   comment: String,
}, { timestamps: true });

export default mongoose.model("Feedback", feedbackSchema);
