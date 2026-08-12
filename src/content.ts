import { GRAIN_EXTENSION } from "./constants";
// import { log } from "./helpers";
import {
  resolveFileViewRoute,
  highlightMarkdownView,
  highlightDiffView,
  resetViewState,
} from "./github";

let lastPath = "";
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let running = false;
let rerun = false;

const runPass = async () => {
  const path = window.location.pathname;
  const isFile = path.includes("/blob/") || path.includes("/blame/");
  const isGrainFile = isFile && path.endsWith(`.${GRAIN_EXTENSION}`);
  const isMarkdownFile = path.includes("/blob/") && path.endsWith(".md");
  if (isGrainFile) {
    await resolveFileViewRoute();
  } else if (
    path.includes("/pull/") ||
    path.includes("/compare/") ||
    path.includes("/commit")
  ) {
    await highlightDiffView();
    await highlightMarkdownView();
  } else if (
    path.includes("/tree/") ||
    path.includes("/issues/") ||
    isMarkdownFile
  ) {
    await highlightMarkdownView();
  } else {
    // Handles Main Page
    await highlightMarkdownView();
    // log("Unknown page detected");
  }
};

const schedule = () => {
  if (debounceTimer !== undefined) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    debounceTimer = undefined;
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    try {
      do {
        rerun = false;
        if (window.location.pathname !== lastPath) {
          resetViewState();
        }
        lastPath = window.location.pathname;
        await runPass();
      } while (rerun || window.location.pathname !== lastPath);
    } finally {
      running = false;
    }
  }, 200);
};

export const start = () => {
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  schedule();
};
