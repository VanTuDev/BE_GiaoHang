import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   createFeedback,
   getDriverFeedbacks,
   getCustomerFeedbacks,
   getAllFeedbacks,
   updateFeedbackStatus
} from '../controllers/feedbackController.js';

const router = express.Router();

// Customer: Tạo đánh giá dịch vụ
router.post('/', authenticate, authorize(roles.CUSTOMER), createFeedback);

// Customer: Lấy đánh giá của mình
router.get('/my-feedbacks', authenticate, authorize(roles.CUSTOMER), getCustomerFeedbacks);

// Public: Lấy đánh giá của driver (không cần auth)
router.get('/driver/:driverId', getDriverFeedbacks);

// Admin: Lấy tất cả đánh giá
router.get('/admin/all', authenticate, authorize(roles.ADMIN), getAllFeedbacks);

// Admin: Cập nhật trạng thái đánh giá
router.put('/admin/:feedbackId/status', authenticate, authorize(roles.ADMIN), updateFeedbackStatus);

export default router;
