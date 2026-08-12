export type HighlightView = "general" | "file";

export type HighlightRequest = {
  type: "highlight";
  code: string;
  view: HighlightView;
};

export type OffscreenHighlightRequest = {
  type: "offscreen-highlight";
  code: string;
  view: HighlightView;
};

export type HighlightResponse =
  | {
      html: string;
    }
  | {
      error: string;
    };

export const isHighlightRequest = (
  message: unknown,
): message is HighlightRequest =>
  typeof message === "object" &&
  message !== null &&
  (message as HighlightRequest).type === "highlight" &&
  typeof (message as HighlightRequest).code === "string";

export const isOffscreenHighlightRequest = (
  message: unknown,
): message is OffscreenHighlightRequest =>
  typeof message === "object" &&
  message !== null &&
  (message as OffscreenHighlightRequest).type === "offscreen-highlight" &&
  typeof (message as OffscreenHighlightRequest).code === "string";

type AsyncMessageListener = (
  message: unknown,
  sender: Browser.runtime.MessageSender,
) => Promise<unknown> | unknown | undefined;

/** Chrome/Firefox onMessage helper: return a Promise and keep the channel open. */
export const replyAsync = (listener: AsyncMessageListener) => {
  const wrapped: (
    message: unknown,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => boolean | void = (message, sender, sendResponse) => {
    let result: Promise<unknown> | unknown | undefined;
    try {
      result = listener(message, sender);
    } catch (error) {
      sendResponse({
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
    if (result === undefined) return false;
    Promise.resolve(result)
      .then((response) => {
        // A resolved `undefined` means this listener's message-type guard didn't
        // match (e.g. background vs. offscreen both hear every message) — stay
        // silent so the listener that actually owns this message type can respond.
        if (response !== undefined) sendResponse(response);
      })
      .catch((error) => {
        sendResponse({
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return true;
  };
  return wrapped;
};

export const errorResponse = (error: unknown): HighlightResponse => ({
  error: error instanceof Error ? error.message : String(error),
});
