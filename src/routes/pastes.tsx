/* src/routes/pastes.tsx
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { Hono } from "hono";
import { config, now, type AppContext, type AppEnv } from "../env";
import {
  countPastes,
  countPastesByAuthor,
  countRecentByAuthor,
  createPaste,
  deletePaste,
  getPaste,
  listPastes,
  listPastesByAuthor,
  slugTaken,
  updatePaste,
  type PasteWithAuthor,
} from "../db";
import { csrfOk } from "../auth/session";
import { randomSlug } from "../lib/crypto";
import { form } from "../lib/http";
import { ACCENT_PRESETS, accentVars, normaliseHex } from "../lib/colour";
import {
  cleanText,
  expiresAtFrom,
  expiryIdFrom,
  expiryProblem,
  normaliseBody,
  normaliseSlug,
  slugProblem,
} from "../lib/validate";
import {
  DEFAULT_THEME,
  extensionFor,
  isLanguage,
  isTheme,
  render as highlight,
  shouldNumber,
  themeIsLight,
} from "../highlight";
import { check as checkJpml } from "../jpml";
import { message, render } from "../views/layout";
import { Composer, PasteRows, PasteView, type ComposerValues } from "../views/pastes";
import { Flash, Pager } from "../views/ui";

export const pastes = new Hono<AppEnv>();

const PER_PAGE = 25;

/** Pastes one account may publish per hour, so a stuck script can't fill the disk. */
const HOURLY_LIMIT = 60;

function pageNumber(c: AppContext): number {
  const raw = Number(c.req.query("page") ?? "1");
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
}

// --- listings -------------------------------------------------------------------------

pastes.get("/", (c) => {
  const page = pageNumber(c);
  const total = countPastes();
  const rows = listPastes(PER_PAGE, (page - 1) * PER_PAGE);

  return render(
    c,
    { title: "Recent pastes", description: `Public pastes on ${config.siteName}.` },
    <>
      <Flash code={c.req.query("m")} />
      <div class="card">
        <h1>Recent pastes</h1>
        <p class="muted">
          Anyone can read what's here. {c.get("user") ? "Publish one from the New paste button." : "Sign in to publish one."}
        </p>
        <PasteRows pastes={rows} empty="Nothing published yet." />
        <Pager path="/" page={page} total={total} perPage={PER_PAGE} />
      </div>
    </>,
  );
});

pastes.get("/mine", async (c) => {
  const user = c.get("user");
  if (!user) return c.redirect("/auth/login?return_to=%2Fmine");

  const page = pageNumber(c);
  const total = countPastesByAuthor(user.id);
  const rows = listPastesByAuthor(user.id, PER_PAGE, (page - 1) * PER_PAGE);

  return render(
    c,
    { title: "Your pastes", noindex: true },
    <>
      <Flash code={c.req.query("m")} />
      <div class="card">
        <h1>Your pastes</h1>
        <p class="muted">Everything you've published, unlisted ones included.</p>
        <PasteRows pastes={rows} showAuthor={false} empty="You haven't published anything yet." />
        <Pager path="/mine" page={page} total={total} perPage={PER_PAGE} />
      </div>
    </>,
  );
});

// --- composing -------------------------------------------------------------------------

function blankValues(): ComposerValues {
  return {
    title: "",
    slug: "",
    body: "",
    language: "text",
    theme: DEFAULT_THEME,
    accentChoice: "none",
    accentCustom: "#9c1f34",
    expiry: "never",
    unlisted: false,
  };
}

/** Works out which accent control an existing paste's stored colour came from. */
function valuesFrom(paste: PasteWithAuthor): ComposerValues {
  const preset = paste.accent ? ACCENT_PRESETS.find((p) => p.hex === paste.accent) : undefined;
  return {
    title: paste.title ?? "",
    slug: paste.slug,
    body: paste.body,
    language: paste.language,
    theme: paste.theme,
    accentChoice: paste.accent === null ? "none" : (preset?.id ?? "custom"),
    accentCustom: paste.accent ?? "#9c1f34",
    expiry: expiryIdFrom(paste.expires_at),
    unlisted: paste.unlisted === 1,
  };
}

interface Parsed {
  values: ComposerValues;
  error: string | null;
  /** Filled in only when `error` is null. */
  accent: string | null;
  expiresAt: number | null;
}

