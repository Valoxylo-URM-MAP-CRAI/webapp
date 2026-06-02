# Inconsistent DOM coverage across the geographic datasets

> **Open question** · priority #21 · Tier 3 – Reference data · Source spec: `specs/006-geo-france-context/spec.md`

## Question
Termite and mérule data include the overseas departments, but their presence in the departments list, cantons, and wind/climate data is unconfirmed. What is the intended overseas coverage?

<details>
<summary>🇫🇷 Version française</summary>

Les données termites et mérules incluent les DOM, mais leur présence dans la liste des départements, les cantons et les données vent/climat n'est pas confirmée. Quelle est la couverture DOM voulue ?

</details>

## Why this is open
**Classification:** Cross-file inconsistency (with a secondary product-intent ambiguity).

The five geographic datasets that feed the « Localisation géographique » panel disagree on whether the overseas departments (DOM: 971 Guadeloupe, 972 Martinique, 973 Guyane, 974 Réunion, 976 Mayotte) exist. This is confirmed by reading the data files directly:

- **Termites** and **mérules** *do* carry DOM rows. `js/data/termites-cerema.js:107-111` defines `"971"`…`"976"` (e.g. 972/973/974 are status `"O"`, full-department orders); `js/data/merules-cerema.js:108-112` defines the same five codes (all status `"N"`). Note 975 (Saint-Pierre-et-Miquelon) is absent and 976 is present in both.
- **Departments list** stops at metropolitan France + Corsica. `js/data/france-departements.js:2` is a single array ending at code `95`; it contains no `97x` entry. The department `<select>` is populated solely from this array via `getFranceDepartementOptions()` (`js/app/valobois-app.js:816-818`, used at `:2120`), so **no DOM is selectable from the list or drawable on the map**.
- **Cantons** have zero DOM geometry. `grep -c '"97[0-9]'` against `js/data/france-cantons.js` returns `0`; canton codes top out in the `95x` range. `getCantonsForDepartement('971')` therefore returns `[]` (`js/app/valobois-app.js:1422-1432`).
- **Wind** data is hard-coded inline in `getGeoFranceWindData()` (`js/app/valobois-app.js:840-934`) and likewise ends at `95` with no `97x` key.
- **Climate** (`js/data/climate-humidification-fd-p20-651.js`) is keyed by *department name* (uppercase, accent-stripped) and contains no GUADELOUPE / MARTINIQUE / GUYANE / REUNION / MAYOTTE entry.

The practical consequence depends on the entry path. Via the dropdown/map a DOM can never be chosen, so the inconsistency is latent. But **address auto-detection can set a DOM code**: `detect` queries `https://geo.api.gouv.fr/communes?codePostal=…` (`js/app/valobois-app.js:1974`) and applies the returned `best.codeDepartement` through `setGeoFranceDepartement(codeDep)` (`:2016`). That setter does **not** validate the code against the departments list — it stores `next.departementCode = code` unconditionally and only leaves `next.departementNom` empty when the code is not found (`:1464-1467`). A postal code like `97110` (Pointe-à-Pitre) would thus persist `departementCode = "971"`, `departementNom = ""`.

In that DOM-detected state the four read-only fields diverge:
- **Termites / mérules** look up *by code* (`getGeoFranceTermiteData()[code]`, `:1063`; `getGeoFranceMeruleData()[code]`, `:1114`), so they *would* render real Cerema DOM values (e.g. Martinique → « Totalité du département sous arrêté préfectoral »). The same code-based lookup also flows into exports via `getGeoFranceWindExportData` siblings.
- **Climate** stays blank: `getGeoFranceClimateCondition()` early-returns `incomplete` when `departementNom` *or* `cantonNom` is empty (`:1327-1334`), both of which are empty for a DOM (no name in the list, no canton geometry). It never reaches the « département introuvable » branch.
- **Wind** returns empty `directions`/`station` because the `97x` key is absent (`:1044`), surfacing as « Non renseigné (Annexe A) ».

What I **confirmed**: the five datasets genuinely disagree (termites/mérules include DOM; departments/cantons/wind/climate do not), and the only code path that can reach a DOM state is address detection, which produces a half-populated panel (termite/mérule populated, climate/wind/canton empty). What remains **uncertain** is intent: whether the Cerema importer simply carried DOM rows the rest of the pipeline was never extended to support (a likely incomplete-import artifact, mirroring the existing wind-coverage open question at `spec.md:140`), or whether DOM support is a deliberate future scope. The spec itself flags this as unresolved at `spec.md:70` and `spec.md:143`.

## Evidence in the code
- `js/data/termites-cerema.js:107-111` — DOM rows 971/972/973/974/976 present (972/973/974 status `O`).
- `js/data/merules-cerema.js:108-112` — same five DOM codes present, all status `N`.
- `js/data/france-departements.js:2` — department array ends at `95`; no `97x` entry (so DOM is not selectable).
- `js/data/france-cantons.js` — `grep -c '"97[0-9]'` returns 0; no DOM canton geometry.
- `js/app/valobois-app.js:840-934` — inline `getGeoFranceWindData()` has no `97x` key.
- `js/data/climate-humidification-fd-p20-651.js` — keyed by department name; no DOM department name present.
- `js/app/valobois-app.js:1464-1467` — `setGeoFranceDepartement` stores any code without validating membership in the list; `departementNom` left empty when unknown.
- `js/app/valobois-app.js:1974`, `:2004-2016` — auto-detect reads `geo.api.gouv.fr` `codeDepartement` and applies it, so a DOM postal code can persist code `971`.
- `js/app/valobois-app.js:1063` / `:1114` — termite/mérule fields look up by code, so a detected DOM *would* display real Cerema values.
- `js/app/valobois-app.js:1327-1334` — climate returns `incomplete` (blank) when name or canton is empty, the DOM case.
- `js/app/valobois-app.js:1044` — wind export returns empty strings for an unknown (DOM) code.
- `specs/006-geo-france-context/spec.md:70`, `:143` — spec explicitly records DOM coverage as unconfirmed.

## What would resolve it
- Product owner decides the target DOM scope: either (a) DOM are out of scope — then strip the DOM rows from `termites-cerema.js` / `merules-cerema.js` for consistency, or (b) DOM are in scope — then add DOM to `france-departements.js`, `france-cantons.js`, the inline wind table, and the climate dataset.
- Until that decision, optionally harden `setGeoFranceDepartement` (`valobois-app.js:1464`) to reject codes absent from `getFranceDepartementOptions()`, so address detection of a DOM postal code cannot produce the half-populated state (termite/mérule shown, everything else blank).
- Manual runtime check: enter a DOM postal code (e.g. `97110 Pointe-à-Pitre`) in the address field, click « Détecter », and confirm whether the panel ends up partially filled — verifying the detection path described above.
- Confirm with the data owner whether the DOM termite/mérule rows were an intentional inclusion or an unfiltered artifact of the Cerema import (the same provenance question already raised for wind coverage at `spec.md:140`).
