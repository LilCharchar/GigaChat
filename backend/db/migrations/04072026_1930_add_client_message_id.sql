ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_messages_sender_chat_client_message_id
  ON chat_messages (sender_id, chat_id, client_message_id);
