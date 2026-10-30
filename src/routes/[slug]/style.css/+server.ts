/* src/routes/[slug]/style.css/+server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { RequestHandler } from "./$types";
import { getPaste } from "#lib/server/db.ts";
import { accentVars } from "#lib/server/colour.ts";
import { renderPaste } from "#lib/server/highlight.ts";

// A paste's own CSS: Shiki's token classes and its accent. Served as a file so
// the page's CSP never has to allow inline styles
export const GET: RequestHandler = async ({ params }) => {
  const paste = await getPaste(params.slug);
  if (!paste) return new Response("/* not found */", { status: 404 });

  const rendered = await renderPaste(paste);
  const accent = paste.accent ? `body{${accentVars(paste.accent)}}` : "";
  const sheet = [accent, rendered.css].filter(Boolean).join("\n");

  return new Response(sheet, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      // The page links it with ?v=updated_at, so an edit is a new URL
      "Cache-Control": "public, max-age=86400",
    },
  });
};
