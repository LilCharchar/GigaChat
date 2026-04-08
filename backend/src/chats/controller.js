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
