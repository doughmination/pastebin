/* src/views/pastes.tsx
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { raw } from "hono/html";
import type { PasteWithAuthor } from "../db";
import { LANGUAGES, THEMES, languageLabel } from "../highlight";
import { ACCENT_PRESETS } from "../lib/colour";
import { EXPIRY_OPTIONS } from "../lib/validate";
import type { JpmlCheck } from "../jpml";
import { Csrf, ErrorNote, bytes, date, relative } from "./ui";

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

export interface ComposerProps {
  values: ComposerValues;
  csrf: string;
  error?: string | null;
  /** Present when editing: the slug is already spent and can't move. */
  editing?: string;
  maxBytes: number;
}

export function Composer(props: ComposerProps) {
  const { values, editing } = props;
  const action = editing ? `/${editing}/edit` : "/new";

  return (
    <form method="post" action={action} class="composer stack" data-max-bytes={String(props.maxBytes)}>
      <Csrf token={props.csrf} />
      <ErrorNote error={props.error} />

      <div class="grid2">
        <label class="field">
          <span>Title</span>
          <input type="text" name="title" value={values.title} maxlength={200} placeholder="Optional" autofocus />
        </label>

        <label class="field">
          <span>Slug</span>
          {editing ? (
            <input type="text" value={editing} readonly disabled />
          ) : (
            <input
              type="text"
              name="slug"
              value={values.slug}
              maxlength={64}
              placeholder="Optional — a short one is generated"
              pattern="[A-Za-z0-9_-]{3,64}"
              autocapitalize="off"
              autocorrect="off"
              spellcheck={false}
            />
          )}
          <small class="muted">
            {editing ? "A paste keeps its address for good." : "Becomes the address: /your-slug"}
          </small>
        </label>
      </div>

      <label class="field">
        <span>Content</span>
        <textarea
          name="body"
          rows={22}
          required
          spellcheck={false}
          autocapitalize="off"
          autocorrect="off"
          placeholder="Paste away."
        >
          {values.body}
        </textarea>
        <small class="muted">
          <span data-counter>0 B</span> of {bytes(props.maxBytes)}
        </small>
      </label>

      <div class="grid2">
        <label class="field">
          <span>Language</span>
          <select name="language">
            {LANGUAGES.map((lang) => (
              <option value={lang.id} selected={lang.id === values.language}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        <label class="field">
          <span>Highlight theme</span>
          <select name="theme">
            {THEMES.map((theme) => (
              <option value={theme.id} selected={theme.id === values.theme}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset class="field">
        <legend>Accent colour</legend>
        <p class="muted small">Re-tints this paste's page. Everything else keeps the site's own colours.</p>
        <div class="swatches">
          <label class={`swatch swatch-none${values.accentChoice === "none" ? " on" : ""}`} title="Site default">
            <input type="radio" name="accent_choice" value="none" checked={values.accentChoice === "none"} />
            <span class="swatch-dot" aria-hidden="true" />
            <span class="swatch-label">Default</span>
          </label>

          {ACCENT_PRESETS.map((preset) => (
            <label
              class={`swatch swatch-${preset.id}${values.accentChoice === preset.id ? " on" : ""}`}
              title={preset.label}
            >
              <input type="radio" name="accent_choice" value={preset.id} checked={values.accentChoice === preset.id} />
              <span class="swatch-dot" aria-hidden="true" />
              <span class="swatch-label">{preset.label}</span>
            </label>
          ))}

          <label class={`swatch swatch-custom${values.accentChoice === "custom" ? " on" : ""}`} title="Custom colour">
            <input type="radio" name="accent_choice" value="custom" checked={values.accentChoice === "custom"} />
            <input
              type="color"
              name="accent_custom"
              value={values.accentCustom || "#9c1f34"}
              aria-label="Custom accent colour"
            />
            <span class="swatch-label">Custom</span>
          </label>
        </div>
      </fieldset>

      <div class="grid2">
        <label class="field">
          <span>Expires</span>
          <select name="expiry">
            {EXPIRY_OPTIONS.map((option) => (
              <option value={option.id} selected={option.id === values.expiry}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label class="check field-check">
          <input type="checkbox" name="unlisted" value="1" checked={values.unlisted} />
          <span>
            Unlisted
            <small class="muted"> — reachable by link, kept off the front page.</small>
          </span>
        </label>
      </div>

      <div class="buttons">
        <button type="submit" class="primary">
          {editing ? "Save changes" : "Publish paste"}
        </button>
        <a class="btn" href={editing ? `/${editing}` : "/"}>
          Cancel
        </a>
      </div>
    </form>
  );
}

export interface PasteViewProps {
  paste: PasteWithAuthor;
  html: string;
  lines: number;
  numbered: boolean;
  highlighted: boolean;
  /** The chosen theme is built for a light page, so the frame follows it. */
  light: boolean;
  jpml: JpmlCheck | null;
  isOwner: boolean;
  csrf: string;
  size: number;
  flash?: string | undefined;
}

export function PasteView(props: PasteViewProps) {
  const { paste } = props;
  const title = paste.title ?? paste.slug;
  const author = paste.author_name ?? paste.author_username;

  return (
    <article class="paste">
      <header class="paste-head">
        <div class="grow">
          <h1>{title}</h1>
          <p class="muted small paste-meta">
            <span>
              by <strong>{author}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span title={date(paste.created_at)}>{relative(paste.created_at)}</span>
            {paste.updated_at !== paste.created_at && (
              <>
                <span aria-hidden="true">·</span>
                <span title={date(paste.updated_at)}>edited {relative(paste.updated_at)}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{languageLabel(paste.language)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {props.lines} {props.lines === 1 ? "line" : "lines"}, {bytes(props.size)}
            </span>
            {paste.unlisted === 1 && <span class="badge">unlisted</span>}
            {paste.expires_at !== null && (
              <span class="badge danger" title={date(paste.expires_at)}>
                expires {relative(paste.expires_at)}
              </span>
            )}
          </p>
        </div>

        <div class="buttons paste-actions">
          <button type="button" class="small" data-copy-body title="Copy the paste to the clipboard">
            Copy
          </button>
          <a class="btn small" href={`/raw/${paste.slug}`}>
            Raw
          </a>
          <a class="btn small" href={`/dl/${paste.slug}`}>
            Download
          </a>
          {props.isOwner && (
            <>
              <a class="btn small" href={`/${paste.slug}/edit`}>
                Edit
              </a>
              <form method="post" action={`/${paste.slug}/delete`} class="inline" data-confirm-delete>
                <Csrf token={props.csrf} />
                <button type="submit" class="small danger">
                  Delete
                </button>
              </form>
            </>
          )}
        </div>
      </header>

      {props.jpml && !props.jpml.ok && (
        <p class="notice error jpml-note" role="status">
          <strong>JPML:</strong> {props.jpml.message}{" "}
          {props.jpml.line !== undefined && (
            <>
              at <a href={`#L${props.jpml.line}`}>line {props.jpml.line}</a>
              {props.jpml.col !== undefined && `, column ${props.jpml.col}`}
            </>
          )}
        </p>
      )}
      {props.jpml?.ok && (
        <p class="notice ok jpml-note" role="status">
          <strong>JPML:</strong> this document parses cleanly.
        </p>
      )}

      {!props.highlighted && paste.language !== "text" && (
        <p class="notice jpml-note">
          Too large to highlight — showing it as plain text.
        </p>
      )}

      <div
        class={`code${props.numbered ? " numbered" : ""}${props.light && props.highlighted ? " light" : ""}`}
        data-lines={String(props.lines)}
      >
        {raw(props.html)}
      </div>
    </article>
  );
}

export function PasteRows(props: { pastes: PasteWithAuthor[]; showAuthor?: boolean; empty: string }) {
  if (props.pastes.length === 0) return <p class="muted">{props.empty}</p>;

  return (
    <ul class="rows paste-rows">
      {props.pastes.map((paste) => (
        <li>
          <div class="grow">
            <a class="paste-link" href={`/${paste.slug}`}>
              {paste.title ?? paste.slug}
            </a>
            <p class="muted small paste-meta">
              <code>/{paste.slug}</code>
              <span aria-hidden="true">·</span>
              <span>{languageLabel(paste.language)}</span>
              {props.showAuthor !== false && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{paste.author_name ?? paste.author_username}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span title={date(paste.created_at)}>{relative(paste.created_at)}</span>
              {paste.unlisted === 1 && <span class="badge">unlisted</span>}
              {paste.expires_at !== null && <span class="badge danger">expiring</span>}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
