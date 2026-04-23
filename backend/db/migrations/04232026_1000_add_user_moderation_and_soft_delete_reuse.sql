ALTER TABLE users
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banned_by UUID DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_email_key;

DROP INDEX IF EXISTS ux_users_username_lower;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_active
  ON users (email)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username_lower_active
  ON users (LOWER(username))
  WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_chat_messages_chat_created;

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created_active
  ON chat_messages (chat_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION handle_user_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE chat_members
    SET left_at = NOW()
    WHERE user_id = NEW.id
      AND left_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
