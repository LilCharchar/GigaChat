import { Server } from "socket.io";
import { authenticateSocket } from "./auth.js";
import { joinUserRoom } from "./rooms.js";
import { registerChatSocketHandlers } from "../chats/socket.handlers.js";

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

  return io;
}
