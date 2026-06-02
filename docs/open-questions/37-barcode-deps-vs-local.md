# Barcode/QR libraries: npm dependencies vs hand-placed local copies

> **Open question** · priority #37 · Tier 4 – Exports · Source spec: `specs/015-barcode-qr-labels/spec.md`

## Question
The barcode and QR tools are listed as project dependencies, yet the running app uses hand-placed local copies. Confirm whether the listed dependencies are used by any build step.

<details>
<summary>🇫🇷 Version française</summary>

Les outils code-barres et QR sont listés comme dépendances du projet, alors que l'application utilise des copies locales posées à la main. Confirmer si les dépendances listées servent à une étape de build.

</details>

## Why this is open
**Classification:** Legacy / dead code (unused declared dependency) — with a secondary supply-chain / provenance concern.

I confirmed the substance of the question: the running app does **not** consume the npm-declared packages. `package.json` declares two runtime dependencies, `bwip-js` (^4.10.1, the 1D Code 128 / 2D DataMatrix renderer) and `qrcode` (^1.5.4, the QR renderer). But the app loads its barcode/QR code purely from two hand-placed files under `lib/`, referenced by plain `<script defer src=...>` tags in `index.html`: `lib/qrcode.min.js` and `lib/bwip-js-min.js`. These are loaded as classic browser globals, and the app code reads them as globals — `bwipjs` (`valobois-app.js:42332`, via `getBwipJsApi()`) and `QRCode.toString(...)` (`valobois-app.js:42521,42526`). There is no module resolution involved.

There is **no build step that touches the npm packages**. The only bundler is `scripts/build-standalone.mjs` → `scripts/lib/build-standalone-html.mjs`. Its `inlineLocalScripts()` simply regex-matches `<script src="...">` tags in `index.html`, skips remote URLs, and reads each local path off disk and inlines it. It therefore inlines exactly `lib/qrcode.min.js` and `lib/bwip-js-min.js` — never anything from `node_modules/`. A repo-wide grep for `require('bwip-js'|'qrcode')` / `from 'bwip-js'|'qrcode'` / `import ... bwip|qrcode` returns **zero matches** outside `node_modules`, and grepping `scripts/` for `node_modules`, `bwip-js`, or `qrcode` also returns nothing. So neither the standalone build nor any other script consumes the declared dependencies.

I also confirmed the local files are *not* derivatives produced by the npm packages via any script, and do not even match them. `lib/bwip-js-min.js` is a 1.06 MB single-file build whose header reads "Barcode Writer in Pure PostScript – Version 2026-04-21"; the installed `node_modules/bwip-js@4.10.1` ships its browser bundle as `dist/bwip-js.js` (a different filename), and that `dist/` directory is not even present in the current install — only the dev source tree (`src/`, `lib/`, `bin/`). The local file was clearly fetched/placed by hand (committed in `bb31b32 "ajout fonctionnalité étiquetage"`, alongside the feature). So the dependency declaration and the shipped asset are independent.

What this means: the two entries in `package.json` `dependencies` are effectively **dead declarations** for the app at runtime — they pull weight in `package-lock.json` and `node_modules` but feed nothing the browser or the standalone build ever sees. The spec's own "Assumptions" section even states the codes are produced by "the app's own local barcode/QR tools … built into the one-file copy" (consistent with what the code does), which makes the npm declarations look vestigial. What remains genuinely a *product/maintenance* decision (not resolvable by reading code): whether the deps were left in deliberately (e.g. intended as the canonical source from which someone periodically re-mints the local minified copies, or kept for a future bundler migration) or are simply leftover and should be removed. There is also a provenance/security angle: because the local copies are hand-placed and diverge from the pinned npm artifacts, nothing verifies that `lib/bwip-js-min.js` / `lib/qrcode.min.js` correspond to the audited, version-pinned packages.

## Evidence in the code
- `package.json` (`dependencies`) — declares `"bwip-js": "^4.10.1"` and `"qrcode": "^1.5.4"`; no other deps.
- `package.json` (`scripts`) — `build:standalone` is the only bundling script; none of the scripts mention the two packages.
- `index.html:5665` — `<script defer src="lib/qrcode.min.js"></script>` loads QR from a local file, not the package.
- `index.html:5666` — `<script defer src="lib/bwip-js-min.js"></script>` loads bwip-js from a local file, not the package.
- `js/app/valobois-app.js:42331-42333` — `getBwipJsApi()` resolves the renderer from the global `bwipjs` / `window.bwipjs`, i.e. the script-tag global, never a module import.
- `js/app/valobois-app.js:42521-42526` — QR rendering calls the global `QRCode.toString(...)`; warns "bibliothèque qrcode indisponible" if the global is missing.
- `scripts/lib/build-standalone-html.mjs` (`inlineLocalScripts`) — inlines local `<script src>` files verbatim by path; resolves nothing from `node_modules`.
- `lib/bwip-js-min.js` (header) — "Barcode Writer in Pure PostScript – Version 2026-04-21"; a hand-placed 1.06 MB bundle, committed in `bb31b32`.
- `node_modules/bwip-js/package.json` — browser entry is `./dist/bwip-js.js`; that `dist/` is absent in the install, and the filename differs from the shipped `lib/bwip-js-min.js` (confirming the local copy is not script-generated from the package).
- grep (repo, excluding `node_modules`) — zero `require`/`import`/`from` references to `bwip-js` or `qrcode`; zero references to either package name inside `scripts/`.

## What would resolve it
- Product/maintainer decision: confirm whether `bwip-js` and `qrcode` are intentionally retained (as the source-of-truth for periodically regenerating the `lib/*.min.js` copies, or for a planned bundler migration) or are leftover and can be dropped from `package.json`.
- If retained as source-of-truth: add (and document) a script that regenerates `lib/qrcode.min.js` / `lib/bwip-js-min.js` from the pinned packages, so the declared version and the shipped asset cannot silently diverge — closing the provenance gap.
- If not: remove both entries from `package.json` `dependencies` (and refresh `package-lock.json`), since no build step or runtime path reads them — verified above by grep.
