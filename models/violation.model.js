import mongoose from "mongoose";

// Báo cáo vi phạm của tài xế
const violationSchema = new mongoose.Schema({
   // Thông tin báo cáo
   reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Người báo cáo
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true }, // Tài xế bị báo cáo
   orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // Đơn hàng liên quan
   orderItemId: { type: mongoose.Schema.Types.ObjectId }, // Item cụ thể trong đơn hàng

   // Loại vi phạm
   violationType: {
      type: String,
      enum: [
         "LatePickup", // Trễ lấy hàng
         "LateDelivery", // Trễ giao hàng
         "RudeBehavior", // Thái độ không tốt
         "DamagedGoods", // Làm hỏng hàng hóa
         "Overcharging", // Tính phí quá cao
         "UnsafeDriving", // Lái xe không an toàn
         "NoShow", // Không đến đúng giờ
         "Other" // Khác
      ],
      required: true
   },

   // Mô tả chi tiết
   description: { type: String, required: true, maxLength: 1000 },
   photos: [String], // Ảnh chứng minh vi phạm

   // Trạng thái xử lý
   status: {
      type: String,
      enum: ["Pending", "Investigating", "Resolved", "Dismissed"],
      default: "Pending"
   },

   // Xử lý của admin
   adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin xử lý
   adminNotes: String, // Ghi chú của admin
   penalty: { type: Number, default: 0 }, // Phạt tiền
   warningCount: { type: Number, default: 0 }, // Số lần cảnh báo

   // Thời gian xử lý
   resolvedAt: Date,

   // Thông tin bổ sung
   severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
   },
   isAnonymous: { type: Boolean, default: false },

}, { timestamps: true });

// Index để tìm kiếm nhanh
violationSchema.index({ driverId: 1 });
violationSchema.index({ reporterId: 1 });
violationSchema.index({ orderId: 1 });
violationSchema.index({ status: 1 });
violationSchema.index({ violationType: 1 });

export default mongoose.model("Violation", violationSchema);
