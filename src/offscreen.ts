import highlight from "./highlight";
import {
  errorResponse,
  isOffscreenHighlightRequest,
  replyAsync,
} from "./messaging";

export const startOffscreenHighlight = () => {
  browser.runtime.onMessage.addListener(
    replyAsync(async (message) => {
      if (!isOffscreenHighlightRequest(message)) return;
      try {
        const html = await highlight(message.code, message.view ?? "general");
        return { html };
      } catch (error) {
        return errorResponse(error);
      }
    }),
  );
};
