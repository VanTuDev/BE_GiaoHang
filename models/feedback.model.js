import mongoose from "mongoose";

// Đánh giá dịch vụ
const feedbackSchema = new mongoose.Schema({
   orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
   orderItemId: { type: mongoose.Schema.Types.ObjectId, ref: "Order.items" },
   customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },

   // Đánh giá tổng quan
   overallRating: { type: Number, min: 1, max: 5, required: true },

   // Đánh giá chi tiết
   serviceRating: { type: Number, min: 1, max: 5 }, // Chất lượng dịch vụ
   driverRating: { type: Number, min: 1, max: 5 }, // Thái độ tài xế
   vehicleRating: { type: Number, min: 1, max: 5 }, // Tình trạng xe
   punctualityRating: { type: Number, min: 1, max: 5 }, // Đúng giờ

   // Nội dung đánh giá
   comment: { type: String, maxLength: 1000 },
   photos: [String], // URLs của ảnh đánh giá

   // Trạng thái
   status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Approved"
   },

   // Phản hồi từ admin (nếu có)
   adminResponse: String,

   // Thông tin bổ sung
   isAnonymous: { type: Boolean, default: false },
   helpfulCount: { type: Number, default: 0 }, // Số lượt đánh giá hữu ích

}, { timestamps: true });

// Index để tìm kiếm nhanh
feedbackSchema.index({ orderId: 1 });
feedbackSchema.index({ driverId: 1 });
feedbackSchema.index({ customerId: 1 });
feedbackSchema.index({ overallRating: 1 });

export default mongoose.model("Feedback", feedbackSchema);
