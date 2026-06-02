# Radar & scatter charts depend on a CDN-loaded library and fail silently offline

> **Open question** · priority #59 · Tier 7 – Wording, i18n & UX · Source spec: `specs/009-editor-analysis-charts/spec.md`

## Question
The radar and scatter charts require an internet connection; offline they stay empty. Confirm this is acceptable for field use.

<details>
<summary>🇫🇷 Version française</summary>

Les graphiques radar et nuage nécessitent une connexion internet ; hors ligne, ils restent vides. Confirmer que c'est acceptable pour un usage terrain.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; only the product owner can decide whether the offline degradation is acceptable for field use). There is a secondary **correctness / UX-consistency** wrinkle in how the two charts fail.

The dependency is real and confirmed. `index.html:14` loads Chart.js synchronously from a public CDN (`https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`), with no `defer`/`async`, no `integrity`, no local fallback copy, and no Service Worker / PWA manifest caching it. There is no vendored copy of the library in the repo (a `find` for `*chart*` returns only the spec folder and this doc). So if the device is offline when the page first loads, the global `Chart` constructor is simply never defined.

Both the radar and the scatter call `new Chart(...)` directly with no `typeof Chart` guard before instantiation: the radar at `js/app/valobois-app.js:37466` and the scatter at `js/app/valobois-app.js:39053`. (The only `typeof Chart !== 'undefined'` check in the file is at `:38483`, and it merely guards registration of a custom tooltip *positioner* — it does not protect the `new Chart` calls.) Offline, both calls therefore throw a `ReferenceError: Chart is not defined`.

The two charts then degrade *differently*, which is the part worth flagging. `renderRadar` has no internal `try/catch`; its throw propagates up to the single wrapper in `js/app/editor-tab-analyse.js:11-13`, which only `console.warn`s. The result is a blank radar canvas with no user-visible explanation — matching the "stay empty" wording of the question. `renderScatterDims`, by contrast, wraps its body in a `try/catch` (`js/app/valobois-app.js:37680` … `:39495`) whose handler hides the canvas and writes the message **"Graphique indisponible pour ce lot (erreur de rendu)."** (`:39504`). That message is misleading offline: the cause is a missing library, not a per-lot rendering error, and it is identical to the message shown for a genuine data/render fault — so a field user cannot tell "no internet" from "bad data".

What is *not* affected: the "Seuils" gauges. `renderSeuils` (`js/app/valobois-app.js:37124`) is pure DOM and never references `Chart`, so it still renders offline. This confirms the spec's claim (spec.md Edge Cases line 53, Assumptions line 103) that "the rest of the analysis stays visible" — only the radar and the scatter go blank. There is no `navigator.onLine` check or any internet/offline detection anywhere in `js/` or `index.html` tied to the charts; the only "offline" strings in the codebase concern the QR-code label feature, not Chart.js.

What remains uncertain is purely a product decision: whether silent-blank (radar) and misleading-error (scatter) behaviour is acceptable "pour un usage terrain", where connectivity on a demolition/reclamation site is often poor. The code does not resolve this — it documents that the failure mode exists and is unhandled, which is exactly why the question is open.

## Evidence in the code
- `index.html:14` — Chart.js 4.4.0 loaded synchronously from jsDelivr CDN; no `integrity`, no `defer`, no local fallback. (pdfmake/jsPDF at `:16-19` are likewise CDN-only — same offline exposure for exports.)
- `js/app/valobois-app.js:37466` — `this.radarChart = new Chart(ctx, { … })` with no preceding `typeof Chart` guard; throws offline.
- `js/app/valobois-app.js:39053` — `this.scatterDimsChart = new Chart(ctx, { … })` likewise unguarded.
- `js/app/valobois-app.js:38483` — the lone `typeof Chart !== 'undefined'` check; only guards the custom tooltip positioner registration, not chart creation.
- `js/app/editor-tab-analyse.js:8-13` — tab entry point calls `renderSeuils()` / `renderRadar()` / `renderScatterDims()` inside one `try/catch` that only `console.warn`s; a radar throw is swallowed with no UI feedback (radar canvas left blank).
- `js/app/valobois-app.js:39495-39506` — scatter's own `catch` hides the canvas and shows **"Graphique indisponible pour ce lot (erreur de rendu)."** — fires offline but blames a render error, conflating "no library" with "bad data".
- `js/app/valobois-app.js:37124` — `renderSeuils()` is DOM-only (no `Chart` reference): the gauges survive offline, so the tab stays partly usable.
- `specs/009-editor-analysis-charts/spec.md:53,103` — spec already records the dependency as an Assumption and an Edge Case, and as Open Question.
- Repo has no Service Worker, no PWA manifest, and no vendored Chart.js (`find . -iname "*chart*"` returns only docs/spec) — confirming nothing caches the library for offline use.

## What would resolve it
- **Product owner decides** whether blank charts are acceptable for field (offline) use, or whether the app must work offline. This is the gating decision.
- If offline support IS required: vendor Chart.js locally (and pdfmake/jsPDF) and/or add a Service Worker so the library is cached; then the radar/scatter render without a network round-trip.
- If offline degradation is acceptable: at minimum, add a `typeof Chart === 'undefined'` guard before both `new Chart` calls and show a single honest message (e.g. "Graphiques indisponibles hors connexion") for *both* radar and scatter, instead of the current silent-blank radar plus the misleading per-lot "erreur de rendu" on the scatter.
- Runtime confirmation: load `index.html` with the network throttled to offline and open the Analyse tab — verify the gauges still render, the radar canvas is blank, and the scatter shows the "erreur de rendu" message (validates the asymmetric failure documented above).
