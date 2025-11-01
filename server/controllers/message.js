import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const ourUserId = req.user.userId;

    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error("Messages error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this message" });
    }

    if (text) message.text = text;
    message.updatedAt = new Date();
    message.isEdited = true;
    await message.save();

    res.json({ success: true, message });
  } catch (err) {
    console.error("Update message error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this message" });
    }

    message.text = "message deleted";
    message.file = null;
    message.isDeleted = true;
    await message.save();

    res.json({ success: true, message });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
