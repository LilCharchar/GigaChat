-- Sync role de admin de users a chat_members para el chat global
UPDATE chat_members
SET role = 'admin'
WHERE EXISTS (
  SELECT 1
  FROM chats c
  WHERE c.id = chat_members.chat_id
    AND c.type = 'global'
)
AND EXISTS (
  SELECT 1
  FROM users u
  WHERE u.id = chat_members.user_id
    AND u.role_id = 1
)
AND role = 'member';

-- Trigger: sincronizar role de admin cuando se actualiza el usuario
CREATE OR REPLACE FUNCTION sync_global_chat_admin_role()
RETURNS TRIGGER AS $$
DECLARE
  global_chat_id UUID;
BEGIN
  IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    SELECT c.id INTO global_chat_id
    FROM chats c
    WHERE c.type = 'global'
    LIMIT 1;

    IF global_chat_id IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE chat_members
      SET role = CASE WHEN NEW.role_id = 1 THEN 'admin' ELSE 'member' END
      WHERE chat_id = global_chat_id
        AND user_id = NEW.id
        AND left_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_sync_global_admin_role ON users;
CREATE TRIGGER trg_users_sync_global_admin_role
  AFTER UPDATE OF role_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_global_chat_admin_role();