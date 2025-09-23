import express from 'express';
import { authenticate, authorize, roles } from '../middleware/auth.js';
import { getUsers, getUserById } from '../controllers/adminController.js';

const router = express.Router();

router.get('/users', authenticate, authorize(roles.ADMIN), getUsers);
router.get('/users/:id', authenticate, authorize(roles.ADMIN), getUserById);

export default router;


