import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   reportViolation,
   getCustomerReports,
   getAllViolations,
   updateViolationStatus,
   getViolationStats
} from '../controllers/violationController.js';

const router = express.Router();

// Customer: Báo cáo vi phạm tài xế
router.post('/report', authenticate, authorize(roles.CUSTOMER), reportViolation);

// Customer: Lấy báo cáo của mình
router.get('/my-reports', authenticate, authorize(roles.CUSTOMER), getCustomerReports);

// Admin: Lấy tất cả báo cáo vi phạm
router.get('/admin/all', authenticate, authorize(roles.ADMIN), getAllViolations);

// Admin: Cập nhật trạng thái báo cáo
router.put('/admin/:violationId/status', authenticate, authorize(roles.ADMIN), updateViolationStatus);

// Admin: Lấy thống kê vi phạm
router.get('/admin/stats', authenticate, authorize(roles.ADMIN), getViolationStats);

export default router;
