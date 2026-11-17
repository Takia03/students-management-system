-- Supports server-side invalidation of all JWTs issued to a user.
ALTER TABLE users
ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
