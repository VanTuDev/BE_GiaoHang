import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   // Driver functions
   createWithdrawalRequest,
   getMyWithdrawalHistory,
   getWithdrawalDetail,
   // Admin functions
   getAllWithdrawalRequests,
   getAdminWithdrawalDetail,
   approveWithdrawal,
   rejectWithdrawal,
   completeWithdrawal,
   getWithdrawalStats
} from '../controllers/withdrawalController.js';

const router = express.Router();

/**
 * ============================================
 * DRIVER ROUTES - YÊU CẦU RÚT TIỀN
 * ============================================
 */

/**
 * TÀI XẾ: TẠO YÊU CẦU RÚT TIỀN
 * POST /api/driver/withdrawal/request
 * Body: { 
 *   requestedAmount, 
 *   bankAccountName, 
 *   bankAccountNumber, 
 *   bankName, 
 *   bankCode?,
 *   confirmedAccountNumber,
 *   driverNote? 
 * }
 * 
 * Logic:
 * - Tài xế nhập thông tin tài khoản ngân hàng và số tiền muốn rút
 * - Phải xác nhận lại số tài khoản (confirmedAccountNumber phải khớp với bankAccountNumber)
 * - Kiểm tra số dư tài khoản có đủ không
 * - Tự động tính: actualAmount = 80%, systemFee = 20%
 * - Tạo yêu cầu với trạng thái "Pending"
 */
router.post(
   '/driver/withdrawal/request',
   authenticate,
   authorize(roles.DRIVER),
   createWithdrawalRequest
);

/**
 * TÀI XẾ: XEM LỊCH SỬ YÊU CẦU RÚT TIỀN
 * GET /api/driver/withdrawal/history
 * Query: ?status=Pending&page=1&limit=10
 * 
 * Chức năng: Xem tất cả yêu cầu rút tiền của tài xế, có thể filter theo status
 */
router.get(
   '/driver/withdrawal/history',
   authenticate,
   authorize(roles.DRIVER),
   getMyWithdrawalHistory
);

/**
 * TÀI XẾ: XEM CHI TIẾT YÊU CẦU RÚT TIỀN
 * GET /api/driver/withdrawal/:id
 * 
 * Chức năng: Xem chi tiết một yêu cầu rút tiền cụ thể của mình
 */
router.get(
   '/driver/withdrawal/:id',
   authenticate,
   authorize(roles.DRIVER),
   getWithdrawalDetail
);

/**
 * ============================================
 * ADMIN ROUTES - QUẢN LÝ YÊU CẦU RÚT TIỀN
 * ============================================
 */

/**
 * ADMIN: XEM DANH SÁCH TẤT CẢ YÊU CẦU RÚT TIỀN
 * GET /api/admin/withdrawals
 * Query: ?status=Pending&driverId=xxx&page=1&limit=20
 * 
 * Chức năng: Admin xem tất cả yêu cầu rút tiền từ các tài xế
 * - Có thể filter theo status (Pending, Approved, Rejected, Completed, Cancelled)
 * - Có thể filter theo driverId
 * - Có phân trang
 */
router.get(
   '/admin/withdrawals',
   authenticate,
   authorize(roles.ADMIN),
   getAllWithdrawalRequests
);

/**
 * ADMIN: THỐNG KÊ YÊU CẦU RÚT TIỀN
 * GET /api/admin/withdrawals/stats
 * Query: ?startDate=2024-01-01&endDate=2024-12-31
 * 
 * Chức năng: Thống kê tổng số yêu cầu, tổng số tiền theo trạng thái
 */
router.get(
   '/admin/withdrawals/stats',
   authenticate,
   authorize(roles.ADMIN),
   getWithdrawalStats
);

/**
 * ADMIN: XEM CHI TIẾT YÊU CẦU RÚT TIỀN
 * GET /api/admin/withdrawals/:id
 * 
 * Chức năng: Admin xem chi tiết một yêu cầu rút tiền cụ thể
 */
router.get(
   '/admin/withdrawals/:id',
   authenticate,
   authorize(roles.ADMIN),
   getAdminWithdrawalDetail
);

/**
 * ADMIN: CHẤP THUẬN YÊU CẦU RÚT TIỀN
 * PUT /api/admin/withdrawals/:id/approve
 * Body: { adminNote? }
 * 
 * Logic:
 * - Kiểm tra yêu cầu có status = "Pending"
 * - Kiểm tra số dư tài xế có đủ không
 * - Trừ tiền từ driver.incomeBalance
 * - Tạo DriverTransaction với type: 'Withdrawal'
 * - Số tiền thực nhận = 80%, phí hệ thống = 20%
 * - Cập nhật status = "Approved"
 * - Lưu transactionId và thông tin admin xử lý
 */
router.put(
   '/admin/withdrawals/:id/approve',
   authenticate,
   authorize(roles.ADMIN),
   approveWithdrawal
);

/**
 * ADMIN: TỪ CHỐI YÊU CẦU RÚT TIỀN
 * PUT /api/admin/withdrawals/:id/reject
 * Body: { rejectionReason, adminNote? }
 * 
 * Logic:
 * - Chỉ có thể từ chối khi status = "Pending"
 * - Cập nhật status = "Rejected"
 * - Lưu lý do từ chối và thông tin admin xử lý
 * - KHÔNG trừ tiền tài xế
 */
router.put(
   '/admin/withdrawals/:id/reject',
   authenticate,
   authorize(roles.ADMIN),
   rejectWithdrawal
);

/**
 * ADMIN: ĐÁNH DẤU HOÀN THÀNH CHUYỂN TIỀN
 * PUT /api/admin/withdrawals/:id/complete
 * Body: { adminNote? }
 * 
 * Logic:
 * - Chỉ có thể đánh dấu khi status = "Approved"
 * - Cập nhật status = "Completed"
 * - Lưu thời gian hoàn thành
 */
router.put(
   '/admin/withdrawals/:id/complete',
   authenticate,
   authorize(roles.ADMIN),
   completeWithdrawal
);

export default router;
