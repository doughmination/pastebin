<!-- src/routes/+error.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import { page } from "$app/state";
  import { siteName } from "#lib";

  const notFound = $derived(page.status === 404 && !page.error?.title);
  const title = $derived(page.error?.title ?? (notFound ? "Not found" : "Something went wrong"));
  const message = $derived(notFound ? "There's nothing at that address." : page.error?.message);
</script>

<svelte:head>
  <title>{title} · {siteName}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="page narrow">
  <section class="panel">
    <p class="eyebrow">Error {page.status}</p>
    <h1>{title}</h1>
    <p class="muted">{message}</p>
    <p>
      <a class="btn" href="/">
        <iconsax-icon name="arrow-left-01" type="bulk" size="18"></iconsax-icon>Back to recent pastes
      </a>
    </p>
  </section>
</div>

<style>
  h1 {
    margin: 0;
  }

  p {
    margin: 0;
  }
</style>
