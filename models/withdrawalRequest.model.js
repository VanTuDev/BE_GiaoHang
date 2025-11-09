import mongoose from "mongoose";

/**
 * MODEL: YÊU CẦU RÚT TIỀN CỦA TÀI XẾ
 * 
 * Lưu trữ các yêu cầu rút tiền từ tài xế, bao gồm:
 * - Thông tin tài khoản ngân hàng để nhận tiền
 * - Số tiền yêu cầu rút
 * - Trạng thái yêu cầu (Pending, Approved, Rejected, Completed)
 * - Lịch sử xử lý của admin
 */
const withdrawalRequestSchema = new mongoose.Schema({
   // ID của tài xế yêu cầu rút tiền
   driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true
   },

   // ID của user (tài xế) - để dễ query
   userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
   },

   // Số tiền yêu cầu rút (VND)
   requestedAmount: {
      type: Number,
      required: true,
      min: 1 // Phải lớn hơn 0
   },

   // Số tiền thực nhận (80% của requestedAmount)
   actualAmount: {
      type: Number,
      default: 0
   },

   // Phí hệ thống (20% của requestedAmount)
   systemFee: {
      type: Number,
      default: 0
   },

   /**
    * TRẠNG THÁI YÊU CẦU:
    * - "Pending": Chờ admin xử lý
    * - "Approved": Admin đã chấp thuận, đang chờ chuyển tiền
    * - "Rejected": Admin từ chối
    * - "Completed": Đã chuyển tiền thành công
    * - "Cancelled": Tài xế hủy yêu cầu
    */
   status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Completed", "Cancelled"],
      default: "Pending",
      index: true
   },

   // THÔNG TIN TÀI KHOẢN NGÂN HÀNG
   // Tên chủ tài khoản
   bankAccountName: {
      type: String,
      required: true,
      trim: true
   },

   // Số tài khoản ngân hàng
   bankAccountNumber: {
      type: String,
      required: true,
      trim: true
   },

   // Tên ngân hàng (VD: "Vietcombank", "BIDV", "Techcombank")
   bankName: {
      type: String,
      required: true,
      trim: true
   },

   // Mã ngân hàng (nếu có)
   bankCode: {
      type: String,
      trim: true
   },

   // Xác nhận số tài khoản (tài xế phải nhập lại để xác nhận)
   confirmedAccountNumber: {
      type: String,
      required: true,
      trim: true
   },

   // Ghi chú từ tài xế (nếu có)
   driverNote: {
      type: String,
      trim: true
   },

   // Lý do từ chối từ admin (nếu bị reject)
   rejectionReason: {
      type: String,
      trim: true
   },

   // ID của admin xử lý yêu cầu
   processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
   },

   // Thời gian admin chấp thuận
   approvedAt: {
      type: Date
   },

   // Thời gian admin từ chối
   rejectedAt: {
      type: Date
   },

   // Thời gian hoàn thành (đã chuyển tiền)
   completedAt: {
      type: Date
   },

   // ID giao dịch liên quan (DriverTransaction)
   transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DriverTransaction"
   }
}, {
   timestamps: true // Tự động thêm createdAt và updatedAt
});

// Index để tìm kiếm nhanh theo driver và status
withdrawalRequestSchema.index({ driverId: 1, status: 1 });
withdrawalRequestSchema.index({ userId: 1, status: 1 });
withdrawalRequestSchema.index({ createdAt: -1 });

export default mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
