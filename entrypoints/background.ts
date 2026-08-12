export default defineBackground(() => {
  if (import.meta.env.FIREFOX) {
    void import("../src/background.firefox").then(
      ({ setupBrowserHighlight }) => {
        setupBrowserHighlight();
      },
    );
  } else {
    void import("../src/background.chrome").then(
      ({ setupBrowserHighlight }) => {
        setupBrowserHighlight();
      },
    );
  }
});
