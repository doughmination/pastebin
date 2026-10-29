/* src/lib/server/session.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { Cookies, RequestEvent } from "@sveltejs/kit";
import { TTL, isSecure, now } from "./env.ts";
import { randomToken, sha256Hex, timingSafeEqualStr } from "./crypto.ts";
import { createSession, deleteSession, getSession, getUser } from "./db.ts";

const COOKIE = "paste_session";

/**
 * Only the hash of the cookie value is stored, so a copy of the database
 * doesn't hand anyone a working session.
 */
export async function startSession(cookies: Cookies, userId: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = now() + TTL.session;
  createSession(await sha256Hex(token), userId, randomToken(16), expiresAt);

  cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: TTL.session,
  });
}

export function endCurrentSession(event: RequestEvent): void {
  const session = event.locals.session;
  if (session) deleteSession(session.idHash);
  event.cookies.delete(COOKIE, {
    path: "/",
    secure: isSecure(),
  });
}

/** Puts the signed-in user (or null) on locals for every request. */
export async function loadSession(event: RequestEvent): Promise<void> {
  event.locals.session = null;
  event.locals.user = null;

  const token = event.cookies.get(COOKIE);
  if (!token) return;

  const row = getSession(await sha256Hex(token));
  if (!row) {
    event.cookies.delete(COOKIE, {
      path: "/",
      secure: isSecure(),
    });
    return;
  }

  const user = getUser(row.user_id);
  if (!user) {
    deleteSession(row.id_hash);
    return;
  }

  event.locals.session = {
    idHash: row.id_hash,
    userId: row.user_id,
    csrf: row.csrf,
    expiresAt: row.expires_at,
  };
  event.locals.user = {
    id: user.id,
    username: user.username,
    name: user.name,
    picture: user.picture,
  };
}

/** Second CSRF layer, behind the Origin check in hooks.server.ts. */
export function csrfOk(event: RequestEvent, submitted: FormDataEntryValue | null): boolean {
  const session = event.locals.session;
  if (!session || typeof submitted !== "string" || !submitted) return false;
  return timingSafeEqualStr(submitted, session.csrf);
}
