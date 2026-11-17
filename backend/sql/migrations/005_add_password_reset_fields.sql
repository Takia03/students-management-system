ALTER TABLE users
  ADD COLUMN password_reset_token_hash TEXT,
  ADD COLUMN password_reset_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX users_password_reset_token_hash_idx
  ON users (password_reset_token_hash)
  WHERE password_reset_token_hash IS NOT NULL;