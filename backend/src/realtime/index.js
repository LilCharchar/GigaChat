import { Server } from "socket.io";
import { authenticateSocket } from "./auth.js";
import { joinUserRoom } from "./rooms.js";
import { registerChatSocketHandlers } from "../chats/socket.handlers.js";

let realtimeServer = null;

export function initRealtime({ httpServer, frontendOrigin }) {
  const io = new Server(httpServer, {
    cors: {
      origin: frontendOrigin,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    joinUserRoom(socket);
    registerChatSocketHandlers(io, socket);
  });

  realtimeServer = io;

  return io;
}

export function getRealtimeServer() {
  return realtimeServer;
}
