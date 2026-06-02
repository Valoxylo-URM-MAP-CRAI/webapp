# Reference data is French-only while the app ships a real English UI mode

> **Open question** · priority #52 · Tier 7 – Wording, i18n & UX · Source spec: `specs/017-reference-data-catalog/spec.md`

## Question
All reference data (species names, normative labels, suggestion lists) is French-only; only the rarity table carries a pilot English name. Does the product intend to translate this content?

<details>
<summary>🇫🇷 Version française</summary>

Toutes les données de référence (noms d'essences, libellés normatifs, listes de suggestions) sont en français uniquement ; seule la table de rareté porte un nom pilote anglais. Le produit prévoit-il de traduire ce contenu ?

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a secondary thread of legacy / dead code on the one English column that does exist).

The code is unambiguous about *what* it does; what is undecided is whether that behaviour is intended. The app ships a genuine bilingual UI: `js/i18n/valobois-i18n.js` reads/persists a `valobois_lang` value (`fr` default, `en` valid) and a language `<select>` is wired through `getValoboisLang()`. But that machinery only ever translates *UI chrome*: `t(key)` and `applyValoboisI18n()` resolve dot-paths against `window.ValoboisLocales[lang]` and write them into elements tagged `data-i18n` / `data-i18n-title` / etc. The locale object (`js/i18n/valobois-locales.js`) contains only interface strings (`banner`, `lang`, `auth`, `mesEval`, …) in parallel `fr:` and `en:` blocks. No reference dataset is keyed there, and the translation layer never inspects dataset content. So when a user switches to English, the chrome flips but every species name, normative label, origin string and suggestion-list entry stays French. I confirmed this is intrinsic to the design, not a missing-string gap: there is simply no code path by which dataset content could ever be localised.

The datasets themselves are authored French-only. The species references (`js/data/essences-valobois.js`, `js/data/essences-bois.js`), the longevity table (`js/data/longevite-fd-p20-651.js`) and the Tropix list (`js/data/tropix-essences.js`) carry **no** English-name field at all (a grep for `nameEn`/`nomEn`/`nomAnglais`/`nomPilote` across those four files returns zero hits). Origins, families and remarks are free French text (`origine: "Europe / Amérique du Nord (Cultivé)"`, `remarques: "Sujet au bleuissement …"`). The free-text suggestion lists (`datalist-*.js`) and the timber-vocabulary list (`termes-bois.js`) are likewise French-only.

The sole exception is exactly as the question states: the rarity & provenance table (`js/data/rarete-provenance.js`) has a `Nom pilote (EN)` CSV column, parsed into a `nomPiloteEn` field. This is the secondary, more concrete finding: **that English column is parsed but read by nothing.** Outside the data file, `nomPiloteEn` appears only twice in the whole codebase, both in `valobois-app.js` custom-rarity plumbing — `normalizeRareteCustomEntry` copies it through (line 15086) and `addRareteCustomEntry` hard-codes it to `''` (line 15154). No rendering, export, lookup or matching path consumes it; rarity matching keys on code, French name and scientific name (per spec FR-005 / US4). So the "pilot English name" is effectively dead data — a half-started bilingual experiment on one table, never surfaced to the user and never collected for custom entries.

What I confirmed: the UI has a working FR/EN toggle; dataset content is structurally French-only; the only English dataset column (`nomPiloteEn`) is unused by any consumer. What remains uncertain is purely the product decision: is French-only reference content the deliberate scope (VALOBOIS being a French regulatory/normative tool tied to EN 350, FD P 20-651, Cerema and french-geojson sources), or is the `en` UI mode meant to eventually carry translated content — in which case the lone `Nom pilote (EN)` column is the seed of an unfinished feature. The spec's own Assumptions section already records this as intentional-for-now ("All dataset content is authored in French … there is no English version of this content"), which leans toward "deliberate scope", but that is an assumption, not a confirmed product decision.

## Evidence in the code
- `js/i18n/valobois-i18n.js:40-47` — `t(key)` resolves only against `window.ValoboisLocales[lang]` then the `fr` fallback; it never touches dataset arrays.
- `js/i18n/valobois-i18n.js:55-80` — `applyValoboisI18n()` translates only DOM nodes carrying `data-i18n*` attributes; dataset-driven content is rendered outside this path.
- `js/i18n/valobois-locales.js:5,109` — parallel `fr:` and `en:` blocks contain UI chrome only (`banner`, `lang`, `auth`, `mesEval`, …); no species/rarity/datalist entries.
- `js/data/essences-valobois.js:11-24` — species rows are French-only (`origine`, `remarques` free French text); no English-name field.
- `js/data/essences-bois.js:1-24` and `js/data/longevite-fd-p20-651.js`, `js/data/tropix-essences.js` — grep for any English-name key returns 0 hits across all four.
- `js/data/rarete-provenance.js:4` — the rarity CSV header is the only dataset to include a `Nom pilote (EN)` column.
- `js/data/rarete-provenance.js:24` — that column is parsed into `nomPiloteEn`.
- `js/app/valobois-app.js:15086` — `normalizeRareteCustomEntry` copies `nomPiloteEn` through, but nothing reads it.
- `js/app/valobois-app.js:15154` — `addRareteCustomEntry` always sets `nomPiloteEn: ''`, so custom entries never even collect an English name; confirms the field is inert.
- `specs/017-reference-data-catalog/spec.md:117` (Assumptions) — records French-only content as the current intent and names the rarity table as the only carrier of an English pilot name.

## What would resolve it
- Product owner confirms whether French-only reference content is the deliberate, permanent scope (likely, given the French normative sourcing) or whether the EN UI mode is meant to eventually localise dataset content too.
- If French-only is confirmed intentional: decide the fate of the unused `Nom pilote (EN)` column in `rarete-provenance.js` — either remove it (and the `nomPiloteEn` plumbing in `valobois-app.js`) as dead data, or document it as a deliberate seed for future translation.
- If translation is intended: define which datasets need English (species names, normative labels, suggestion lists) and add a content-localisation path — none exists today, since `t()`/`applyValoboisI18n` cover UI chrome only.
- A grep/runtime check confirming no exporter or report renders `nomPiloteEn` (already done statically: only the two `valobois-app.js` plumbing references exist) would lock in the "dead column" conclusion.
