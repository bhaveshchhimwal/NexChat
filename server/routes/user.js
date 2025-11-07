import express from "express";
import { register, login, logout, profile, people } from "../controllers/user.js";
import { registerLimiter } from "../middlewares/registerLimiter.js";
import { registerWrapper } from "../middlewares/registerWrapper.js";

const router = express.Router();

router.post("/register", registerWrapper(register), registerLimiter);

router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", profile);
router.get("/people", people);

export default router;
