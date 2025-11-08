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

export default router;