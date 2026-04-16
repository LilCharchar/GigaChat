ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_drive_file_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS bio VARCHAR(160);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_users_avatar_url_nonempty'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_avatar_url_nonempty
      CHECK (avatar_url IS NULL OR LENGTH(TRIM(avatar_url)) > 0);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_users_avatar_drive_file_id_nonempty'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_avatar_drive_file_id_nonempty
      CHECK (avatar_drive_file_id IS NULL OR LENGTH(TRIM(avatar_drive_file_id)) > 0);
  END IF;
END;
$$;
