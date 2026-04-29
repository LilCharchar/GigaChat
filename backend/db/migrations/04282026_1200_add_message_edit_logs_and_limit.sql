ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS chat_message_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  previous_body TEXT NOT NULL,
  new_body TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_message_edit_logs_message_id_created_at
  ON chat_message_edit_logs (message_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_edit_logs_created_at
  ON chat_message_edit_logs (created_at DESC);
