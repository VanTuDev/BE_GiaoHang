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
   serviceAreas: { type: [String], default: [] }, // Danh sách quận/huyện hoạt động
   // Vị trí hiện tại của tài xế (GeoJSON Point)
   currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
   },
   locationUpdatedAt: { type: Date }, // Thời gian cập nhật vị trí lần cuối
   // Thông tin ngân hàng để nhận tiền
   bankAccountName: { type: String },
   bankAccountNumber: { type: String },
   bankName: { type: String },
   bankCode: { type: String }
}, { timestamps: true });

// Index để tìm kiếm theo vị trí (GeoJSON 2dsphere)
driverSchema.index({ currentLocation: '2dsphere' });

export default mongoose.model("Driver", driverSchema);
