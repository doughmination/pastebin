/* src/auth/oidc.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { config, redirectUri } from "../env";

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

let cached: { at: number; doc: Discovery } | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * The auth server's OpenID configuration. Cached for an hour so a paste view
 * never waits on it, and re-fetched after that so key and endpoint changes
 * land without a restart.
 */
export async function discover(): Promise<Discovery> {
  if (cached && Date.now() - cached.at < 3_600_000) return cached.doc;

  const url = `${config.issuer}/.well-known/openid-configuration`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Discovery failed: ${url} returned ${res.status}`);
  const doc = (await res.json()) as Discovery;

  // A provider that answers for a different issuer than we configured is either
  // misconfigured or not the server we meant to trust.
  if (doc.issuer !== config.issuer) {
    throw new Error(`Discovery issuer mismatch: expected ${config.issuer}, got ${doc.issuer}`);
  }

  cached = { at: Date.now(), doc };
  jwks ??= createRemoteJWKSet(new URL(doc.jwks_uri));
  return doc;
}

export interface AuthorizeRequest {
  url: string;
  state: string;
  verifier: string;
  nonce: string;
}

export async function authorizeUrl(state: string, challenge: string, nonce: string): Promise<string> {
  const doc = await discover();
  const url = new URL(doc.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export interface Identity {
  /** The OIDC subject: stable for this user at this auth server. */
  id: string;
  username: string;
  name: string | null;
  picture: string | null;
}

/**
 * Swaps the authorization code for tokens and verifies the id_token against
 * the auth server's published keys.
 */
export async function exchangeCode(code: string, verifier: string, nonce: string): Promise<Identity> {
  const doc = await discover();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    code_verifier: verifier,
  });

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  // Confidential clients authenticate with Basic; public ones rely on PKCE alone.
  if (config.clientSecret) {
    const credentials = `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`;
    headers.authorization = `Basic ${btoa(credentials)}`;
  }

  const res = await fetch(doc.token_endpoint, { method: "POST", headers, body });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const tokens = (await res.json()) as TokenResponse;

  const { payload } = await jwtVerify(tokens.id_token, jwks!, {
    issuer: config.issuer,
    audience: config.clientId,
  });

  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("The id_token has no subject.");
  if (payload.nonce !== nonce) throw new Error("The id_token nonce doesn't match this sign-in.");

  return identityFrom(payload, await fetchUserinfo(doc, tokens.access_token, payload.sub));
}

/**
 * The id_token carries profile claims already; userinfo is a best-effort
 * top-up, so a failure there must not break an otherwise valid sign-in.
 */
async function fetchUserinfo(doc: Discovery, accessToken: string, sub: string): Promise<JWTPayload | null> {
  try {
    const res = await fetch(doc.userinfo_endpoint, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return null;
    const info = (await res.json()) as JWTPayload;
    // A userinfo response for somebody else is a mix-up, not extra detail.
    return info.sub === sub ? info : null;
  } catch {
    return null;
  }
}

function text(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim().slice(0, 200);
  }
  return null;
}

function identityFrom(idToken: JWTPayload, userinfo: JWTPayload | null): Identity {
  const claims = { ...idToken, ...(userinfo ?? {}) };
  const sub = idToken.sub!;
  const picture = text(claims.picture);
  return {
    id: sub,
    username: text(claims.preferred_username, claims.name) ?? sub,
    name: text(claims.name),
    // Rendered as an <img src>, so only https URLs are kept.
    picture: picture && picture.startsWith("https://") ? picture : null,
  };
}

/** Where to send the browser to end the session at the auth server too. */
export async function endSessionUrl(): Promise<string | null> {
  const doc = await discover();
  if (!doc.end_session_endpoint) return null;
  const url = new URL(doc.end_session_endpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("post_logout_redirect_uri", `${config.origin}/`);
  return url.toString();
}
