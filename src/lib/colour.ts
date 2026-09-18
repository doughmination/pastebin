/* src/lib/colour.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

/**
 * A paste's accent is stored as one hex colour. The rest of the tints the
 * stylesheet needs — hover, focus ring, borders, glow — are derived from it
 * here, so an author picks a single colour and the whole page stays coherent
 * instead of drifting away from the site's look.
 */

export interface AccentPreset {
  id: string;
  label: string;
  hex: string;
}

/** The site's own crimson first; the rest are picked to stay legible on #07050a. */
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "crimson", label: "Crimson", hex: "#9c1f34" },
  { id: "rose", label: "Rose", hex: "#c2456b" },
  { id: "violet", label: "Violet", hex: "#7b4bc4" },
  { id: "indigo", label: "Indigo", hex: "#4257b2" },
  { id: "teal", label: "Teal", hex: "#1f8a7a" },
  { id: "moss", label: "Moss", hex: "#4f8a3d" },
  { id: "amber", label: "Amber", hex: "#b07d1e" },
  { id: "ember", label: "Ember", hex: "#c2562a" },
];

const HEX = /^#[0-9a-f]{6}$/;

/** Accepts `#abc` and `#aabbcc`, in any case, and returns the long lowercase form. */
export function normaliseHex(input: string | undefined): string | null {
  const value = (input ?? "").trim().toLowerCase();
  if (!value) return null;
  const withHash = value.startsWith("#") ? value : `#${value}`;
  const expanded = /^#[0-9a-f]{3}$/.test(withHash)
    ? `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`
    : withHash;
  return HEX.test(expanded) ? expanded : null;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function toRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function toHsl(hex: string): Hsl {
  const [r255, g255, b255] = toRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hueToChannel(p: number, q: number, tRaw: number): number {
  let t = tRaw;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function toHex({ h, s, l }: Hsl): string {
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToChannel(p, q, h + 1 / 3);
    g = hueToChannel(p, q, h);
    b = hueToChannel(p, q, h - 1 / 3);
  }
  const channel = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function shift(hsl: Hsl, dl: number, ds = 0): string {
  return toHex({ h: hsl.h, s: clamp(hsl.s + ds), l: clamp(hsl.l + dl) });
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Mixes `hex` toward the page background, for borders that read as tinted, not coloured. */
function towardBackground(hex: string, amount: number): string {
  const [r, g, b] = toRgb(hex);
  const [br, bg, bb] = toRgb("#07050a");
  const mix = (a: number, back: number) => Math.round(back + (a - back) * amount);
  const channel = (v: number) => v.toString(16).padStart(2, "0");
  return `#${channel(mix(r, br))}${channel(mix(g, bg))}${channel(mix(b, bb))}`;
}

/**
 * The CSS custom properties that re-tint a page. Names match the ones
 * `style.css` defines on `:root`, so setting them on an element overrides the
 * site default for that subtree and nothing else.
 */
export function accentVars(hex: string): string {
  const hsl = toHsl(hex);

  // A very dark or very desaturated pick would make links and buttons vanish,
  // so the derived tints are floored into a usable band.
  const base = toHex({ h: hsl.h, s: clamp(hsl.s, 0.25), l: clamp(hsl.l, 0.24, 0.62) });
  const baseHsl = toHsl(base);

  const strong = shift(baseHsl, 0.08, 0.04);
  const focus = shift(baseHsl, 0.16, 0.06);

  return [
    `--accent:${base}`,
    `--accent-strong:${strong}`,
    `--focus:${focus}`,
    `--focus-glow:${rgba(focus, 0.35)}`,
    `--border:${towardBackground(base, 0.34)}`,
    `--border-strong:${towardBackground(base, 0.62)}`,
    `--accent-wash:${rgba(base, 0.16)}`,
    `--accent-wash-soft:${rgba(base, 0.1)}`,
  ].join(";");
}
