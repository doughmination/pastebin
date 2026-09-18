/* src/auth/session.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { TTL, isSecure, now, type AppContext, type CurrentUser } from "../env";
import { randomToken, sha256Hex, timingSafeEqualStr } from "../lib/crypto";
import { createSession, deleteSession, getSession, getUser } from "../db";

const COOKIE = "paste_session";

/**
 * Only the hash of the cookie value is stored, so a copy of the database
 * doesn't hand anyone a working session.
 */
export async function startSession(c: AppContext, userId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = now() + TTL.session;
  createSession(await sha256Hex(token), userId, randomToken(16), expiresAt);

  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "Lax",
    path: "/",
    maxAge: TTL.session,
  });
}

export async function endCurrentSession(c: AppContext): Promise<void> {
  const session = c.get("session");
  if (session) deleteSession(session.idHash);
  deleteCookie(c, COOKIE, { path: "/", secure: isSecure() });
}

/** Middleware: puts the signed-in user (or null) on the context for every route. */
export async function loadSession(c: AppContext): Promise<void> {
  c.set("session", null);
  c.set("user", null);

  const token = getCookie(c, COOKIE);
  if (!token) return;

  const row = getSession(await sha256Hex(token));
  if (!row) {
    deleteCookie(c, COOKIE, { path: "/", secure: isSecure() });
    return;
  }

  const user = getUser(row.user_id);
  if (!user) {
    deleteSession(row.id_hash);
    return;
  }

  c.set("session", {
    idHash: row.id_hash,
    userId: row.user_id,
    csrf: row.csrf,
    expiresAt: row.expires_at,
  });
  c.set("user", {
    id: user.id,
    username: user.username,
    name: user.name,
    picture: user.picture,
  } satisfies CurrentUser);
}

/** Second CSRF layer, behind the Origin check in the request pipeline. */
export function csrfOk(c: AppContext, submitted: string | undefined): boolean {
  const session = c.get("session");
  if (!session || !submitted) return false;
  return timingSafeEqualStr(submitted, session.csrf);
}
