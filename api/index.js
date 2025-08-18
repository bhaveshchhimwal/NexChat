const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const UserModel = require('./models/user');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');

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
const bcryptSalt = bcrypt.genSaltSync(10);
// Routes
app.get('/test', (req, res) => {
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

// Corrected Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await UserModel.findOne({ username });

  if (!foundUser) {
    // Return a 401 Unauthorized if the user is not found
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const passOk = bcrypt.compareSync(password, foundUser.password);
  if (!passOk) {
    // Return a 401 Unauthorized if the password is wrong
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // If login is successful, sign the JWT and send the cookie
  jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
    if (err) {
      console.error('JWT signing error:', err);
      return res.status(500).json({ error: 'Failed to create token' });
    }
    res.cookie('token', token, { sameSite: 'none', secure: true }).json({
      id: foundUser._id,
      username: foundUser.username,
    });
  });
});

// Corrected Register Route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await UserModel.create({
      username: username,
      password: hashedPassword,
    });
    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      // Fix 1: Handle JWT error gracefully without crashing the server
      if (err) {
        console.error('JWT signing error:', err);
        return res.status(500).json({ error: 'Failed to create token' });
      }
      res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({
        id: createdUser._id,
        username: createdUser.username,
      });
    });
  } catch (err) {
    // Fix 2: Handle database errors and send a proper response
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});