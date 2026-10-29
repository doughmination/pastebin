/* src/lib/server/compose.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { error, type RequestEvent } from "@sveltejs/kit";
import { config } from "./env.ts";
import { getPaste, slugTaken, type PasteWithAuthor } from "./db.ts";
import { randomSlug } from "./crypto.ts";
import { ACCENT_PRESETS, normaliseHex } from "./colour.ts";
import {
  EXPIRY_OPTIONS,
  expiresAtFrom,
  expiryIdFrom,
  expiryProblem,
  normaliseBody,
  normaliseSlug,
} from "./validate.ts";
import {
  DEFAULT_THEME,
  LANGUAGES,
  THEMES,
  isLanguage,
  isTheme,
} from "./highlight.ts";

/** Pastes one account may publish per hour, so a stuck script can't fill the disk. */
export const HOURLY_LIMIT = 60;

export interface ComposerValues {
  title: string;
  slug: string;
  body: string;
  language: string;
  theme: string;
  accentChoice: string;
  accentCustom: string;
  expiry: string;
  unlisted: boolean;
}

/** Everything the composer's selects and swatches offer */
export function composerOptions() {
  return {
    languages: LANGUAGES,
    themes: THEMES,
    expiries: EXPIRY_OPTIONS,
    accents: ACCENT_PRESETS,
    maxBytes: config.maxBodyBytes,
  };
}

export type ComposerOptions = ReturnType<typeof composerOptions>;

export function blankValues(): ComposerValues {
  return {
    title: "",
    slug: "",
    body: "",
    language: "text",
    theme: DEFAULT_THEME,
    accentChoice: "none",
    accentCustom: "#eb459e",
    expiry: "never",
    unlisted: false,
  };
}

/** Works out which accent control an existing paste's stored colour came from. */
export function valuesFrom(paste: PasteWithAuthor): ComposerValues {
  const preset = paste.accent
    ? ACCENT_PRESETS.find((p) => p.hex === paste.accent)
    : undefined;

  return {
    title: paste.title ?? "",
    slug: paste.slug,
    body: paste.body,
    language: paste.language,
    theme: paste.theme,
    accentChoice: paste.accent === null ? "none" : (preset?.id ?? "custom"),
    accentCustom: paste.accent ?? "#eb459e",
    expiry: expiryIdFrom(paste.expires_at),
    unlisted: paste.unlisted === 1,
  };
}

export interface Parsed {
  values: ComposerValues;
  error: string | null;
  /** Filled in only when `error` is null. */
  accent: string | null;
  expiresAt: number | null;
}

function field(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * Reads the composer form back into validated fields. Everything the user
 * typed survives on the returned `values` so a rejected submission can be
 * re-rendered without losing the paste.
 */
export function parseComposer(form: FormData): Parsed {
  const accentChoice = field(form, "accent_choice") ?? "none";
  const accentCustom = normaliseHex(field(form, "accent_custom")) ?? "#eb459e";

  const values: ComposerValues = {
    title: (field(form, "title") ?? "").trim().slice(0, 200),
    slug: normaliseSlug(field(form, "slug")),
    body: normaliseBody(field(form, "body")),
    language: field(form, "language") ?? "text",
    theme: field(form, "theme") ?? DEFAULT_THEME,
    accentChoice,
    accentCustom,
    expiry: field(form, "expiry") ?? "never",
    unlisted: field(form, "unlisted") === "1",
  };

  const fail = (error: string): Parsed => ({
    values,
    error,
    accent: null,
    expiresAt: null,
  });

  if (!values.body) return fail("A paste needs some content.");
  const size = Buffer.byteLength(values.body, "utf8");
  if (size > config.maxBodyBytes) {
    const sizeKb = Math.round(size / 1024);
    const limitKb = Math.round(config.maxBodyBytes / 1024);
    return fail(`That paste is ${sizeKb} KB; the limit is ${limitKb} KB.`);
  }

  if (!isLanguage(values.language)) return fail("That isn't one of the languages on offer.");
  if (!isTheme(values.theme)) return fail("That isn't one of the highlight themes on offer.");

  const expiryFault = expiryProblem(values.expiry);
  if (expiryFault) return fail(expiryFault);

  let accent: string | null = null;
  if (accentChoice === "custom") {
    const hex = normaliseHex(field(form, "accent_custom"));
    if (!hex) return fail("That accent colour isn't a valid hex colour.");
    accent = hex;
  } else if (accentChoice !== "none") {
    const preset = ACCENT_PRESETS.find((p) => p.id === accentChoice);
    if (!preset) return fail("That isn't one of the accent colours on offer.");
    accent = preset.hex;
  }

  return {
    values,
    error: null,
    accent,
    expiresAt: expiresAtFrom(values.expiry),
  };
}

/** Generated slugs collide vanishingly rarely; a few tries removes the doubt. */
export function freeSlug(): string | null {
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = randomSlug(attempt < 5 ? 8 : 12);
    if (!slugTaken(slug)) return slug;
  }
  return null;
}

/** Resolves a paste the signed-in account is allowed to change, or throws the right error page. */
export function ownPaste(event: RequestEvent): PasteWithAuthor {
  const user = event.locals.user;
  const paste = getPaste(event.params.slug ?? "");

  if (!paste) {
    error(404, {
      title: "No such paste",
      message: "It may have expired, been deleted, or never existed.",
    });
  }
  if (!user) {
    error(401, {
      title: "Sign in first",
      message: "Only the author can change a paste.",
    });
  }
  if (paste.author_id !== user.id) {
    error(403, {
      title: "Not yours",
      message: "Only the author can change this paste.",
    });
  }
  return paste;
}

/** Throws the "form expired" page when the CSRF token doesn't match. */
export function formExpired(): never {
  error(403, {
    title: "That form expired",
    message: "Go back, reload the page and try again.",
  });
}
