import { start } from "../src/content";

export default defineContentScript({
  matches: ["https://github.com/*"],
  main() {
    start();
  },
});
