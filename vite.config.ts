/* vite.config.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import adapter from "@sveltejs/adapter-cloudflare";
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
          // Two exact style attributes only: iconsax's color:currentColor on every icon,
          // and SvelteKit's visually-hidden route announcer
          "style-src": [
            "self",
            "unsafe-hashes",
            "sha256-muhGX4Mn7np2XQi6DH6Iz+0SHdws6/BLgVigE46O3Xc=",
            "sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo=",
          ],
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
  // Left for wrangler to bundle as a compiled WASM module; see highlight.ts
  build: {
    rollupOptions: {
      external: ["shiki/onig.wasm"],
    },
  },
});
