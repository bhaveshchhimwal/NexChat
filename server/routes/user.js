import express from "express";
import rateLimit from "express-rate-limit";
import { register, login, logout, profile, people } from "../controllers/user.js";
import { registerWrapper } from "../middlewares/registerWrapper.js";

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  skipFailedRequests: true, 
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      message:
        "Too many accounts created from this IP address today. Please try again after 24 hours.",
    });
  },
});


router.post("/register", registerWrapper(register), registerLimiter);


router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", profile);
router.get("/people", people);

export default router;
