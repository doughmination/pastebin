/* src/routes/mine/+page.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { countPastesByAuthor, listPastesByAuthor } from "#lib/server/db.ts";
import { PER_PAGE, pageNumber, toRow } from "#lib/server/listing.ts";

export const load: PageServerLoad = async ({ locals, url }) => {
  const user = locals.user;
  if (!user) redirect(303, "/auth/login?return_to=%2Fmine");

  const page = pageNumber(url);
  const [total, pastes] = await Promise.all([
    countPastesByAuthor(user.id),
    listPastesByAuthor(user.id, PER_PAGE, (page - 1) * PER_PAGE),
  ]);
  return {
    page,
    total,
    perPage: PER_PAGE,
    pastes: pastes.map(toRow),
  };
};
