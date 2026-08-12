import { listenForHighlight } from "./background-shared";
import { type HighlightResponse, type HighlightView } from "./messaging";

const OFFSCREEN_PATH = "offscreen.html";

let creating: Promise<void> | undefined;

const ensureOffscreen = async () => {
  const url = browser.runtime.getURL(`/${OFFSCREEN_PATH}`);
  const existing = await browser.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [url],
  });
  if (existing.length > 0) return;

  if (creating) {
    await creating;
    return;
  }

  creating = browser.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ["DOM_PARSER"],
    justification:
      "Run tree-sitter WASM to highlight Grain source (blocked by GitHub CSP in content scripts)",
  });
  try {
    await creating;
  } finally {
    creating = undefined;
  }
};

const offscreenHighlight = async (
  code: string,
  view: HighlightView,
): Promise<string> => {
  await ensureOffscreen();
  const result = await browser.runtime.sendMessage({
    type: "offscreen-highlight",
    code,
    view,
  });

  if (!result) {
    throw new Error("No response from offscreen highlight");
  }
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.html;
};

export const setupBrowserHighlight = () => {
  listenForHighlight(offscreenHighlight);
};
