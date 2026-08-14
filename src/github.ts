import { GRAIN_EXTENSION, GRAIN_NAME } from "./constants";
// import { log } from "./helpers";
import highlight from "./highlight-client";

type FileViewState =
  | { status: "pending" }
  | { status: "ready"; observer: MutationObserver };

let fileViews = new Map<Element, FileViewState>();
let markdownDone = new Set<Element>();

export const resetViewState = (): void => {
  for (const state of fileViews.values()) {
    if (state.status === "ready") state.observer.disconnect();
  }
  fileViews = new Map();
  markdownDone = new Set();
};

const paintLines = (
  root: Element,
  linesById: ReadonlyMap<string, string>,
): void => {
  for (const el of root.querySelectorAll<HTMLElement>('[id^="LC"]')) {
    const id = el.id;
    if (!id.startsWith("LC")) continue;
    const content = linesById.get(id);
    if (content === undefined) continue;
    if (
      el.getAttribute("data-grain-hl") === "true" &&
      (content.length === 0 || el.childElementCount > 0)
    ) {
      continue;
    }
    if (content.length > 0) {
      el.innerHTML = content;
    }
    el.setAttribute("data-grain-hl", "true");
  }
};

const parseHtmlBody = (html: string) =>
  new DOMParser().parseFromString(html, "text/html").body;

const linesByIdFromHighlight = async (
  code: string,
): Promise<ReadonlyMap<string, string>> => {
  const highlighted = await highlight(code, "file");
  const body = parseHtmlBody(highlighted);
  const linesById = new Map<string, string>();
  for (const line of body.querySelectorAll("code > div[id]")) {
    linesById.set(line.id, line.innerHTML);
  }
  return linesById;
};

const observeVirtualizedLines = (root: Element, paint: () => void) => {
  let painting = false;
  const run = () => {
    if (painting) return;
    painting = true;
    try {
      paint();
    } finally {
      painting = false;
    }
  };
  const observer = new MutationObserver(run);
  observer.observe(root, { childList: true, subtree: true });
  return observer;
};

const attachFileLineHighlight = async (
  container: Element,
  lineContainer: Element,
  code: string,
  label: string,
): Promise<void> => {
  const views = fileViews;
  if (views.has(container)) return;

  const path = window.location.pathname;
  views.set(container, { status: "pending" });
  // log(label);

  let linesById: ReadonlyMap<string, string>;
  try {
    linesById = await linesByIdFromHighlight(code);
  } catch (error) {
    views.delete(container);
    throw error;
  }

  const paint = () => {
    if (window.location.pathname !== path) return;
    paintLines(lineContainer, linesById);
  };
  paint();
  // log(`Cached ${linesById.size} highlighted lines`);

  const observer = observeVirtualizedLines(lineContainer, paint);
  views.set(container, { status: "ready", observer });
};

const highlightReadingView = async (container: Element): Promise<void> => {
  const codeBlock = container.querySelector<HTMLTextAreaElement>(
    'textarea#read-only-cursor-text-area, textarea[data-testid="read-only-cursor-text-area"]',
  );
  if (!codeBlock?.value) return;

  const lineContainer =
    container.querySelector("div.react-code-lines > div[inert]") ??
    container.querySelector("div.react-code-lines") ??
    container;

  await attachFileLineHighlight(
    container,
    lineContainer,
    codeBlock.value,
    "Highlighting Reading View",
  );
};

const getBlameSource = async (): Promise<string | undefined> => {
  const rawPath = window.location.pathname.replace("/blame/", "/raw/");
  try {
    const res = await fetch(rawPath);
    if (!res.ok) return undefined;
    return await res.text();
  } catch {
    return undefined;
  }
};

const highlightBlameView = async (container: Element): Promise<void> => {
  if (fileViews.has(container)) return;
  const path = window.location.pathname;

  const code = await getBlameSource();
  if (!code) {
    // log("Blame view: could not load file source");
    return;
  }
  if (window.location.pathname !== path) return;

  const lineContainer =
    container.querySelector<HTMLElement>('[class*="virtualBlameWrapper"]') ??
    container;

  await attachFileLineHighlight(
    container,
    lineContainer,
    code,
    "Highlighting Blame View",
  );
};

export const highlightMarkdownView = async (): Promise<void> => {
  const done = markdownDone;
  const markdownContainers = document.querySelectorAll(".markdown-body");
  for (const container of markdownContainers) {
    if (done.has(container)) continue;
    const codeBlocks = [
      ...container.querySelectorAll(`pre[lang="${GRAIN_NAME}"] > code`),
      ...container.querySelectorAll(`pre[lang="${GRAIN_EXTENSION}"] > code`),
    ];
    if (codeBlocks.length === 0) continue;
    // log("Highlighting Markdown Block");
    for (const codeBlock of codeBlocks) {
      const content = codeBlock.textContent;
      if (!content) continue;
      const highlighted = await highlight(content);
      const parentElement = codeBlock.parentElement;
      if (!parentElement) continue;
      parentElement.outerHTML = highlighted;
    }
    done.add(container);
  }
};

