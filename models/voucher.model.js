import mongoose from "mongoose";

// Mã khuyến mãi
const voucherSchema = new mongoose.Schema({
   code: { type: String, unique: true },
   discountPercent: Number,
   discountAmount: Number,
   expiryDate: Date,
   status: { type: String, enum: ["Active", "Expired", "Used"], default: "Active" },
}, { timestamps: true });

export default mongoose.model("Voucher", voucherSchema);
