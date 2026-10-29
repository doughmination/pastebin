<!-- src/routes/[slug]/edit/+page.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import { siteName } from "#lib";
  import Composer from "#lib/components/Composer.svelte";

  let { data, form } = $props();
</script>

<svelte:head>
  <title>Edit {data.slug} · {siteName}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
  <div class="page-head">
    <p class="eyebrow">Pastebin</p>
    <h1>Edit paste</h1>
  </div>

  <section class="panel">
    <Composer
      values={form?.values ?? data.values}
      options={data.options}
      csrf={data.csrf}
      error={form?.error}
      editing={data.slug}
    />
  </section>
</div>
