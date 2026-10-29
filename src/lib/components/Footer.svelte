<!-- src/lib/components/Footer.svelte
     Copyright (c) 2026 Clove Nytrix Doughmination Twilight
     Licensed under the DASL-1.2 Licence.
     See LICENCE.md in the project root for full licence information.
-->

<script lang="ts">
  import "#lib/styles/footer.css";
  import { mainSite, siteName } from "#lib";
</script>

<footer>
  <p class="footer-line">
    <span class="footer-brand">
      <img src="/favicon.svg" alt="" width="20" height="20" />
      {siteName}
    </span>

    <span>
      part of <a href={mainSite}>doughmination.gay</a>
      <iconsax-icon name="heart" type="bulk" size="16" class="beat"></iconsax-icon>
    </span>

    <span>Clove Twilight &copy; 2026</span>
  </p>
</footer>
