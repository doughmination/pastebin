/* src/lib/server/env.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { building } from "$app/env";
import { env } from "cloudflare:workers";

// Vars and secrets from wrangler.jsonc, or .dev.vars locally. The build has no
// bindings, and touching them there throws
const vars: Record<string, string | undefined> = building ? {} : (env as unknown as Record<string, string>);

function required(name: string): string {
  const value = vars[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Set it in wrangler.jsonc, or .dev.vars locally.`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return vars[name]?.trim() || fallback;
}

function integer(name: string, fallback: number): number {
  const raw = vars[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return Math.floor(value);
}

export interface Config {
  /** Public origin of this pastebin, e.g. https://paste.doughmination.gay. */
  origin: string;
  siteName: string;
  /** OIDC issuer: the auth-server's public origin. */
  issuer: string;
  clientId: string;
  /** Empty for a public (PKCE-only) client. */
  clientSecret: string;
  /** Largest paste body accepted, in bytes of UTF-8. */
  maxBodyBytes: number;
  /** Bodies larger than this are served without syntax highlighting. */
  maxHighlightBytes: number;
}

// The build imports server modules to analyse them, with no .env around
const read = building
  ? (name: string) => vars[name]?.trim() || "http://localhost"
  : required;

export const config: Config = {
  origin: read("ORIGIN").replace(/\/+$/, ""),
  siteName: optional("SITE_NAME", "Doughmination Paste"),
  issuer: read("OIDC_ISSUER").replace(/\/+$/, ""),
  clientId: read("OIDC_CLIENT_ID"),
  clientSecret: optional("OIDC_CLIENT_SECRET", ""),
  maxBodyBytes: integer("MAX_BODY_BYTES", 512 * 1024),
  maxHighlightBytes: integer("MAX_HIGHLIGHT_BYTES", 192 * 1024),
};

/** The redirect URI registered with the auth server for this client. */
export const redirectUri = `${config.origin}/auth/callback`;

export function isSecure(): boolean {
  return new URL(config.origin).protocol === "https:";
}

export interface SessionInfo {
  idHash: string;
  userId: string;
  csrf: string;
  expiresAt: number;
}

export interface CurrentUser {
  id: string;
  username: string;
  name: string | null;
  picture: string | null;
}

export const TTL = {
  session: 60 * 60 * 24 * 14,
  /** How long a half-finished sign-in may sit at the auth server. */
  pendingLogin: 60 * 10,
} as const;

export function now(): number {
  return Math.floor(Date.now() / 1000);
}
