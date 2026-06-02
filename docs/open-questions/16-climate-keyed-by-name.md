# Climate data keyed by department name vs. code-keyed wind/termite/mérule data

> **Open question** · priority #16 · Tier 3 – Reference data · Source spec: `specs/006-geo-france-context/spec.md`

## Question
The climate (humidity) data is keyed by department name, while wind, termite and mérule data are keyed by department code; a spelling difference between files would silently yield "department not found". Should name consistency across datasets be guaranteed?

<details>
<summary>🇫🇷 Version française</summary>

Les données climat (humidité) sont indexées par le nom du département, alors que vent, termites et mérules le sont par le code ; une différence d'orthographe entre fichiers donnerait « département introuvable » silencieusement. Faut-il garantir la cohérence des noms entre jeux de données ?

</details>

## Why this is open
**Classification:** Product-intent ambiguity (data-integrity convention), with a *latent* correctness risk that is currently not triggered.

The premise is factually correct. The four geographic datasets are keyed two different ways:

- **Climate** (`VALOBOIS_CLIMATE_DATA`) is keyed by an uppercase, near-normative **department name** (`"ALPES-DE-HAUTE-PROVENCE"`, `"COTE-DOR"`, …). At lookup time `getGeoFranceClimateCondition` builds the lookup key from the *name* — `valobois-app.js:1337` does `const depKey = this._normalizeGeoFranceClimateKey(departementNom);` and, if no entry matches, returns the silent fallback `"Non déterminée (département introuvable)"` (`valobois-app.js:1340-1346`).
- **Wind, termites and mérules** are all keyed by the **2-digit department code** (`getGeoFranceWindExportData` at `valobois-app.js:1043`, the termite display at `valobois-app.js:1062`, the mérule display at `valobois-app.js:1113`), via `String(geo.departementCode).padStart(2, '0').toUpperCase()`.

So a department whose *name* is spelled differently between `france-departements.js` and `climate-humidification-fd-p20-651.js` would indeed fall into the silent "département introuvable" branch for climate only, while wind/termites/mérules (code-based) would keep working. That asymmetry is real.

What tempers the risk is **where `departementNom` comes from at runtime**. The user never types the department name: it is always copied from the canonical departements list. `setGeoFranceDepartement` looks the selection up by code and sets `next.departementNom = departement ? String(departement.nom || '') : ''` (`valobois-app.js:1464-1467`). Therefore the climate key and the departements list always derive from the *same* generated file (`france-departements.js`) at runtime — the only place the two strings can ever diverge is **between the two static data files**, i.e. a generation/maintenance error, not a user action. A persisted old selection could in principle reload a stale `departementNom` (`getDefaultGeoFrance` at `valobois-app.js:799-810` trusts the stored string), but in practice it too originated from the same list.

The codebase already contains a guard for exactly this concern: `_validateGeoFranceClimateData` (`valobois-app.js:1197-1262`) normalizes every climate-data department name and checks it against the departements list, collecting `unknownDepartments`; `_logGeoFranceClimateValidationReport` (`valobois-app.js:1264-1286`) then emits a `console.warn` when any mismatch is found. This validation runs once when the climate index is first built (`valobois-app.js:1315-1317`). It is a *developer-facing* safety net — it logs to the console but does not surface to the diagnostician nor block the build. The matching is also tolerant: `_normalizeGeoFranceClimateKey` (`valobois-app.js:1006-1013`) strips accents, uppercases and removes every non-alphanumeric character, so `"Alpes-de-Haute-Provence"`, `"ALPES-DE-HAUTE-PROVENCE"` and `"alpes de haute provence"` all collapse to the same key — only a genuine letter difference (not punctuation/accents/case) would break the join.

I **confirmed** that today there is no mismatch: a normalized cross-join of the 96 climate keys against the 96 departement-list names finds 0 climate keys unmatched and 0 departements without a climate entry (run against `js/data/france-departements.js` and `js/data/climate-humidification-fd-p20-651.js`). So the failure mode is currently dormant. What remains **open** is the product/maintenance convention: nothing *enforces* this invariant (no test, no build-time assertion, only a console warning that a maintainer must happen to read), so a future edit to either generated file could reintroduce a silent per-department climate dropout. The decision to make is whether keying climate by name (instead of by the code already present for the other three datasets) is acceptable given that soft guard, or whether the convention should be hardened.

## Evidence in the code
- `js/data/climate-humidification-fd-p20-651.js:7-…` — `VALOBOIS_CLIMATE_DATA` keyed by uppercase department **name** (`"AIN"`, `"ALPES-DE-HAUTE-PROVENCE"`, `"COTE-DOR"`).
- `js/data/termites-cerema.js:10-…` and `js/data/merules-cerema.js:11-…` — `VALOBOIS_TERMITES_DATA` / `VALOBOIS_MERULES_DATA` keyed by 2-digit **code** (`"01"`, `"02"`, …).
- `js/app/valobois-app.js:840-933` — `getGeoFranceWindData()` keyed by code (`'01'`, `'2A'`, …); wind is also inline in the app, not a separate data file.
- `js/app/valobois-app.js:1337-1346` — climate lookup uses `_normalizeGeoFranceClimateKey(departementNom)`; missing key returns the silent `source: 'missing-departement'` / `"Non déterminée (département introuvable)"`.
- `js/app/valobois-app.js:1043`, `:1062`, `:1113` — wind export, termite display and mérule display each key by `departementCode`.
- `js/app/valobois-app.js:1464-1467` — `departementNom` is always taken from the departements list entry found by code, never user-entered, so name and code stay consistent at runtime.
- `js/app/valobois-app.js:1006-1013` — `_normalizeGeoFranceClimateKey` strips accents/punctuation/case (so only true letter differences break the join).
- `js/app/valobois-app.js:1197-1262` + `:1264-1286` + `:1315-1317` — `_validateGeoFranceClimateData` / `_logGeoFranceClimateValidationReport` cross-check climate names against the departements list and `console.warn` on mismatch (dev-only, non-blocking, run once when the index is built).
- Cross-join check (run locally): 96 climate keys ↔ 96 departement names, **0 mismatches** in either direction today.

## What would resolve it
- Product owner / maintainer decides whether name-keyed climate is acceptable given the existing console-only validation, or whether the invariant should be hardened.
- If hardening is wanted: add climate by code too (or a generated code↔name map) so climate joins on the same key as wind/termites/mérules, eliminating the name-spelling failure mode entirely.
- Alternatively, promote `_validateGeoFranceClimateData`'s `unknownDepartments` result from a `console.warn` to a build-time assertion or a unit test over `france-departements.js` × `climate-humidification-fd-p20-651.js`, so a future data edit that introduces a spelling drift fails CI instead of silently dropping climate for one department.
