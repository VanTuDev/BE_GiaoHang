import express from 'express';
import { vnpIpn } from '../controllers/paymentController.js';

const router = express.Router();

// Alias để khớp ENV: VNP_IPN_URL=http://<host>/api/vnpay/ipn
router.get('/ipn', vnpIpn);

export default router;


