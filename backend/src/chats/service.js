import pool from "../config/db.js";

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function ensureUserIsActive(userId) {
  const result = await pool.query(
    `SELECT id
     FROM users
     WHERE id = $1
       AND deleted_at IS NULL`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw createHttpError("Unauthorized", 401);
  }
}

export async function isActiveMember(userId, chatId) {
  const result = await pool.query(
    `SELECT cm.id
     FROM chat_members cm
     JOIN chats c ON c.id = cm.chat_id
     WHERE cm.chat_id = $1
       AND cm.user_id = $2
       AND cm.left_at IS NULL
       AND c.is_active = TRUE`,
    [chatId, userId]
  );

  return result.rows.length > 0;
}

export async function getGlobalChatForUser(userId) {
  await ensureUserIsActive(userId);

  const result = await pool.query(
    `SELECT c.id, c.type, c.title, c.created_at, c.updated_at
     FROM chats c
     JOIN chat_members cm ON cm.chat_id = c.id
     WHERE c.type = 'global'
       AND c.is_active = TRUE
       AND cm.user_id = $1
       AND cm.left_at IS NULL
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw createHttpError("Global chat not available", 404);
  }

  return result.rows[0];
}

export async function listChatMessages({ chatId, userId, limit = 50 }) {
  const member = await isActiveMember(userId, chatId);

  if (!member) {
    throw createHttpError("Forbidden", 403);
  }

  const result = await pool.query(
    `SELECT cm.id,
            cm.chat_id,
            cm.sender_id,
            cm.body,
            cm.client_message_id,
            cm.created_at,
            cm.edited_at,
            cm.deleted_at,
            u.name AS sender_name,
            u.username AS sender_username
     FROM chat_messages cm
     JOIN users u ON u.id = cm.sender_id
     WHERE cm.chat_id = $1
       AND cm.deleted_at IS NULL
     ORDER BY cm.created_at DESC
     LIMIT $2`,
    [chatId, limit]
  );

  return result.rows.reverse();
}

export async function createMessage({ chatId, senderId, body, clientMessageId = null }) {
  if (!clientMessageId) {
    const inserted = await pool.query(
      `WITH inserted AS (
         INSERT INTO chat_messages (chat_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, chat_id, sender_id, body, client_message_id, created_at, edited_at, deleted_at
       )
       SELECT i.id,
              i.chat_id,
              i.sender_id,
              i.body,
              i.client_message_id,
              i.created_at,
              i.edited_at,
              i.deleted_at,
              u.name AS sender_name,
              u.username AS sender_username
       FROM inserted i
       JOIN users u ON u.id = i.sender_id`,
      [chatId, senderId, body]
    );

    return { message: inserted.rows[0], deduplicated: false };
  }

  const existing = await pool.query(
    `SELECT cm.id,
            cm.chat_id,
            cm.sender_id,
            cm.body,
            cm.client_message_id,
            cm.created_at,
            cm.edited_at,
            cm.deleted_at,
            u.name AS sender_name,
            u.username AS sender_username
     FROM chat_messages cm
     JOIN users u ON u.id = cm.sender_id
     WHERE cm.sender_id = $1
       AND cm.chat_id = $2
       AND cm.client_message_id = $3
     LIMIT 1`,
    [senderId, chatId, clientMessageId]
  );

  if (existing.rows.length > 0) {
    return { message: existing.rows[0], deduplicated: true };
  }

  try {
    const inserted = await pool.query(
      `WITH inserted AS (
         INSERT INTO chat_messages (chat_id, sender_id, body, client_message_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, chat_id, sender_id, body, client_message_id, created_at, edited_at, deleted_at
       )
       SELECT i.id,
              i.chat_id,
              i.sender_id,
              i.body,
              i.client_message_id,
              i.created_at,
              i.edited_at,
              i.deleted_at,
              u.name AS sender_name,
              u.username AS sender_username
       FROM inserted i
       JOIN users u ON u.id = i.sender_id`,
      [chatId, senderId, body, clientMessageId]
    );

    return { message: inserted.rows[0], deduplicated: false };
  } catch (error) {
    if (error.code !== "23505") {
      throw error;
    }

    const deduped = await pool.query(
      `SELECT cm.id,
              cm.chat_id,
              cm.sender_id,
              cm.body,
              cm.client_message_id,
              cm.created_at,
              cm.edited_at,
              cm.deleted_at,
              u.name AS sender_name,
              u.username AS sender_username
       FROM chat_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE cm.sender_id = $1
         AND cm.chat_id = $2
         AND cm.client_message_id = $3
       LIMIT 1`,
      [senderId, chatId, clientMessageId]
    );

    if (deduped.rows.length === 0) {
      throw error;
    }

    return { message: deduped.rows[0], deduplicated: true };
  }
}

export async function getMessageById(messageId) {
  const result = await pool.query(
    `SELECT id, chat_id, sender_id, body, client_message_id, created_at, edited_at, deleted_at
     FROM chat_messages
     WHERE id = $1`,
    [messageId]
  );

  return result.rows[0] || null;
}

export async function canModerateChat(userId, chatId) {
  const result = await pool.query(
    `SELECT cm.role
     FROM chat_members cm
     WHERE cm.chat_id = $1
       AND cm.user_id = $2
       AND cm.left_at IS NULL`,
    [chatId, userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  return ["owner", "admin"].includes(result.rows[0].role);
}

export async function updateMessageBody(messageId, body) {
  const result = await pool.query(
    `UPDATE chat_messages
     SET body = $2,
         edited_at = NOW()
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id, chat_id, sender_id, body, client_message_id, created_at, edited_at, deleted_at`,
    [messageId, body]
  );

  if (result.rows.length === 0) {
    throw createHttpError("Message not found", 404);
  }

  return result.rows[0];
}

export async function softDeleteMessage(messageId) {
  const result = await pool.query(
    `UPDATE chat_messages
     SET deleted_at = NOW()
     WHERE id = $1
       AND deleted_at IS NULL
     RETURNING id, chat_id, sender_id, body, client_message_id, created_at, edited_at, deleted_at`,
    [messageId]
  );

  if (result.rows.length === 0) {
    throw createHttpError("Message not found", 404);
  }

  return result.rows[0];
}

export { createHttpError };
