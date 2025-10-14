import mongoose from "mongoose";

// Bảo hiểm đơn hàng
const insuranceSchema = new mongoose.Schema({
   orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
   provider: { type: String, default: "App" },
   amount: Number,
   status: { type: String, enum: ["Active", "Claiming", "Closed"], default: "Active" },
}, { timestamps: true });

export default mongoose.model("Insurance", insuranceSchema);
