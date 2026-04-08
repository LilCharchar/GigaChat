export function userRoom(userId) {
  return `user:${userId}`;
}

export function chatRoom(chatId) {
  return `chat:${chatId}`;
}

export function joinUserRoom(socket) {
  if (!socket.user?.id) {
    return;
  }

  socket.join(userRoom(socket.user.id));
}

export function joinChatRoom(socket, chatId) {
  socket.join(chatRoom(chatId));
}

export function leaveChatRoom(socket, chatId) {
  socket.leave(chatRoom(chatId));
}
