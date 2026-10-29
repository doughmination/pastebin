<!-- src/lib/components/PasteRows.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import { date, relative } from "#lib/format.ts";

  type Row = {
    slug: string;
    title: string | null;
    languageLabel: string;
    author: string;
    created_at: number;
    unlisted: number;
    expires_at: number | null;
  };

  let {
    pastes,
    showAuthor = true,
    empty,
  }: {
    pastes: Row[];
    showAuthor?: boolean;
    empty: string;
  } = $props();
</script>

{#if pastes.length === 0}
  <p class="muted">{empty}</p>
{:else}
  <ul class="rows">
    {#each pastes as paste (paste.slug)}
      <li>
        <div class="grow">
          <a class="paste-link" href="/{paste.slug}">{paste.title ?? paste.slug}</a>
          <p class="muted small meta">
            <code>/{paste.slug}</code>
            <span aria-hidden="true">·</span>
            <span>{paste.languageLabel}</span>
            {#if showAuthor}
              <span aria-hidden="true">·</span>
              <span>{paste.author}</span>
            {/if}
            <span aria-hidden="true">·</span>
            <span title={date(paste.created_at)}>{relative(paste.created_at)}</span>
            {#if paste.unlisted === 1}
              <span class="badge">unlisted</span>
            {/if}
            {#if paste.expires_at !== null}
              <span class="badge danger">expiring</span>
            {/if}
          </p>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .paste-link {
    font-size: 1.05rem;
    font-weight: 600;
    text-decoration: none;
  }

  .paste-link:hover {
    color: var(--accent);
  }
</style>
