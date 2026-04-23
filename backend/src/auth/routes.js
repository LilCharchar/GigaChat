import { Router } from "express";
import authController from "./controller.js";
import { requireAdmin, requireAuth } from "./middleware.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.patch("/me/profile", requireAuth, authController.updateProfile);
router.delete("/me", requireAuth, authController.deleteMe);
router.post("/admin/users/:userId/ban", requireAuth, requireAdmin, authController.banUser);
router.post("/admin/users/:userId/unban", requireAuth, requireAdmin, authController.unbanUser);
router.post("/admin/users/:userId/timeout", requireAuth, requireAdmin, authController.timeoutUser);
router.post(
  "/admin/users/:userId/timeout/clear",
  requireAuth,
  requireAdmin,
  authController.clearUserTimeout
);
router.get("/admin/users/:userId", requireAuth, requireAdmin, authController.getUser);

export default router;
