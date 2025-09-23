import express from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import adminRoutes from './adminRoutes.js';
import vehicleRoutes from './vehicleRoutes.js';
import orderRoutes from './orderRoutes.js';
import driverOnboardingRoutes from './driverOnboardingRoutes.js';

const router = express.Router();

// Versioning sẵn sàng mở rộng: /api/(v1)/...
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/orders', orderRoutes);
router.use('/driver', driverOnboardingRoutes);

export default router;


