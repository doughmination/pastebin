/* src/routes/dl/[slug]/+server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { RequestHandler } from "./$types";
import { getPaste } from "#lib/server/db.ts";
import { extensionFor } from "#lib/server/highlight.ts";

export const GET: RequestHandler = async ({ params }) => {
  const paste = await getPaste(params.slug);
  if (!paste) return new Response("Not found", { status: 404 });

  const name = `${paste.slug}.${extensionFor(paste.language)}`.replace(/[^\w.-]/g, "_");
  return new Response(paste.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
};
