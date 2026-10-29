/* src/lib/format.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

export function date(ts: number | null | undefined): string {
  if (!ts) return "never";
  return new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function relative(ts: number | null | undefined): string {
  if (!ts) return "never";
  const diff = Math.floor(Date.now() / 1000) - ts;
  const future = diff < 0;
  const abs = Math.abs(diff);

  let count: number;
  let word: string;
  if (abs < 60) {
    count = abs;
    word = "second";
  } else if (abs < 3600) {
    count = Math.floor(abs / 60);
    word = "minute";
  } else if (abs < 86400) {
    count = Math.floor(abs / 3600);
    word = "hour";
  } else {
    count = Math.floor(abs / 86400);
    word = "day";
  }

  const text = `${count} ${word}${count === 1 ? "" : "s"}`;
  return future ? `in ${text}` : `${text} ago`;
}

export function bytes(count: number): string {
  if (count < 1024) return `${count} B`;
  if (count < 1024 * 1024) return `${(count / 1024).toFixed(count < 10240 ? 1 : 0)} KB`;
  return `${(count / (1024 * 1024)).toFixed(1)} MB`;
}

// Flash messages travel as a fixed code in `?m=`, never as free text, so a
// crafted link can't put words in this site's mouth.
const FLASH: Record<string, string> = {
  "signed-in": "You're signed in.",
  "signed-out": "You're signed out.",
  "paste-created": "Paste published.",
  "paste-updated": "Paste updated.",
  "paste-deleted": "Paste deleted.",
  "sign-in-needed": "Sign in to publish a paste.",
};

export function flashText(code: string | null): string | undefined {
  return code ? FLASH[code] : undefined;
}
