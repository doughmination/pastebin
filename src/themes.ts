/* src/themes.ts
 * Copyright (c) 2026 Clove Nytrix Doughmination Twilight
 * Licensed under the DASL-1.2 Licence.
 * See LICENCE.md in the project root for full licence information.
 */

import type { ThemeRegistration } from "shiki";

/**
 * Two house themes built on the Doughmination palette, so a paste sitting in
 * the page doesn't look like it was pasted in from somewhere else.
 *
 * Hue assignments are shared by both: crimson for keywords and JPML section
 * headers, rose for keys and properties, green for strings, blue for numbers,
 * violet for language constants, warm gold for functions.
 */

interface Hues {
  fg: string;
  bg: string;
  comment: string;
  keyword: string;
  property: string;
  string: string;
  number: string;
  constant: string;
  func: string;
  type: string;
  punctuation: string;
  invalid: string;
  selection: string;
}

function build(name: string, type: "dark" | "light", h: Hues): ThemeRegistration {
  return {
    name,
    type,
    colors: {
      "editor.background": h.bg,
      "editor.foreground": h.fg,
      "editor.selectionBackground": h.selection,
    },
    settings: [
      { settings: { background: h.bg, foreground: h.fg } },

      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: h.comment, fontStyle: "italic" } },

      {
        scope: [
          "keyword",
          "storage",
          "storage.type",
          "keyword.control",
          "keyword.operator.expression",
          "keyword.operator.new",
          "variable.language",
          "entity.name.tag",
          "markup.heading",
        ],
        settings: { foreground: h.keyword },
      },

      // JPML: a [section] header is the document's spine, so it gets the
      // strongest colour in the theme and the only bold weight.
      { scope: ["entity.name.section", "entity.name.section.jpml"], settings: { foreground: h.keyword, fontStyle: "bold" } },
      { scope: ["punctuation.definition.section"], settings: { foreground: h.keyword } },

      {
        scope: [
          "support.type.property-name",
          "variable.other.property",
          "meta.object-literal.key",
          "entity.name.tag.yaml",
          "support.type.property-name.toml",
        ],
        settings: { foreground: h.property },
      },

      {
        scope: ["string", "string.quoted", "string.unquoted", "markup.inserted", "meta.embedded.line"],
        settings: { foreground: h.string },
      },
      { scope: ["constant.character.escape", "string.regexp"], settings: { foreground: h.func } },
      { scope: ["invalid", "invalid.illegal"], settings: { foreground: h.invalid, fontStyle: "underline" } },

      { scope: ["constant.numeric", "constant.other.unit"], settings: { foreground: h.number } },
      {
        scope: ["constant.language", "constant.language.boolean", "constant.language.null", "constant.other"],
        settings: { foreground: h.constant },
      },

      {
        scope: ["entity.name.function", "support.function", "meta.function-call.generic"],
        settings: { foreground: h.func },
      },
      {
        scope: ["entity.name.type", "entity.name.class", "support.class", "support.type", "entity.other.inherited-class"],
        settings: { foreground: h.type },
      },

      { scope: ["variable", "variable.other", "meta.definition.variable.name"], settings: { foreground: h.fg } },
      { scope: ["variable.parameter", "entity.name.variable.parameter"], settings: { foreground: h.type } },

      {
        scope: ["punctuation", "meta.brace", "keyword.operator", "punctuation.separator", "punctuation.terminator"],
        settings: { foreground: h.punctuation },
      },

      { scope: ["markup.deleted"], settings: { foreground: h.invalid } },
      { scope: ["markup.bold"], settings: { fontStyle: "bold" } },
      { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
      { scope: ["markup.underline.link"], settings: { foreground: h.number, fontStyle: "underline" } },
    ],
  };
}

export const doughminationDark = build("doughmination-dark", "dark", {
  fg: "#ece3e6",
  bg: "#0c070c",
  comment: "#7a636b",
  keyword: "#e23a52",
  property: "#f5a9b8",
  string: "#7fc49a",
  number: "#5bcefa",
  constant: "#c8a2ff",
  func: "#ffd39b",
  type: "#e8b4c4",
  punctuation: "#9c848c",
  invalid: "#ff4d5e",
  selection: "#3a1420",
});

export const doughminationLight = build("doughmination-light", "light", {
  fg: "#2a1a20",
  bg: "#fdf6f8",
  comment: "#8a7078",
  keyword: "#9c1f34",
  property: "#b03a58",
  string: "#3f7d55",
  number: "#1d6f9e",
  constant: "#6b3fb0",
  func: "#94661a",
  type: "#8a4460",
  punctuation: "#7a656c",
  invalid: "#c0192c",
  selection: "#f6dde3",
});
