import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   getDriverRevenueStats,
   getDriverTransactions,
   getDriverRevenueOverview
} from '../controllers/driverRevenueController.js';

const router = express.Router();

// Driver: Lấy tổng quan doanh thu
router.get('/overview', authenticate, authorize(roles.DRIVER), getDriverRevenueOverview);

// Driver: Lấy thống kê doanh thu theo thời gian
router.get('/stats', authenticate, authorize(roles.DRIVER), getDriverRevenueStats);

// Driver: Lấy danh sách giao dịch
router.get('/transactions', authenticate, authorize(roles.DRIVER), getDriverTransactions);

export default router;

