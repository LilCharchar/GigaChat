-- Crear función para generar DM chat cuando se acepta una amistad
CREATE OR REPLACE FUNCTION create_dm_on_friendship_accepted()
RETURNS TRIGGER AS $$
DECLARE
  existing_dm UUID;
  new_dm_id UUID;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Solo crear DM cuando el status cambia a 'accepted'
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
    SELECT c.id INTO existing_dm
    FROM chats c
    WHERE c.type = 'dm'
      AND c.dm_user1_id = user1_id
      AND c.dm_user2_id = user2_id
    LIMIT 1;

    -- Si no existe, crear el DM chat
    IF existing_dm IS NULL THEN
      INSERT INTO chats (type, dm_user1_id, dm_user2_id, is_active)
      VALUES ('dm', user1_id, user2_id, TRUE)
      RETURNING id INTO new_dm_id;

      -- Agregar ambos usuarios como miembros del DM
      INSERT INTO chat_members (chat_id, user_id, role, left_at)
      VALUES 
        (new_dm_id, user1_id, 'member', NULL),
        (new_dm_id, user2_id, 'member', NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_friendships_create_dm ON friendships;
CREATE TRIGGER trg_friendships_create_dm
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_dm_on_friendship_accepted();