/**
 * Reads the composer form back into validated fields. Everything the user
 * typed survives on the returned `values` so a rejected submission can be
 * re-rendered without losing the paste.
 */
function parseComposer(body: Record<string, string>): Parsed {
  const accentChoice = body.accent_choice ?? "none";
  const accentCustom = normaliseHex(body.accent_custom) ?? "#9c1f34";

  const values: ComposerValues = {
    title: (body.title ?? "").trim().slice(0, 200),
    slug: normaliseSlug(body.slug),
    body: normaliseBody(body.body),
    language: body.language ?? "text",
    theme: body.theme ?? DEFAULT_THEME,
    accentChoice,
    accentCustom,
    expiry: body.expiry ?? "never",
    unlisted: body.unlisted === "1",
  };

  const fail = (error: string): Parsed => ({ values, error, accent: null, expiresAt: null });

  if (!values.body) return fail("A paste needs some content.");
  const size = Buffer.byteLength(values.body, "utf8");
  if (size > config.maxBodyBytes) {
    return fail(`That paste is ${Math.round(size / 1024)} KB; the limit is ${Math.round(config.maxBodyBytes / 1024)} KB.`);
  }

  if (!isLanguage(values.language)) return fail("That isn't one of the languages on offer.");
  if (!isTheme(values.theme)) return fail("That isn't one of the highlight themes on offer.");

  const expiryFault = expiryProblem(values.expiry);
  if (expiryFault) return fail(expiryFault);

  let accent: string | null = null;
  if (accentChoice === "custom") {
    const hex = normaliseHex(body.accent_custom);
    if (!hex) return fail("That accent colour isn't a valid hex colour.");
    accent = hex;
  } else if (accentChoice !== "none") {
    const preset = ACCENT_PRESETS.find((p) => p.id === accentChoice);
    if (!preset) return fail("That isn't one of the accent colours on offer.");
    accent = preset.hex;
  }

  return { values, error: null, accent, expiresAt: expiresAtFrom(values.expiry) };
}

pastes.get("/new", async (c) => {
  const user = c.get("user");
  if (!user) return c.redirect("/auth/login?return_to=%2Fnew&m=sign-in-needed");

  return render(
    c,
    { title: "New paste", page: "composer", noindex: true },
    <div class="card">
      <h1>New paste</h1>
      <Composer values={blankValues()} csrf={c.get("session")!.csrf} maxBytes={config.maxBodyBytes} />
    </div>,
  );
});

