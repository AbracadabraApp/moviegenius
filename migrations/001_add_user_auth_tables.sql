-- Migration: Add user authentication tables for NextAuth + iOS integration
-- Created: 2026-05-14
-- Updated: 2026-05-14 (switched from Firebase to NextAuth approach)
-- Purpose: Enable account-level data persistence for iOS sign-in

-- Extend existing NextAuth users table with Apple Sign-In support
-- NOTE: Assumes NextAuth users table already exists
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id);

-- User favorites table (loved movies)
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  movie_tmdb_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);

-- User queue table (movies to watch)
CREATE TABLE IF NOT EXISTS user_queue (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  movie_tmdb_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_user_queue_user_id ON user_queue(user_id);

-- Comments
COMMENT ON TABLE user_favorites IS 'Movies marked as "Seen it" (loved)';
COMMENT ON TABLE user_queue IS 'Movies marked as "Watch it" (bookmarked)';
COMMENT ON COLUMN users.apple_id IS 'Apple Sign-In unique identifier (from iOS app)';
COMMENT ON COLUMN users.email IS 'User email - may be NULL or Apple relay email';
