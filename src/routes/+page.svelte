<!-- src/routes/+page.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import { siteName } from "#lib";
  import Flash from "#lib/components/Flash.svelte";
  import Pager from "#lib/components/Pager.svelte";
  import PasteRows from "#lib/components/PasteRows.svelte";

  let { data } = $props();
</script>

<svelte:head>
  <title>Recent pastes · {siteName}</title>
  <meta name="description" content="Public pastes on {siteName}." />
</svelte:head>

<div class="page">
  <div class="page-head">
    <p class="eyebrow">Pastebin</p>
    <h1>Recent pastes</h1>
    <p class="muted">
      Anyone can read what's here. {data.user ? "Publish one from New paste." : "Sign in to publish one."}
    </p>
  </div>

  <Flash />

  <section class="panel">
    <PasteRows pastes={data.pastes} empty="Nothing published yet." />
    <Pager path="/" page={data.page} total={data.total} perPage={data.perPage} />
  </section>
</div>
