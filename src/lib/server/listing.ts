/* src/lib/server/listing.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { PasteWithAuthor } from "./db.ts";
import { languageLabel } from "./highlight.ts";

export const PER_PAGE = 25;

export function pageNumber(url: URL): number {
  const raw = Number(url.searchParams.get("page") ?? "1");
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

/** Just what a listing row shows; the body never leaves the server here */
export function toRow(paste: PasteWithAuthor) {
  return {
    slug: paste.slug,
    title: paste.title,
    languageLabel: languageLabel(paste.language),
    author: paste.author_name ?? paste.author_username,
    created_at: paste.created_at,
    unlisted: paste.unlisted,
    expires_at: paste.expires_at,
  };
}
