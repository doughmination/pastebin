<!-- src/lib/components/Header.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import "#lib/styles/header.css";
  import { page } from "$app/state";
  import { siteName } from "#lib";
  let {
    user,
    csrf,
  }: {
    user: { username: string } | null;
    csrf: string;
  } = $props();

  const returnTo = $derived(encodeURIComponent(page.url.pathname + page.url.search));
</script>

<!-- Fixed-height page backdrop, so every page gets the same amount of background -->
<div class="backdrop" aria-hidden="true"></div>

<header>
  <a class="brand" href="/">
    <img src="/favicon.svg" alt="" width="32" height="32" />
    <span>{siteName}</span>
  </a>

  <nav>
    <a href="/">
      <iconsax-icon name="document-text" type="bulk" size="24" class="nav-icon"></iconsax-icon>Recent
    </a>

    {#if user}
      <a href="/mine">
        <iconsax-icon name="folder-2" type="bulk" size="24" class="nav-icon"></iconsax-icon>Mine
      </a>
      <a href="/new">
        <iconsax-icon name="add-circle" type="bulk" size="24" class="nav-icon"></iconsax-icon>New paste
      </a>
      <form method="post" action="/auth/logout" class="inline">
        <input type="hidden" name="_csrf" value={csrf} />
        <button type="submit" class="nav-button" title="Signed in as {user.username}">
          <iconsax-icon name="logout-01" type="bulk" size="24" class="nav-icon"></iconsax-icon>Sign out
        </button>
      </form>
    {:else}
      <a href="/auth/login?return_to={returnTo}">
        <iconsax-icon name="login-01" type="bulk" size="24" class="nav-icon"></iconsax-icon>Sign in
      </a>
    {/if}
  </nav>
</header>

<style>
  /* A form button that reads as one of the header's links */
  .nav-button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--muted);
    font-size: inherit;
  }

  .nav-button:hover:not(:disabled) {
    color: var(--text);
  }
</style>
