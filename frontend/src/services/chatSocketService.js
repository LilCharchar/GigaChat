import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let socket = null;

function getOrCreateSocket() {
  if (socket) {
    return socket;
  }

  socket = io(API_URL, {
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket", "polling"],
  });

  return socket;
}

function connect() {
  const current = getOrCreateSocket();
  if (!current.connected) {
    current.connect();
  }
  return current;
}

function disconnect() {
  if (!socket) {
    return;
  }

  socket.disconnect();
}

function on(event, handler) {
  const current = getOrCreateSocket();
  current.on(event, handler);
  return () => {
    current.off(event, handler);
  };
}

function emitWithAck(event, payload, timeoutMs = 10000) {
  const current = connect();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Socket timeout"));
    }, timeoutMs);

    current.emit(event, payload, (response = {}) => {
      window.clearTimeout(timer);

      if (!response.ok) {
        const message = response.error?.message || "Socket error";
        reject(new Error(message));
        return;
      }

      resolve(response.data);
    });
  });
}

function subscribeChat(chatId) {
  return emitWithAck("chat:subscribe", { chatId });
}

function unsubscribeChat(chatId) {
  return emitWithAck("chat:unsubscribe", { chatId });
}

function sendMessage({ chatId, body, clientMessageId }) {
  return emitWithAck("message:send", { chatId, body, clientMessageId });
}

export const chatSocketService = {
  connect,
  disconnect,
  on,
  subscribeChat,
  unsubscribeChat,
  sendMessage,
};
