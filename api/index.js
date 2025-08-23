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

dotenv.config();

// Cloudinary configuration via CLOUDINARY_URL
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
cloudinary.api.resources()
  .then(res => console.log("Cloudinary working", res))
  .catch(err => console.error("Cloudinary error", err));

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true, origin: process.env.CLIENT_URL }));

// -------------------- Helper --------------------
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

// -------------------- Routes --------------------
app.get('/test', (req,res) => res.json('test ok'));

app.get('/messages/:userId', async (req,res) => {
  try {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: {$in:[userId,ourUserId]},
      recipient: {$in:[userId,ourUserId]},
    }).sort({createdAt:1});
    res.json(messages);
  } catch(err) {
    res.status(401).json({ message: "Unauthorized" });
  }
});

app.delete('/messages/:id', async (req, res) => {
  try {
    const userData = await getUserDataFromRequest(req);
    const { id } = req.params;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userData.userId)
      return res.status(403).json({ message: "Not authorized" });

    message.text = "Message deleted";
    message.deleted = true;
    await message.save();

    // Notify both sender and recipient via WebSocket
    [...wss.clients]
      .filter(c => c.userId === message.recipient.toString() || c.userId === message.sender.toString())
      .forEach(c => c.send(JSON.stringify({
        type: 'delete',
        messageId: id,
        text: "Message deleted"
      })));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get('/people', async (req,res) => {
  const users = await User.find({}, {'_id':1, username:1});
  res.json(users);
});

app.get('/profile', (req,res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json('no token');
  jwt.verify(token, jwtSecret, {}, (err, userData) => {
    if (err) return res.status(401).json('invalid token');
    res.json(userData);
  });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });
    if (!foundUser) return res.status(404).json({ message: "User does not exist" });

    if (!bcrypt.compareSync(password, foundUser.password))
      return res.status(401).json({ message: "Wrong password" });

    jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { sameSite:'none', secure:true }).json({
        id: foundUser._id, message: "Login successful"
      });
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post('/logout', (req,res) => {
  res.cookie('token', '', { sameSite:'none', secure:true }).json('ok');
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({ username, password: hashedPassword });

    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { sameSite:'none', secure:true }).status(201).json({
        id: createdUser._id, message: "User registered successfully"
      });
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- WebSocket --------------------
const server = app.listen(4040);
const wss = new ws.WebSocketServer({ server });

wss.on('connection', (connection, req) => {

  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username })),
      }));
    });
  }

  connection.isAlive = true;

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (!err) {
            connection.userId = userData.userId;
            connection.username = userData.username;
          }
        });
      }
    }
  }

  connection.on('message', async (message) => {
    try {
      const messageData = JSON.parse(message.toString());

      // -------------------- Handle delete --------------------
      if (messageData.type === 'delete') {
        const { messageId, recipient } = messageData;
        const messageDoc = await Message.findById(messageId);
        if (messageDoc) {
          messageDoc.text = "Message deleted";
          messageDoc.deleted = true;
          await messageDoc.save();

          [...wss.clients]
            .filter(c => c.userId === recipient || c.userId === messageDoc.sender.toString())
            .forEach(c => c.send(JSON.stringify({
              type: 'delete',
              messageId,
              text: "Message deleted"
            })));
        }
        return;
      }

      // -------------------- Handle normal message --------------------
      const { recipient, text, file } = messageData;
      let fileUrl = null;

      if (file) {
        const uploadResult = await cloudinary.uploader.upload(file.data, { folder: "chat_app" });
        fileUrl = uploadResult.secure_url;
      }

      if (recipient && (text || file)) {
        const messageDoc = await Message.create({
          sender: connection.userId,
          recipient,
          text,
          file: file ? fileUrl : null,
        });

        [...wss.clients]
          .filter(c => c.userId === recipient || c.userId === connection.userId)
          .forEach(c => c.send(JSON.stringify({
            text,
            sender: connection.userId,
            recipient,
            file: file ? fileUrl : null,
            _id: messageDoc._id,
          })));
      }

    } catch(err) {
      console.error('WebSocket error:', err);
    }
  });

  notifyAboutOnlinePeople();
});
