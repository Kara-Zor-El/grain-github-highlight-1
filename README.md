# Github Grain Highlight
This is a small chrome/firefox extension that enables syntax highlighting on Github.com for [grain lang](https://grain-lang.org/).

## Installing
The extension can be installed from the [chrome web store](https://chromewebstore.google.com/detail/grain-syntax-highlighter/feljoccdillnkkbkpjanfabndijdndgp), or packaged from the source repo and installed manually.

## Building
Grain grammar assets live in `public/` (`tree-sitter-grain.wasm` and `highlights.scm`), vendored from [`tree-sitter-grain`](https://github.com/Kara-Zor-El/tree-sitter-grain).

```bash
npm ci # Install dependencies
npm run build # Build the extension
npm run pack # Zip to dist/ for both Chrome and Firefox
npm run pack:chrome # Zip to dist/github-grain-highlight-*-chrome.zip
npm run pack:firefox # Zip to dist/github-grain-highlight-*-firefox.zip
npm run dev # Develop with Chrome
npm run dev:firefox # Develop with Firefox
```

## How it works
This extension works completely locally. It injects a content script that identifies Grain code in markdown code blocks and `.gr` files.

Highlighting runs via [Treelight](https://github.com/matoous/treelight) (`@treelight/browser`) with the Grain grammar/queries in `public/`

- **Chrome**: highlighting runs in an extension [offscreen document](https://developer.chrome.com/docs/extensions/reference/api/offscreen) (`offscreen.html`)
- **Firefox**: highlighting runs in an event page (Firefox has no Offscreen API)

# TODO
+ Automate chrome web store / Firefox add-ons release
