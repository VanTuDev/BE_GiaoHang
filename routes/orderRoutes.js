import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import { createOrder, setDriverOnline, acceptOrderItem, updateOrderItemStatus } from '../controllers/orderController.js';

const router = express.Router();

// Customer tạo đơn
router.post('/', authenticate, authorize(roles.CUSTOMER), createOrder);

// Driver bật/tắt online
router.put('/driver/online', authenticate, authorize(roles.DRIVER), setDriverOnline);

// Driver nhận item trong đơn
router.put('/:orderId/items/:itemId/accept', authenticate, authorize(roles.DRIVER), acceptOrderItem);

// Driver cập nhật trạng thái item
router.put('/:orderId/items/:itemId/status', authenticate, authorize(roles.DRIVER), updateOrderItemStatus);

export default router;


