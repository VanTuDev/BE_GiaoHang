import express from 'express';
import multer from 'multer';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import {
   listVehicles,
   getVehicleTypes,
   addVehicle,
   updateVehicle,
   deleteVehicle,
   getMyVehicles
} from '../controllers/vehicleController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Public list vehicles
router.get('/', listVehicles);
router.get('/types', getVehicleTypes);

// Driver routes
router.get('/my-vehicles', authenticate, authorize(roles.DRIVER), getMyVehicles);
router.post('/', authenticate, authorize(roles.DRIVER), upload.single('photo'), addVehicle);
router.put('/:vehicleId', authenticate, authorize(roles.DRIVER), upload.single('photo'), updateVehicle);
router.delete('/:vehicleId', authenticate, authorize(roles.DRIVER), deleteVehicle);

export default router;