/* src/views/ui.tsx
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { Child } from "hono/jsx";

// Flash messages travel as a fixed code in `?m=`, never as free text, so a
// crafted link can't put words in this site's mouth.
const MESSAGES: Record<string, string> = {
  "signed-in": "You're signed in.",
  "signed-out": "You're signed out.",
  "paste-created": "Paste published.",
  "paste-updated": "Paste updated.",
  "paste-deleted": "Paste deleted.",
  "sign-in-needed": "Sign in to publish a paste.",
};

export function Flash(props: { code?: string | undefined }) {
  const text = props.code ? MESSAGES[props.code] : undefined;
  return text ? <p class="notice ok">{text}</p> : null;
}

export function ErrorNote(props: { error?: string | null | undefined }) {
  return props.error ? (
    <p class="notice error" role="alert">
      {props.error}
    </p>
  ) : null;
}

export function Csrf(props: { token: string }) {
  return <input type="hidden" name="_csrf" value={props.token} />;
}

export function Section(props: { title: string; children?: Child; id?: string; description?: string }) {
  return (
    <section class="panel" id={props.id}>
      <h2>{props.title}</h2>
      {props.description && <p class="muted">{props.description}</p>}
      {props.children}
    </section>
  );
}

export function date(ts: number | null | undefined): string {
  if (!ts) return "never";
  return new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function relative(ts: number | null | undefined): string {
  if (!ts) return "never";
  const diff = Math.floor(Date.now() / 1000) - ts;
  const future = diff < 0;
  const abs = Math.abs(diff);
  const unit =
    abs < 60 ? [abs, "second"] :
    abs < 3600 ? [Math.floor(abs / 60), "minute"] :
    abs < 86400 ? [Math.floor(abs / 3600), "hour"] :
    [Math.floor(abs / 86400), "day"];
  const [n, word] = unit as [number, string];
  const text = `${n} ${word}${n === 1 ? "" : "s"}`;
  return future ? `in ${text}` : `${text} ago`;
}

export function bytes(count: number): string {
  if (count < 1024) return `${count} B`;
  if (count < 1024 * 1024) return `${(count / 1024).toFixed(count < 10240 ? 1 : 0)} KB`;
  return `${(count / (1024 * 1024)).toFixed(1)} MB`;
}

/** Links to the next and previous page of a listing, when there is one. */
export function Pager(props: { path: string; page: number; total: number; perPage: number }) {
  const pages = Math.max(1, Math.ceil(props.total / props.perPage));
  if (pages <= 1) return null;
  const link = (page: number) => (page <= 1 ? props.path : `${props.path}?page=${page}`);
  return (
    <nav class="pager">
      {props.page > 1 ? (
        <a class="btn small" href={link(props.page - 1)}>
          Newer
        </a>
      ) : (
        <span class="btn small" aria-disabled="true">
          Newer
        </span>
      )}
      <span class="muted small">
        Page {props.page} of {pages}
      </span>
      {props.page < pages ? (
        <a class="btn small" href={link(props.page + 1)}>
          Older
        </a>
      ) : (
        <span class="btn small" aria-disabled="true">
          Older
        </span>
      )}
    </nav>
  );
}
