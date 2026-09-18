/* src/env.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { Context } from "hono";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function integer(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number.`);
  return Math.floor(value);
}

export interface Config {
  /** Public origin of this pastebin, e.g. https://paste.doughmination.gay. */
  origin: string;
  siteName: string;
  port: number;
  host: string;
  databaseFile: string;
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

export const config: Config = {
  origin: required("ORIGIN").replace(/\/+$/, ""),
  siteName: optional("SITE_NAME", "Doughmination Paste"),
  port: integer("PORT", 3000),
  host: optional("HOST", "0.0.0.0"),
  databaseFile: optional("DATABASE_FILE", "data/pastebin.db"),
  issuer: required("OIDC_ISSUER").replace(/\/+$/, ""),
  clientId: required("OIDC_CLIENT_ID"),
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

export type AppEnv = {
  Variables: {
    session: SessionInfo | null;
    user: CurrentUser | null;
    /** Per-response nonce for the one <style> block the layout emits. */
    nonce: string;
  };
};

export type AppContext = Context<AppEnv>;

export const TTL = {
  session: 60 * 60 * 24 * 14,
  /** How long a half-finished sign-in may sit at the auth server. */
  pendingLogin: 60 * 10,
} as const;

export function now(): number {
  return Math.floor(Date.now() / 1000);
}
