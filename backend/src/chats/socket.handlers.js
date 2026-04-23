import {
  canModerateChat,
  createHttpError,
  createMessage,
  ensureUserIsActive,
  getMessageById,
  isActiveParticipant,
  isGlobalChatAdmin,
  softDeleteMessage,
  updateMessageBody,
} from "./service.js";
import { assertUserCanWrite } from "../auth/service.js";
import { chatRoom, joinChatRoom, leaveChatRoom } from "../realtime/rooms.js";

const MAX_MESSAGE_LENGTH = 4000;

function toSocketError(error) {
  return {
    code: error.status || 500,
    message: error.message || "Internal error",
  };
}

function ackSuccess(ack, data = {}) {
  if (typeof ack === "function") {
    ack({ ok: true, data });
  }
}

function ackError(ack, error) {
  if (typeof ack === "function") {
    ack({ ok: false, error: toSocketError(error) });
  }
}

function normalizeBody(body) {
  if (typeof body !== "string") {
    throw createHttpError("Invalid message body", 400);
  }

  const normalized = body.trim();

  if (!normalized) {
    throw createHttpError("Message body cannot be empty", 400);
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw createHttpError("Message body exceeds max length", 400);
  }

  return normalized;
}

function formatMessage(message) {
  return {
    id: message.id,
    chatId: message.chat_id,
    senderId: message.sender_id,
    senderName: message.sender_name,
    senderUsername: message.sender_username,
    senderAvatarBase64: message.sender_avatar_base64,
    body: message.body,
    clientMessageId: message.client_message_id,
    createdAt: message.created_at,
    editedAt: message.edited_at,
    deletedAt: message.deleted_at,
  };
}

export function registerChatSocketHandlers(io, socket) {
  socket.on("chat:subscribe", async (payload = {}, ack) => {
    try {
      await ensureUserIsActive(socket.user.id);
      const { chatId } = payload;

      if (!chatId) {
        throw createHttpError("chatId is required", 400);
      }

      const participant = await isActiveParticipant(socket.user.id, chatId);

      if (!participant) {
        throw createHttpError("Forbidden", 403);
      }

      joinChatRoom(socket, chatId);
      socket.emit("chat:subscribed", { chatId });
      ackSuccess(ack, { chatId });
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("chat:unsubscribe", async (payload = {}, ack) => {
    try {
      const { chatId } = payload;

      if (!chatId) {
        throw createHttpError("chatId is required", 400);
      }

      leaveChatRoom(socket, chatId);
      ackSuccess(ack, { chatId });
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("message:send", async (payload = {}, ack) => {
    try {
      await ensureUserIsActive(socket.user.id);
      await assertUserCanWrite(socket.user.id);
      const { chatId } = payload;
      const body = normalizeBody(payload.body);
      const clientMessageId =
        typeof payload.clientMessageId === "string" && payload.clientMessageId.trim()
          ? payload.clientMessageId.trim()
          : null;

      if (!chatId) {
        throw createHttpError("chatId is required", 400);
      }

      const participant = await isActiveParticipant(socket.user.id, chatId);

      if (!participant) {
        throw createHttpError("Forbidden", 403);
      }

      const { message: saved, deduplicated } = await createMessage({
        chatId,
        senderId: socket.user.id,
        body,
        clientMessageId,
      });

      const eventPayload = formatMessage(saved);
      if (!deduplicated) {
        io.to(chatRoom(chatId)).emit("message:new", eventPayload);
      }
      ackSuccess(ack, eventPayload);
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("message:edit", async (payload = {}, ack) => {
    try {
      await ensureUserIsActive(socket.user.id);
      await assertUserCanWrite(socket.user.id);
      const { messageId } = payload;
      const body = normalizeBody(payload.body);

      if (!messageId) {
        throw createHttpError("messageId is required", 400);
      }

      const existing = await getMessageById(messageId);

      if (!existing || existing.deleted_at) {
        throw createHttpError("Message not found", 404);
      }

      const isSender = existing.sender_id === socket.user.id;
      const isModerator = await canModerateChat(socket.user.id, existing.chat_id);
      const isGlobalAdmin = await isGlobalChatAdmin(socket.user.id, existing.chat_id);

      if (!isSender && !isModerator && !isGlobalAdmin) {
        throw createHttpError("Forbidden", 403);
      }

      const updated = await updateMessageBody(messageId, body);
      const eventPayload = formatMessage(updated);
      io.to(chatRoom(updated.chat_id)).emit("message:updated", eventPayload);
      ackSuccess(ack, eventPayload);
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("message:delete", async (payload = {}, ack) => {
    try {
      await ensureUserIsActive(socket.user.id);
      await assertUserCanWrite(socket.user.id);
      const { messageId } = payload;

      if (!messageId) {
        throw createHttpError("messageId is required", 400);
      }

      const existing = await getMessageById(messageId);

      if (!existing || existing.deleted_at) {
        throw createHttpError("Message not found", 404);
      }

      const isSender = existing.sender_id === socket.user.id;
      const isModerator = await canModerateChat(socket.user.id, existing.chat_id);
      const isGlobalAdmin = await isGlobalChatAdmin(socket.user.id, existing.chat_id);

      if (!isSender && !isModerator && !isGlobalAdmin) {
        throw createHttpError("Forbidden", 403);
      }

      const removed = await softDeleteMessage(messageId);
      const eventPayload = formatMessage(removed);
      io.to(chatRoom(removed.chat_id)).emit("message:deleted", eventPayload);
      ackSuccess(ack, eventPayload);
    } catch (error) {
      ackError(ack, error);
    }
  });
}
