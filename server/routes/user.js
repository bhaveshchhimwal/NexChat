import express from "express";
import { register, login, logout ,profile ,people } from "../controllers/user.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", profile);
router.get("/people", people);
export default router;