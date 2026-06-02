# What refreshes the Synthèse tab content

> **Open question** · priority #56 · Tier 7 – Wording, i18n & UX · Source spec: `specs/010-editor-synthesis-orientation/spec.md`

## Question
The Synthèse tab does not trigger its own rendering — it is driven elsewhere by the editor render. Confirm what refreshes the synthesis when the tab is opened.

<details>
<summary>🇫🇷 Version française</summary>

L'onglet « Synthèse » ne déclenche pas son propre affichage — il est piloté ailleurs par le rendu de l'éditeur. Confirmer ce qui rafraîchit la synthèse à l'ouverture de l'onglet.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; what is open is whether the resulting refresh model is the intended UX).

The mechanism is fully traceable in static reading — there is no bug or untraced path here. The Synthèse tab has **no per-tab render hook**: `js/app/editor-tab-synthese.js` registers `ValoboisEditorTabPanels.synthese` as an empty stub (`/* Réservé : orientation / synthèse opération */`). The tab framework (`js/app/editor-tabs.js`) does look up and invoke that hook in `selectTab()` (line 41-48), but since the synthese hook is a no-op, opening the tab does **not** recompute or re-render anything.

Instead, the three Synthèse sections — `orientationSection`, `syntheseLotsPositionSection`, and the operation-evaluation card — live permanently in the DOM inside the `editor-tabpanel-synthese` panel (`index.html:3433-3520`); the panel is merely toggled via the `hidden` attribute by `selectTab()` (`editor-tabs.js:27-28`). Their content is produced by `renderOrientation()` (`valobois-app.js:39510`, which itself calls `renderSyntheseLotsPositionPanel()` at line 39841) and `renderEvalOp()` (`valobois-app.js:39917`). These are invoked from two places only: (1) the global editor `render()` method, which calls `renderOrientation()` then `renderEvalOp()` back-to-back (`valobois-app.js:25559-25560`), and (2) `computeOrientation(lot)`, which re-runs both at the end of every orientation recompute (`valobois-app.js:39872` and `39876`). `computeOrientation` is called from dozens of matrix/notation edit handlers (e.g. lines 7674, 7718, 27455, plus many `renderEvalOp()` "temps réel" calls such as 27469). So the synthesis is kept current **eagerly**, on every notation/lot edit and on every full editor render — not lazily on tab open.

This confirms FR-015 of the spec ("L'affichage de la synthèse … DOIT être déclenché par le rendu général de l'éditeur, et non par l'onglet « Synthèse » lui-même"): the as-built behaviour matches the spec. The single listener that *does* react to the tab switch is `window.addEventListener('valobois-editor-tab', …)` at `valobois-app.js:19921`, and it only clears accordion open-states (`_accordionOpenStates.clear()` / `_customInfoAccordionOpenStates.clear()`) — it triggers no synthesis refresh.

What remains genuinely open is therefore a **product-intent / UX** call, not a code question: because nothing recomputes on tab activation, if the synthesis-relevant data is ever mutated through a path that does **not** route through `computeOrientation()` or the global `render()`, opening the Synthèse tab would display stale numbers until the next edit. With the current edit handlers everything funnels through those two entry points, so in practice the data stays fresh; but the design relies on every future mutation remembering to call one of them. The product owner / maintainer should confirm whether this eager-everywhere model is the intended contract, or whether a defensive refresh-on-open (filling the empty `synthese` hook) is wanted as a safety net.

## Evidence in the code
- `js/app/editor-tab-synthese.js:4-6` — the `synthese` tab panel hook is an empty stub; opening the tab runs no render logic.
- `js/app/editor-tabs.js:41-48` — `selectTab()` does call `ValoboisEditorTabPanels[tabId]()`, so the empty synthese hook is the deliberate reason nothing renders on open.
- `js/app/editor-tabs.js:27-28` — tab panels are only shown/hidden via the `hidden` attribute; the synthese DOM is never created or destroyed on switch.
- `index.html:3433-3520` — `editor-tabpanel-synthese` statically contains `orientationSection` (3435), `syntheseLotsPositionSection` (3452) and the eval-op card (3466); they exist regardless of which tab is active.
- `js/app/valobois-app.js:25541-25560` — the global `render()` calls `renderOrientation()` and `renderEvalOp()`; `render()` is invoked at editor open/load (e.g. lines 686, 19450, 19749).
- `js/app/valobois-app.js:39872,39876` — `computeOrientation(lot)` re-runs `renderOrientation()` and `renderEvalOp()` after every orientation recompute.
- `js/app/valobois-app.js:39841` — `renderOrientation()` chains into `renderSyntheseLotsPositionPanel()`, so the position bar is refreshed on the same path.
- `js/app/valobois-app.js:19921-19924` — the only `valobois-editor-tab` listener just clears accordion state; it performs no synthesis refresh.
- `js/app/valobois-app.js:7674, 7718, 27455, 27469, 29536, …` — the many edit handlers that call `computeOrientation(...)` / `renderEvalOp()`, which is what actually keeps the synthesis current.

## What would resolve it
- Product owner confirms the intended contract: "synthesis is refreshed eagerly by `render()` and `computeOrientation()`, never on tab open" (matches FR-015) — and accepts that any new mutation path must call one of those.
- Optionally, decide whether to fill the empty `ValoboisEditorTabPanels.synthese` hook with a `this.render()` (or targeted `renderOrientation()` + `renderEvalOp()`) call as a defensive refresh-on-open, so the tab can never show stale figures.
- Verification test: with the editor open on another tab, mutate a lot's volume/price/orientation, switch to Synthèse, and confirm the figures are already up to date (they should be, because the mutating handlers call `computeOrientation`/`renderEvalOp`). Then audit for any data-mutation path that bypasses both entry points.
