import { createBrowserHighlighter, type Highlighter } from "@treelight/browser";
import githubDark from "@treelight/theme-github-dark";
import { grainLanguage } from "./grain-language";
import type { HighlightView } from "./messaging";

let highlighter: Highlighter | undefined;

const getHighlighter = async (): Promise<Highlighter> => {
  if (highlighter) return highlighter;

  highlighter = await createBrowserHighlighter({
    parserWasmUrl: browser.runtime.getURL("/web-tree-sitter.wasm"),
    languages: [grainLanguage()],
    themes: [githubDark],
  });
  return highlighter;
};

const wrapLines = (lines: string[], view: HighlightView) => {
  if (view === "file") {
    const rendered = lines.map(
      (content, index) =>
        `<div id="LC${index + 1}" class="react-code-text react-code-line-contents-no-virtualization react-file-line html-div">${content}</div>`,
    );
    return `<pre><code>${rendered.join("")}</code></pre>`;
  }

  const rendered = lines.map(
    (content) => `<span class="line">${content}</span>`,
  );
  return `<pre style=""><code>${rendered.join("\n")}</code></pre>`;
};

export default async (code: string, view: HighlightView = "general") => {
  const hl = await getHighlighter();
  const lines = hl.highlightLines(code, "grain");
  return wrapLines(lines, view);
};
