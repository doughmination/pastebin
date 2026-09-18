/* src/views/layout.tsx
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { config, type AppContext } from "../env";

export interface PageOptions {
  title: string;
  /** Picks the behaviour in /static/app.js. */
  page?: string;
  /** Centered card layout for short pages. */
  narrow?: boolean;
  /** Full-bleed layout for reading code. */
  full?: boolean;
  status?: ContentfulStatusCode;
  /** Extra CSS for this response only, emitted under the page's CSP nonce. */
  css?: string;
  /** Accent overrides from a paste, applied to <body>. */
  accentVars?: string;
  description?: string;
  /** Set on paste pages so a stale copy is never served after an edit. */
  noindex?: boolean;
}

export async function render(c: AppContext, opts: PageOptions, body: Child): Promise<Response> {
  const user = c.get("user");
  const session = c.get("session");
  const nonce = c.get("nonce");

  const layout = opts.full ? "full" : opts.narrow ? "narrow" : "wide";

  // Shiki's token colours and a paste's accent both arrive as CSS text. They
  // go in one nonced <style> rather than on inline style attributes, which a
  // nonce cannot cover — see highlight.ts.
  const sheet = [opts.accentVars ? `body{${opts.accentVars}}` : "", opts.css ?? ""].filter(Boolean).join("\n");

  const html = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        {opts.noindex && <meta name="robots" content="noindex" />}
        <title>{`${opts.title} · ${config.siteName}`}</title>
        {opts.description && <meta name="description" content={opts.description} />}
        <link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
        <link rel="stylesheet" href="/static/style.css" />
        <script src="/static/app.js" defer></script>
        {sheet && raw(`<style nonce="${nonce}">${sheet}</style>`)}
      </head>
      <body data-page={opts.page ?? ""} data-csrf={session?.csrf ?? ""}>
        <header class="topbar">
          <a class="brand" href="/">
            {config.siteName}
          </a>
          <nav>
            <a class="btn small" href="/">
              Recent
            </a>
            {user ? (
              <>
                <a class="btn small" href="/mine">
                  Mine
                </a>
                <a class="btn small primary" href="/new">
                  New paste
                </a>
                <form method="post" action="/auth/logout" class="inline">
                  <input type="hidden" name="_csrf" value={session?.csrf ?? ""} />
                  <button type="submit" class="small" title={`Signed in as ${user.username}`}>
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <a class="btn small primary" href={`/auth/login?return_to=${encodeURIComponent(currentPath(c))}`}>
                Sign in
              </a>
            )}
          </nav>
        </header>
        <main class={layout}>{body}</main>
      </body>
    </html>
  );

  return c.html(`<!doctype html>${await html}`, opts.status ?? 200);
}

function currentPath(c: AppContext): string {
  const url = new URL(c.req.url);
  return url.pathname + url.search;
}

/** Small standalone page for 404s and refusals. */
export function message(c: AppContext, title: string, text: string, status: ContentfulStatusCode = 400) {
  return render(
    c,
    { title, narrow: true, status },
    <div class="card">
      <h1>{title}</h1>
      <p class="muted">{text}</p>
      <p>
        <a class="btn" href="/">
          Back to recent pastes
        </a>
      </p>
    </div>,
  );
}
