/* src/routes/auth.tsx
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { Hono } from "hono";
import { TTL, now, type AppEnv } from "../env";
import { createLogin, takeLogin, upsertUser } from "../db";
import { authorizeUrl, endSessionUrl, exchangeCode } from "../auth/oidc";
import { csrfOk, endCurrentSession, startSession } from "../auth/session";
import { pkce, randomToken, sha256Hex } from "../lib/crypto";
import { form, safeReturn } from "../lib/http";
import { message } from "../views/layout";

export const auth = new Hono<AppEnv>();

/**
 * Starts the OpenID Connect code flow against the Doughmination auth server.
 * The state, PKCE verifier and nonce live in this app's database rather than
 * in a cookie, so a reply that doesn't match a sign-in we started is rejected
 * without trusting anything the browser carried back.
 */
auth.get("/auth/login", async (c) => {
  if (c.get("user")) return c.redirect(safeReturn(c.req.query("return_to")));

  const state = randomToken(24);
  const nonce = randomToken(24);
  const { verifier, challenge } = await pkce();
  const returnTo = safeReturn(c.req.query("return_to"));

  createLogin(await sha256Hex(state), verifier, nonce, returnTo, now() + TTL.pendingLogin);

  try {
    return c.redirect(await authorizeUrl(state, challenge, nonce));
  } catch (err) {
    console.error("[auth] could not reach the auth server:", err);
    return message(
      c,
      "Sign-in is unavailable",
      "The authentication server didn't answer. Pastes are still readable; try signing in again in a moment.",
      502,
    );
  }
});

auth.get("/auth/callback", async (c) => {
  const query = c.req.query();

  // The auth server reports a refusal (e.g. the account isn't in an allowed
  // group) on the redirect rather than at the token endpoint.
  if (query.error) {
    const detail = query.error === "access_denied" ? "Your account isn't allowed to use this pastebin." : query.error;
    return message(c, "Sign-in refused", detail, 403);
  }

  if (!query.code || !query.state) {
    return message(c, "Incomplete sign-in", "That sign-in reply was missing its code or state.", 400);
  }

  const login = takeLogin(await sha256Hex(query.state));
  if (!login) {
    return message(
      c,
      "That sign-in expired",
      "Sign-ins are good for ten minutes and can only be used once. Start again from the sign-in button.",
      400,
    );
  }

  let identity;
  try {
    identity = await exchangeCode(query.code, login.verifier, login.nonce);
  } catch (err) {
    console.error("[auth] code exchange failed:", err);
    return message(c, "Sign-in failed", "The authentication server wouldn't confirm that sign-in.", 502);
  }

  upsertUser(identity);
  await startSession(c, identity.id);

  const separator = login.return_to.includes("?") ? "&" : "?";
  return c.redirect(`${login.return_to}${separator}m=signed-in`);
});

auth.post("/auth/logout", async (c) => {
  const body = await form(c);
  if (!csrfOk(c, body._csrf)) return c.text("That form expired. Go back and try again.", 403);

  await endCurrentSession(c);

  // Ending the session here leaves the auth server's own session alone, so
  // offer to close that too rather than deciding for the user.
  const single = body.everywhere === "1";
  if (single) {
    try {
      const url = await endSessionUrl();
      if (url) return c.redirect(url);
    } catch (err) {
      console.error("[auth] end-session lookup failed:", err);
    }
  }
  return c.redirect("/?m=signed-out");
});
