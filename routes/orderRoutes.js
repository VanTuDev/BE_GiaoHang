import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   createOrder,
   setDriverOnline,
   acceptOrderItem,
   updateOrderItemStatus,
   getCustomerOrders,
   getDriverOrders,
   getOrderDetail,
   getAvailableOrders,
   cancelOrder,
   updateOrderInsurance
} from '../controllers/orderController.js';

const router = express.Router();

// Customer tạo đơn
router.post('/', authenticate, authorize(roles.CUSTOMER), createOrder);

// Customer lấy danh sách đơn
router.get('/my-orders', authenticate, authorize(roles.CUSTOMER), getCustomerOrders);

// Customer huỷ đơn hàng
router.put('/:orderId/cancel', authenticate, authorize(roles.CUSTOMER), cancelOrder);

// Customer cập nhật bảo hiểm đơn hàng
router.put('/:orderId/insurance', authenticate, authorize(roles.CUSTOMER), updateOrderInsurance);

// Driver bật/tắt online
router.put('/driver/online', authenticate, authorize(roles.DRIVER), setDriverOnline);

// Driver lấy danh sách đơn đã nhận
router.get('/driver/my-orders', authenticate, authorize(roles.DRIVER), getDriverOrders);

// Driver lấy danh sách đơn có sẵn để nhận
router.get('/driver/available', authenticate, authorize(roles.DRIVER), getAvailableOrders);

// Driver nhận item trong đơn
router.put('/:orderId/items/:itemId/accept', authenticate, authorize(roles.DRIVER), acceptOrderItem);

// Driver cập nhật trạng thái item
router.put('/:orderId/items/:itemId/status', authenticate, authorize(roles.DRIVER), updateOrderItemStatus);

// Xem chi tiết đơn hàng (Customer, Driver, Admin)
router.get('/:orderId', authenticate, getOrderDetail);

export default router;