import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   createFeedback,
   getDriverFeedbacks,
   getCustomerFeedbacks,
   getOrderFeedbacks,
   getAllFeedbacks,
   updateFeedbackStatus,
   respondToFeedback,
   deleteFeedback
} from '../controllers/feedbackController.js';

const router = express.Router();

// Customer: Tạo đánh giá dịch vụ
router.post('/', authenticate, authorize(roles.CUSTOMER), createFeedback);

// Customer: Lấy đánh giá của mình
router.get('/my-feedbacks', authenticate, authorize(roles.CUSTOMER), getCustomerFeedbacks);

// Public: Lấy đánh giá của driver (không cần auth)
router.get('/driver/:driverId', getDriverFeedbacks);

// Public: Lấy đánh giá của đơn hàng (cho tài xế xem feedback)
router.get('/order/:orderId', authenticate, getOrderFeedbacks);

// Admin: Lấy tất cả đánh giá
router.get('/admin/all', authenticate, authorize(roles.ADMIN), getAllFeedbacks);

// Admin: Cập nhật trạng thái đánh giá
router.put('/admin/:feedbackId/status', authenticate, authorize(roles.ADMIN), updateFeedbackStatus);

// Driver: Phản hồi đánh giá
router.put('/:feedbackId/respond', authenticate, authorize(roles.DRIVER), respondToFeedback);

// Customer: Xóa đánh giá của mình
router.delete('/:feedbackId', authenticate, authorize(roles.CUSTOMER), deleteFeedback);

export default router;
