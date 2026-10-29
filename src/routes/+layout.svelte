<!-- src/routes/+layout.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import "#lib/styles/fonts.css";
  import "#lib/styles/theme.css";
  import "#lib/styles/global.css";
  import "#lib/styles/ui.css";
  import Header from "#lib/components/Header.svelte";
  import Footer from "#lib/components/Footer.svelte";

  let { data, children } = $props();
</script>

<Header user={data.user} csrf={data.csrf} />
<main>
  {@render children()}
</main>
<Footer />
