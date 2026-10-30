/* src/routes/[slug]/+page.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { deletePaste, getPaste } from "#lib/server/db.ts";
import { csrfOk } from "#lib/server/session.ts";
import { formExpired, ownPaste } from "#lib/server/compose.ts";
import { check as checkJpml } from "#lib/server/jpml.ts";
import {
  languageLabel,
  renderPaste,
  shouldNumber,
  themeIsLight,
} from "#lib/server/highlight.ts";

export const load: PageServerLoad = async ({ params, locals }) => {
  const paste = await getPaste(params.slug);
  if (!paste) {
    error(404, {
      title: "No such paste",
      message: "It may have expired, been deleted, or never existed.",
    });
  }

  const rendered = await renderPaste(paste);
  const jpml = paste.language === "jpml" ? await checkJpml(paste.body) : null;

  return {
    paste: {
      slug: paste.slug,
      title: paste.title,
      author: paste.author_name ?? paste.author_username,
      authorUsername: paste.author_username,
      language: paste.language,
      languageLabel: languageLabel(paste.language),
      unlisted: paste.unlisted === 1,
      createdAt: paste.created_at,
      updatedAt: paste.updated_at,
      expiresAt: paste.expires_at,
      size: Buffer.byteLength(paste.body, "utf8"),
    },
    html: rendered.html,
    lines: rendered.lines,
    numbered: shouldNumber(rendered.lines),
    highlighted: rendered.highlighted,
    light: themeIsLight(paste.theme),
    // Shiki's classes and the accent live in a stylesheet of their own: the CSP allows no inline styles
    styled: rendered.css !== "" || paste.accent !== null,
    jpml,
    isOwner: locals.user?.id === paste.author_id,
  };
};

export const actions: Actions = {
  delete: async (event) => {
    const paste = await ownPaste(event);

    const form = await event.request.formData();
    if (!csrfOk(event, form.get("_csrf"))) formExpired();

    await deletePaste(paste.slug);
    redirect(303, "/mine?m=paste-deleted");
  },
};
