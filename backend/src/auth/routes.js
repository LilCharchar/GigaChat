import { Router } from "express";
import authController from "./controller.js";
import { requireAuth } from "./middleware.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

export default router;
