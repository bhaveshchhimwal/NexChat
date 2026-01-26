import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import cloudinary from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

export function initSocketIO(server) {
  const allowedOrigins = ["https://nexchat44.onrender.com"];

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    },
  });

  function notifyAboutOnlinePeople() {
    const online = Array.from(io.sockets.sockets.values())
      .filter((s) => s.userId)
      .map((s) => ({ userId: s.userId, username: s.username }));
    io.emit("online-users", online);
  }

  io.use((socket, next) => {
    const token = socket.handshake.headers.cookie
      ?.split(";")
      .find((c) => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token) return next(new Error("Auth error"));

    jwt.verify(token, jwtSecret, (err, userData) => {
      if (err) return next(new Error("Auth error"));
      socket.userId = userData.userId;
      socket.username = userData.username;
      next();
    });
  });

  io.on("connection", (socket) => {
    socket.join(socket.userId);
    
    console.log(`${socket.username} (${socket.userId}) connected and joined room`);
    
    notifyAboutOnlinePeople();

    socket.on("send-message", async ({ recipient, text, file }) => {
      try {
        let fileUrl = null;

        if (file) {
          const uploadResult = await cloudinary.uploader.upload(file.data, {
            folder: "chat_app",
          });
          fileUrl = uploadResult.secure_url;
        }

        if (recipient && (text || file)) {
          const messageDoc = await Message.create({
            sender: socket.userId,
            recipient,
            text,
            file: file ? fileUrl : null,
            isDeleted: false,
            isEdited: false,
          });

          const payload = {
            _id: messageDoc._id,
            sender: socket.userId,
            recipient,
            text: messageDoc.text,
            file: fileUrl,
            createdAt: messageDoc.createdAt,
            updatedAt: messageDoc.updatedAt,
            isDeleted: false,
            isEdited: false,
          };

          io.to(socket.userId).emit("receive-message", payload);
          io.to(recipient).emit("receive-message", payload);
        }
      } catch (err) {
        console.error("Error sending message:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("update-message", async ({ messageId, newText }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit("error", { message: "Message not found" });
        }

        if (message.sender.toString() !== socket.userId) {
          return socket.emit("error", { message: "Not authorized" });
        }

        const createdAtMs = message.createdAt
          ? new Date(message.createdAt).getTime()
          : new Date(message._id.getTimestamp()).getTime();

        const messageAge = Date.now() - createdAtMs;
        const timeLimit = 5 * 60 * 1000;

        if (messageAge > timeLimit) {
          return socket.emit("error", { message: "Edit time expired" });
        }

        message.text = newText;
        message.isEdited = true;
        await message.save();

        const payload = {
          _id: message._id,
          text: message.text,
          isEdited: true,
          updatedAt: message.updatedAt,
        };

        io.to(message.sender.toString()).emit("message-updated", payload);
        io.to(message.recipient.toString()).emit("message-updated", payload);
        
      } catch (err) {
        console.error("Error updating message:", err);
        socket.emit("error", { message: "Failed to update message" });
      }
    });

    socket.on("delete-message", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          return socket.emit("error", { message: "Message not found" });
        }

        if (message.sender.toString() !== socket.userId) {
          return socket.emit("error", { message: "Not authorized" });
        }

        const createdAtMs = message.createdAt
          ? new Date(message.createdAt).getTime()
          : new Date(message._id.getTimestamp()).getTime();

        const messageAge = Date.now() - createdAtMs;
        const timeLimit = 5 * 60 * 1000;

        if (messageAge > timeLimit) {
          return socket.emit("error", { message: "Delete time expired" });
        }

        message.text = "";
        message.file = null;
        message.isDeleted = true;
        await message.save();

        const payload = { _id: message._id, isDeleted: true };

        io.to(message.sender.toString()).emit("message-deleted", payload);
        io.to(message.recipient.toString()).emit("message-deleted", payload);
        
      } catch (err) {
        console.error("Error deleting message:", err);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`${socket.username} disconnected`);
      notifyAboutOnlinePeople();
    });
  });

  return io;
}
