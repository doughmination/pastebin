/* vite.config.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sveltekit({
      compilerOptions: {
        // Runes everywhere except libraries
        runes: ({ filename }) => (filename.split(/[/\\]/).includes("node_modules") ? undefined : true),
      },
      adapter: adapter(),
      // Pastes are other people's text, so nothing inline runs or styles without a nonce
      csp: {
        mode: "auto",
        directives: {
          "default-src": ["none"],
          "script-src": ["self"],
          "style-src": ["self"],
          "img-src": ["self", "https:", "data:"],
          "font-src": ["self", "https://raw.doughmination.gay"],
          "connect-src": ["self"],
          "form-action": ["self"],
          "base-uri": ["none"],
          "frame-ancestors": ["none"],
        },
      },
    }),
  ],
  // iconsax fetches its icon data relative to its own file, which pre-bundling breaks
  optimizeDeps: {
    exclude: ["iconsax"],
  },
  ssr: {
    external: ["bun:sqlite"],
  },
  build: {
    rollupOptions: {
      external: ["bun:sqlite"],
    },
  },
});
