const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');
const ws = require('ws');
const cloudinary = require('cloudinary').v2;
const path = require('path');

dotenv.config();

// Add debugging logs
console.log('🚀 Starting server...');
console.log('📊 Environment:', process.env.NODE_ENV);
console.log('🔗 MongoDB URL exists:', !!process.env.MONGO_URL);
console.log('🔐 JWT Secret exists:', !!process.env.JWT_SECRET);

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ---------------- Cloudinary ----------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------- Mongo ----------------
console.log('📦 Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  });

// Handle mongoose connection events
mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());

const isDev = process.env.NODE_ENV !== 'production';

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);

// ---------------- Helper ----------------
async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (!token) return reject('no token');
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) return reject(err);
      resolve(userData);
    });
  });
}

// ---------------- Routes ----------------
app.get('/test', (req, res) => {
  console.log('🧪 Test route hit');
  res.json('ok');
});

app.post('/api/ai', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY missing on server' });
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
      process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.json({ reply: data.candidates[0].content.parts[0].text });
    }

    return res
      .status(500)
      .json({ error: 'Invalid response from Gemini API', details: data });
  } catch (error) {
    console.error('Error in /api/ai:', error);
    res.status(500).json({ error: 'Error getting response from AI.' });
  }
});

// ---------------- Auth Routes ----------------
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });
    if (!foundUser) return res.status(404).json({ message: 'User does not exist' });

    if (!bcrypt.compareSync(password, foundUser.password))
      return res.status(401).json({ message: 'Wrong password' });

    jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) return res.status(500).json({ message: 'JWT Error' });

      res
        .cookie('token', token, {
          sameSite: isDev ? 'lax' : 'none',
          secure: !isDev,
          httpOnly: true,
        })
        .json({ id: foundUser._id, username: foundUser.username });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({ username, password: hashedPassword });

    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) return res.status(500).json({ message: 'JWT Error' });

      res
        .cookie('token', token, {
          sameSite: isDev ? 'lax' : 'none',
          secure: !isDev,
          httpOnly: true,
        })
        .status(201)
        .json({ id: createdUser._id, username: createdUser.username });
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/logout', (req, res) => {
  res.cookie('token', '', { sameSite: isDev ? 'lax' : 'none', secure: !isDev }).json('ok');
});

// ---------------- Messages ----------------
app.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;

    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/people', async (req, res) => {
  try {
    const users = await User.find({}, { _id: 1, username: 1 });
    res.json(users);
  } catch (err) {
    console.error('People error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/profile', async (req, res) => {
  try {
    const userData = await getUserDataFromRequest(req);
    res.json(userData);
  } catch (err) {
    res.status(401).json({ error: 'No token or invalid token' });
  }
});

// ---------------- Serve React Build ----------------
if (!isDev) {
  const clientBuildPath = path.join(__dirname, '../client/build');
  
  // Check if client build directory exists
  const fs = require('fs');
  if (fs.existsSync(clientBuildPath)) {
    console.log('📁 Serving static files from:', clientBuildPath);
    app.use(express.static(clientBuildPath));
    
    // Handle React Router routes - serve index.html for non-API routes
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.log('⚠️ Client build directory not found. Running API only.');
    
    // Serve a simple message for non-API routes
    app.get(/^(?!\/api).*/, (req, res) => {
      res.json({ 
        message: 'NexChat API is running',
        status: 'API only mode - frontend not built',
        endpoints: {
          test: '/test',
          login: '/login',
          register: '/register',
          profile: '/profile',
          people: '/people'
        }
      });
    });
  }
}

// ---------------- WebSocket ----------------
const PORT = process.env.PORT || 4040;
console.log(`🚀 Starting server on port ${PORT}...`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

const wss = new ws.WebSocketServer({ server });
console.log('🔌 WebSocket server initialized');

wss.on('connection', (connection, req) => {
  console.log('👤 New WebSocket connection');

  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  }

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find((str) => str.startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (!err) {
            connection.userId = userData.userId;
            connection.username = userData.username;
            console.log(`✅ WebSocket authenticated: ${userData.username}`);
          }
        });
      }
    }
  }

  connection.on('message', async (message) => {
    try {
      const messageData = JSON.parse(message.toString());

      const { recipient, text, file } = messageData;
      let fileUrl = null;

      if (file) {
        const uploadResult = await cloudinary.uploader.upload(file.data, {
          folder: 'chat_app',
        });
        fileUrl = uploadResult.secure_url;
      }

      if (recipient && (text || file)) {
        const messageDoc = await Message.create({
          sender: connection.userId,
          recipient,
          text,
          file: file ? fileUrl : null,
        });

        const broadcastPayload = {
          text,
          sender: connection.userId,
          recipient,
          file: file ? fileUrl : null,
          _id: messageDoc._id,
        };

        [...wss.clients]
          .filter((c) => c.userId === recipient || c.userId === connection.userId)
          .forEach((c) => c.send(JSON.stringify(broadcastPayload)));
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  });

  connection.on('close', () => {
    console.log('👋 WebSocket connection closed');
    notifyAboutOnlinePeople();
  });

  notifyAboutOnlinePeople();
});

console.log('🎉 Server setup complete!');