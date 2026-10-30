<!-- src/routes/[slug]/+page.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import { siteName } from "#lib";
  import { bytes, date, relative } from "#lib/format.ts";
  import Flash from "#lib/components/Flash.svelte";
  import CodeView from "#lib/components/CodeView.svelte";
  import DiscordEmbed from "#lib/components/DiscordEmbed.svelte";

  let { data } = $props();

  const paste = $derived(data.paste);
  const title = $derived(paste.title ?? paste.slug);

  let copyLabel = $state("Copy");
  let armed = $state(false);
  let code: CodeView;

  function flash(text: string) {
    copyLabel = text;
    setTimeout(() => (copyLabel = "Copy"), 1500);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code.text());
      flash("Copied");
    } catch {
      flash("Press Ctrl+C");
    }
  }

  // Deleting can't be undone, so ask once. The form still submits normally without scripting
  function confirmDelete(event: SubmitEvent) {
    if (armed) return;
    event.preventDefault();
    armed = true;
    setTimeout(() => (armed = false), 4000);
  }
</script>

<svelte:head>
  <title>{title} · {siteName}</title>
  <meta name="description" content={paste.title ?? `A paste by ${paste.authorUsername}.`} />
  {#if paste.unlisted}
    <meta name="robots" content="noindex" />
  {/if}
  {#if data.styled}
    <link rel="stylesheet" href="/{paste.slug}/style.css?v={paste.updatedAt}" />
  {/if}
</svelte:head>

<DiscordEmbed
  {title}
  description={`A paste by ${paste.authorUsername}.`}
/>

<div class="page">
  <Flash />

  <article class="paste">
    <div class="paste-head">
      <div class="grow">
        <p class="eyebrow">{paste.languageLabel}</p>
        <h1>{title}</h1>
        <p class="muted small meta">
          <span>by <strong>{paste.author}</strong></span>
          <span aria-hidden="true">·</span>
          <span title={date(paste.createdAt)}>{relative(paste.createdAt)}</span>
          {#if paste.updatedAt !== paste.createdAt}
            <span aria-hidden="true">·</span>
            <span title={date(paste.updatedAt)}>edited {relative(paste.updatedAt)}</span>
          {/if}
          <span aria-hidden="true">·</span>
          <span>{data.lines} {data.lines === 1 ? "line" : "lines"}, {bytes(paste.size)}</span>
          {#if paste.unlisted}
            <span class="badge">unlisted</span>
          {/if}
          {#if paste.expiresAt !== null}
            <span class="badge danger" title={date(paste.expiresAt)}>expires {relative(paste.expiresAt)}</span>
          {/if}
        </p>
      </div>

      <div class="buttons">
        <button type="button" class="small" title="Copy the paste to the clipboard" onclick={copy}>
          <iconsax-icon name="copy" type="bulk" size="16"></iconsax-icon>{copyLabel}
        </button>
        <a class="btn small" href="/raw/{paste.slug}">
          <iconsax-icon name="document-code" type="bulk" size="16"></iconsax-icon>Raw
        </a>
        <a class="btn small" href="/dl/{paste.slug}">
          <iconsax-icon name="document-download" type="bulk" size="16"></iconsax-icon>Download
        </a>
        {#if data.isOwner}
          <a class="btn small" href="/{paste.slug}/edit">
            <iconsax-icon name="edit-2" type="bulk" size="16"></iconsax-icon>Edit
          </a>
          <form method="post" action="?/delete" class="inline" onsubmit={confirmDelete}>
            <input type="hidden" name="_csrf" value={data.csrf} />
            <button type="submit" class="small danger">
              <iconsax-icon name="trash" type="bulk" size="16"></iconsax-icon>{armed ? "Really delete?" : "Delete"}
            </button>
          </form>
        {/if}
      </div>
    </div>

    {#if data.jpml && !data.jpml.ok}
      <p class="notice error" role="status">
        <strong>JPML:</strong>
        {data.jpml.message}
        {#if data.jpml.line !== undefined}
          at <a href="#L{data.jpml.line}">line {data.jpml.line}</a>{#if data.jpml.col !== undefined}, column {data.jpml.col}{/if}
        {/if}
      </p>
    {:else if data.jpml?.ok}
      <p class="notice ok" role="status"><strong>JPML:</strong> this document parses cleanly.</p>
    {/if}

    {#if !data.highlighted && paste.language !== "text"}
      <p class="notice">Too large to highlight — showing it as plain text.</p>
    {/if}

    <CodeView
      bind:this={code}
      html={data.html}
      numbered={data.numbered}
      light={data.light && data.highlighted}
    />
  </article>
</div>

<style>
  .paste {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .paste-head {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
  }

  .paste-head h1 {
    margin: 0;
    font-size: clamp(1.6rem, 4vw, 2.25rem);
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }

  .eyebrow {
    margin: 0 0 0.25rem;
  }

  @media (max-width: 40rem) {
    .paste-head {
      flex-direction: column;
    }
  }
</style>
