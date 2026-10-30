/* src/routes/new/+page.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { now } from "#lib/server/env.ts";
import { countRecentByAuthor, createPaste, slugTaken } from "#lib/server/db.ts";
import { csrfOk } from "#lib/server/session.ts";
import { cleanText, slugProblem } from "#lib/server/validate.ts";
import {
  HOURLY_LIMIT,
  blankValues,
  composerOptions,
  formExpired,
  freeSlug,
  parseComposer,
} from "#lib/server/compose.ts";

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) redirect(303, "/auth/login?return_to=%2Fnew&m=sign-in-needed");

  return {
    values: blankValues(),
    options: composerOptions(),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const user = event.locals.user;
    if (!user) {
      error(401, {
        title: "Sign in first",
        message: "Only signed-in accounts can publish pastes.",
      });
    }

    const form = await event.request.formData();
    if (!csrfOk(event, form.get("_csrf"))) formExpired();

    if ((await countRecentByAuthor(user.id, now() - 3600)) >= HOURLY_LIMIT) {
      error(429, {
        title: "Slow down",
        message: `That's ${HOURLY_LIMIT} pastes in an hour. Try again later.`,
      });
    }

    const parsed = parseComposer(form);
    const reject = (message: string) =>
      fail(400, {
        error: message,
        values: parsed.values,
      });

    if (parsed.error) return reject(parsed.error);

    let slug: string;
    if (parsed.values.slug) {
      slug = parsed.values.slug;
      const fault = slugProblem(slug);
      if (fault) return reject(fault);
      if (await slugTaken(slug)) return reject(`The slug "${slug}" is already taken.`);
    } else {
      const generated = await freeSlug();
      if (!generated) {
        error(503, {
          title: "Couldn't allocate an address",
          message: "Please try publishing again.",
        });
      }
      slug = generated;
    }

    await createPaste({
      slug,
      authorId: user.id,
      title: cleanText(parsed.values.title, 200),
      body: parsed.values.body,
      language: parsed.values.language,
      theme: parsed.values.theme,
      accent: parsed.accent,
      unlisted: parsed.values.unlisted,
      expiresAt: parsed.expiresAt,
    });

    redirect(303, `/${slug}?m=paste-created`);
  },
};
