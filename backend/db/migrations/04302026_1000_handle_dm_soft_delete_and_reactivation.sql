-- 1. Actualizar el trigger de creación para que reactive el chat si ya existe pero estaba inactivo
CREATE OR REPLACE FUNCTION create_dm_on_friendship_accepted()
RETURNS TRIGGER AS $$
DECLARE
  existing_dm UUID;
  dm_is_active BOOLEAN;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Solo crear o reactivar DM cuando el status cambia a 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    -- Asegurar que user1_id < user2_id para consistencia
    IF NEW.requester_id < NEW.addressee_id THEN
      user1_id := NEW.requester_id;
      user2_id := NEW.addressee_id;
    ELSE
      user1_id := NEW.addressee_id;
      user2_id := NEW.requester_id;
    END IF;

    -- Verificar si ya existe un DM chat para este par de usuarios
    SELECT c.id, c.is_active INTO existing_dm, dm_is_active
    FROM chats c
    WHERE c.type = 'dm'
      AND c.dm_user1_id = user1_id
      AND c.dm_user2_id = user2_id
    LIMIT 1;

    -- Si no existe, crear el DM chat
    IF existing_dm IS NULL THEN
      INSERT INTO chats (type, dm_user1_id, dm_user2_id, is_active)
      VALUES ('dm', user1_id, user2_id, TRUE)
      RETURNING id INTO existing_dm;

      -- Agregar ambos usuarios como miembros del DM
      INSERT INTO chat_members (chat_id, user_id, role, left_at)
      VALUES 
        (existing_dm, user1_id, 'member', NULL),
        (existing_dm, user2_id, 'member', NULL);
    ELSIF NOT dm_is_active THEN
      -- Si existe pero estaba inactivo, reactivarlo
      UPDATE chats SET is_active = TRUE, updated_at = NOW() WHERE id = existing_dm;
      -- Rehabilitar la membresía
      UPDATE chat_members SET left_at = NULL WHERE chat_id = existing_dm AND user_id IN (user1_id, user2_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para manejar el soft delete del chat al hacer unfriends
CREATE OR REPLACE FUNCTION soft_delete_dm_on_unfriend()
RETURNS TRIGGER AS $$
DECLARE
  existing_dm UUID;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Solo accionar si la amistad eliminada estaba en estado 'accepted'
  IF OLD.status = 'accepted' THEN
    IF OLD.requester_id < OLD.addressee_id THEN
      user1_id := OLD.requester_id; user2_id := OLD.addressee_id;
    ELSE
      user1_id := OLD.addressee_id; user2_id := OLD.requester_id;
    END IF;

    SELECT id INTO existing_dm
    FROM chats
    WHERE type = 'dm' AND dm_user1_id = user1_id AND dm_user2_id = user2_id
    LIMIT 1;

    IF existing_dm IS NOT NULL THEN
      -- Desactivar el chat
      UPDATE chats SET is_active = FALSE, updated_at = NOW() WHERE id = existing_dm;
      -- Marcar a los miembros como que salieron
      UPDATE chat_members SET left_at = NOW() WHERE chat_id = existing_dm AND left_at IS NULL;
      -- Soft delete de los mensajes para que inicie "desde cero"
      UPDATE chat_messages SET deleted_at = NOW() WHERE chat_id = existing_dm AND deleted_at IS NULL;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger al eliminar la amistad (unfriend)
DROP TRIGGER IF EXISTS trg_friendships_delete_dm ON friendships;
CREATE TRIGGER trg_friendships_delete_dm
  AFTER DELETE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_dm_on_unfriend();