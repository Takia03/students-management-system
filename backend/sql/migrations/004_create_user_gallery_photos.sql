CREATE TABLE user_gallery_photos (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_gallery_photos_user_id_created_at_idx
  ON user_gallery_photos (user_id, created_at DESC);