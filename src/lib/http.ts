/* src/lib/http.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { AppContext } from "../env";

/** Parsed form body with every value coerced to a string (files dropped). */
export async function form(c: AppContext): Promise<Record<string, string>> {
  const body = await c.req.parseBody({ all: true });
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string") out[key] = first;
  }
  return out;
}

/** Only same-site paths: "/x" yes, "//host", "/\host" and absolute URLs no. */
export function safeReturn(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\x00-\x20]/.test(raw)) return fallback;
  return raw.length > 2048 ? fallback : raw;
}

export function clientIp(c: AppContext): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return c.req.header("cf-connecting-ip") ?? "unknown";
}
