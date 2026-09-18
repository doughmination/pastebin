/* src/highlight.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import { createHighlighter, type Highlighter, type LanguageRegistration } from "shiki";
import { config } from "./env";
import { doughminationDark, doughminationLight } from "./themes";
import jpmlGrammar from "../syntaxes/jpml.tmLanguage.json" with { type: "json" };

/**
 * The grammar file is copied verbatim from jpml-vscode so the two stay in
 * sync; only the registration metadata Shiki needs is added here. Its patterns
 * use Oniguruma inline flags, so this module keeps Shiki's default WASM engine
 * rather than the JavaScript RegExp one.
 */
const jpml = {
  ...(jpmlGrammar as unknown as LanguageRegistration),
  name: "jpml",
  displayName: "JPML",
  aliases: ["jp"],
} satisfies LanguageRegistration;

export interface LanguageOption {
  id: string;
  label: string;
}

/**
 * Languages offered in the composer. `text` and `jpml` lead because they are
 * this site's defaults; the rest are alphabetical.
 */
export const LANGUAGES: LanguageOption[] = [
  { id: "text", label: "Plain text" },
  { id: "jpml", label: "JPML (.jp)" },
  { id: "bash", label: "Bash / shell" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "css", label: "CSS" },
  { id: "diff", label: "Diff / patch" },
  { id: "docker", label: "Dockerfile" },
  { id: "elixir", label: "Elixir" },
  { id: "go", label: "Go" },
  { id: "haskell", label: "Haskell" },
  { id: "html", label: "HTML" },
  { id: "ini", label: "INI" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript" },
  { id: "json", label: "JSON" },
  { id: "kotlin", label: "Kotlin" },
  { id: "lua", label: "Lua" },
  { id: "markdown", label: "Markdown" },
  { id: "nix", label: "Nix" },
  { id: "php", label: "PHP" },
  { id: "powershell", label: "PowerShell" },
  { id: "python", label: "Python" },
  { id: "ruby", label: "Ruby" },
  { id: "rust", label: "Rust" },
  { id: "scss", label: "SCSS" },
  { id: "sql", label: "SQL" },
  { id: "svelte", label: "Svelte" },
  { id: "swift", label: "Swift" },
  { id: "toml", label: "TOML" },
  { id: "tsx", label: "TSX / JSX" },
  { id: "typescript", label: "TypeScript" },
  { id: "vue", label: "Vue" },
  { id: "xml", label: "XML" },
  { id: "yaml", label: "YAML" },
  { id: "zig", label: "Zig" },
];

const LANGUAGE_IDS = new Set(LANGUAGES.map((l) => l.id));

export function isLanguage(id: string): boolean {
  return LANGUAGE_IDS.has(id);
}

export function languageLabel(id: string): string {
  return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}

/** File extension used when a paste is downloaded. */
const EXTENSIONS: Record<string, string> = {
  text: "txt",
  jpml: "jp",
  bash: "sh",
  csharp: "cs",
  docker: "Dockerfile",
  elixir: "ex",
  haskell: "hs",
  javascript: "js",
  markdown: "md",
  powershell: "ps1",
  python: "py",
  ruby: "rb",
  rust: "rs",
  typescript: "ts",
  yaml: "yml",
};

export function extensionFor(language: string): string {
  return EXTENSIONS[language] ?? language;
}

export interface ThemeOption {
  id: string;
  label: string;
  /** Themes built for a light page get a light paste surface. */
  light: boolean;
}

export const THEMES: ThemeOption[] = [
  { id: "doughmination-dark", label: "Doughmination", light: false },
  { id: "doughmination-light", label: "Doughmination Light", light: true },
  { id: "catppuccin-mocha", label: "Catppuccin Mocha", light: false },
  { id: "dracula", label: "Dracula", light: false },
  { id: "github-dark", label: "GitHub Dark", light: false },
  { id: "nord", label: "Nord", light: false },
  { id: "tokyo-night", label: "Tokyo Night", light: false },
  { id: "vitesse-dark", label: "Vitesse Dark", light: false },
  { id: "github-light", label: "GitHub Light", light: true },
  { id: "vitesse-light", label: "Vitesse Light", light: true },
];

export const DEFAULT_THEME = "doughmination-dark";

const THEME_IDS = new Set(THEMES.map((t) => t.id));

export function isTheme(id: string): boolean {
  return THEME_IDS.has(id);
}

export function themeIsLight(id: string): boolean {
  return THEMES.find((t) => t.id === id)?.light ?? false;
}

let highlighterPromise: Promise<Highlighter> | null = null;

/**
 * One highlighter for the process. Themes load up front (there are ten and
 * they are small); grammars load the first time a paste asks for them, so
 * start-up doesn't pay for languages nobody has used.
 */
function highlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: [doughminationDark, doughminationLight, ...THEMES.map((t) => t.id).filter((id) => !id.startsWith("doughmination"))],
    langs: [jpml],
  });
  return highlighterPromise;
}

