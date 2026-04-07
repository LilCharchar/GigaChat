import api from "./api";

export const friendshipService = {
  sendRequest(username) {
    return api.post(`/friends/requests/${encodeURIComponent(username)}`);
  },

  incoming() {
    return api.get("/friends/requests/incoming");
  },

  outgoing() {
    return api.get("/friends/requests/outgoing");
  },

  respond(friendshipId, action) {
    return api.patch(`/friends/requests/${friendshipId}`, { action });
  },

  listFriends() {
    return api.get("/friends");
  },

  removeFriend(userId) {
    return api.delete(`/friends/${userId}`);
  },
};
