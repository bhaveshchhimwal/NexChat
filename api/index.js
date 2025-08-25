// ---------------- Imports ----------------
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
// ✅ Removed node-fetch import - using built-in fetch in Node.js 18+
const path = require('path');
const fs = require('fs'); // ✅ Moved fs import to top

dotenv.config();

// ---------------- Cloudinary ----------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------- Mongo ----------------
mongoose.connect(process.env.MONGO_URL);

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json({ limit: '10mb' })); // ✅ Increased limit for file uploads
app.use(cookieParser());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000', // ✅ Added common React dev port
  process.env.CLIENT_URL,
].filter(Boolean); // ✅ Filter out undefined values

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // ✅ Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error('CORS not allowed'));
      }
    },
  })
);

const isDev = process.env.NODE_ENV !== 'production';

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
app.get('/test', (req, res) => res.json('ok'));

// ---------- Gemini AI Route ----------
app.post('/api/ai', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY missing on server' });
    }

    // ✅ Using built-in fetch instead of node-fetch
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

    console.error('Gemini API Error:', data); // ✅ Added logging
    return res
      .status(500)
      .json({ error: 'Invalid response from Gemini API', details: data });
  } catch (error) {
    console.error('Error in /api/ai:', error);
    res.status(500).json({ error: 'Error getting response from AI.' });
  }
});

