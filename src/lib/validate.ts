/* src/lib/validate.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { now } from "../env";

// Slugs are the whole URL after the origin, so they stay lowercase and boring:
// 3–64 characters, letters, digits, dashes and underscores, no leading or
// trailing punctuation.
const SLUG = /^[a-z0-9](?:[a-z0-9_-]{1,62}[a-z0-9])?$/;

/**
 * Paths the app serves itself. A paste may not take one of these, or it would
 * shadow a real page — `/new` must stay the composer.
 */
export const RESERVED_SLUGS = new Set([
  "new",
  "auth",
  "login",
  "logout",
  "raw",
  "dl",
  "static",
  "mine",
  "about",
  "api",
  "edit",
  "delete",
  "favicon.ico",
  "robots.txt",
  "health",
  "u",
  "p",
]);

export function normaliseSlug(input: string | undefined): string {
  return (input ?? "").trim().toLowerCase();
}

export function slugProblem(slug: string): string | null {
  if (!SLUG.test(slug)) {
    return "Slugs are 3–64 lowercase letters, digits, dashes or underscores, starting and ending with a letter or digit.";
  }
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is reserved for the site itself. Pick another.`;
  return null;
}

export function cleanText(input: string | undefined, max: number): string | null {
  const value = (input ?? "").trim();
  if (!value) return null;
  return value.slice(0, max);
}

/**
 * Normalises line endings and strips a trailing newline. Browsers send CRLF
 * from a textarea regardless of what was typed, and a stray blank final line
 * would show up as a numbered line in every paste.
 */
export function normaliseBody(input: string | undefined): string {
  return (input ?? "").replace(/\r\n?/g, "\n").replace(/\n+$/, "");
}

export interface ExpiryOption {
  id: string;
  label: string;
  /** Seconds from now, or null for "keep forever". */
  seconds: number | null;
}

export const EXPIRY_OPTIONS: ExpiryOption[] = [
  { id: "never", label: "Never", seconds: null },
  { id: "1h", label: "1 hour", seconds: 60 * 60 },
  { id: "1d", label: "1 day", seconds: 60 * 60 * 24 },
  { id: "1w", label: "1 week", seconds: 60 * 60 * 24 * 7 },
  { id: "1m", label: "30 days", seconds: 60 * 60 * 24 * 30 },
  { id: "1y", label: "1 year", seconds: 60 * 60 * 24 * 365 },
];

export function expiryProblem(id: string): string | null {
  return EXPIRY_OPTIONS.some((o) => o.id === id) ? null : "That isn't one of the expiry choices.";
}

export function expiresAtFrom(id: string): number | null {
  const option = EXPIRY_OPTIONS.find((o) => o.id === id);
  return option?.seconds == null ? null : now() + option.seconds;
}

/** Turns a stored timestamp back into the option a form should preselect. */
export function expiryIdFrom(expiresAt: number | null): string {
  if (expiresAt === null) return "never";
  const remaining = expiresAt - now();
  const match = EXPIRY_OPTIONS.filter((o) => o.seconds !== null).find((o) => o.seconds! >= remaining);
  return match?.id ?? "1y";
}
