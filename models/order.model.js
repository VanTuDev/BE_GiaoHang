import mongoose from "mongoose";

/**
 * SCHEMA ITEM TRONG ĐON HANG
 * Mỗi item đại diện cho một mục hàng trong đơn hàng, có thể được một tài xế nhận riêng
 */
const orderItemSchema = new mongoose.Schema({
   // Loại xe cần thuê (VD: "Xe tải nhỏ", "Xe tải lớn", "Xe ben")
   vehicleType: { type: String, required: true },

   // Trọng lượng hàng hóa (đơn vị: kg)
   weightKg: { type: Number, required: true },

   // Khoảng cách vận chuyển (đơn vị: km)
   distanceKm: { type: Number, required: true },

   // Có sử dụng dịch vụ bốc xếp không
   loadingService: { type: Boolean, default: false },

   // Có mua bảo hiểm không
   insurance: { type: Boolean, default: false },

   // Chi tiết giá cả của mục hàng
   priceBreakdown: {
      basePerKm: Number,        // Giá cơ bản trên 1km
      distanceCost: Number,     // Tổng cước phí theo khoảng cách
      loadCost: Number,         // Phí bốc xếp (nếu có)
      insuranceFee: Number,     // Phí bảo hiểm (nếu có)
      total: Number             // Tổng giá trị của mục hàng
   },

   /**
    * TRẠNG THÁI ITEM - Luồng hoạt động:
    * 1. "Created" (Đơn có sẵn) - Mới tạo, chờ tài xế nhận
    * 2. "Accepted" (Đơn đã nhận) - Tài xế đã nhận đơn
    * 3. "PickedUp" (Đã lấy hàng) - Tài xế đã lấy hàng
    * 4. "Delivering" (Đơn đang giao) - Đang trong quá trình giao hàng
    * 5. "Delivered" (Đã hoàn thành) - Đã giao hàng thành công
    * 6. "Cancelled" (Đơn hủy) - Đơn bị hủy
    */
   status: {
      type: String,
      enum: ["Created", "Accepted", "PickedUp", "Delivering", "Delivered", "Cancelled"],
      default: "Created"
   },

   // ID của tài xế đã nhận cuốc xe này
   driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },

   // Thời gian tài xế chấp nhận đơn
   acceptedAt: { type: Date },

   // Thời gian đã lấy hàng
   pickedUpAt: { type: Date },

   // Thời gian giao hàng thành công
   deliveredAt: { type: Date },

   // Thời gian hủy đơn
   cancelledAt: { type: Date },

   // Lý do hủy đơn
   cancelReason: { type: String },

   // Danh sách URL hình ảnh của hàng hóa
   itemPhotos: [String],
}, { _id: true, timestamps: true });

/**
 * SCHEMA ĐƠN HÀNG
 * Một đơn hàng có thể chứa nhiều items, mỗi item có thể được tài xế khác nhau nhận
 */
const orderSchema = new mongoose.Schema({
   // ID của khách hàng đặt đơn
   customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

   // Địa chỉ lấy hàng (dạng text)
   pickupAddress: { type: String, required: true },

   // Tọa độ địa điểm lấy hàng (dùng cho bản đồ)
   pickupLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
   },

   // Địa chỉ giao hàng (dạng text)
   dropoffAddress: { type: String, required: true },

   // Tọa độ địa điểm giao hàng (dùng cho bản đồ)
   dropoffLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
   },

   // Danh sách các mục hàng trong đơn
   items: [{
      vehicleType: String,
      weightKg: Number,
      distanceKm: Number,
      loadingService: Boolean,
      insurance: Boolean,
      priceBreakdown: Object,
      status: String,
      itemPhotos: [String],
      driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' } // ID của tài xế đã nhận cuốc
   }],

   // Tổng giá trị đơn hàng (tổng của tất cả items)
   totalPrice: { type: Number, default: 0 },

   // ID thanh toán (nếu đã thanh toán)
   paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

   // Trạng thái thanh toán
   paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },

   // Phương thức thanh toán
   paymentMethod: { type: String, enum: ["Cash", "Banking", "Wallet"], default: "Cash" },

   // Ghi chú từ khách hàng
   customerNote: { type: String },

   /**
    * TRẠNG THÁI ĐƠN HÀNG TỔNG THỂ:
    * - "Created": Đơn mới tạo, chưa có tài xế nhận
    * - "InProgress": Có ít nhất 1 item đã được tài xế nhận và đang xử lý
    * - "Completed": Tất cả items đã hoàn thành
    * - "Cancelled": Tất cả items đã bị hủy
    */
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