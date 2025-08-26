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
const fs = require('fs');

dotenv.config();

const app = express();
const jwtSecret = process.env.JWT_SECRET || 'default_secret_key';
const bcryptSalt = bcrypt.genSaltSync(10);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URL, (err) => {
  if (err) console.error("MongoDB connection error:", err);
  else console.log("MongoDB connected successfully ✅");
});

// Authentication route
app.get('/profile', (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) return res.status(403).json('Invalid token');
      res.json(userData);
    });
  } else {
    res.status(401).json('No token');
  }
});

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({ username, password: hashedPassword });
    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
        id: createdUser._id,
      });
    });
  } catch (err) {
    res.status(400).json({ error: 'User registration failed', details: err });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (!foundUser) return res.status(404).json('User not found');

  const passOk = bcrypt.compareSync(password, foundUser.password);
  if (passOk) {
    jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { sameSite: 'none', secure: true }).json({
        id: foundUser._id,
      });
    });
  } else {
    res.status(401).json('Wrong credentials');
  }
});

// Logout
app.post('/logout', (req, res) => {
  res.cookie('token', '', { sameSite: 'none', secure: true }).json('ok');
});

// Get messages with a specific user
app.get('/messages/:userId', async (req, res) => {
  const { userId } = req.params;
  const token = req.cookies?.token;

  if (!token) return res.status(401).json('No token');
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) return res.status(403).json('Invalid token');
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });

    res.json(messages);
  });
});

// List all users
app.get('/people', async (req, res) => {
  const users = await User.find({}, { '_id': 1, username: 1 });
  res.json(users);
});

// Start HTTP server
const PORT = process.env.PORT || 4040;
console.log(`🚀 Starting server on port ${PORT}...`);
const server = app.listen(PORT, '0.0.0.0', () =>
  console.log(`✅ Server is running on port ${PORT}`)
);

// ---------------- WebSocket ----------------
const wss = new ws.WebSocketServer({ server });
console.log('🔌 WebSocket server initialized');

// Track userId -> multiple connections
const userConnections = new Map();

wss.on('connection', (connection, req) => {
  console.log('👤 New WebSocket connection');

  // --- Helper: notify all about online users ---
  function notifyAboutOnlinePeople() {
    const onlineUsers = [...userConnections.keys()].map(userId => {
      const anyConn = [...userConnections.get(userId)][0];
      return { userId, username: anyConn.username };
    });

    userConnections.forEach(conns => {
      conns.forEach(conn =>
        conn.send(JSON.stringify({ online: onlineUsers }))
      );
    });
  }

  // --- Authenticate user from cookie ---
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (!err) {
            connection.userId = userData.userId;
            connection.username = userData.username;

            // Store multiple connections for a user
            if (!userConnections.has(connection.userId)) {
              userConnections.set(connection.userId, new Set());
            }
            userConnections.get(connection.userId).add(connection);

            notifyAboutOnlinePeople();
          }
        });
      }
    }
  }

  // --- Handle incoming messages ---
  connection.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch (err) {
      console.error("Invalid message:", err);
      return;
    }

    const { recipient, text } = data;
    if (recipient && text) {
      // Save message to DB
      const msgDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
      });

      // Send message to recipient's all connections
      if (userConnections.has(recipient)) {
        userConnections.get(recipient).forEach(conn => {
          conn.send(JSON.stringify({
            text,
            sender: connection.userId,
            recipient,
            _id: msgDoc._id
          }));
        });
      }
    }
  });

  // --- Handle disconnect ---
  connection.on('close', () => {
    if (connection.userId && userConnections.has(connection.userId)) {
      userConnections.get(connection.userId).delete(connection);
      if (userConnections.get(connection.userId).size === 0) {
        userConnections.delete(connection.userId);
      }
    }
    notifyAboutOnlinePeople();
  });
});
