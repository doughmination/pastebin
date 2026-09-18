/* scripts/sync-jpml-grammar.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

/**
 * Copies the JPML TextMate grammar out of the jpml-vscode checkout, so the
 * highlighting here matches the editor rather than drifting from it.
 *
 *   bun run sync:jpml [path/to/jpml-vscode]
 */

import { resolve } from "node:path";

const DESTINATION = resolve(import.meta.dir, "..", "syntaxes", "jpml.tmLanguage.json");

const candidates = [
  process.argv[2],
  resolve(import.meta.dir, "..", "..", "jpml-vscode"),
].filter((path): path is string => Boolean(path));

for (const root of candidates) {
  const source = Bun.file(resolve(root, "syntaxes", "jpml.tmLanguage.json"));
  if (!(await source.exists())) continue;

  const text = await source.text();
  // Parse before writing: a grammar that isn't valid JSON would take the
  // server down at its next start, and this script is the last chance to say so.
  JSON.parse(text);

  await Bun.write(DESTINATION, text);
  console.log(`Copied ${resolve(root, "syntaxes", "jpml.tmLanguage.json")}\n     -> ${DESTINATION}`);
  process.exit(0);
}

console.error(
  "Couldn't find jpml-vscode. Pass its path:\n  bun run sync:jpml ../jpml-vscode",
);
process.exit(1);
