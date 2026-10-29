/* src/app.d.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { CurrentUser, SessionInfo } from "#lib/server/env.ts";

declare global {
  namespace App {
    interface Error {
      message: string;
      title?: string;
    }

    interface Locals {
      session: SessionInfo | null;
      user: CurrentUser | null;
    }
  }
}

// <iconsax-icon> is registered by `import "iconsax"` in src/hooks.client.ts
declare module "svelte/elements" {
  export interface SvelteHTMLElements {
    "iconsax-icon": HTMLAttributes<HTMLElement> & {
      name: string;
      type?: "bold" | "broken" | "bulk" | "linear" | "outline" | "twotone";
      size?: number | string;
      color?: string;
      pro?: boolean;
    };
  }
}

export {};