pastes.post("/new", async (c) => {
  const user = c.get("user");
  if (!user) return message(c, "Sign in first", "Only signed-in accounts can publish pastes.", 401);

  const body = await form(c);
  if (!csrfOk(c, body._csrf)) return c.text("That form expired. Go back and try again.", 403);

  if (countRecentByAuthor(user.id, now() - 3600) >= HOURLY_LIMIT) {
    return message(c, "Slow down", `That's ${HOURLY_LIMIT} pastes in an hour. Try again later.`, 429);
  }

  const parsed = parseComposer(body);
  const reject = (error: string) =>
    render(
      c,
      { title: "New paste", page: "composer", status: 400, noindex: true },
      <div class="card">
        <h1>New paste</h1>
        <Composer values={parsed.values} csrf={c.get("session")!.csrf} error={error} maxBytes={config.maxBodyBytes} />
      </div>,
    );

  if (parsed.error) return reject(parsed.error);

  let slug: string;
  if (parsed.values.slug) {
    slug = parsed.values.slug;
    const fault = slugProblem(slug);
    if (fault) return reject(fault);
    if (slugTaken(slug)) return reject(`The slug "${slug}" is already taken.`);
  } else {
    const generated = freeSlug();
    if (!generated) return message(c, "Couldn't allocate an address", "Please try publishing again.", 503);
    slug = generated;
  }

  createPaste({
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

  return c.redirect(`/${slug}?m=paste-created`);
});

/** Generated slugs collide vanishingly rarely; a few tries removes the doubt. */
function freeSlug(): string | null {
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = randomSlug(attempt < 5 ? 8 : 12);
    if (!slugTaken(slug)) return slug;
  }
  return null;
}

// --- reading -----------------------------------------------------------------------------

pastes.get("/raw/:slug", (c) => {
  const paste = getPaste(c.req.param("slug"));
  if (!paste) return c.text("Not found", 404);

  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  // A paste is arbitrary text from another account, so it is never allowed to
  // execute as a document on this origin.
  c.header("Content-Disposition", "inline");
  c.header("Content-Security-Policy", "default-src 'none'; sandbox");
  return c.body(paste.body);
});

pastes.get("/dl/:slug", (c) => {
  const paste = getPaste(c.req.param("slug"));
  if (!paste) return c.text("Not found", 404);

  const name = `${paste.slug}.${extensionFor(paste.language)}`;
  c.header("Content-Type", "application/octet-stream");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Content-Disposition", `attachment; filename="${name.replace(/[^\w.-]/g, "_")}"`);
  return c.body(paste.body);
});

pastes.get("/:slug", async (c) => {
  const paste = getPaste(c.req.param("slug"));
  if (!paste) {
    return message(c, "No such paste", "It may have expired, been deleted, or never existed.", 404);
  }

  const user = c.get("user");
  const rendered = await highlight(paste.body, paste.language, paste.theme);
  const jpml = paste.language === "jpml" ? checkJpml(paste.body) : null;

  return render(
    c,
    {
      title: paste.title ?? paste.slug,
      page: "paste",
      full: true,
      css: rendered.css,
      accentVars: paste.accent ? accentVars(paste.accent) : undefined,
      noindex: paste.unlisted === 1,
      description: paste.title ?? `A paste by ${paste.author_username}.`,
    },
    <>
      <Flash code={c.req.query("m")} />
      <PasteView
        paste={paste}
        html={rendered.html}
        lines={rendered.lines}
        numbered={shouldNumber(rendered.lines)}
        highlighted={rendered.highlighted}
        light={themeIsLight(paste.theme)}
        jpml={jpml}
        isOwner={user?.id === paste.author_id}
        csrf={c.get("session")?.csrf ?? ""}
        size={Buffer.byteLength(paste.body, "utf8")}
      />
    </>,
  );
});

// --- editing -------------------------------------------------------------------------------

/** Resolves a paste the signed-in account is allowed to change. */
async function ownPaste(c: AppContext): Promise<PasteWithAuthor | Response> {
  const user = c.get("user");
  const paste = getPaste(c.req.param("slug") ?? "");
  if (!paste) return message(c, "No such paste", "It may have expired, been deleted, or never existed.", 404);
  if (!user) return message(c, "Sign in first", "Only the author can change a paste.", 401);
  if (paste.author_id !== user.id) return message(c, "Not yours", "Only the author can change this paste.", 403);
  return paste;
}

pastes.get("/:slug/edit", async (c) => {
  const found = await ownPaste(c);
  if (found instanceof Response) return found;

  return render(
    c,
    { title: `Edit ${found.slug}`, page: "composer", noindex: true },
    <div class="card">
      <h1>Edit paste</h1>
      <Composer
        values={valuesFrom(found)}
        csrf={c.get("session")!.csrf}
        editing={found.slug}
        maxBytes={config.maxBodyBytes}
      />
    </div>,
  );
});

pastes.post("/:slug/edit", async (c) => {
  const found = await ownPaste(c);
  if (found instanceof Response) return found;

  const body = await form(c);
  if (!csrfOk(c, body._csrf)) return c.text("That form expired. Go back and try again.", 403);

  const parsed = parseComposer(body);
  if (parsed.error) {
    // The slug isn't editable, so keep showing the real one.
    parsed.values.slug = found.slug;
    return render(
      c,
      { title: `Edit ${found.slug}`, page: "composer", status: 400, noindex: true },
      <div class="card">
        <h1>Edit paste</h1>
        <Composer
          values={parsed.values}
          csrf={c.get("session")!.csrf}
          editing={found.slug}
          error={parsed.error}
          maxBytes={config.maxBodyBytes}
        />
      </div>,
    );
  }

  updatePaste(found.slug, {
    title: cleanText(parsed.values.title, 200),
    body: parsed.values.body,
    language: parsed.values.language,
    theme: parsed.values.theme,
    accent: parsed.accent,
    unlisted: parsed.values.unlisted,
    expiresAt: parsed.expiresAt,
  });

  return c.redirect(`/${found.slug}?m=paste-updated`);
});

pastes.post("/:slug/delete", async (c) => {
  const found = await ownPaste(c);
  if (found instanceof Response) return found;

  const body = await form(c);
  if (!csrfOk(c, body._csrf)) return c.text("That form expired. Go back and try again.", 403);

  deletePaste(found.slug);
  return c.redirect("/mine?m=paste-deleted");
});
