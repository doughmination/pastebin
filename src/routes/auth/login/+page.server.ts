/* src/routes/auth/login/+page.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { TTL, config, now } from "#lib/server/env.ts";
import { createLogin } from "#lib/server/db.ts";
import { authorizeUrl } from "#lib/server/oidc.ts";
import { pkce, randomToken, sha256Hex } from "#lib/server/crypto.ts";
import { safeReturn } from "#lib/server/validate.ts";

/**
 * Starts the OpenID Connect code flow against the Doughmination auth server.
 * The state, PKCE verifier and nonce live in this app's database rather than
 * in a cookie, so a reply that doesn't match a sign-in we started is rejected
 * without trusting anything the browser carried back.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
  const returnTo = safeReturn(url.searchParams.get("return_to"));
  if (locals.user) redirect(303, returnTo);

  const state = randomToken(24);
  const nonce = randomToken(24);
  const { verifier, challenge } = await pkce();

  await createLogin(await sha256Hex(state), verifier, nonce, returnTo, now() + TTL.pendingLogin);

  let target: string;
  try {
    target = await authorizeUrl(state, challenge, nonce);
  } catch (err) {
    console.error("[auth] could not reach the auth server:", err);
    error(502, {
      title: "Sign-in is unavailable",
      message: "The authentication server didn't answer. Pastes are still readable; try signing in again in a moment.",
    });
  }
  // Off-site, but only ever to the auth server
  redirect(303, target, {
    external: [new URL(config.issuer).origin],
  });
};
