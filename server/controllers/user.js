import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { validatePassword } from '../utils/validatePassword.js';
import { validateUsername } from '../utils/validateUsername.js';
import dotenv from "dotenv";

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const isDev = process.env.NODE_ENV !== 'production';

export const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        const { valid, message, username: validUsername } = validateUsername(username);
        if (!valid) {
            return res.status(400).json({ message });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
            });
        }

        const existingUser = await User.findOne({ username: validUsername });
        if (existingUser)
            return res.status(400).json({ message: "User already exists" });

        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);

        const createdUser = await User.create({
            username: validUsername,
            password: hashedPassword,
        });

        const token = jwt.sign(
            { userId: createdUser._id, username: createdUser.username },
            jwtSecret,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            sameSite: isDev ? "lax" : "none",
            secure: !isDev,
            httpOnly: true,
        }).status(201).json({
            id: createdUser._id,
            username: createdUser.username,
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const foundUser = await User.findOne({ username });
        if (!foundUser) return res.status(404).json({ message: 'User does not exist' });

        if (!bcrypt.compareSync(password, foundUser.password))
            return res.status(401).json({ message: 'Wrong password' });

        jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
            if (err) return res.status(500).json({ message: 'JWT Error' });

            res.cookie('token', token, {
                httpOnly: true,
                sameSite: 'None', 
                secure: true,    
                path: '/',
            });

            res.json({ id: foundUser._id, username: foundUser.username });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
export const logout = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        sameSite: isDev ? 'lax' : 'none',
        secure: !isDev,
        maxAge: 0
    });
    res.json({ message: 'Logged out' });
};

export const profile = (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const userData = jwt.verify(token, jwtSecret);
        res.json(userData);
    } catch (err) {
        res.status(401).json({ message: "Unauthorized" });
    }
};

export const people = async (req, res) => {
    try {
        const users = await User.find({}, { _id: 1, username: 1 });
        res.json(users);
    } catch (err) {
        console.error('People error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}