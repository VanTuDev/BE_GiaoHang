import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   getDashboardStats,
   getUsers,
   getDrivers,
   getOrders,
   getRevenueReport,
   getSystemRevenueStats,
   getDriverDetail,
   getUserDetail,
   banDriver,
   unbanDriver,
   payoutToDriver,
   resetDriverBalanceWithPenalty,
   getDriverRevenueStats,
   getDriversWithRevenue
} from '../controllers/adminController.js';
import {
   getAllWithdrawalRequests,
   getWithdrawalRequestDetail,
   approveWithdrawalRequest,
   rejectWithdrawalRequest,
   completeWithdrawalRequest,
   getWithdrawalStats
} from '../controllers/adminWithdrawalController.js';

const router = express.Router();

// Yêu cầu xác thực và quyền Admin cho tất cả các routes
router.use(authenticate, authorize(roles.ADMIN));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Quản lý người dùng
router.get('/users', getUsers);
router.get('/users/:userId', getUserDetail);

// Quản lý tài xế
router.get('/drivers', getDrivers);
router.get('/drivers/:driverId', getDriverDetail);

// Cấm/Mở cấm tài xế
router.put('/drivers/:driverId/ban', banDriver);
router.put('/drivers/:driverId/unban', unbanDriver);

// Admin: chi trả cho tài xế
router.post('/drivers/:driverId/payout', payoutToDriver);

// Admin: reset số dư và trừ 20%
router.post('/drivers/:driverId/reset-balance', resetDriverBalanceWithPenalty);

// Admin: thống kê doanh thu tài xế theo ngày/tuần/tháng
router.get('/drivers/:driverId/revenue', getDriverRevenueStats);

// Quản lý đơn hàng
router.get('/orders', getOrders);

// Báo cáo doanh thu (giữ nguyên để tương thích)
router.get('/revenue', getRevenueReport);

// Thống kê doanh thu hệ thống (tổng tiền tài xế thu nhập và 20% phí)
router.get('/revenue/system', getSystemRevenueStats);

// Danh sách tài xế với doanh thu
router.get('/drivers/revenue', getDriversWithRevenue);

// ============================================
// QUẢN LÝ YÊU CẦU RÚT TIỀN CỦA TÀI XẾ
// ============================================

/**
 * ADMIN: XEM DANH SÁCH TẤT CẢ YÊU CẦU RÚT TIỀN
 * GET /api/admin/withdrawals
 * Query: ?page=1&limit=20&status=Pending&driverId=xxx&bankAccountConfirmed=true
 */
router.get('/withdrawals', getAllWithdrawalRequests);

/**
 * ADMIN: THỐNG KÊ YÊU CẦU RÚT TIỀN
 * GET /api/admin/withdrawals/stats
 * Query: ?startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/withdrawals/stats', getWithdrawalStats);

/**
 * ADMIN: XEM CHI TIẾT YÊU CẦU RÚT TIỀN
 * GET /api/admin/withdrawals/:requestId
 */
router.get('/withdrawals/:requestId', getWithdrawalRequestDetail);

/**
 * ADMIN: CHẤP THUẬN YÊU CẦU RÚT TIỀN
 * POST /api/admin/withdrawals/:requestId/approve
 * Body: { adminNote? }
 * 
 * Logic:
 * - Trừ tiền từ driver.incomeBalance
 * - Tạo DriverTransaction với type: 'Withdrawal'
 * - Số tiền thực nhận = 80%, phí hệ thống = 20%
 */
router.post('/withdrawals/:requestId/approve', approveWithdrawalRequest);

/**
 * ADMIN: TỪ CHỐI YÊU CẦU RÚT TIỀN
 * POST /api/admin/withdrawals/:requestId/reject
 * Body: { rejectionReason, adminNote? }
 */
router.post('/withdrawals/:requestId/reject', rejectWithdrawalRequest);

/**
 * ADMIN: ĐÁNH DẤU HOÀN THÀNH CHUYỂN TIỀN
 * POST /api/admin/withdrawals/:requestId/complete
 * Body: { adminNote? }
 */
router.post('/withdrawals/:requestId/complete', completeWithdrawalRequest);

export default router;