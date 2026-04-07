CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    responded_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_friendships_no_self
        CHECK (requester_id <> addressee_id),

    CONSTRAINT chk_friendships_status
        CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_friendships_pair_canonical
    ON friendships (
        LEAST(requester_id, addressee_id),
        GREATEST(requester_id, addressee_id)
    );

CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status
    ON friendships (addressee_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_requester_status
    ON friendships (requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_updated_at
    ON friendships (updated_at DESC);

DROP TRIGGER IF EXISTS trg_friendships_updated_at ON friendships;
CREATE TRIGGER trg_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
