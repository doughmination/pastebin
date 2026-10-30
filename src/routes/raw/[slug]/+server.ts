/* src/routes/raw/[slug]/+server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { RequestHandler } from "./$types";
import { getPaste } from "#lib/server/db.ts";

export const GET: RequestHandler = async ({ params }) => {
  const paste = await getPaste(params.slug);
  if (!paste) return new Response("Not found", { status: 404 });

  // A paste is arbitrary text from another account, so it is never allowed to
  // execute as a document on this origin
  return new Response(paste.body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
};
