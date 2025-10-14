import mongoose from "mongoose";

// Thông tin mở rộng khi User là tài xế
const driverSchema = new mongoose.Schema({
   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
   vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
   status: { type: String, enum: ["Pending", "Active", "Rejected", "Blocked"], default: "Pending" },
   rating: { type: Number, default: 5.0 },
   totalTrips: { type: Number, default: 0 },
   incomeBalance: { type: Number, default: 0 },
   isOnline: { type: Boolean, default: false },
   lastOnlineAt: { type: Date },
   avatarUrl: { type: String },
   serviceAreas: { type: [String], default: [] } // Danh sách quận/huyện hoạt động
}, { timestamps: true });

export default mongoose.model("Driver", driverSchema);
