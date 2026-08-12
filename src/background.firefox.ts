import { listenForHighlight } from "./background-shared";
import highlight from "./highlight";

export const setupBrowserHighlight = () => {
  listenForHighlight((code, view) => highlight(code, view));
};
