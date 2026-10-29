<!-- src/routes/mine/+page.svelte
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
  <title>Your pastes · {siteName}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
  <div class="page-head">
    <p class="eyebrow">Pastebin</p>
    <h1>Your pastes</h1>
    <p class="muted">Everything you've published, unlisted ones included.</p>
  </div>

  <Flash />

  <section class="panel">
    <PasteRows pastes={data.pastes} showAuthor={false} empty="You haven't published anything yet." />
    <Pager path="/mine" page={data.page} total={data.total} perPage={data.perPage} />
  </section>
</div>
