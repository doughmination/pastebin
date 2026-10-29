<!-- src/lib/components/Flash.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import { page } from "$app/state";
  import { flashText } from "#lib/format.ts";

  const text = $derived(flashText(page.url.searchParams.get("m")));
</script>

{#if text}
  <p class="notice ok" role="status">{text}</p>
{/if}
