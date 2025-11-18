import express from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import adminRoutes from './adminRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';
import orderRoutes from './orderRoutes.js';
import driverOnboardingRoutes from './driverOnboardingRoutes.js';
import driverRevenueRoutes from './driverRevenueRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import violationRoutes from './violationRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import vnpayRoutes from './vnpayRoutes.js';
import aiRoutes from './aiRoutes.js';
import withdrawalRoutes from './withdrawalRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = express.Router();

// Versioning sẵn sàng mở rộng: /api/(v1)/...
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/orders', orderRoutes);
router.use('/driver', driverOnboardingRoutes);
router.use('/driver/revenue', driverRevenueRoutes);
router.use('/upload', uploadRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/violations', violationRoutes);
router.use('/payments', paymentRoutes);
router.use('/vnpay', vnpayRoutes);
router.use('/ai', aiRoutes);
router.use('/chat', chatRoutes);
router.use('/', withdrawalRoutes); // Withdrawal routes (driver và admin)

export default router;