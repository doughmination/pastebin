/* src/lib/server/jpml.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

interface JpmlCore {
  loads(text: string): unknown;
  JPDecodeError: new (...args: never[]) => Error & {
    rawMessage: string;
    line?: number;
    col?: number;
  };
}

// jpml-lang left the npm registry, so the parser is optional: without it there's no check
const PACKAGE = "jpml-lang/core";

const core: Promise<JpmlCore | null> = import(/* @vite-ignore */ PACKAGE).catch(() => null);

/**
 * Pastes tagged `jpml` are run through the real parser, so the page can say
 * where a document breaks instead of leaving a reader to guess from the
 * highlighting. This is advisory only: a broken `.jp` file is still a
 * perfectly good thing to paste, usually the reason for pasting it.
 */

export interface JpmlCheck {
  ok: boolean;
  /** Parser message with no location prefix, e.g. `expected ':' after key`. */
  message?: string;
  line?: number;
  col?: number;
}

/** Documents past this size are skipped: the check is a nicety, not worth the stall. */
const MAX_CHECK_BYTES = 256 * 1024;

export async function check(body: string): Promise<JpmlCheck | null> {
  if (Buffer.byteLength(body, "utf8") > MAX_CHECK_BYTES) return null;

  const parser = await core;
  if (!parser) return null;
  const { JPDecodeError, loads } = parser;

  try {
    // Duplicate keys are an error in the parser's default mode, which matches
    // what the VS Code extension reports out of the box.
    loads(body);
    return { ok: true };
  } catch (err) {
    if (err instanceof JPDecodeError) {
      return { ok: false, message: err.rawMessage, line: err.line, col: err.col };
    }
    // Anything else is a bug here, not in the pasted document.
    console.error("[jpml] unexpected check failure:", err);
    return null;
  }
}
