-- Registration accepts and stores a user's name.
-- The default keeps existing rows and older inserts valid during rollout.
ALTER TABLE users
ADD COLUMN name TEXT NOT NULL DEFAULT '';
