# Gauge and radar axis labels are hardcoded in French while the rest of the app is internationalized

> **Open question** · priority #60 · Tier 7 – Wording, i18n & UX · Source spec: `specs/009-editor-analysis-charts/spec.md`

## Question
The axis labels on the gauges and radar are fixed in French. Confirm this is consistent with the rest of the app's intended behaviour.

<details>
<summary>🇫🇷 Version française</summary>

Les libellés des axes des jauges et du radar sont figés en français. Confirmer la cohérence voulue avec le reste de l'application.

</details>

## Why this is open
**Classification:** Cross-file inconsistency (with a suspected i18n gap)

The behaviour is confirmed: in the "Analyse" tab, the five value-axis labels used by the **Seuils** gauges (`renderSeuils`, valobois-app.js:37124) and the **radar** (`renderRadar`, valobois-app.js:37316) are built from a hardcoded French array `axisMeta = [{ key: 'economique', label: 'Économique' }, …]` (valobois-app.js:37155–37159 and 37325–37329). The `.label` values are pushed straight into the chart data (`const labels = axisMeta.map((axis) => axis.label);`, valobois-app.js:37332) and into the radar tooltip title (`<div class="radar-tooltip-title">${this.escapeHtml(axis.label)}</div>`). Neither function ever calls `window.t(...)` or a `tr(...)` helper for these labels — I grepped the full bodies of both functions and found no i18n lookup for the axis names.

What makes this an inconsistency rather than a deliberate French-only design is that the **same five axis labels already exist as translation keys and are translated elsewhere in the app**. The locale file defines `editor.axis.{economic,ecological,mechanical,historical,aesthetic}` in both French (valobois-locales-editor.js:237–241) and English (valobois-locales-editor.js:694–698 → "Economic", "Ecological", …). Those keys are actually consumed: the Seuils *section headers* in static HTML use them via `data-i18n="editor.axis.economic"` … `editor.axis.aesthetic` (index.html:3257, 3282, 3307, 3332, 3357), and so do the notation value-label boxes (index.html:1515, 1712, 1905, …). The PDF export also translates them (`tpdf('pdf.axis.economic', 'Économique', 'Economic')`, valobois-app.js:46290–46294). The app does ship a live language switch: `getValoboisLang()` returns `'en'` for an English locale (valobois-i18n.js:51), `setValoboisLang` is wired to a real `#valobois-lang-select` dropdown (valobois-i18n.js:122, 137–143; index.html:50–51), and `applyValoboisI18n` re-applies `data-i18n` attributes on switch.

The result is a concrete divergence: when a user switches the app to English, the Seuils section titles and notation labels flip to "Economic / Ecological / …", but the gauge and radar branch labels rendered by Chart.js stay "Économique / Écologique / …". The third chart in the same tab proves the i18n path is the established pattern — the scatter axes go through `tr('editor.scatterDims.axisLength', 'Longueur (mm)')` / `tr('editor.scatterDims.axisSection', 'Section (mm²)')` (valobois-app.js:38841–38842), with real English fallbacks "Length (mm)" / "Width (mm)" in the locale (valobois-locales-editor.js:849). So within a single feature, two charts are localized and two are not.

What I could **not** determine from the code is intent. The spec's own Assumptions state "Les libellés et couleurs des axes sont fixés dans l'application" (spec.md:105), which can be read either as "axis names are fixed *content*" (deliberate) or simply as a description of the as-built hardcoding. Whether the product owner wants the radar/gauge axis labels to follow the language switch (matching the section headers and scatter axes) or to remain French regardless is a product decision, not something the code can answer. Note also that nothing re-renders the radar/seuils on a language change — I found no `onValoboisLangChange` registration in valobois-app.js — so even if the labels were switched to `tr(...)`, a fix would also need to re-run these charts on locale change.

## Evidence in the code
- `js/app/valobois-app.js:37155-37159` — `renderSeuils` builds gauge axes from a hardcoded French `{ key, label: 'Économique' }` array (no `tr`/`t` call).
- `js/app/valobois-app.js:37325-37332` — `renderRadar` does the same; `labels` (French) is fed directly into the chart, and the per-branch tooltip uses `axis.label`.
- `js/app/valobois-app.js:38841-38842` — by contrast, the scatter axes in the *same* tab are localized via `tr('editor.scatterDims.axisLength', …)` / `tr('editor.scatterDims.axisSection', …)`.
- `js/i18n/valobois-locales-editor.js:237-241` and `:694-698` — `editor.axis.{economic…aesthetic}` keys exist in FR and EN ("Economic", "Ecological", "Mechanical", "Historical", "Aesthetic") but are never read by `renderSeuils`/`renderRadar`.
- `index.html:3257,3282,3307,3332,3357` — Seuils section headers DO use `data-i18n="editor.axis.*"`, so the headers translate while the JS-rendered gauge/radar labels do not.
- `js/i18n/valobois-i18n.js:51,122,137-143` + `index.html:50-51` — a live FR/EN language switch exists (`#valobois-lang-select`), so the divergence is reachable at runtime.
- `js/app/valobois-app.js:46290-46294` — PDF export translates the same axes via `tpdf(... 'Économique', 'Economic')`, reinforcing that EN labels are intended to exist.
- `specs/009-editor-analysis-charts/spec.md:105` — Assumption "Les libellés et couleurs des axes sont fixés dans l'application" is ambiguous between "fixed content" and "hardcoded".

## What would resolve it
- Product owner confirms whether radar/gauge axis labels should follow the FR/EN language switch (like the Seuils headers and scatter axes) or stay French by design.
- If they should be localized: switch the `label` values in the `axisMeta` arrays (valobois-app.js:37155 and 37325) to `tr('editor.axis.economic', 'Économique')` etc. using the existing keys, and register `renderSeuils`/`renderRadar` (plus `renderScatterDims`) with `onValoboisLangChange` so the charts re-render on locale change.
- Runtime check: load the app, switch `#valobois-lang-select` to English, open the "Analyse" tab, and confirm whether the radar branch labels and gauge titles change — this would demonstrate the inconsistency live and validate any fix.
