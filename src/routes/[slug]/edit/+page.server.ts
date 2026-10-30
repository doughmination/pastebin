/* src/routes/[slug]/edit/+page.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { updatePaste } from "#lib/server/db.ts";
import { csrfOk } from "#lib/server/session.ts";
import { cleanText } from "#lib/server/validate.ts";
import {
  composerOptions,
  formExpired,
  ownPaste,
  parseComposer,
  valuesFrom,
} from "#lib/server/compose.ts";

export const load: PageServerLoad = async (event) => {
  const paste = await ownPaste(event);
  return {
    slug: paste.slug,
    values: valuesFrom(paste),
    options: composerOptions(),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const paste = await ownPaste(event);

    const form = await event.request.formData();
    if (!csrfOk(event, form.get("_csrf"))) formExpired();

    const parsed = parseComposer(form);
    if (parsed.error) {
      // The slug isn't editable, so keep showing the real one
      parsed.values.slug = paste.slug;
      return fail(400, {
        error: parsed.error,
        values: parsed.values,
      });
    }

    await updatePaste(paste.slug, {
      title: cleanText(parsed.values.title, 200),
      body: parsed.values.body,
      language: parsed.values.language,
      theme: parsed.values.theme,
      accent: parsed.accent,
      unlisted: parsed.values.unlisted,
      expiresAt: parsed.expiresAt,
    });

    redirect(303, `/${paste.slug}?m=paste-updated`);
  },
};
