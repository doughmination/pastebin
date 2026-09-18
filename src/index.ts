/* src/index.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { config, isSecure, type AppEnv } from "./env";
import { sweepExpired } from "./db";
import { loadSession } from "./auth/session";
import { randomToken } from "./lib/crypto";
import { warmUp } from "./highlight";
import { auth } from "./routes/auth";
import { pastes } from "./routes/pastes";
import { message } from "./views/layout";

const app = new Hono<AppEnv>();

const ORIGIN = new URL(config.origin).origin;

app.use("*", async (c, next) => {
  // One nonce per response, for the single <style> block the layout emits.
  c.set("nonce", randomToken(16));

  // CSRF, layer one: browsers label every cross-site request with Origin or
  // Sec-Fetch-Site, so state-changing requests from elsewhere never reach a
  // handler. Session-bound forms additionally carry a CSRF token.
  const method = c.req.method;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const sentOrigin = c.req.header("origin");
    const site = c.req.header("sec-fetch-site");
    if (sentOrigin ? sentOrigin !== ORIGIN : site && site !== "same-origin" && site !== "none") {
      return c.text("Cross-site request refused.", 403);
    }
  }

  await loadSession(c);
  await next();

  const h = c.res.headers;
  // Raw and download responses set their own, stricter policy.
  if (!h.has("Content-Security-Policy")) {
    h.set(
      "Content-Security-Policy",
      `default-src 'none'; script-src 'self'; style-src 'self' 'nonce-${c.get("nonce")}'; ` +
        "img-src 'self' https: data:; connect-src 'self'; form-action 'self'; " +
        "base-uri 'none'; frame-ancestors 'none'",
    );
  }
  h.set("X-Frame-Options", "DENY");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "same-origin");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  if (isSecure()) h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  if (!h.has("Cache-Control")) h.set("Cache-Control", "no-store");
});

app.use(
  "/static/*",
  serveStatic({
    root: "./public",
    onFound: (_path, c) => {
      c.header("Cache-Control", "public, max-age=3600");
    },
  }),
);

app.get("/favicon.ico", (c) => c.redirect("/static/favicon.svg", 301));

app.get("/robots.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body("User-agent: *\nDisallow: /new\nDisallow: /mine\nDisallow: /auth/\n");
});

app.get("/health", (c) => c.json({ ok: true }));

app.route("/", auth);
app.route("/", pastes);

app.notFound((c) => message(c, "Not found", "There's nothing at that address.", 404));

app.onError((err, c) => {
  console.error("[error]", c.req.method, new URL(c.req.url).pathname, err);
  return c.text("Something went wrong on our side. Please try again.", 500);
});

// Expired pastes are already invisible to every query; this is what actually
// reclaims the space, alongside spent sessions and abandoned sign-ins.
sweepExpired();
setInterval(sweepExpired, 60 * 60 * 1000).unref();

// Pull in the most-used grammars now so the first paste view isn't the request
// that pays for them.
warmUp().catch((err) => console.error("[highlight] warm-up failed:", err));

console.log(`${config.siteName} listening on http://${config.host}:${config.port} (public origin ${config.origin})`);

export default {
  port: config.port,
  hostname: config.host,
  // Generated slugs are short, but a title or body is not: allow a request
  // body comfortably past the configured paste limit for form overhead.
  maxRequestBodySize: config.maxBodyBytes + 1024 * 1024,
  fetch: app.fetch,
};
