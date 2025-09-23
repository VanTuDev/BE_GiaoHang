import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
   getMyProfile,
   updateMyProfile,
   uploadMyAvatar,
   getMyDriverProfile,
   upsertMyDriverProfile,
   uploadMyDriverAvatar,
   upsertMyVehicle,
   uploadMyVehiclePhoto,
   updateDriverServiceAreas
} from '../controllers/profileController.js';

const router = express.Router();

// User profile
router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, updateMyProfile);
router.post('/me/avatar', authenticate, upload.single('file'), uploadMyAvatar);

// Driver profile
router.get('/driver/me', authenticate, authorize(roles.DRIVER, roles.ADMIN), getMyDriverProfile);
router.put('/driver/me', authenticate, authorize(roles.DRIVER, roles.ADMIN), upsertMyDriverProfile);
router.post('/driver/me/avatar', authenticate, authorize(roles.DRIVER, roles.ADMIN), upload.single('file'), uploadMyDriverAvatar);
router.put('/driver/me/areas', authenticate, authorize(roles.DRIVER, roles.ADMIN), updateDriverServiceAreas);

// Vehicle
router.put('/vehicle/me', authenticate, authorize(roles.DRIVER, roles.ADMIN), upsertMyVehicle);
router.post('/vehicle/me/photo', authenticate, authorize(roles.DRIVER, roles.ADMIN), upload.single('file'), uploadMyVehiclePhoto);

export default router;


