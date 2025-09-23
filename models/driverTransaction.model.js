import mongoose from "mongoose";

// Lịch sử giao dịch tiền của tài xế
const driverTransactionSchema = new mongoose.Schema({
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
   orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // Liên quan cuốc xe nào
   type: {
      type: String,
      enum: ["TripIncome", "AppFee", "Withdrawal", "Refund", "Adjustment"],
      required: true
   },
   amount: { type: Number, required: true },        // Số tiền (+ thu nhập, - phí/rút tiền)
   balanceAfter: { type: Number, required: true },  // Số dư sau giao dịch
   description: String,                             // Ghi chú: "Thu nhập từ đơn X", "Phí 10% app"...
}, { timestamps: true });

export default mongoose.model("DriverTransaction", driverTransactionSchema);
