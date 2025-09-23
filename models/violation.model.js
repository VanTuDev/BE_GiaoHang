import mongoose from "mongoose";

// Vi phạm của tài xế
const violationSchema = new mongoose.Schema({
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
   orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
   reason: String,
   penalty: Number,
}, { timestamps: true });

export default mongoose.model("Violation", violationSchema);
