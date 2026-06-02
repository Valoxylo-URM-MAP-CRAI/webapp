# Driving-rain wind data is inlined in code, undocumented, and missing 5 departments

> **Open question** · priority #17 · Tier 3 – Reference data · Source spec: `specs/006-geo-france-context/spec.md`

## Question
The dominant rain-wind data is built into the app (not a separate data file like the others), its source is undocumented, and it omits several departments (some Île-de-France, 16, 90, the overseas departments, Corsica beyond 2A/2B), which then show "Non renseigné (Annexe A)". Are these gaps intentional or an incomplete import?

<details>
<summary>🇫🇷 Version française</summary>

Les données de vent (pluie dominante) sont intégrées dans l'application (pas dans un fichier de données comme les autres), de source non documentée, et omettent plusieurs départements (certains d'Île-de-France, 16, 90, les DOM, la Corse au-delà de 2A/2B), qui affichent alors « Non renseigné (Annexe A) ». Ces manques sont-ils volontaires ou un import incomplet ?

</details>

## Why this is open
**Classification:** Cross-file inconsistency + Product-intent ambiguity (the *mechanism* is fully confirmed in code; whether the missing departments are deliberate is a data/product decision).

The wind dataset is structurally the odd one out among the four geographic reference datasets. Climate, termites and merules each live in their own `js/data/*.js` file, exposed as a `window.VALOBOIS_*` global with a provenance header comment (source, refresh date, status legend). The wind data instead is a plain object literal hard-coded inside the method `getGeoFranceWindData()` in `js/app/valobois-app.js` (lines 840-934), with no `window.*` global and **no source comment at all** — the surrounding lines are just the previous method's closing braces. So the "built into the app, source undocumented" part of the question is fully **confirmed**: the only normative attribution that survives is the literal string `'FD P 20-651 - Annexe A'` emitted at consumption time (line 1048), not anything recording the Météo-France station period (the spec's Key Entities note "Météo-France 1994-2008", but that is nowhere in the code).

I also **confirmed the coverage gap precisely**. The object has exactly **91 keys**: `01`–`15`, `17`–`19`, `2A`, `2B`, `21`–`89` (no `90`), `91`, `95`. The department list `js/data/france-departements.js` has **96 codes**: all of metropolitan France plus Corsica `2A`/`2B` (no DOM). Diffing the two sets, the codes selectable in the UI but **absent from wind data are exactly: `16`, `90`, `92`, `93`, `94`**. Department `16` (Charente) and `90` (Territoire de Belfort) are isolated mainland holes; `92`/`93`/`94` are the inner-ring Île-de-France departments — note that the other IDF codes `75`, `77`, `78`, `91`, `95` *are* present (lines 916-932), which matches the question's "some Île-de-France". When any of those five is selected, the consumer at line 1396 does `getGeoFranceWindData()[code] || null`, gets `null`, and the field is set to the literal `'Non renseigné (Annexe A)'` (line 1402) with the wind rose cleared — exactly the observed behaviour. There is no fallback (e.g. a neighbouring station), so the gap surfaces directly to the diagnostician.

The question's framing slightly **overstates the gap on two points**, which is worth recording for triage. (1) Corsica is *not* missing "beyond 2A/2B" — `2A`/`2B` are the only Corsican codes that exist anywhere in `france-departements.js`, and both *are* present in wind data; there is simply no third Corsican code to be missing. (2) The DOM (`971`–`976`) are absent from wind data, but they are equally absent from `france-departements.js` and from `climate-humidification-*.js`; they only appear in `termites-cerema.js` and `merules-cerema.js`. So the DOM are not selectable in the geo widget at all, meaning the missing wind data for DOM is **not user-reachable** — it is consistent with the rest of the geo selection, not a unique wind gap. The genuinely user-reachable, wind-specific holes are the five mainland/IDF codes `16`, `90`, `92`, `93`, `94`.

What remains genuinely **open** is intent and correctness of those five holes. The pattern is suspicious: a near-complete A-Z import that drops `16`, `90`, `92`, `93`, `94` looks more like rows lost during a manual transcription of the FD P 20-651 Annexe A table than a deliberate "these departments have no dominant-wind station" decision — especially since `90` (tiny, no major Météo-France synoptic station of its own) and the inner-ring `92`/`93`/`94` (covered in practice by Paris-Montsouris / Orly / Roissy, which the dataset *does* carry for `75`/`91`/`95`) are exactly the kind of departments a normative table would fold into a neighbour's station rather than omit. But that is an inference; the static code cannot tell us whether Annexe A itself leaves these blank or whether the import dropped them. Only the source table can resolve it.

## Evidence in the code
- `js/app/valobois-app.js:840-934` — `getGeoFranceWindData()` returns an inline object literal of 91 `{ station, directions }` entries; no source/provenance comment precedes it (lines 836-839 are the prior method's braces).
- `js/app/valobois-app.js:842-932` — the 91 keys: `01`-`15`, `17`-`19`, `2A`, `2B`, `21`-`89`, `91`, `95`; verified absent vs the department list: `16`, `90`, `92`, `93`, `94`.
- `js/app/valobois-app.js:1396-1404` — consumer: `entry = getGeoFranceWindData()[code] || null;` → if `null`, sets `windInput.value = 'Non renseigné (Annexe A)'` and clears the wind rose. No neighbour/fallback lookup.
- `js/app/valobois-app.js:1041-1050` — `getGeoFranceWindExportData()` does the same lookup for PDF/CERFA/text exports; missing departments export empty `directions`/`station` (rendered as `—`/`-` by callers at lines 45658, 47223-47224), tagged `'FD P 20-651 - Annexe A'`.
- `js/data/france-departements.js` — 96 department codes (metropole + `2A`/`2B`, **no DOM**); this is the set selectable in the widget, defining which wind gaps are actually reachable.
- `js/data/termites-cerema.js:1-10` and `js/data/merules-cerema.js:11` — contrast: separate file, `window.VALOBOIS_TERMITES_DATA` / `VALOBOIS_MERULES_DATA` global, header comment with source (Cerema) and refresh date (21/03/2024); these two include DOM (`971`-`976`).
- `js/data/climate-humidification-fd-p20-651.js:7` — same pattern: `window.VALOBOIS_CLIMATE_DATA`, separate file (no DOM). Confirms wind is the only one of the four inlined and undocumented.
- `specs/006-geo-france-context/spec.md:105` — spec records the intended source ("FD P 20-651 Annexe A (Météo-France 1994-2008)") that is *not* captured anywhere in the code.

## What would resolve it
- Check FD P 20-651 **Annexe A** directly: do rows for `16`, `90`, `92`, `93`, `94` exist? If yes → it is an **incomplete import** (add the missing rows). If the table folds them into a neighbouring station (very likely for `92`/`93`/`94` → Paris/Orly/Roissy) → either copy that station's row or have the product owner confirm "Non renseigné" is acceptable.
- Product owner confirms whether `16` (Charente) and `90` (Territoire de Belfort) are intentionally left blank or were dropped.
- Decide whether wind data should be migrated to a `js/data/*.js` file with a provenance header like the other three datasets (source, period, refresh date), to remove the documentation gap and make future corrections auditable.
- No action needed for DOM/Corsica: confirmed they are not selectable in the geo widget at all (absent from `france-departements.js`), so their wind absence is consistent and not user-reachable — the question can be narrowed to the five mainland/IDF codes.
