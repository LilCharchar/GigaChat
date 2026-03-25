import { Router } from "express";
import authController from "./controller.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

// Para despues
router.post("/logout", (req, res) => {
  res.json({ message: "Logout" });
});

export default router;
