/* src/lib/server/db.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { env } from "cloudflare:workers";
import { now } from "./env.ts";

// The schema lives in migrations/; apply it with `wrangler d1 migrations apply`
function db(): D1Database {
  return env.DB;
}

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
export async function upsertUser(user: {
  id: string;
  username: string;
  name: string | null;
  picture: string | null;
}): Promise<void> {
  const ts = now();
  await db()
    .prepare(
      `INSERT INTO users (id, username, name, picture, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         name = excluded.name,
         picture = excluded.picture,
         updated_at = excluded.updated_at`,
    )
    .bind(
      user.id,
      user.username,
      user.name,
      user.picture,
      ts,
      ts,
    )
    .run();
}

export function getUser(id: string): Promise<UserRow | null> {
  return db().prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

// --- sessions -----------------------------------------------------------------------

export interface SessionRow {
  id_hash: string;
  user_id: string;
  csrf: string;
  created_at: number;
  expires_at: number;
}

export async function createSession(idHash: string, userId: string, csrf: string, expiresAt: number): Promise<void> {
  await db()
    .prepare("INSERT INTO sessions (id_hash, user_id, csrf, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(
      idHash,
      userId,
      csrf,
      now(),
      expiresAt,
    )
    .run();
}

export function getSession(idHash: string): Promise<SessionRow | null> {
  return db()
    .prepare("SELECT * FROM sessions WHERE id_hash = ? AND expires_at > ?")
    .bind(idHash, now())
    .first<SessionRow>();
}

export async function deleteSession(idHash: string): Promise<void> {
  await db().prepare("DELETE FROM sessions WHERE id_hash = ?").bind(idHash).run();
}

// --- in-flight sign-ins --------------------------------------------------------------

export interface LoginRow {
  state_hash: string;
  verifier: string;
  nonce: string;
  return_to: string;
  expires_at: number;
}

export async function createLogin(
  stateHash: string,
  verifier: string,
  nonce: string,
  returnTo: string,
  expiresAt: number,
): Promise<void> {
  await db()
    .prepare("INSERT INTO logins (state_hash, verifier, nonce, return_to, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(
      stateHash,
      verifier,
      nonce,
      returnTo,
      expiresAt,
    )
    .run();
}

/** Single-use: redeeming a state removes it, so a replayed callback finds nothing. */
export async function takeLogin(stateHash: string): Promise<LoginRow | null> {
  const row = await db()
    .prepare("DELETE FROM logins WHERE state_hash = ? RETURNING *")
    .bind(stateHash)
    .first<LoginRow>();
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

export async function slugTaken(slug: string): Promise<boolean> {
  const row = await db().prepare("SELECT slug FROM pastes WHERE slug = ?").bind(slug).first();
  return row !== null;
}

export async function createPaste(input: PasteInput): Promise<void> {
  const ts = now();
  await db()
    .prepare(
      `INSERT INTO pastes (slug, author_id, title, body, language, theme, accent, unlisted, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
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
    )
    .run();
}

export async function updatePaste(slug: string, input: Omit<PasteInput, "slug" | "authorId">): Promise<void> {
  await db()
    .prepare(
      `UPDATE pastes SET title = ?, body = ?, language = ?, theme = ?, accent = ?, unlisted = ?, updated_at = ?, expires_at = ?
       WHERE slug = ?`,
    )
    .bind(
      input.title,
      input.body,
      input.language,
      input.theme,
      input.accent,
      input.unlisted ? 1 : 0,
      now(),
      input.expiresAt,
      slug,
    )
    .run();
}

const LIVE = "(p.expires_at IS NULL OR p.expires_at > ?)";

const WITH_AUTHOR = `
  SELECT p.*, u.username AS author_username, u.name AS author_name
  FROM pastes p JOIN users u ON u.id = p.author_id`;

export function getPaste(slug: string): Promise<PasteWithAuthor | null> {
  return db()
    .prepare(`${WITH_AUTHOR} WHERE p.slug = ? AND ${LIVE}`)
    .bind(slug, now())
    .first<PasteWithAuthor>();
}

export async function deletePaste(slug: string): Promise<void> {
  await db().prepare("DELETE FROM pastes WHERE slug = ?").bind(slug).run();
}

/** Public index: listed, unexpired pastes, newest first. */
export async function listPastes(limit: number, offset: number): Promise<PasteWithAuthor[]> {
  const { results } = await db()
    .prepare(`${WITH_AUTHOR} WHERE p.unlisted = 0 AND ${LIVE} ORDER BY p.created_at DESC, p.rowid DESC LIMIT ? OFFSET ?`)
    .bind(
      now(),
      limit,
      offset,
    )
    .all<PasteWithAuthor>();
  return results;
}

export async function countPastes(): Promise<number> {
  const row = await db()
    .prepare(`SELECT count(*) AS n FROM pastes p WHERE p.unlisted = 0 AND ${LIVE}`)
    .bind(now())
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** One author's pastes, including their unlisted ones. */
export async function listPastesByAuthor(authorId: string, limit: number, offset: number): Promise<PasteWithAuthor[]> {
  const { results } = await db()
    .prepare(`${WITH_AUTHOR} WHERE p.author_id = ? AND ${LIVE} ORDER BY p.created_at DESC, p.rowid DESC LIMIT ? OFFSET ?`)
    .bind(
      authorId,
      now(),
      limit,
      offset,
    )
    .all<PasteWithAuthor>();
  return results;
}

export async function countPastesByAuthor(authorId: string): Promise<number> {
  const row = await db()
    .prepare(`SELECT count(*) AS n FROM pastes p WHERE p.author_id = ? AND ${LIVE}`)
    .bind(authorId, now())
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** How many pastes an author has made recently — the create rate limit's input. */
export async function countRecentByAuthor(authorId: string, since: number): Promise<number> {
  const row = await db()
    .prepare("SELECT count(*) AS n FROM pastes WHERE author_id = ? AND created_at > ?")
    .bind(authorId, since)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Drops what has aged out. Expired pastes are already invisible to every query above. */
export async function sweepExpired(): Promise<void> {
  const ts = now();
  await db().batch([
    db().prepare("DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at <= ?").bind(ts),
    db().prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(ts),
    db().prepare("DELETE FROM logins WHERE expires_at <= ?").bind(ts),
  ]);
}
