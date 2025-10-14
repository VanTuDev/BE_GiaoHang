import express from 'express';
import { register, login, verifyEmail, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authenticate, authorize, roles } from '../middleware/auth.js';

const router = express.Router();

// Public
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Example protected route per role
router.get('/me', authenticate, (req, res) => {
   res.json({ success: true, data: req.user });
});

router.get('/admin-only', authenticate, authorize(roles.ADMIN), (req, res) => {
   res.json({ success: true, message: 'Admin OK' });
});

router.get('/driver-only', authenticate, authorize(roles.DRIVER), (req, res) => {
   res.json({ success: true, message: 'Driver OK' });
});

// Debug roles of current user
router.get('/roles', authenticate, (req, res) => {
   const merged = Array.from(new Set([
      req.user.role,
      ...(Array.isArray(req.user.roles) ? req.user.roles : [])
   ].filter(Boolean)));
   res.json({ success: true, data: { userId: String(req.user._id), roles: merged } });
});

export default router;


