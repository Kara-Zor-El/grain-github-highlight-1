import { type HighlightResponse, type HighlightView } from "./messaging";

export type { HighlightView };

export default async (
  code: string,
  view: HighlightView = "general",
): Promise<string> => {
  const response = (await browser.runtime.sendMessage({
    type: "highlight",
    code,
    view,
  })) as HighlightResponse | undefined;

  if (!response) {
    throw new Error("No response from highlight service");
  }
  if ("error" in response) {
    throw new Error(response.error);
  }
  return response.html;
};
