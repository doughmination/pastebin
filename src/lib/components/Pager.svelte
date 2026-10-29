<!-- src/lib/components/Pager.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  // Links to the next and previous page of a listing, when there is one
  let {
    path,
    page,
    total,
    perPage,
  }: {
    path: string;
    page: number;
    total: number;
    perPage: number;
  } = $props();

  const pages = $derived(Math.max(1, Math.ceil(total / perPage)));

  function link(target: number): string {
    return target <= 1 ? path : `${path}?page=${target}`;
  }
</script>

{#if pages > 1}
  <nav class="pager">
    {#if page > 1}
      <a class="btn small" href={link(page - 1)}>Newer</a>
    {:else}
      <span class="btn small" aria-disabled="true">Newer</span>
    {/if}

    <span class="muted small">Page {page} of {pages}</span>

    {#if page < pages}
      <a class="btn small" href={link(page + 1)}>Older</a>
    {:else}
      <span class="btn small" aria-disabled="true">Older</span>
    {/if}
  </nav>
{/if}