const normalizeDiffPath = (path: string): string =>
  path.replace(/[\u200e\u200f]/g, "").trim();

const hasGrainExtension = (path: string): boolean =>
  normalizeDiffPath(path).endsWith(`.${GRAIN_EXTENSION}`);

const isGrainDiffFile = (file: Element): boolean => {
  const type = file.getAttribute("data-file-type");
  if (type === `.${GRAIN_EXTENSION}`) return true;
  const path =
    file.getAttribute("data-tagsearch-path") ??
    file.querySelector(".file-header")?.getAttribute("data-path") ??
    file.getAttribute("aria-label")?.replace(/^Diff for:\s*/i, "") ??
    file.querySelector('[class*="DiffFileHeader-module__file-name"]')
      ?.textContent ??
    "";
  return hasGrainExtension(path);
};

const parseGeneralLineHtml = (highlighted: string) => {
  const body = parseHtmlBody(highlighted);
  return [...body.querySelectorAll("code > span.line")].map(
    (line) => line.innerHTML,
  );
};

const paintDiffLines = async (
  label: string,
  inners: readonly HTMLElement[],
): Promise<void> => {
  if (inners.length === 0) return;
  if (inners.every((el) => el.getAttribute("data-grain-hl") === "true")) {
    return;
  }

  // log(`Highlighting Diff: ${label}`);
  const texts = inners.map((el) => el.textContent ?? "");
  let lineHtmls: string[];
  try {
    const highlighted = await highlight(texts.join("\n"));
    lineHtmls = parseGeneralLineHtml(highlighted);
  } catch (error) {
    // log(`Diff highlight failed: ${error}`);
    return;
  }

  for (let i = 0; i < inners.length; i++) {
    const inner = inners[i];
    const content = lineHtmls[i];
    if (inner === undefined || content === undefined) continue;
    inner.innerHTML = content;
    inner.setAttribute("data-grain-hl", "true");
  }
};

const classicDiffLineInners = (
  root: ParentNode,
  opts?: { excludeReviewThreads?: boolean },
): readonly HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>("span.blob-code-inner")].filter(
    (el) =>
      !opts?.excludeReviewThreads ||
      !el.closest(
        "review-thread-collapsible.review-thread-component, .review-thread-component",
      ),
  );

const reactDiffLineInners = (root: ParentNode): readonly HTMLElement[] => [
  ...root.querySelectorAll<HTMLElement>("div.diff-text-inner"),
];

const reviewThreadPath = (thread: Element): string => {
  for (const a of thread.querySelectorAll("a")) {
    const text = normalizeDiffPath(a.textContent ?? "");
    if (hasGrainExtension(text)) return text;
  }
  return "";
};

export const highlightDiffView = async (): Promise<void> => {
  for (const file of document.querySelectorAll(".file.js-file")) {
    if (!isGrainDiffFile(file)) continue;
    await paintDiffLines(
      file.getAttribute("data-tagsearch-path") ?? "",
      classicDiffLineInners(file, { excludeReviewThreads: true }),
    );
  }

  for (const thread of document.querySelectorAll(
    "review-thread-collapsible.review-thread-component, .review-thread-component",
  )) {
    const path = reviewThreadPath(thread);
    if (!path) continue;
    const inners = classicDiffLineInners(thread);
    if (inners.length === 0) continue;
    await paintDiffLines(path, inners);
  }

  for (const table of document.querySelectorAll("table[data-diff-anchor]")) {
    const rawPath =
      table.getAttribute("aria-label")?.replace(/^Diff for:\s*/i, "") ?? "";
    if (!hasGrainExtension(rawPath)) continue;
    await paintDiffLines(
      normalizeDiffPath(rawPath),
      reactDiffLineInners(table),
    );
  }

  for (const nameEl of document.querySelectorAll(
    '[class*="DiffFileHeader-module__file-name"]',
  )) {
    const rawPath = nameEl.textContent ?? "";
    if (!hasGrainExtension(rawPath)) continue;
    const root =
      nameEl.closest<HTMLElement>("[id^='diff-']") ??
      nameEl.closest<HTMLElement>("[data-testid='diff-content']") ??
      nameEl.parentElement;
    if (!root) continue;
    if (root.querySelector("table[data-diff-anchor][aria-label]")) continue;
    await paintDiffLines(normalizeDiffPath(rawPath), reactDiffLineInners(root));
  }
};

export const resolveFileViewRoute = async (): Promise<void> => {
  const fileBreadCrumb = document.querySelector(
    'div[data-testid="breadcrumbs-filename"]',
  );
  if (!fileBreadCrumb) return;
  const breadCrumbText = fileBreadCrumb.textContent;
  if (!breadCrumbText || !hasGrainExtension(breadCrumbText)) return;

  const container = document.querySelector(
    "div#highlighted-line-menu-positioner",
  );
  if (!container) return;

  try {
    if (window.location.pathname.includes("/blame/")) {
      await highlightBlameView(container);
    } else {
      await highlightReadingView(container);
    }
  } catch (error) {
    // log(`File view highlight failed: ${error}`);
  }
};
