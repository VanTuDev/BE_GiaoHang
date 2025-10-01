import mongoose from "mongoose";

// Item trong đơn: mỗi item có thể được 1 tài xế nhận riêng
const orderItemSchema = new mongoose.Schema({
   vehicleType: { type: String, required: true },
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
   itemPhotos: [String], // Hình ảnh đơn hàng
}, { _id: true, timestamps: true });

// Đơn hàng nhiều item
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
   customerNote: { type: String },
   status: {
      type: String,
      enum: ["Created", "InProgress", "Completed", "Cancelled"],
      default: "Created"
   }
}, { timestamps: true });

// Tạo index cho vị trí để tìm kiếm dựa trên khoảng cách
orderSchema.index({ pickupLocation: '2dsphere' });
orderSchema.index({ dropoffLocation: '2dsphere' });

export default mongoose.model("Order", orderSchema);