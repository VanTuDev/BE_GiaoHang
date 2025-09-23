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
   status: { type: String, enum: ["Created", "Accepted", "PickedUp", "Delivering", "Delivered", "Cancelled"], default: "Created" },
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" }
}, { _id: true });

// Đơn hàng nhiều item
const orderSchema = new mongoose.Schema({
   customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
   pickupAddress: { type: String, required: true },
   dropoffAddress: { type: String, required: true },
   items: { type: [orderItemSchema], default: [] },
   totalPrice: { type: Number, default: 0 },
   paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
