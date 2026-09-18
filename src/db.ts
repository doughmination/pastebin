/* src/db.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { Database } from "bun:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { config, now } from "./env";

mkdirSync(dirname(config.databaseFile), { recursive: true });

export const db = new Database(config.databaseFile, { create: true, strict: true });

// WAL lets readers (every paste view) run while a write is in flight, which is
// the whole access pattern of a pastebin.
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA busy_timeout = 5000");
db.exec("PRAGMA synchronous = NORMAL");

db.exec(`
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
`);

export interface UserRow {
  id: string;
  username: string;
  name: string | null;
  picture: string | null;
  created_at: number;
  updated_at: number;
}

export interface PasteRow {
  slug: string;
  author_id: string;
  title: string | null;
  body: string;
  language: string;
  theme: string;
  accent: string | null;
  unlisted: number;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
}

/** A paste row joined with the author's display details. */
export interface PasteWithAuthor extends PasteRow {
  author_username: string;
  author_name: string | null;
}

/** Mirrors the claims from the last sign-in; the auth server stays the source of truth. */
export function upsertUser(user: {
  id: string;
  username: string;
  name: string | null;
  picture: string | null;
}): void {
  const ts = now();
  db.query(
    `INSERT INTO users (id, username, name, picture, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       name = excluded.name,
       picture = excluded.picture,
       updated_at = excluded.updated_at`,
  ).run(user.id, user.username, user.name, user.picture, ts, ts);
}

export function getUser(id: string): UserRow | null {
  return db.query<UserRow, [string]>("SELECT * FROM users WHERE id = ?").get(id);
}

// --- sessions -----------------------------------------------------------------------

export interface SessionRow {
  id_hash: string;
  user_id: string;
  csrf: string;
  created_at: number;
  expires_at: number;
}

export function createSession(idHash: string, userId: string, csrf: string, expiresAt: number): void {
  db.query("INSERT INTO sessions (id_hash, user_id, csrf, created_at, expires_at) VALUES (?, ?, ?, ?, ?)").run(
    idHash,
    userId,
    csrf,
    now(),
    expiresAt,
  );
}

export function getSession(idHash: string): SessionRow | null {
  return db
    .query<SessionRow, [string, number]>("SELECT * FROM sessions WHERE id_hash = ? AND expires_at > ?")
    .get(idHash, now());
}

export function deleteSession(idHash: string): void {
  db.query("DELETE FROM sessions WHERE id_hash = ?").run(idHash);
}

// --- in-flight sign-ins --------------------------------------------------------------

export interface LoginRow {
  state_hash: string;
  verifier: string;
  nonce: string;
  return_to: string;
  expires_at: number;
}

export function createLogin(
  stateHash: string,
  verifier: string,
  nonce: string,
  returnTo: string,
  expiresAt: number,
): void {
  db.query(
    "INSERT INTO logins (state_hash, verifier, nonce, return_to, expires_at) VALUES (?, ?, ?, ?, ?)",
  ).run(stateHash, verifier, nonce, returnTo, expiresAt);
}

/** Single-use: redeeming a state removes it, so a replayed callback finds nothing. */
export function takeLogin(stateHash: string): LoginRow | null {
  const row = db.query<LoginRow, [string]>("DELETE FROM logins WHERE state_hash = ? RETURNING *").get(stateHash);
  return row && row.expires_at > now() ? row : null;
}

// --- pastes ---------------------------------------------------------------------------

export interface PasteInput {
  slug: string;
  authorId: string;
  title: string | null;
  body: string;
  language: string;
  theme: string;
  accent: string | null;
  unlisted: boolean;
  expiresAt: number | null;
}

export function slugTaken(slug: string): boolean {
  return db.query<{ slug: string }, [string]>("SELECT slug FROM pastes WHERE slug = ?").get(slug) !== null;
}

export function createPaste(input: PasteInput): void {
  const ts = now();
  db.query(
    `INSERT INTO pastes (slug, author_id, title, body, language, theme, accent, unlisted, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.slug,
    input.authorId,
    input.title,
    input.body,
    input.language,
    input.theme,
    input.accent,
    input.unlisted ? 1 : 0,
    ts,
    ts,
    input.expiresAt,
  );
}

export function updatePaste(slug: string, input: Omit<PasteInput, "slug" | "authorId">): void {
  db.query(
    `UPDATE pastes SET title = ?, body = ?, language = ?, theme = ?, accent = ?, unlisted = ?, updated_at = ?, expires_at = ?
     WHERE slug = ?`,
  ).run(
    input.title,
    input.body,
    input.language,
    input.theme,
    input.accent,
    input.unlisted ? 1 : 0,
    now(),
    input.expiresAt,
    slug,
  );
}

const LIVE = "(p.expires_at IS NULL OR p.expires_at > ?)";

const WITH_AUTHOR = `
  SELECT p.*, u.username AS author_username, u.name AS author_name
  FROM pastes p JOIN users u ON u.id = p.author_id`;

export function getPaste(slug: string): PasteWithAuthor | null {
  return db.query<PasteWithAuthor, [string, number]>(`${WITH_AUTHOR} WHERE p.slug = ? AND ${LIVE}`).get(slug, now());
}

export function deletePaste(slug: string): void {
  db.query("DELETE FROM pastes WHERE slug = ?").run(slug);
}

/** Public index: listed, unexpired pastes, newest first. */
export function listPastes(limit: number, offset: number): PasteWithAuthor[] {
  return db
    .query<PasteWithAuthor, [number, number, number]>(
      `${WITH_AUTHOR} WHERE p.unlisted = 0 AND ${LIVE} ORDER BY p.created_at DESC, p.rowid DESC LIMIT ? OFFSET ?`,
    )
    .all(now(), limit, offset);
}

export function countPastes(): number {
  return (
    db
      .query<{ n: number }, [number]>(`SELECT count(*) AS n FROM pastes p WHERE p.unlisted = 0 AND ${LIVE}`)
      .get(now())?.n ?? 0
  );
}

/** One author's pastes, including their unlisted ones. */
export function listPastesByAuthor(authorId: string, limit: number, offset: number): PasteWithAuthor[] {
  return db
    .query<PasteWithAuthor, [string, number, number, number]>(
      `${WITH_AUTHOR} WHERE p.author_id = ? AND ${LIVE} ORDER BY p.created_at DESC, p.rowid DESC LIMIT ? OFFSET ?`,
    )
    .all(authorId, now(), limit, offset);
}

export function countPastesByAuthor(authorId: string): number {
  return (
    db
      .query<{ n: number }, [string, number]>(`SELECT count(*) AS n FROM pastes p WHERE p.author_id = ? AND ${LIVE}`)
      .get(authorId, now())?.n ?? 0
  );
}

/** How many pastes an author has made recently — the create rate limit's input. */
export function countRecentByAuthor(authorId: string, since: number): number {
  return (
    db
      .query<{ n: number }, [string, number]>(
        "SELECT count(*) AS n FROM pastes WHERE author_id = ? AND created_at > ?",
      )
      .get(authorId, since)?.n ?? 0
  );
}

/** Drops what has aged out. Expired pastes are already invisible to every query above. */
export function sweepExpired(): void {
  const ts = now();
  db.query("DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at <= ?").run(ts);
  db.query("DELETE FROM sessions WHERE expires_at <= ?").run(ts);
  db.query("DELETE FROM logins WHERE expires_at <= ?").run(ts);
}
