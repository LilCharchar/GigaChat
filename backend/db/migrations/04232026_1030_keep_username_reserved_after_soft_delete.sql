DROP INDEX IF EXISTS ux_users_username_lower_active;

WITH ranked AS (
  SELECT
    id,
    username,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(username)
      ORDER BY (deleted_at IS NULL) DESC, created_at ASC, id ASC
    ) AS rn
  FROM users
),
to_rename AS (
  SELECT
    id,
    LEFT(username, 23) || '_' || RIGHT(REPLACE(id::text, '-', ''), 6) AS next_username
  FROM ranked
  WHERE rn > 1
)
UPDATE users u
SET username = r.next_username
FROM to_rename r
WHERE u.id = r.id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username_lower
  ON users (LOWER(username));
