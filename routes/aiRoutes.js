import express from 'express';
import { chatWithAI } from '../controllers/aiController.js';

const router = express.Router();

// Chat với AI (public - không cần authentication)
router.post('/chat', chatWithAI);

export default router;

