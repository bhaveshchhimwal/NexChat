const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const UserModel = require('./models/user');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL,
}));
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB and then start the server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connection established successfully!");
    // Start the server ONLY after the database is connected
    app.listen(4040, () => {
      console.log("🚀 Server running on http://localhost:4040");
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const jwtSecret = process.env.JWT_SECRET;

// Routes
app.get('/test', (req,res) => {
  res.json('test ok');
});
app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  jwt.verify(token, jwtSecret, {}, (err, UserData) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.json(UserData);
  });
});



app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const createdUser = await UserModel.create({ username, password });
    jwt.sign({ userId: createdUser._id,username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { httpOnly: true }).status(201).json({ id: createdUser._id,username});
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});