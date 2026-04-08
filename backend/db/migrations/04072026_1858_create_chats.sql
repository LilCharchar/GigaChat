-- 1) Chats: global, group, dm
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    title VARCHAR(120) DEFAULT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    dm_user1_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
    dm_user2_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chats_type
      CHECK (type IN ('global', 'group', 'dm')),

    CONSTRAINT chk_chats_dm_pair_valid
      CHECK (
        (type <> 'dm' AND dm_user1_id IS NULL AND dm_user2_id IS NULL)
        OR
        (type = 'dm' AND dm_user1_id IS NOT NULL AND dm_user2_id IS NOT NULL AND dm_user1_id <> dm_user2_id)
      ),

    CONSTRAINT chk_chats_title_nonempty
      CHECK (title IS NULL OR LENGTH(TRIM(title)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chats_single_global
  ON chats (type)
  WHERE type = 'global';

CREATE UNIQUE INDEX IF NOT EXISTS ux_chats_dm_pair
  ON chats (LEAST(dm_user1_id, dm_user2_id), GREATEST(dm_user1_id, dm_user2_id))
  WHERE type = 'dm';

CREATE INDEX IF NOT EXISTS idx_chats_updated_at
  ON chats (updated_at DESC);

DROP TRIGGER IF EXISTS trg_chats_updated_at ON chats;
CREATE TRIGGER trg_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed: chat global
INSERT INTO chats (type, title, created_by, is_active)
  VALUES ('global', 'Global', NULL, TRUE)
  ON CONFLICT DO NOTHING;

-- 2) Chat members
CREATE TABLE IF NOT EXISTS chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chat_members_role
      CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_members_active
  ON chat_members (chat_id, user_id)
  WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_members_user_active
  ON chat_members (user_id, joined_at DESC)
  WHERE left_at IS NULL;

-- Backfill: agregar miembros globales a usuarios existentes
INSERT INTO chat_members (chat_id, user_id, role)
SELECT c.id, u.id, 'member'
FROM chats c
CROSS JOIN users u
WHERE c.type = 'global'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_members cm
    WHERE cm.chat_id = c.id
      AND cm.user_id = u.id
      AND cm.left_at IS NULL
  )
ON CONFLICT DO NOTHING;

-- 3) Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    edited_at TIMESTAMPTZ DEFAULT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chat_messages_body_nonempty
      CHECK (LENGTH(TRIM(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created
  ON chat_messages (chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created
  ON chat_messages (sender_id, created_at DESC);

-- 4) Trigger: auto-agregar nuevos usuarios al chat global
CREATE OR REPLACE FUNCTION auto_join_global_chat()
RETURNS TRIGGER AS $$
DECLARE
  global_chat_id UUID;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.id INTO global_chat_id
  FROM chats c
  WHERE c.type = 'global'
    AND c.is_active = TRUE
  LIMIT 1;

  IF global_chat_id IS NOT NULL THEN
    INSERT INTO chat_members (chat_id, user_id, role)
    VALUES (global_chat_id, NEW.id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_auto_join_global ON users;
CREATE TRIGGER trg_users_auto_join_global
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_join_global_chat();

-- 5) Trigger: soft-delete de membresía global
CREATE OR REPLACE FUNCTION handle_user_soft_delete()
RETURNS TRIGGER AS $$
DECLARE
  global_chat_id UUID;
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    SELECT c.id INTO global_chat_id
    FROM chats c
    WHERE c.type = 'global'
    LIMIT 1;

    IF global_chat_id IS NOT NULL THEN
      UPDATE chat_members
      SET left_at = NOW()
      WHERE chat_id = global_chat_id
        AND user_id = NEW.id
        AND left_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_soft_delete_members ON users;
CREATE TRIGGER trg_users_soft_delete_members
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_soft_delete();