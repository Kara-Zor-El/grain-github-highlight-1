import { defineConfig } from "wxt";

export default defineConfig({
  outDir: "dist",
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: "Grain Syntax Highlighter",
    description: "Highlight Grain code on Github.com",
    icons: {
      16: "/icons/icon.png",
      32: "/icons/icon.png",
      48: "/icons/icon.png",
      128: "/icons/icon.png",
    },
    permissions:
      browser === "firefox" ? ["scripting"] : ["offscreen", "scripting"],
    host_permissions: ["https://github.com/*"],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    browser_specific_settings: {
      gecko: {
        // TODO: Change this for proper release
        id: "grain-github-highlight@grain-lang.org",
        strict_min_version: "121.0",
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  }),
});
