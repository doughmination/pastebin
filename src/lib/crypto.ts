/* src/lib/crypto.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

/** URL-safe base64 without padding — the encoding PKCE and JWTs use. */
export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** Short, lowercase, unambiguous id for pastes that don't name their own slug. */
export function randomSlug(length = 8): string {
  const picks = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const pick of picks) out += ALPHABET[pick % ALPHABET.length];
  return out;
}

export async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = new Uint8Array(await sha256(input));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare, so a mismatch leaks nothing through timing. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface Pkce {
  verifier: string;
  challenge: string;
}

/** RFC 7636 S256: the verifier stays here, only its hash reaches the auth server. */
export async function pkce(): Promise<Pkce> {
  const verifier = randomToken(32);
  return { verifier, challenge: b64url(await sha256(verifier)) };
}
