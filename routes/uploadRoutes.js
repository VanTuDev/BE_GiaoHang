import express from 'express';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import { uploadImage, uploadMultipleImages } from '../controllers/uploadController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Upload một ảnh
router.post('/image', authenticate, upload.single('file'), uploadImage);

// Upload nhiều ảnh
router.post('/images', authenticate, upload.array('files', 10), uploadMultipleImages);

export default router;
