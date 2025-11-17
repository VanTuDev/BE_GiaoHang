import mongoose from "mongoose";

/**
 * Item trong đơn hàng: mỗi mục có thể được một tài xế nhận riêng.
 * Lưu lại trạng thái theo từng bước xử lý và các mốc thời gian quan trọng.
 */
const orderItemSchema = new mongoose.Schema({
   vehicleType: { type: String, required: false }, // Cho phép null (theo luồng mới không cần chọn loại xe cụ thể)
   weightKg: { type: Number, required: true },
   distanceKm: { type: Number, required: true },
   loadingService: { type: Boolean, default: false },
   insurance: { type: Boolean, default: false },
   priceBreakdown: {
      basePerKm: Number,
      distanceCost: Number,
      loadCost: Number,
      insuranceFee: Number,
      total: Number
   },
   status: {
      type: String,
      enum: ["Created", "Accepted", "PickedUp", "Delivering", "Delivered", "Cancelled"],
      default: "Created"
   },
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
   acceptedAt: { type: Date },
   pickedUpAt: { type: Date },
   deliveredAt: { type: Date },
   cancelledAt: { type: Date },
   cancelReason: { type: String },
   itemPhotos: [String],
   // Track tài xế đã được gửi đơn và đã từ chối
   offeredToDrivers: [{
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
      offeredAt: { type: Date, default: Date.now },
      status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
      rejectedAt: { type: Date }
   }]
}, { _id: true, timestamps: true });

// Đơn hàng gồm nhiều item, mỗi item có thể do tài xế khác nhau phụ trách.
const orderSchema = new mongoose.Schema({
   customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
   pickupAddress: { type: String, required: true },
   pickupLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
   },
   dropoffAddress: { type: String, required: true },
   dropoffLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
   },
   items: { type: [orderItemSchema], default: [] },
   totalPrice: { type: Number, default: 0 },
   paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
   paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
   paymentMethod: { type: String, enum: ["Cash", "Banking", "Wallet"], default: "Cash" },
   // Người thanh toán: người gửi (sender) hoặc người nhận (receiver)
   paymentBy: {
      type: String,
      enum: ["sender", "receiver"],
      default: "sender",
      required: true
   },
   customerNote: { type: String },
   status: {
      type: String,
      enum: ["Created", "InProgress", "Completed", "Cancelled"],
      default: "Created"
   }
}, { timestamps: true });

// Index để tìm kiếm theo vị trí
orderSchema.index({ pickupLocation: '2dsphere' });
orderSchema.index({ dropoffLocation: '2dsphere' });

export default mongoose.model("Order", orderSchema);

