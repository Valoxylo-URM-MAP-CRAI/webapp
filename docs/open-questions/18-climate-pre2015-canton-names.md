# Pre-2015 canton names in the humidity climate table rely on a name bridge

> **Open question** · priority #18 · Tier 3 – Reference data · Source spec: `specs/017-reference-data-catalog/spec.md`

## Question
The humidity climate table uses older (pre-2015) canton names and relies on a name bridge to reach today's geography; cantons that cannot be matched are flagged by a consistency check and need review.

<details>
<summary>🇫🇷 Version française</summary>

La table climat (humidité) utilise les anciens noms de canton (avant 2015) et s'appuie sur un pont de noms pour rejoindre la géographie actuelle ; les cantons non rapprochés sont signalés par un contrôle de cohérence et à revoir.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a latent maintenance/correctness risk in how the consistency check is surfaced).

The mechanism described in the question is real and confirmed in code. The climate dataset `js/data/climate-humidification-fd-p20-651.js` keys both départements and canton exceptions by the **pre-2015 normative names** taken from FD P 20-651 (06/2011), Annexe B — its header comment states "Les noms de departement/canton sont conserves proches de la source normative." (`climate-humidification-fd-p20-651.js:6`). These names predate the March 2015 canton reform, so many no longer exist in the current geography (e.g. `"BRENOD"`, `"AURILLAC 4E CANTON"`, `"AJACCIO 7E CANTON"`, `"MONTELIMAR 1E CANTON"`). To reconcile them with the current `france-cantons` data, a generated bridge file `climate-humidification-fd-p20-651-aliases.js` maps each pre-2015 normative name to its post-2015 successor (e.g. `"BRENOD": "Hauteville-Lompnes"`), built by crossing INSEE COG 2015 and COG 2023 codes.

At runtime, `getGeoFranceClimateCondition()` resolves a climate level for the user's selected (current) canton by first looking up the **target** post-2015 name in the alias index (`_findGeoFranceClimateAliasNormativeKeysByTarget`, `valobois-app.js:1350`) to recover the matching normative exception, then falling back to a direct normalized-key match and finally a prefix/`startsWith` fuzzy match (`_isGeoFranceClimateCantonMatch`, `valobois-app.js:1015-1021`). This is the "name bridge" the question refers to, and it is the core of how a 2011-era table is read against 2023 geography. The ambiguity is not in the implementation but in whether this layered, partly-fuzzy bridge is the intended long-term design — the data is deliberately frozen to the normative source, and reconciliation to live geography is delegated to a generated mapping plus a fuzzy fallback that a product owner would need to bless as "accurate enough."

I **confirmed** the "consistency check" exists: `_validateGeoFranceClimateData()` (`valobois-app.js:1197-1262`) builds a report with `unknownCantons` / `ambiguousCantons` / `unknownDepartments` / invalid-level buckets, and `_logGeoFranceClimateValidationReport()` (`valobois-app.js:1264-1286`) emits it. I **also confirmed** that, as the data stands today, the check passes cleanly: running the standalone equivalent `scripts/check-climate-table.mjs` returns zero `unknownCantons`, zero `ambiguousCantons`, and zero unknown départements. So the "cantons that cannot be matched … need review" condition currently has **no live offenders** — it is a guardrail for future data/geometry drift, not an open defect today.

The genuinely open / risky part is **how the flag is surfaced**: the validation report is written only to the browser console (`console.warn`, `valobois-app.js:1274`) and stored on `this._geoFranceClimateValidation` (`valobois-app.js:1315`), which is **read nowhere else** in the app (grep of `js/` shows the field is only assigned, never consumed; the report has no UI binding). The climate warning element `[data-geo-france-role="climate-warning"]` in `_updateGeoFranceClimateDisplay` is unconditionally shown (`climateWarning.hidden = false`, `valobois-app.js:1387`) and is a static caveat, not driven by the validation result. So if a future canton dataset update reintroduced an unmatched canton, the diagnostician would silently fall back to the **département default** climate level (`level = … || depData.defaut`, `valobois-app.js:1362`) with no visible signal — only a console warning a developer would have to notice. Whether that silent département-default fallback is the intended behaviour for an unmatched canton is the product decision that keeps this open.

## Evidence in the code
- `js/data/climate-humidification-fd-p20-651.js:6` — header confirms names are kept "proches de la source normative" (pre-2015 FD P 20-651 Annexe B).
- `js/data/climate-humidification-fd-p20-651.js:8,21,26,33` — exception keys are pre-2015 canton names that no longer exist (`BRENOD`, `AURILLAC 4E CANTON`, `AJACCIO 7E CANTON`, `MONTELIMAR 1E CANTON`).
- `js/data/climate-humidification-fd-p20-651-aliases.js:1-7` — the generated pre-2015→post-2015 bridge (e.g. `"BRENOD": "Hauteville-Lompnes"`), sourced from COG INSEE 2015 + 2023.
- `js/app/valobois-app.js:1350-1361` — climate resolution uses the alias bridge (target→normative), then exact key, then `_isGeoFranceClimateCantonMatch` fuzzy fallback.
- `js/app/valobois-app.js:1015-1021` — `_isGeoFranceClimateCantonMatch` uses a `startsWith` prefix match, the partly-fuzzy part of the bridge.
- `js/app/valobois-app.js:1362-1363` — unmatched canton silently falls back to the département `defaut` level.
- `js/app/valobois-app.js:1197-1262` — `_validateGeoFranceClimateData` builds the consistency report (`unknownCantons`, `ambiguousCantons`, etc.).
- `js/app/valobois-app.js:1264-1286` — report is emitted only via `console.info` / `console.warn`; never rendered.
- `js/app/valobois-app.js:669,1315` — `this._geoFranceClimateValidation` is assigned but consumed nowhere else in `js/` (verified by grep).
- `js/app/valobois-app.js:1386-1388` — the on-screen climate warning is shown unconditionally and is not tied to the validation result.
- `scripts/check-climate-table.mjs` — standalone re-implementation of the same check; run today it reports 0 unmatched / ambiguous cantons.

## What would resolve it
- Product owner confirms whether the climate table is intended to stay frozen to the pre-2015 normative names with a generated bridge (vs. re-keying the dataset to current cantons), accepting the `startsWith` fuzzy fallback as accurate enough.
- Decide whether an unmatched canton should remain a silent département-default fallback, or surface a visible "climate could not be canton-resolved" warning in the geo widget instead of only a console message.
- If silent fallback is not acceptable, wire `this._geoFranceClimateValidation` (or the per-selection resolution `source`) into the UI / a build-time gate so future canton-data drift fails loudly; `scripts/check-climate-table.mjs` already provides the offline check that could be run in CI.
