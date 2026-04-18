import * as chatService from "./service.js";

function getStatus(error) {
  return error.status || 500;
}

export async function getGlobalChat(req, res) {
  try {
    const chat = await chatService.getGlobalChatForUser(req.auth.id);
    res.json({ chat });
  } catch (error) {
    res.status(getStatus(error)).json({ error: error.message });
  }
}

export async function getChatMessages(req, res) {
  try {
    const { chatId } = req.params;
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
    const messages = await chatService.listChatMessages({
      chatId,
      userId: req.auth.id,
      limit: Math.min(limit, 100),
    });

    res.json({ messages });
  } catch (error) {
    res.status(getStatus(error)).json({ error: error.message });
  }
}

export async function getDMChats(req, res) {
  try {
    const dms = await chatService.listUserDMs(req.auth.id);
    res.json({ dms });
  } catch (error) {
    res.status(getStatus(error)).json({ error: error.message });
  }
}

export async function openOrCreateDMWithFriend(req, res) {chatService
  try {
    const { friendId } = req.params;

    if (!friendId) {
      return res.status(400).json({ error: "friendId is required" });
    }

    const chat = await chatService.getOrCreateDMWithFriend(req.auth.id, friendId);
    res.json({ chat });
  } catch (error) {
    res.status(getStatus(error)).json({ error: error.message });
  }
}

export async function clearDMChat(req, res) {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ error: "chatId is required" });
    }

    await chatService.clearDMMessages({ chatId, userId: req.auth.id });
    res.json({ ok: true });
  } catch (error) {
    res.status(getStatus(error)).json({ error: error.message });
  }
}