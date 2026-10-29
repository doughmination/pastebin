/* src/routes/+layout.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  const user = locals.user;
  return {
    user: user
      ? {
          username: user.username,
          name: user.name,
        }
      : null,
    csrf: locals.session?.csrf ?? "",
  };
};
