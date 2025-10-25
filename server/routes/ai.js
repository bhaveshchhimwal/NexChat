import express from 'express';
import { generateAIResponse } from '../controllers/ai.js';

const router = express.Router();

router.post('/', generateAIResponse);

export default router;
