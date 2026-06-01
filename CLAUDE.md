# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

VALOBOIS — a web tool for evaluating reclaimed/second-hand timber (scoring grid, lots, PDF/3D/barcode exports). There is **no build step and no framework**: the app is plain ES2020 served as static files. The browser loads scripts via `<script defer>` tags in `index.html`, so **load order matters** and code coordinates through globals on `window`, not modules/imports. The codebase, comments, and UI are in French — match that when editing.

## Commands

```bash
# Run locally — DO NOT open index.html via file:// (fetch + HTML-save break). Serve over HTTP:
python3 -m http.server 8080   # then http://localhost:8080/index.html
npm run serve                 # alternative (npx serve)

# Build a single self-contained HTML (inlines local CSS+JS; CDN <script> stay external) → dist/valobois-standalone.html
npm run build:standalone

# Regression checks (run after touching the relevant area — these are the test suite)
npm run check:climate-table            # canton→climate lookup table integrity
npm run check:matrix-export-config     # matrix export config hasn't regressed
npm run check:orientation-parity       # orientation CSS classes match JS

# One-off data importers (not part of normal dev)
npm run import:france-geojson
```

There is no linter, no unit-test runner, and no `npm test`. The `scripts/check-*.mjs` files ARE the regression tests: they load browser scripts into a Node `vm` sandbox (`{ window: {} }`) or parse `valobois-app.js` as text and assert invariants. Run the matching check after editing climate data, matrix export, or orientation logic.

## Architecture

**Entry pages** (each `<head>` lists its own `<script defer>` chain — keep these in sync when adding shared deps):
- `index.html` — the main app (~447 KB, includes all static markup + `<datalist>`/`<template>` nodes). This is where the UI lives.
- `auth.html` → `js/app/auth-page.js` (Firebase sign-in).
- `mes-evaluations.html` → `js/app/mes-evaluations-page.js` (user's saved evaluations list).
- `valobois.html` — legacy redirect to `index.html`.

**Core app**: `js/app/valobois-app.js` (~48k lines) defines `class ValoboisApp`, instantiated at the bottom (`new ValoboisApp()`) which assigns `window.__valoboisApp = this`. Everything else reaches the app through that global.

**Extension patterns** — features are layered onto the app *after* it loads rather than living inside the class:
- **Editor tabs** (`js/app/editor-tab-*.js`): each registers a render hook on `window.ValoboisEditorTabPanels[tabId]`. `js/app/editor-tabs.js` owns tab selection (`ORDER = ['general','lots','notation','analyse','synthese','matrice']`, persisted in `sessionStorage` key `valoboisEditorTab`) and invokes the matching hook on tab change.
- **Patch files** (`js/app/*-patch.js`): IIFEs that monkey-patch behavior onto `window.__valoboisApp` / DOM after the app exists, guarded by a one-time `PATCH_FLAG`. Use this pattern to extend behavior without editing the giant `valobois-app.js`.

**Data layer** (`js/data/*.js`): reference datasets (essences, climate FD P20-651 tables, France departements/cantons, termites/merules CEREMA, rejection-vector matrix, datalists) each attach a frozen global like `window.VALOBOIS_CLIMATE_DATA`. `js/lib/datalist-populate.js` fills empty `<datalist>` elements from these. The `.csv`/`.numbers`/`.pdf` files at repo root are the human-editable sources these JS datasets are generated from (see `scripts/generate-*.mjs`).

**i18n** (`js/i18n/`): `valobois-locales.js` + `valobois-locales-editor.js` hold `fr`/`en` strings; `valobois-i18n.js` exposes `window.t(path)` and `getValoboisLang()`. Language persists in `localStorage` key `valobois_lang` (default `fr`). Static HTML uses `data-i18n="dot.path"` (and `data-i18n-html="1"` for trusted innerHTML); dynamic JS strings use `t()`.

**Persistence**: guest mode → `localStorage` (key `valobois_v1`). Signed-in mode → Firestore at `users/{ownerUid}/evaluations/{evalId}` via `js/lib/valobois-firestore-sync.js`; `evalId` comes from `?eval=`, optional `?owner=` enables shared editing. The required Firestore security rules are documented in a header comment in that file. Firebase config lives in `js/config/firebase-config.js` (local override `firebase-config.local.js` is gitignored).

**Exports**: PDF via pdfmake/jsPDF (CDN); 3D geometry via pure-JS builders with no deps — `js/lib/build-glb.js` (`window.buildGLB`), `build-dae.js`, `build-ifc.js`; barcodes/QR via `lib/bwip-js-min.js` + `lib/qrcode.min.js`. `js/lib/build-standalone-html.js` is the in-browser "Sauvegarder" feature (mirrors `npm run build:standalone`).

## Constraints when editing

- **Plain ES2020, no modules.** Don't add `import`/`export` to browser scripts or introduce a bundler — `scripts/check-*.mjs` and `build-standalone` assume scripts run via `<script>` tags and define globals. Library code (`js/lib/build-*.js`) explicitly notes "pas de modules ESM, pas d'import".
- **Adding a script** = add the file AND its `<script defer src=...>` line to every entry page that needs it, in correct dependency order (data/i18n/constants before the app; tabs/patches after the app).
- **CDN dependencies** (Chart.js, pdfmake, jsPDF, Firebase) are loaded over the network even in the "standalone" build — these are intentionally left as external `<script src="https://…">`.
- `.numbers`/`.pdf` are committed binaries; don't hand-edit the generated `js/data/*.js` — change the CSV source and regenerate via the matching `scripts/generate-*.mjs`.