/** Loads the grammars used most, so the first paste view isn't the one that waits. */
export async function warmUp(): Promise<void> {
  const shiki = await highlighter();
  await shiki.loadLanguage("json", "javascript", "typescript", "python", "bash", "markdown");
}

const loaded = new Set<string>(["jpml", "text"]);

async function ensureLanguage(shiki: Highlighter, language: string): Promise<boolean> {
  if (loaded.has(language)) return true;
  try {
    await shiki.loadLanguage(language as Parameters<Highlighter["loadLanguage"]>[0]);
    loaded.add(language);
    return true;
  } catch (err) {
    console.error(`[highlight] could not load grammar "${language}":`, err);
    return false;
  }
}

export interface Rendered {
  /** `<pre class="shiki">…` with one `<span class="line" id="Ln">` per line. */
  html: string;
  /** Rules for the classes in `html`, for the page's single nonced <style>. */
  css: string;
  lines: number;
  /** False when the body was too big, or its grammar failed to load. */
  highlighted: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain, unhighlighted fallback in the same shape the highlighted path returns. */
function plain(body: string): Rendered {
  const lines = body.split("\n");
  const rows = lines
    .map((line, i) => `<span class="line" id="L${i + 1}">${escapeHtml(line) || "\n"}</span>`)
    .join("\n");
  return {
    html: `<pre class="shiki sh-plain"><code>${rows}</code></pre>`,
    css: "",
    lines: lines.length,
    highlighted: false,
  };
}

/**
 * Moves Shiki's inline `style="…"` attributes onto generated classes.
 *
 * Inline style attributes can't be covered by a CSP nonce, so keeping them
 * would mean allowing `style-src 'unsafe-inline'` site-wide — a bad trade on a
 * site whose whole job is displaying text other people wrote. Every `style="`
 * in this string is Shiki's own: paste content reaches here already escaped,
 * so a quote in the body is `&quot;` and can't close an attribute.
 */
function externaliseStyles(html: string, prefix: string): { html: string; css: string } {
  const classes = new Map<string, string>();

  const out = html.replace(/ style="([^"]*)"/g, (_match, style: string) => {
    let name = classes.get(style);
    if (!name) {
      name = `${prefix}${classes.size}`;
      classes.set(style, name);
    }
    return ` class="${name}"`;
  });

  // Shiki puts style on <pre>, <code> and token spans; <pre> and the line spans
  // already carry classes, so merge rather than replace on those two.
  const merged = out
    .replace(/<pre class="([^"]*)"([^>]*?)class="([^"]*)"/g, '<pre class="$1 $3"$2')
    .replace(/<span class="line"([^>]*?) class="([^"]*)"/g, '<span class="line $2"$1')
    .replace(/<(pre|span|code)((?:[^>"]|"[^"]*")*?)  +/g, "<$1$2 ");

  const css = Array.from(classes, ([style, name]) => `.${name}{${style}}`).join("");
  return { html: merged, css };
}

const MAX_LINES_NUMBERED = 20_000;

/**
 * Renders one paste. Bodies past `MAX_HIGHLIGHT_BYTES` skip the tokenizer:
 * highlighting megabytes of text is slow enough to hold the event loop.
 */
export async function render(body: string, language: string, theme: string): Promise<Rendered> {
  if (Buffer.byteLength(body, "utf8") > config.maxHighlightBytes) return plain(body);
  if (language === "text") return plain(body);

  const shiki = await highlighter();
  if (!(await ensureLanguage(shiki, language))) return plain(body);

  let lines = 0;
  let html: string;
  try {
    html = shiki.codeToHtml(body, {
      lang: language,
      theme,
      transformers: [
        {
          name: "line-anchors",
          line(node, line) {
            // Anchors so #L12 (and the copy-link control) can address a line.
            node.properties.id = `L${line}`;
            lines = line;
          },
        },
      ],
    });
  } catch (err) {
    console.error("[highlight] render failed:", err);
    return plain(body);
  }

  // Classes are namespaced per render so two pastes on one page could never
  // collide; in practice a page shows one paste.
  const { html: classed, css } = externaliseStyles(html, "sh");
  return {
    html: classed,
    css,
    lines: lines || body.split("\n").length,
    highlighted: true,
  };
}

export function shouldNumber(lines: number): boolean {
  return lines <= MAX_LINES_NUMBERED;
}
