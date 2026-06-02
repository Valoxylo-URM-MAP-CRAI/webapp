# Overseas départements: termite data present but unreachable from the UI

> **Open question** · priority #22 · Tier 3 – Reference data · Source spec: `specs/017-reference-data-catalog/spec.md`

## Question
Termite data covers overseas departments (971–976), but the climate table and departments list cover mainland France and Corsica only, so climate/canton behaviour for an overseas operation is undefined. What is intended?

<details>
<summary>🇫🇷 Version française</summary>

Les données termites couvrent les DOM (971–976), mais la table climat et la liste des départements se limitent à la métropole et à la Corse, si bien que le comportement climat/canton pour une opération en DOM est indéfini. Que prévoit-on ?

</details>

## Why this is open
**Classification:** Product-intent ambiguity, with a side of legacy / dead data (the overseas rows are unreachable as-built).

The code is internally consistent and does not crash — but it makes the overseas coverage *unreachable*, and whether that is the intended product scope is a decision only the product owner can make. Here is what the code actually does, confirmed end to end.

The département `<select>` is populated exclusively from `getFranceDepartementOptions()` (`js/app/valobois-app.js:2120`), which returns `window.VALOBOIS_FRANCE_DEPARTEMENTS` (`js/app/valobois-app.js:816-819`). That dataset lists **96 entries — mainland France plus Corsica (2A/2B) only**; it contains **no 971–976 codes** (`js/data/france-departements.js:2`). Because the dropdown is the only entry point for `departementCode`, an overseas département can never be selected through the UI. I confirmed the option list is rebuilt solely from that array on every render (`js/app/valobois-app.js:2124-2132`), with no separate path that injects overseas codes.

The termite dataset, by contrast, **does** carry overseas rows: `971` (statut "P"), `972`, `973`, `974` (statut "O"), `976` (statut "N") at `js/data/termites-cerema.js:107-111`. The mérule dataset carries the matching overseas rows too (`js/data/merules-cerema.js:108-110`). The display helpers `_updateGeoFranceTermiteDisplay` (`js/app/valobois-app.js:1056-1101`) and `_updateGeoFranceMeruleDisplay` (`js/app/valobois-app.js:1107-1146`) look these up by `departementCode` and would render them correctly *if* such a code were ever passed in. But since `departementCode` only ever comes from the mainland/Corsica dropdown, the 971–976 rows in both Cerema datasets are effectively **dead data**: shipped, valid, but never reachable in the running app.

The climate, canton and wind layers reinforce the mainland-only scope. `france-cantons.js` has **no 97x keys** (mainland + Corsica only), so `getCantonsForDepartement('971')` would return `[]` (`js/app/valobois-app.js:1422-1432`). The built-in wind table in `getGeoFranceWindData()` likewise stops at mainland + 2A/2B (`js/app/valobois-app.js:840-929`). And `getGeoFranceClimateCondition()` is explicitly defensive: a département absent from the climate index returns `source: 'missing-departement'` with text "Non déterminée (département introuvable)" (`js/app/valobois-app.js:1340-1347`). So even *if* an overseas code reached the climate resolver, it would degrade gracefully to "not determined" rather than error — there is no overseas climate class to resolve, by design of the data.

What I **confirmed**: the as-built behaviour is coherent and safe — overseas departments are simply not offered, the overseas termite/mérule rows are never consulted, and any hypothetical overseas code would yield "non déterminée" for climate and empty canton/wind. There is no bug here; the spec itself documents the asymmetry as an edge case (`specs/017-reference-data-catalog/spec.md:70`, and the open question at line 143). What remains **uncertain** is purely product intent: (a) is overseas coverage in scope at all, and if so, why do the termite/mérule datasets include 971–976 while no other layer does? and (b) if overseas is out of scope, should the 971–976 rows be removed from the Cerema datasets so the data matches the reachable scope? The presence of overseas termite/mérule data with no consuming UI path is the concrete tension that keeps this open.

## Evidence in the code
- `js/data/france-departements.js:2` — `VALOBOIS_FRANCE_DEPARTEMENTS` lists 96 entries (mainland + 2A/2B), no 971–976. This is the sole source of the département dropdown.
- `js/app/valobois-app.js:816-819` — `getFranceDepartementOptions()` returns that array verbatim.
- `js/app/valobois-app.js:2120-2132` — the département `<select>` options are built only from `getFranceDepartementOptions()`; no overseas codes are injected anywhere else.
- `js/data/termites-cerema.js:107-111` — overseas termite rows 971/972/973/974/976 exist and are well-formed.
- `js/data/merules-cerema.js:108-110` — overseas mérule rows 971/972/973 (and following) exist too.
- `js/app/valobois-app.js:1056-1101` / `1107-1146` — `_updateGeoFranceTermiteDisplay` / `_updateGeoFranceMeruleDisplay` look up by `departementCode`; they would show overseas rows correctly but are only ever called with mainland/Corsica codes.
- `js/app/valobois-app.js:1422-1432` — `getCantonsForDepartement()` returns `[]` for any code missing from `france-cantons.js`; 97x keys are absent there.
- `js/app/valobois-app.js:840-929` — built-in wind table covers mainland + 2A/2B only; no 97x entries.
- `js/app/valobois-app.js:1340-1347` — climate resolver returns `'missing-departement'` / "Non déterminée (département introuvable)" for any département not in the climate index (overseas would fall here).
- `specs/017-reference-data-catalog/spec.md:70,95-96,111,143` — spec documents the overseas asymmetry as a known edge case / open question (termite & mérule maps list "101 départements including 971–976"; départements list is "96 entries" mainland + Corsica).

## What would resolve it
- Product owner confirms scope: **is overseas (DOM) evaluation in scope for VALOBOIS?** A yes/no closes most of this.
- If **out of scope**: decide whether to delete the 971–976 rows from `js/data/termites-cerema.js` and `js/data/merules-cerema.js` so the shipped data matches the reachable UI (removes the dead-data discrepancy), or to keep them documented as intentional future stock.
- If **in scope**: file follow-up work to add 971–976 to `france-departements.js`, `france-cantons.js`, the wind table and the climate table (FD P 20-651 has no overseas climate classes, so a sourcing decision is needed for the climate layer) — and confirm the desired behaviour when climate/canton data is genuinely unavailable for an in-scope département (today it shows "Non déterminée").
- Quick static check to confirm the dead-data claim: grep for any caller that passes a 97x code into `_updateGeoFranceTermiteDisplay` / `_updateGeoFranceMeruleDisplay` other than via the dropdown — none was found.
