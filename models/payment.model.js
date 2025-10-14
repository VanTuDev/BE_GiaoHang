import mongoose from "mongoose";

// Thanh toán cho đơn hàng
const paymentSchema = new mongoose.Schema({
   orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
   method: { type: String, enum: ["MoMo", "VNPay", "ZaloPay", "COD"], required: true },
   amount: Number,
   status: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Pending" },
   transactionCode: String,
}, { timestamps: true });

export default mongoose.model("Payment", paymentSchema);