// ---------------- User Routes ----------------
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // ✅ Added input validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const foundUser = await User.findOne({ username });
    if (!foundUser) return res.status(404).json({ message: 'User does not exist' });

    if (!bcrypt.compareSync(password, foundUser.password))
      return res.status(401).json({ message: 'Wrong password' });

    jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) {
        console.error('JWT Error:', err); // ✅ Added logging
        return res.status(500).json({ message: 'JWT Error' });
      }

      res
        .cookie('token', token, {
          sameSite: isDev ? 'lax' : 'none',
          secure: !isDev,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // ✅ Added 24 hour expiry
        })
        .json({ id: foundUser._id, username: foundUser.username }); // ✅ Include username in response
    });
  } catch (error) {
    console.error('Login error:', error); // ✅ Added logging
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // ✅ Added input validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({ username, password: hashedPassword });

    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) {
        console.error('JWT Error:', err); // ✅ Added logging
        return res.status(500).json({ message: 'JWT Error' });
      }

      res
        .cookie('token', token, {
          sameSite: isDev ? 'lax' : 'none',
          secure: !isDev,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // ✅ Added 24 hour expiry
        })
        .status(201)
        .json({ id: createdUser._id, username: createdUser.username }); // ✅ Include username in response
    });
  } catch (error) {
    console.error('Registration error:', error); // ✅ Added logging
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/logout', (req, res) => {
  res
    .cookie('token', '', { 
      sameSite: isDev ? 'lax' : 'none', 
      secure: !isDev,
      httpOnly: true,
      maxAge: 0 // ✅ Immediately expire the cookie
    })
    .json('ok');
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
    console.error('Messages error:', err); // ✅ Better error logging
    if (err === 'no token') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- People ----------------
app.get('/people', async (req, res) => {
  try {
    // ✅ Verify user is authenticated
    await getUserDataFromRequest(req);
    
    const users = await User.find({}, { _id: 1, username: 1 });
    res.json(users);
  } catch (err) {
    console.error('People error:', err);
    if (err === 'no token') {
      return res.status(401).json({ error: 'Authentication required' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- Profile ----------------
app.get('/profile', async (req, res) => {
  try {
    const userData = await getUserDataFromRequest(req);
    res.json(userData);
  } catch (err) {
    console.error('Profile error:', err); // ✅ Added logging
    res.status(401).json({ error: 'No token or invalid token' });
  }
});

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ---------------- Production: Serve React ----------------
if (!isDev) {
  // ✅ More robust path handling for different deployment scenarios
  const possiblePaths = [
    '/opt/render/project/src/client/dist',
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, 'dist'),
    path.join(__dirname, 'build')
  ];
  
  let clientPath = null;
  
  for (const testPath of possiblePaths) {
    console.log(`🔍 Testing path: ${testPath}`);
    if (fs.existsSync(testPath)) {
      clientPath = testPath;
      console.log(`✅ Found client files at: ${clientPath}`);
      break;
    }
  }
  
  if (clientPath) {
    try {
      const files = fs.readdirSync(clientPath);
      console.log('📄 Directory contents:', files);
      
      if (fs.existsSync(path.join(clientPath, 'index.html'))) {
        console.log('✅ Found index.html, serving static files');
        app.use(express.static(clientPath));
        
        // ✅ Handle client-side routing
        app.get('*', (req, res) => {
          // Don't serve index.html for API routes
          if (req.path.startsWith('/api/') || req.path.startsWith('/messages/') || 
              req.path.startsWith('/people') || req.path.startsWith('/profile') || 
              req.path.startsWith('/login') || req.path.startsWith('/register') || 
              req.path.startsWith('/logout') || req.path.startsWith('/test') ||
              req.path.startsWith('/health')) {
            return res.status(404).json({ error: 'API endpoint not found' });
          }
          res.sendFile(path.join(clientPath, 'index.html'));
        });
      } else {
        console.log('❌ index.html not found in client directory');
        app.get('*', (req, res) => {
          res.status(404).json({ 
            error: 'index.html not found',
            clientPath: clientPath,
            files: files
          });
        });
      }
    } catch (err) {
      console.log('❌ Cannot read client directory:', err.message);
      app.get('*', (req, res) => {
        res.status(500).json({ error: 'Cannot read client directory', details: err.message });
      });
    }
  } else {
    console.log('❌ No client directory found in any of the expected locations');
    app.get('*', (req, res) => {
      res.status(404).json({ 
        error: 'Client directory not found',
        searchedPaths: possiblePaths
      });
    });
  }
}

// ✅ Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------- WebSocket ----------------
const PORT = process.env.PORT || 4040;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 MongoDB: ${process.env.MONGO_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not configured'}`);
});

const wss = new ws.WebSocketServer({ server });

wss.on('connection', (connection, req) => {
  console.log('🔌 New WebSocket connection'); // ✅ Added logging

  function notifyAboutOnlinePeople() {
    const onlineUsers = [...wss.clients]
      .filter(c => c.userId) // ✅ Only include authenticated users
      .map(c => ({
        userId: c.userId,
        username: c.username,
      }));

    [...wss.clients].forEach((client) => {
      if (client.readyState === ws.READY_STATE_OPEN) { // ✅ Check connection state
        client.send(JSON.stringify({ online: onlineUsers }));
      }
    });
  }

  // ✅ Parse cookies more safely
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(';')
      .find((str) => str.trim().startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (!err && userData) {
            connection.userId = userData.userId;
            connection.username = userData.username;
            console.log(`✅ User ${userData.username} connected via WebSocket`);
            notifyAboutOnlinePeople();
          } else {
            console.log('❌ Invalid WebSocket token:', err?.message);
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

      // ✅ Validate required fields
      if (!connection.userId) {
        console.log('❌ Unauthenticated WebSocket message attempt');
        return;
      }

      if (!recipient) {
        console.log('❌ Message missing recipient');
        return;
      }

      if (!text && !file) {
        console.log('❌ Message missing content');
        return;
      }

      // ✅ Handle file upload with better error handling
      if (file) {
        try {
          const uploadResult = await cloudinary.uploader.upload(file.data, {
            folder: 'chat_app',
            resource_type: 'auto', // ✅ Auto-detect file type
          });
          fileUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error('❌ Cloudinary upload error:', uploadError);
          connection.send(JSON.stringify({ 
            error: 'File upload failed',
            details: uploadError.message 
          }));
          return;
        }
      }

      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: fileUrl,
      });

      const broadcastPayload = {
        text,
        sender: connection.userId,
        recipient,
        file: fileUrl,
        _id: messageDoc._id,
        createdAt: messageDoc.createdAt, // ✅ Include timestamp
      };

      // ✅ Broadcast to relevant users with connection state check
      [...wss.clients]
        .filter(
          (c) => 
            (c.userId === recipient || c.userId === connection.userId) &&
            c.readyState === ws.READY_STATE_OPEN
        )
        .forEach((c) => c.send(JSON.stringify(broadcastPayload)));

    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
      connection.send(JSON.stringify({ 
        error: 'Message processing failed',
        details: error.message 
      }));
    }
  });

  // ✅ Handle connection close
  connection.on('close', () => {
    console.log(`🔌 User ${connection.username || 'unknown'} disconnected`);
    notifyAboutOnlinePeople();
  });

  // ✅ Handle connection errors
  connection.on('error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  // Initial notification about online people (only after potential authentication)
  setTimeout(notifyAboutOnlinePeople, 100);
});