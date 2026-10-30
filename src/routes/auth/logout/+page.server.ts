/* src/routes/auth/logout/+page.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { config } from "#lib/server/env.ts";
import { endSessionUrl } from "#lib/server/oidc.ts";
import { csrfOk, endCurrentSession } from "#lib/server/session.ts";
import { formExpired } from "#lib/server/compose.ts";

// Signing out is a POST; a stray GET just goes home
export const load: PageServerLoad = () => redirect(303, "/");

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    if (!csrfOk(event, form.get("_csrf"))) formExpired();

    await endCurrentSession(event);

    // Ending the session here leaves the auth server's own session alone, so
    // only close that too when asked
    if (form.get("everywhere") === "1") {
      let url: string | null = null;
      try {
        url = await endSessionUrl();
      } catch (err) {
        console.error("[auth] end-session lookup failed:", err);
      }
      if (url) {
        redirect(303, url, {
          external: [new URL(config.issuer).origin],
        });
      }
    }

    redirect(303, "/?m=signed-out");
  },
};
