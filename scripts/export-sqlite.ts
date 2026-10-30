/* scripts/export-sqlite.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

// Turns the old Bun-era database into SQL for D1:
//   bun scripts/export-sqlite.ts data/pastebin.db > import.sql
//   bunx wrangler d1 execute pastebin --remote --file import.sql
// Sessions and in-flight sign-ins are left behind; everyone signs in again.

import { Database } from "bun:sqlite";

const file = process.argv[2];
if (!file) {
  console.error("usage: bun scripts/export-sqlite.ts <pastebin.db>");
  process.exit(1);
}

const source = new Database(file, { readonly: true });

function literal(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Users before pastes, so every author_id already exists
for (const table of ["users", "pastes"]) {
  const rows = source.query(`SELECT * FROM ${table} ORDER BY rowid`).all() as Record<string, unknown>[];

  for (const row of rows) {
    const columns = Object.keys(row).join(", ");
    const values = Object.values(row).map(literal).join(", ");
    console.log(`INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${values});`);
  }
}
