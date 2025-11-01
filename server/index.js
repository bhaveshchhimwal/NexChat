import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import cloudinary from "cloudinary";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initSocketIO } from "./websockets/socketio.js";
import userRoutes from "./routes/user.js";
import aiRoutes from './routes/ai.js';
import messageRoutes from "./routes/message.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

mongoose.connect(process.env.MONGO_URL);

// Initialize Express
const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS setup

const allowedOrigins = [
  "https://nexchat44.onrender.com"
];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
  })
);

const isDev = process.env.NODE_ENV !== 'production';
app.use("/user", userRoutes);
app.use("/ai", aiRoutes);
app.use("/message", messageRoutes);

if (!isDev) {
  const clientBuildPath = path.join(__dirname, '../client/dist');

  if (fs.existsSync(clientBuildPath)) {
    console.log('📁 Serving static files from:', clientBuildPath);
    app.use(express.static(clientBuildPath));

    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.log('⚠️ Client build directory not found. Running API only.');
    app.get(/^(?!\/api).*/, (req, res) => {
      res.json({
        message: 'NexChat API is running',
        status: 'API only mode - frontend not built',
      });
    });
  }
}

const PORT = process.env.PORT || 4040;
const server = app.listen(PORT, '0.0.0.0', () =>
  console.log(`Server running on port ${PORT}`)
);

initSocketIO(server);
