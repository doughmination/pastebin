/* src/routes/auth/callback/+page.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { takeLogin, upsertUser } from "#lib/server/db.ts";
import { exchangeCode, type Identity } from "#lib/server/oidc.ts";
import { startSession } from "#lib/server/session.ts";
import { sha256Hex } from "#lib/server/crypto.ts";

export const load: PageServerLoad = async ({ url, cookies }) => {
  const query = url.searchParams;

  // The auth server reports a refusal (e.g. the account isn't in an allowed
  // group) on the redirect rather than at the token endpoint
  const refusal = query.get("error");
  if (refusal) {
    error(403, {
      title: "Sign-in refused",
      message: refusal === "access_denied" ? "Your account isn't allowed to use this pastebin." : refusal,
    });
  }

  const code = query.get("code");
  const state = query.get("state");
  if (!code || !state) {
    error(400, {
      title: "Incomplete sign-in",
      message: "That sign-in reply was missing its code or state.",
    });
  }

  const login = takeLogin(await sha256Hex(state));
  if (!login) {
    error(400, {
      title: "That sign-in expired",
      message: "Sign-ins are good for ten minutes and can only be used once. Start again from the sign-in button.",
    });
  }

  let identity: Identity;
  try {
    identity = await exchangeCode(code, login.verifier, login.nonce);
  } catch (err) {
    console.error("[auth] code exchange failed:", err);
    error(502, {
      title: "Sign-in failed",
      message: "The authentication server wouldn't confirm that sign-in.",
    });
  }

  upsertUser(identity);
  await startSession(cookies, identity.id);

  const separator = login.return_to.includes("?") ? "&" : "?";
  redirect(303, `${login.return_to}${separator}m=signed-in`);
};
