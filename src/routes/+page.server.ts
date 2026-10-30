/* src/routes/+page.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { PageServerLoad } from "./$types";
import { countPastes, listPastes } from "#lib/server/db.ts";
import { PER_PAGE, pageNumber, toRow } from "#lib/server/listing.ts";

export const load: PageServerLoad = async ({ url }) => {
  const page = pageNumber(url);
  const [total, pastes] = await Promise.all([
    countPastes(),
    listPastes(PER_PAGE, (page - 1) * PER_PAGE),
  ]);
  return {
    page,
    total,
    perPage: PER_PAGE,
    pastes: pastes.map(toRow),
  };
};
