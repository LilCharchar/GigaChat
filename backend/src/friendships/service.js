import pool from "../config/db.js";

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getUserByUsername(username) {
  const result = await pool.query(
    `SELECT id, username
     FROM users
     WHERE LOWER(username) = LOWER($1)
       AND deleted_at IS NULL`,
    [username]
  );

  if (result.rows.length === 0) {
    throw createHttpError("User not found", 404);
  }

  return result.rows[0];
}

async function getFriendshipByPair(userAId, userBId) {
  const result = await pool.query(
    `SELECT id, requester_id, addressee_id, status, responded_at, created_at, updated_at
     FROM friendships
     WHERE LEAST(requester_id, addressee_id) = LEAST($1::uuid, $2::uuid)
       AND GREATEST(requester_id, addressee_id) = GREATEST($1::uuid, $2::uuid)`,
    [userAId, userBId]
  );

  return result.rows[0] || null;
}

const sendRequest = async (currentUserId, targetUsername) => {
  const targetUser = await getUserByUsername(targetUsername);

  if (targetUser.id === currentUserId) {
    throw createHttpError("You cannot send a friend request to yourself", 400);
  }

  const existing = await getFriendshipByPair(currentUserId, targetUser.id);

  if (!existing) {
    const inserted = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, requester_id, addressee_id, status, responded_at, created_at, updated_at`,
      [currentUserId, targetUser.id]
    );

    return inserted.rows[0];
  }

  if (existing.status === "blocked") {
    throw createHttpError("Cannot send request due to user privacy settings", 403);
  }

  if (existing.status === "accepted") {
    throw createHttpError("You are already friends", 409);
  }

  if (existing.status === "pending") {
    if (existing.requester_id === currentUserId) {
      throw createHttpError("Friend request already sent", 409);
    }

    const accepted = await pool.query(
      `UPDATE friendships
       SET status = 'accepted', responded_at = NOW()
       WHERE id = $1
       RETURNING id, requester_id, addressee_id, status, responded_at, created_at, updated_at`,
      [existing.id]
    );

    return accepted.rows[0];
  }

  if (existing.status === "rejected") {
    const reopened = await pool.query(
      `UPDATE friendships
       SET requester_id = $2,
           addressee_id = $3,
           status = 'pending',
           responded_at = NULL
       WHERE id = $1
       RETURNING id, requester_id, addressee_id, status, responded_at, created_at, updated_at`,
      [existing.id, currentUserId, targetUser.id]
    );

    return reopened.rows[0];
  }

  throw createHttpError("Invalid friendship state", 400);
};

const listIncoming = async (currentUserId) => {
  const result = await pool.query(
    `SELECT f.id,
            f.status,
            f.created_at,
            u.id AS requester_id,
            u.username AS requester_username,
            u.name AS requester_name
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = $1
       AND f.status = 'pending'
       AND u.deleted_at IS NULL
     ORDER BY f.created_at DESC`,
    [currentUserId]
  );

  return result.rows;
};

const listOutgoing = async (currentUserId) => {
  const result = await pool.query(
    `SELECT f.id,
            f.status,
            f.created_at,
            u.id AS addressee_id,
            u.username AS addressee_username,
            u.name AS addressee_name
     FROM friendships f
     JOIN users u ON u.id = f.addressee_id
     WHERE f.requester_id = $1
       AND f.status = 'pending'
       AND u.deleted_at IS NULL
     ORDER BY f.created_at DESC`,
    [currentUserId]
  );

  return result.rows;
};

const respondRequest = async (currentUserId, friendshipId, action) => {
  const result = await pool.query(
    `SELECT id, requester_id, addressee_id, status
     FROM friendships
     WHERE id = $1`,
    [friendshipId]
  );

  if (result.rows.length === 0) {
    throw createHttpError("Friend request not found", 404);
  }

  const friendship = result.rows[0];

  if (friendship.addressee_id !== currentUserId) {
    throw createHttpError("Only the recipient can respond to this request", 403);
  }

  if (friendship.status !== "pending") {
    throw createHttpError("Friend request is no longer pending", 409);
  }

  const nextStatus = action === "accept" ? "accepted" : "rejected";
  const updated = await pool.query(
    `UPDATE friendships
     SET status = $2,
         responded_at = NOW()
     WHERE id = $1
     RETURNING id, requester_id, addressee_id, status, responded_at, created_at, updated_at`,
    [friendshipId, nextStatus]
  );

  return updated.rows[0];
};

const listFriends = async (currentUserId) => {
  const result = await pool.query(
    `SELECT f.id AS friendship_id,
            f.updated_at,
            u.id AS user_id,
            u.username,
            u.name
     FROM friendships f
     JOIN users u
       ON u.id = CASE
         WHEN f.requester_id = $1 THEN f.addressee_id
         ELSE f.requester_id
       END
     WHERE f.status = 'accepted'
       AND (f.requester_id = $1 OR f.addressee_id = $1)
       AND u.deleted_at IS NULL
     ORDER BY f.updated_at DESC`,
    [currentUserId]
  );

  return result.rows;
};

export default {
  sendRequest,
  listIncoming,
  listOutgoing,
  respondRequest,
  listFriends,
};
