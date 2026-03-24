ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(30);

ALTER TABLE users
    ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username_lower
    ON users (LOWER(username));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_users_username_format'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_username_format
            CHECK (username ~ '^[a-z0-9_.]{3,30}$');
    END IF;
END;
$$;
