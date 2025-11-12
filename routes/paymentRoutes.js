import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createVNPayPayment, vnpIpn } from '../controllers/paymentController.js';

const router = express.Router();

// Tạo URL thanh toán VNPay (user đăng nhập)
router.post('/vnpay/create', authenticate, createVNPayPayment);

// IPN từ VNPay
router.get('/vnpay/ipn', vnpIpn);

export default router;


