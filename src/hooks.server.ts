/* src/hooks.server.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { Handle, HandleServerError, ServerInit } from "@sveltejs/kit/hooks";
import { config, isSecure } from "#lib/server/env.ts";
import { sweepExpired } from "#lib/server/db.ts";
import { loadSession } from "#lib/server/session.ts";
import { warmUp } from "#lib/server/highlight.ts";

const ORIGIN = new URL(config.origin).origin;

export const init: ServerInit = () => {
  // Expired pastes are already invisible to every query; this is what actually
  // reclaims the space, alongside spent sessions and abandoned sign-ins.
  sweepExpired();
  setInterval(sweepExpired, 60 * 60 * 1000).unref();

  // Pull in the most-used grammars now so the first paste view isn't the
  // request that pays for them.
  warmUp().catch((err) => console.error("[highlight] warm-up failed:", err));

  console.log(`${config.siteName} up (public origin ${config.origin})`);
};

function crossSite(request: Request): boolean {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;

  const sentOrigin = request.headers.get("origin");
  if (sentOrigin) return sentOrigin !== ORIGIN;

  const site = request.headers.get("sec-fetch-site");
  return Boolean(site && site !== "same-origin" && site !== "none");
}

export const handle: Handle = async ({ event, resolve }) => {
  // CSRF, layer one: browsers label every cross-site request with Origin or
  // Sec-Fetch-Site, so state-changing requests from elsewhere never reach a
  // handler. Session-bound forms additionally carry a CSRF token.
  if (crossSite(event.request)) {
    return new Response("Cross-site request refused.", { status: 403 });
  }

  await loadSession(event);
  const response = await resolve(event);

  const headers = response.headers;
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (isSecure()) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");

  return response;
};

// App errors (thrown with error()) keep their own title and message; this only softens unknown ones
export const handleError: HandleServerError = ({ kind, error, event }) => {
  if (kind !== "unknown") return;

  console.error("[error]", event.request.method, event.url.pathname, error);
  return {
    title: "Something went wrong",
    message: "Something went wrong on our side. Please try again.",
  };
};
