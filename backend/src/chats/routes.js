import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { getChatMessages, getGlobalChat } from "./controller.js";

const router = Router();

router.use(requireAuth);

router.get("/chats/global", getGlobalChat);
router.get("/chats/:chatId/messages", getChatMessages);

export default router;
