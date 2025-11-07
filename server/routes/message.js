import express from 'express';
import { getMessages, updateMessage, deleteMessage } from '../controllers/message.js';
import authMiddleware from '../middlewares/auth.js';

const router = express.Router();

router.get('/:userId', authMiddleware, getMessages);

router.put('/:messageId', authMiddleware, updateMessage);

router.delete('/:messageId', authMiddleware, deleteMessage);

export default router;
