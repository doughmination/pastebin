-- migrations/0001_init.sql
-- Copyright (c) 2026 Clove Nytrix Doughmination Twilight
-- Licensed under the DASL-1.2 Licence.
-- See LICENCE.md in the project root for full licence information.

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  name       TEXT,
  picture    TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash    TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);

-- Sign-ins that have been sent to the auth server but not yet come back.
CREATE TABLE IF NOT EXISTS logins (
  state_hash TEXT PRIMARY KEY,
  verifier   TEXT NOT NULL,
  nonce      TEXT NOT NULL,
  return_to  TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS logins_expires ON logins(expires_at);

CREATE TABLE IF NOT EXISTS pastes (
  slug       TEXT PRIMARY KEY,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT,
  body       TEXT NOT NULL,
  language   TEXT NOT NULL,
  theme      TEXT NOT NULL,
  accent     TEXT,
  unlisted   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS pastes_listing ON pastes(unlisted, created_at DESC);
CREATE INDEX IF NOT EXISTS pastes_author ON pastes(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pastes_expires ON pastes(expires_at);
