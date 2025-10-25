import express from 'express';
import  getMessages  from '../controllers/message.js';
import auth  from '../middlewares/auth.js';

const router = express.Router();

router.get('/:userId', auth, getMessages);

export default router;
