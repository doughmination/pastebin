/* src/routes/robots.txt/+server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = () =>
  new Response("User-agent: *\nDisallow: /new\nDisallow: /mine\nDisallow: /auth/\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
