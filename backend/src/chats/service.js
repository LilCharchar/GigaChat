import pool from "../config/db.js";
import { assertUserCanWrite } from "../auth/service.js";

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function ensureUserIsActive(userId) {
  const result = await pool.query(
    `SELECT id, deleted_at, banned_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0 || result.rows[0].deleted_at) {
    throw createHttpError("Unauthorized", 401);
  }

  if (result.rows[0].banned_at) {
    throw createHttpError("Account banned", 403);
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

export async function isActiveParticipant(userId, chatId) {
  const isMember = await isActiveMember(userId, chatId);
  if (isMember) {
    return true;
  }

  return isDMChatBetweenFriends(userId, chatId);
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

export async function listChatMessages({
  chatId,
  userId,
  limit = 50,
  beforeCreatedAt = null,
  beforeId = null,
}) {
  const member = await isActiveMember(userId, chatId);

  if (!member) {
    throw createHttpError("Forbidden", 403);
  }

  const hasCursor = Boolean(beforeCreatedAt && beforeId);

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
            u.username AS sender_username,
            u.bio AS sender_bio,
            encode(u.avatar, 'base64') AS sender_avatar_base64
     FROM chat_messages cm
     JOIN users u ON u.id = cm.sender_id
     WHERE cm.chat_id = $1
       AND cm.deleted_at IS NULL
       AND (
         $3::boolean = FALSE
         OR (cm.created_at, cm.id) < ($4::timestamptz, $5::uuid)
       )
      ORDER BY cm.created_at DESC
      LIMIT $2`,
    [chatId, limit, hasCursor, beforeCreatedAt, beforeId]
  );

  const ordered = result.rows.reverse();
  const nextCursor = ordered.length
    ? {
        beforeCreatedAt: ordered[0].created_at,
        beforeId: ordered[0].id,
      }
    : null;

  return {
    messages: ordered,
    nextCursor,
    hasMore: result.rows.length === limit,
  };
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
              u.username AS sender_username,
              u.bio AS sender_bio,
              encode(u.avatar, 'base64') AS sender_avatar_base64
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
            u.username AS sender_username,
            u.bio AS sender_bio,
            encode(u.avatar, 'base64') AS sender_avatar_base64
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
              u.username AS sender_username,
              u.bio AS sender_bio,
              encode(u.avatar, 'base64') AS sender_avatar_base64
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
              u.username AS sender_username,
              u.bio AS sender_bio,
              encode(u.avatar, 'base64') AS sender_avatar_base64
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

  if (result.rows.length > 0) {
    return ["owner", "admin"].includes(result.rows[0].role);
  }

  return false;
}

export async function isGlobalChatAdmin(userId, chatId) {
  const result = await pool.query(
    `SELECT 1
     FROM chats c
     JOIN users u ON u.id = $1
     WHERE c.id = $2
       AND c.type = 'global'
       AND c.is_active = TRUE
       AND u.role_id = 1
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId, chatId]
  );

  return result.rows.length > 0;
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

async function isAcceptedFriend(userId1, userId2) {
  const result = await pool.query(
    `SELECT id, status
     FROM friendships
     WHERE status = 'accepted'
       AND LEAST(requester_id, addressee_id) = LEAST($1::uuid, $2::uuid)
       AND GREATEST(requester_id, addressee_id) = GREATEST($1::uuid, $2::uuid)`,
    [userId1, userId2]
  );

  return result.rows.length > 0;
}

export async function getOrCreateDMWithFriend(userId, friendId) {
  await ensureUserIsActive(userId);

  const isFriend = await isAcceptedFriend(userId, friendId);
  if (!isFriend) {
    throw createHttpError("User not found or not your friend", 404);
  }

  const user1_id = userId < friendId ? userId : friendId;
  const user2_id = userId < friendId ? friendId : userId;

  let result = await pool.query(
    `SELECT c.id, c.type, c.created_at, c.updated_at
     FROM chats c
     WHERE c.type = 'dm'
       AND c.dm_user1_id = $1
       AND c.dm_user2_id = $2
       AND c.is_active = TRUE`,
    [user1_id, user2_id]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const insertResult = await pool.query(
    `INSERT INTO chats (type, dm_user1_id, dm_user2_id, is_active)
     VALUES ('dm', $1, $2, TRUE)
     RETURNING id, type, created_at, updated_at`,
    [user1_id, user2_id]
  );

  const newChat = insertResult.rows[0];

  await pool.query(
    `INSERT INTO chat_members (chat_id, user_id, role, left_at)
     VALUES ($1, $2, 'member', NULL), ($1, $3, 'member', NULL)
     ON CONFLICT DO NOTHING`,
    [newChat.id, user1_id, user2_id]
  );

  return newChat;
}

export async function listUserDMs(userId) {
  await ensureUserIsActive(userId);

  const result = await pool.query(
    `SELECT c.id,
            c.type,
            c.dm_user1_id,
            c.dm_user2_id,
            c.created_at,
            c.updated_at,
            CASE 
              WHEN c.dm_user1_id = $1 THEN u2.id
              ELSE u1.id
            END AS friend_id,
            CASE 
              WHEN c.dm_user1_id = $1 THEN u2.name
              ELSE u1.name
            END AS friend_name,
            CASE 
              WHEN c.dm_user1_id = $1 THEN u2.username
              ELSE u1.username
            END AS friend_username
     FROM chats c
     JOIN chat_members cm ON cm.chat_id = c.id
     LEFT JOIN users u1 ON u1.id = c.dm_user1_id
     LEFT JOIN users u2 ON u2.id = c.dm_user2_id
     WHERE c.type = 'dm'
       AND c.is_active = TRUE
       AND cm.user_id = $1
       AND cm.left_at IS NULL
       AND ((c.dm_user1_id = $1 OR c.dm_user2_id = $1))
     ORDER BY c.updated_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function isDMChatBetweenFriends(userId, chatId) {
  const result = await pool.query(
    `SELECT c.id, c.dm_user1_id, c.dm_user2_id
     FROM chats c
     JOIN chat_members cm ON cm.chat_id = c.id
     WHERE c.id = $1
       AND c.type = 'dm'
       AND c.is_active = TRUE
       AND cm.user_id = $2
       AND cm.left_at IS NULL
       AND ((c.dm_user1_id = $2 OR c.dm_user2_id = $2))`,
    [chatId, userId]
  );

  return result.rows.length > 0;
}

export async function clearDMMessages({ chatId, userId }) {
  await assertUserCanWrite(userId);

  // Verificar que el chat existe, es un DM y el usuario es participante
  const result = await pool.query(
    `SELECT c.id
     FROM chats c
     JOIN chat_members cm ON cm.chat_id = c.id
     WHERE c.id = $1
       AND c.type = 'dm'
       AND c.is_active = TRUE
       AND cm.user_id = $2
       AND cm.left_at IS NULL`,
    [chatId, userId]
  );

  if (result.rows.length === 0) {
    throw createHttpError("Forbidden", 403);
  }

  // Soft-delete de todos los mensajes activos del DM
  await pool.query(
    `UPDATE chat_messages
     SET deleted_at = NOW()
     WHERE chat_id = $1
       AND deleted_at IS NULL`,
    [chatId]
  );
}

export { createHttpError, assertUserCanWrite };
