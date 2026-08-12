import type { LanguageDefinition } from "@treelight/browser";
import highlights from "../public/highlights.scm?raw";

export const grainLanguage = (): LanguageDefinition => ({
  id: "grain",
  wasmUrl: browser.runtime.getURL("/tree-sitter-grain.wasm"),
  queries: {
    highlights,
  },
});
