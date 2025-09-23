import express from 'express';
import { listVehicles, getVehicleTypes } from '../controllers/vehicleController.js';

const router = express.Router();

// Public list vehicles
router.get('/', listVehicles);
router.get('/types', getVehicleTypes);

export default router;


