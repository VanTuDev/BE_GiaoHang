import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   getDashboardStats,
   getUsers,
   getDrivers,
   getOrders,
   getRevenueReport,
   getDriverDetail
} from '../controllers/adminController.js';

const router = express.Router();

// Yêu cầu xác thực và quyền Admin cho tất cả các routes
router.use(authenticate, authorize(roles.ADMIN));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Quản lý người dùng
router.get('/users', getUsers);

// Quản lý tài xế
router.get('/drivers', getDrivers);
router.get('/drivers/:driverId', getDriverDetail);

// Quản lý đơn hàng
router.get('/orders', getOrders);

// Báo cáo doanh thu
router.get('/revenue', getRevenueReport);

export default router;