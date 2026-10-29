<!-- src/lib/components/Composer.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import { bytes } from "#lib/format.ts";
  import type { ComposerOptions, ComposerValues } from "#lib/server/compose.ts";

  let {
    values,
    options,
    csrf,
    error = null,
    editing,
  }: {
    values: ComposerValues;
    options: ComposerOptions;
    csrf: string;
    error?: string | null;
    // Present when editing: the slug is already spent and can't move
    editing?: string;
  } = $props();

  // Seeded once from the server's values; the form owns them after that
  // svelte-ignore state_referenced_locally
  let body = $state(values.body);
  // svelte-ignore state_referenced_locally
  let accentChoice = $state(values.accentChoice);

  let form: HTMLFormElement;

  const encoder = new TextEncoder();
  const size = $derived(encoder.encode(body).length);
  const over = $derived(size > options.maxBytes);

  // Tab inserts an indent instead of leaving the field. Shift+Tab and Escape still move focus
  function indent(event: KeyboardEvent) {
    if (event.key !== "Tab" || event.shiftKey) return;
    event.preventDefault();

    const textarea = event.currentTarget as HTMLTextAreaElement;
    const { selectionStart: start, selectionEnd: end } = textarea;
    body = body.slice(0, start) + "  " + body.slice(end);

    queueMicrotask(() => {
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = start + 2;
    });
  }

  // Ctrl/Cmd+Enter publishes, the way a commit message field would
  function submitShortcut(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") form.requestSubmit();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<form
  bind:this={form}
  method="post"
  action={editing ? `/${editing}/edit` : "/new"}
  class="stack"
  onkeydown={submitShortcut}
>
  <input type="hidden" name="_csrf" value={csrf} />

  {#if error}
    <p class="notice error" role="alert">{error}</p>
  {/if}

  <div class="grid2">
    <label class="field">
      <span>Title</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input type="text" name="title" value={values.title} maxlength="200" placeholder="Optional" autofocus />
    </label>

    <label class="field">
      <span>Slug</span>
      {#if editing}
        <input type="text" value={editing} readonly disabled />
      {:else}
        <input
          type="text"
          name="slug"
          value={values.slug}
          maxlength="64"
          placeholder="Optional — a short one is generated"
          pattern="[A-Za-z0-9_\-]{'{'}3,64{'}'}"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
        />
      {/if}
      <small class="muted">
        {editing ? "A paste keeps its address for good." : "Becomes the address: /your-slug"}
      </small>
    </label>
  </div>

  <label class="field">
    <span>Content</span>
    <textarea
      name="body"
      rows="22"
      required
      spellcheck="false"
      autocapitalize="off"
      placeholder="Paste away."
      bind:value={body}
      onkeydown={indent}
    ></textarea>
    <small class="muted">
      <span class:over>{bytes(size)}</span> of {bytes(options.maxBytes)}
    </small>
  </label>

  <div class="grid2">
    <label class="field">
      <span>Language</span>
      <select name="language" value={values.language}>
        {#each options.languages as language (language.id)}
          <option value={language.id}>{language.label}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Highlight theme</span>
      <select name="theme" value={values.theme}>
        {#each options.themes as theme (theme.id)}
          <option value={theme.id}>{theme.label}</option>
        {/each}
      </select>
    </label>
  </div>

  <fieldset class="field">
    <legend>Accent colour</legend>
    <p class="muted small hint">Re-tints this paste's page. Everything else keeps the site's own colours.</p>

    <div class="swatches">
      <label class="swatch" title="Site default">
        <input type="radio" name="accent_choice" value="none" bind:group={accentChoice} />
        <span class="swatch-dot swatch-none" aria-hidden="true"></span>
        <span>Default</span>
      </label>

      {#each options.accents as preset (preset.id)}
        <label class="swatch" title={preset.label}>
          <input type="radio" name="accent_choice" value={preset.id} bind:group={accentChoice} />
          <span class="swatch-dot swatch-{preset.id}" aria-hidden="true"></span>
          <span>{preset.label}</span>
        </label>
      {/each}

      <label class="swatch" title="Custom colour">
        <input type="radio" name="accent_choice" value="custom" bind:group={accentChoice} />
        <!-- Picking a custom colour is what you meant by choosing "Custom" -->
        <input
          type="color"
          name="accent_custom"
          value={values.accentCustom}
          aria-label="Custom accent colour"
          oninput={() => (accentChoice = "custom")}
        />
        <span>Custom</span>
      </label>
    </div>
  </fieldset>

  <div class="grid2">
    <label class="field">
      <span>Expires</span>
      <select name="expiry" value={values.expiry}>
        {#each options.expiries as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
    </label>

    <label class="check unlisted">
      <input type="checkbox" name="unlisted" value="1" checked={values.unlisted} />
      <span>
        Unlisted
        <small class="muted"> — reachable by link, kept off the front page.</small>
      </span>
    </label>
  </div>

  <div class="buttons">
    <button type="submit" class="primary">
      <iconsax-icon name={editing ? "tick-circle" : "send-2"} type="bulk" size="18"></iconsax-icon>
      {editing ? "Save changes" : "Publish paste"}
    </button>
    <a class="btn" href={editing ? `/${editing}` : "/"}>Cancel</a>
  </div>
</form>

<style>
  .over {
    color: var(--bad);
    font-weight: 600;
  }

  .hint {
    margin: 0;
  }

  .unlisted {
    align-self: end;
    padding-bottom: 0.5rem;
  }

  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }

  .swatch {
    display: inline-flex;
    gap: 0.45rem;
    align-items: center;
    padding: 0.3rem 0.75rem 0.3rem 0.45rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--raised);
    color: var(--muted);
    font-size: 0.85rem;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .swatch:hover {
    border-color: var(--accent-line);
    color: var(--text);
  }

  /* The radio itself is the accessible control; the dot is what you see */
  .swatch input[type="radio"] {
    position: absolute;
    width: 0;
    height: 0;
    opacity: 0;
  }

  .swatch:has(input[type="radio"]:checked) {
    border-color: var(--accent);
    color: var(--text);
    box-shadow: 0 0 0 4px var(--accent-dim);
  }

  .swatch:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .swatch-dot {
    flex-shrink: 0;
    width: 1.1rem;
    height: 1.1rem;
    border: 1px solid rgb(255 255 255 / 22%);
    border-radius: 50%;
    background: var(--swatch, transparent);
  }

  .swatch-none {
    background:
      linear-gradient(135deg, transparent 46%, var(--muted) 46%, var(--muted) 54%, transparent 54%),
      var(--bg);
  }

  /* Classes rather than inline styles: the CSP allows no style attributes */
  .swatch-crimson {
    --swatch: #9c1f34;
  }

  .swatch-rose {
    --swatch: #c2456b;
  }

  .swatch-violet {
    --swatch: #7b4bc4;
  }

  .swatch-indigo {
    --swatch: #4257b2;
  }

  .swatch-teal {
    --swatch: #1f8a7a;
  }

  .swatch-moss {
    --swatch: #4f8a3d;
  }

  .swatch-amber {
    --swatch: #b07d1e;
  }

  .swatch-ember {
    --swatch: #c2562a;
  }

  .swatch input[type="color"] {
    width: 1.6rem;
    height: 1.3rem;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: none;
  }
</style>
