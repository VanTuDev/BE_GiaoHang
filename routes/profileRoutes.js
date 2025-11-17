import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   getProfile,
   updateProfile,
   uploadAvatar,
   getDriverProfile,
   updateServiceAreas,
   updateDriverBankInfo,
   updateDriverLocation,
   changePassword
} from '../controllers/profileController.js';

const router = express.Router();

// Lấy thông tin profile của người dùng hiện tại
router.get('/', authenticate, getProfile);

// Cập nhật thông tin profile
router.put('/', authenticate, updateProfile);

// Cập nhật avatar
router.post('/avatar', authenticate, uploadAvatar);

// Lấy thông tin profile tài xế (bao gồm cả thông tin user)
router.get('/driver', authenticate, authorize(roles.DRIVER), getDriverProfile);

// Cập nhật khu vực hoạt động của tài xế
router.put('/driver/service-areas', authenticate, authorize(roles.DRIVER), updateServiceAreas);

// Cập nhật thông tin ngân hàng của tài xế
router.put('/driver/bank', authenticate, authorize(roles.DRIVER), updateDriverBankInfo);

// Cập nhật vị trí hiện tại của tài xế
router.put('/driver/location', authenticate, authorize(roles.DRIVER), updateDriverLocation);

// Đổi mật khẩu (cho Customer và Driver)
router.put('/change-password', authenticate, changePassword);

export default router;