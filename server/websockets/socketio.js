import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import cloudinary from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

export function initSocketIO(server) {
const allowedOrigins = [
  "http://localhost:5173",
  "https://nexchat223.onrender.com"
];

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

  // Helper to broadcast online users
  function notifyAboutOnlinePeople() {
    const online = Array.from(io.sockets.sockets.values())
      .filter((s) => s.userId)
      .map((s) => ({ userId: s.userId, username: s.username }));
    io.emit("online-users", online);
  }

  // Middleware: verify JWT from cookie
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
    //console.log("User connected:", socket.username);

    // Notify all clients about online users
    notifyAboutOnlinePeople();

    // Handle sending messages
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
          });

          const payload = {
            _id: messageDoc._id,
            sender: socket.userId,
            recipient,
            text,
            file: fileUrl,
          };

          // Send message to both sender and recipient if online
          for (const s of io.sockets.sockets.values()) {
            if (s.userId === recipient || s.userId === socket.userId) {
              s.emit("receive-message", payload);
            }
          }
        }
      } catch (err) {
        console.error("Error sending message:", err);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
    //  console.log("User disconnected:", socket.username);
      notifyAboutOnlinePeople();
    });
  });

  return io;
}
