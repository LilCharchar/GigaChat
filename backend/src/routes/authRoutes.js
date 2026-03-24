import { Router } from "express";
import authController from "../controllers/authController.js";

const authRoutes = Router();

authRoutes.post("/login", authController.login);

authRoutes.post("/register", authController.register);

// Para después
authRoutes.post("/logout", (req, res) => {
  res.json({ message: "Logout" });
});

export default authRoutes;
