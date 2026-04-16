import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { getChatMessages, getGlobalChat, getDMChats, openOrCreateDMWithFriend } from "./controller.js";

const router = Router();

router.use(requireAuth);

router.get("/chats/global", getGlobalChat);
router.get("/chats/dms", getDMChats);
router.get("/chats/dms/:friendId", openOrCreateDMWithFriend);
router.get("/chats/:chatId/messages", getChatMessages);

export default router;
