# Standalone-HTML save builder exists but no UI control invokes it

> **Open question** · priority #35 · Tier 4 – Exports · Source spec: `specs/014-export-standalone-html/spec.md`

## Question
The standalone-HTML builder is present and reopening an embedded evaluation works, but no committed button or control actually triggers the save. The README describes a « Sauvegarder » action that is absent from this version. Is this partly-finished functionality?

<details>
<summary>🇫🇷 Version française</summary>

Le constructeur HTML autonome est présent et la réouverture d'une évaluation intégrée fonctionne, mais aucun bouton ni contrôle ne déclenche réellement la sauvegarde. Le README décrit une action « Sauvegarder » absente de cette version. Fonctionnalité partiellement terminée ?

</details>

## Why this is open
**Classification:** Legacy / dead code (partly-finished feature) — with a secondary Cross-file inconsistency (README vs. shipped code).

The browser-side save builder is fully implemented and loaded into the page, yet nothing in the codebase ever calls it. `js/lib/build-standalone-html.js:75` defines `global.buildValoboisStandaloneHtml(options)`, and `index.html:5664` loads that script (`<script defer src="js/lib/build-standalone-html.js">`), so `window.buildValoboisStandaloneHtml` is available at runtime. But a repo-wide grep for the symbol returns only its definition — no caller, no event listener, no `onclick`, no menu/toolbar item. There is also no download plumbing anywhere near it: a grep for `createObjectURL` / `new Blob` / `download` against an HTML/standalone context in `js/app/valobois-app.js` yields nothing. So even if the function were invoked, the produced HTML string is never turned into a downloadable file. This is the half that is missing: the builder returns a string; the trigger + download UI does not exist.

The *reopening* half, by contrast, is real and wired. The builder embeds the evaluation by injecting `window.__VALOBOIS_DATA__` into `<head>` (`build-standalone-html.js:6-16`), and the running app reads it on startup: `valobois-app.js:8783-8790` (`loadGuestDataFromLocalStorage`) checks `window.__VALOBOIS_DATA__`, normalizes it, and writes it to both the primary and backup localStorage keys before using it as the working evaluation. `valobois-firestore-sync.js:513-517` also consumes/clears the same global. This confirms the spec's claim that "the reopening side knows how to read embedded data" — it does. The gap is strictly on the *producing/triggering* side in the live app.

The README is inconsistent with the shipped code in two concrete ways. First, `README.md:64-66` documents a « Sauvegarder depuis l'interface » action ("export HTML with the current evaluation state … browser-side"), but no such control ships — confirming the spec's User Story 2 note (`spec.md:29`) that "no visible button in this version actually triggers it." Second, the README states that on failure "le message d'erreur propose d'utiliser `npm run build:standalone`" (`README.md:66`), but that fallback wording exists nowhere in the JS: a grep for `build:standalone` / `npm run build` across `js/` and `index.html` returns nothing. The only error the builder can emit is the generic `'Échec du chargement : ' + url` thrown by `fetchText` (`build-standalone-html.js:24`) — there is no command-line fallback hint. Likewise, the spec's edge case about `file://` is documentation-only: nothing in the code detects or guards the protocol; an un-served page would simply hit a `fetch` failure inside `fetchText`.

What I confirmed: the builder is defined and loaded but never invoked; no download wiring exists; the embedded-data restore path is genuinely implemented; the README's « Sauvegarder » trigger, its command-line fallback message, and the `file://` safeguard are all absent from the code. What remains uncertain is intent — whether the in-app save was deliberately deferred (builder pre-staged for a future UI) or quietly dropped. That is a product/roadmap decision, not something the static code can answer; hence the question is genuinely open.

## Evidence in the code
- `js/lib/build-standalone-html.js:75` — `buildValoboisStandaloneHtml(options)` is defined on the global object; it inlines local CSS/JS, embeds data, hides modals, and returns an HTML string.
- `index.html:5664` — `<script defer src="js/lib/build-standalone-html.js">` loads the builder into the page, so `window.buildValoboisStandaloneHtml` exists at runtime.
- grep `buildValoboisStandaloneHtml` across `js/` + `index.html` — only the definition matches; **zero callers**, no listener, no toolbar/menu entry.
- grep `createObjectURL` / `new Blob` / `download` (HTML/standalone context) in `js/app/valobois-app.js` — no matches; the returned string is never converted to a downloadable file.
- `js/lib/build-standalone-html.js:6-16` — `injectValoboisDataScript` embeds the evaluation as base64 JSON into `window.__VALOBOIS_DATA__` in `<head>`.
- `js/app/valobois-app.js:8783-8790` — `loadGuestDataFromLocalStorage` detects `window.__VALOBOIS_DATA__`, normalizes it, and persists it to `storageKey` + `storageBackupKey` (reopening path works).
- `js/lib/valobois-firestore-sync.js:513-517` — also reads/clears `window.__VALOBOIS_DATA__`, corroborating the restore contract.
- `js/lib/build-standalone-html.js:22-26` — the only failure surfaced is `Error('Échec du chargement : ' + url)`; no command-line fallback message.
- grep `build:standalone` / `npm run build` across `js/` + `index.html` — no matches; the README's documented fallback message is not implemented.
- `README.md:64-66` — documents the « Sauvegarder » in-app action, the HTTP-only requirement, and the `build:standalone` fallback message — none of which are wired in the code.

## What would resolve it
- Product owner / maintainer states intent: is the in-app « Sauvegarder » deferred-but-planned (keep the loaded builder, add a button) or abandoned (remove the dead `buildValoboisStandaloneHtml` + its `<script>` tag from `index.html`)?
- If keeping: implement the missing trigger — a UI control that calls `buildValoboisStandaloneHtml({ data })` and downloads the returned string (Blob + `createObjectURL`), plus the `file://`/load-failure fallback message that points to `npm run build:standalone`, matching `README.md:64-66`.
- Confirm by re-grepping that `buildValoboisStandaloneHtml` is referenced by at least one caller and that a download path (`createObjectURL`/`Blob`) exists, so the README and code agree.
