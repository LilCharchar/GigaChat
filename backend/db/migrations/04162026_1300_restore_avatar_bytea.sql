ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar BYTEA;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_avatar_url_nonempty;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_avatar_drive_file_id_nonempty;

ALTER TABLE users
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS avatar_drive_file_id;
