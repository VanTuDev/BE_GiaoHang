import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
   getChatMeta,
   getChatHistory,
   sendChatMessage,
   longPollMessages
} from '../controllers/chatController.js';

const router = express.Router();

router.get('/orders/:orderId/meta', authenticate, getChatMeta);
router.get('/orders/:orderId/messages', authenticate, getChatHistory);
router.get('/orders/:orderId/long-poll', authenticate, longPollMessages);
router.post('/messages', authenticate, sendChatMessage);

export default router;












