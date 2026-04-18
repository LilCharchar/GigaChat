import api from "./api";

export const chatService = {
  getGlobalChat() {
    return api.get("/chats/global");
  },

  getMessages(chatId, limit = 50) {
    return api.get(`/chats/${chatId}/messages`, {
      params: { limit },
    });
  },

  getDMs() {
    return api.get("/chats/dms");
  },

  openDMWithFriend(friendId) {
    return api.get(`/chats/dms/${encodeURIComponent(friendId)}`);
  },

  clearDM(chatId) {
    return api.delete(`/chats/dms/${encodeURIComponent(chatId)}/messages`);
  },
};