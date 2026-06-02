# English interface coverage is partial: ~270 on-screen texts stay French

> **Open question** · priority #51 · Tier 7 – Wording, i18n & UX · Source spec: `specs/016-internationalization/spec.md`

## Question
Switching to English translates the tabs and top-level labels, but about 270 on-screen texts stay French (the whole geographic-context block, the lot detail panel, several pop-ups), and one English export label is still French with a typo ("Rhinon" for Rhino). Is a fully English interface intended?

<details>
<summary>🇫🇷 Version française</summary>

Le passage en anglais traduit les onglets et les libellés de premier niveau, mais environ 270 textes à l'écran restent en français (tout le bloc contexte géographique, le panneau de détail des lots, plusieurs pop-ups), et un libellé d'export anglais est encore en français avec une coquille (« Rhinon » pour Rhino). Une interface entièrement anglaise est-elle prévue ?

</details>

## Why this is open
**Classification:** Product-intent ambiguity (primary), with one embedded suspected bug (the `exportGh` label / "Rhinon" typo) and one cross-file inconsistency in how translatable strings are wired.

The i18n machinery itself works exactly as the spec describes and is *not* the gap. `t()` in `js/i18n/valobois-i18n.js:40` looks up the key in the chosen language, falls back to French (`resolvePath(locales.fr, key)`, line 46), and finally returns the raw key as a harmless placeholder. Static HTML is translated by `applyValoboisI18n` scanning `[data-i18n]`, `[data-i18n-title]`, `[data-i18n-aria-label]` and `[data-i18n-placeholder]` nodes (lines 58–82). I confirmed the dictionaries are essentially complete and parallel: `fr.editor` (lines 6–463 of `valobois-locales-editor.js`) and `en.editor` (lines 465–910) carry 419 vs 414 `key: value` lines respectively — so the English gap is **not** caused by missing dictionary entries.

The gap is that a large body of on-screen French text is **never routed through the translation layer at all** — it is hardcoded either in `index.html` without any `data-i18n*` attribute, or inside JavaScript template literals in `valobois-app.js` as plain French rather than `t('…')` calls. I verified this concretely for the two areas the question names. The entire geographic-context block in `index.html` (the `accueil-geo-france-*` region, roughly lines 985–1125) contains **zero** `data-i18n` attributes: "Département", "Canton", "Vigilance termites", "Vigilance mérules", the climate hint, and placeholders such as "Sélectionnez un département" are raw text that `applyValoboisI18n` cannot reach, so they stay French in English mode. Compare the immediately adjacent line 1220 (`data-i18n="editor.meta.diagTermites"`), which *is* wired — showing the wiring is selective, not systematic. Across `index.html` there are 674 `data-i18n`, 5 `data-i18n-aria-label` and 23 `data-i18n-placeholder` hooks (matching the spec's SC-002 counts), but everything outside those hooks is fixed French.

The lot detail panel is the same story on the JS side: "Pièce dans cette combinaison" and "Type de pièce" are emitted as literal French in template strings and direct `textContent` assignments — e.g. `valobois-app.js:26616`, `26650`, `25826`, and `27662`/`27701` — none of which call `t()`. The Tropix confirmation pop-up is likewise hardcoded: `openResetConfirmModal({ title: 'Ouvrir la fiche Tropix', message: \`Ouvrir une nouvelle fenêtre vers la fiche Tropix…\`, confirmLabel: 'Ouvrir la fiche' })` at `valobois-app.js:19903–19908`. These are by-construction French regardless of the selected language.

The one genuine **bug** is the `exportGh` label. In the English dictionary (`valobois-locales-editor.js:686`) the value is literally `'3D à reconstruire - Rhinon + Grasshopper (JSON)'` — identical to the French entry at line 229, untranslated, and containing the misspelling "Rhinon" (should be "Rhino"). Because the English value exists, `t()` does *not* fall back; it returns this French-with-typo string. The same typo is in the French source and in the `index.html` `<option data-i18n="editor.common.exportGh">` (line 5264) and in the warning text at `valobois-app.js:21647`, so it is a consistent authoring error, not a fallback artifact.

What remains genuinely open is **product intent**: spec `016-internationalization` itself documents this as as-built and explicitly lists "Partial English coverage" as an edge case (spec line 60) and as the primary open question (spec line 110). The code unambiguously produces a partial-English UI; what a maintainer cannot determine from the code is whether full English coverage is a goal (in which case the geo block, lot panel and pop-ups need wiring) or whether partial coverage is intentionally acceptable. The "Rhinon"/`exportGh` issue, by contrast, is fixable without any product decision.

## Evidence in the code
- `js/i18n/valobois-i18n.js:40-48` — `t()` looks up the active language, falls back to `locales.fr`, then returns the key; confirms French fallback and placeholder behaviour.
- `js/i18n/valobois-i18n.js:58-82` — `applyValoboisI18n` only translates nodes carrying `data-i18n` / `-title` / `-aria-label` / `-placeholder`; anything without these attributes is untouched.
- `js/i18n/valobois-locales-editor.js:6-463` vs `465-910` — `fr.editor` and `en.editor` are near-complete parallels (419 vs 414 entries), so the gap is wiring, not missing translations.
- `index.html` lines 985–1125 — entire `accueil-geo-france-*` geographic-context block has 0 `data-i18n` attributes (verified by grep); "Département", "Canton", "Vigilance termites/mérules", climate hint, placeholders all hardcoded French.
- `index.html:1220` — adjacent `data-i18n="editor.meta.diagTermites"` shows wiring is selective; the geo block was simply never migrated.
- `js/app/valobois-app.js:26616,26650,25826,27662,27701` — lot detail panel emits "Pièce dans cette combinaison" / "Type de pièce" as literal French (template strings / `textContent`), never via `t()`.
- `js/app/valobois-app.js:19903-19908` — Tropix pop-up title/message/confirm label hardcoded in French ("Ouvrir la fiche Tropix").
- `js/i18n/valobois-locales-editor.js:686` — English `exportGh` value is the untranslated French string with the "Rhinon" typo, flanked by correctly translated keys (line 684 `exportIntro: 'Choose content…'`, line 687 `footerReset: 'Reset'`).
- `js/i18n/valobois-locales-editor.js:229`, `index.html:5264`, `js/app/valobois-app.js:21647` — same "Rhinon" typo replicated in the French source, the HTML option, and the warning text.

## What would resolve it
- Product owner decides whether a fully English UI is a goal. If yes, the geo-context block, lot detail panel and JS-built pop-ups must be migrated to `data-i18n` / `t()` and given `en` dictionary entries; if no, record partial coverage as intentional and downgrade this item.
- Independent of that decision, fix the `exportGh` label: correct "Rhinon" → "Rhino" in the French source (`valobois-locales-editor.js:229`, `index.html:5264`, `valobois-app.js:21647`) and provide a real English translation at `valobois-locales-editor.js:686` (e.g. "3D for rebuild — Rhino + Grasshopper (JSON)") so the fallback no longer surfaces French.
- To size the full-coverage effort, grep for French literals in `valobois-app.js` template strings and for HTML text nodes lacking `data-i18n` (the geo block at `index.html` 985–1125 is the largest single cluster).
