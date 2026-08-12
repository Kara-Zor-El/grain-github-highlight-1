import {
  errorResponse,
  isHighlightRequest,
  replyAsync,
  type HighlightView,
} from "./messaging";

export type HighlightRunner = (
  code: string,
  view: HighlightView,
) => Promise<string>;

export const listenForHighlight = (run: HighlightRunner) => {
  browser.runtime.onMessage.addListener(
    replyAsync(async (message) => {
      if (!isHighlightRequest(message)) return;
      try {
        const html = await run(message.code, message.view ?? "general");
        return { html };
      } catch (error) {
        return errorResponse(error);
      }
    }),
  );
};
