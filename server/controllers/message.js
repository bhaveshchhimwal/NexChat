
import Message from '../models/Message.js';

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const ourUserId = req.user.userId; 
    
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export default getMessages;
