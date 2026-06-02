# "Fraction C" field is editable and exported, but the carbon math ignores it (hard-codes 0.5)

> **Open question** · priority #14 · Tier 2 – Quantitative outputs · Source spec: `specs/008-editor-lots-allotissement/spec.md`

## Question
A "Fraction C" field is editable on the piece and lot, but the carbon calculation hard-codes 0.5 (per NF EN 16449), so the field appears not to feed the computation. Confirm whether it is legacy input.

<details>
<summary>🇫🇷 Version française</summary>

Un champ « Fraction C » est éditable sur la pièce et le lot, mais le calcul carbone fige 0,5 (NF EN 16449), si bien que le champ ne semble pas alimenter le calcul. Confirmer s'il s'agit d'une saisie héritée.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a cross-file inconsistency confirmed in the code).

The behaviour described in the question is confirmed exactly as stated, and it is unambiguous in the code: the `fractionCarbonee` field is editable, validated, and exported, but the biogenic-carbon formula never reads it. There are **two** independent carbon calculations and both hard-code the fraction. The lot-level estimate at `js/app/valobois-app.js:18553-18568` declares `const carbonFractionFixed = 0.5;` and plugs that literal into `(44/12) * carbonFractionFixed * rho * vGross * (safeWoodPct/100) / moistureDenominator`. The per-piece estimate at `js/app/valobois-app.js:19425-19436` repeats the identical pattern (`carbonFractionFixed = 0.5` → `piece.carboneBiogeniqueEstime`). The default-piece aggregation branch reuses the same lot-scope constant (`js/app/valobois-app.js:18658-18660`). In none of these three paths is `piece.fractionCarbonee` or `lot.allotissement.fractionCarbonee` referenced. So the editable field provably does not change the computed CO₂. This matches the spec's own callout at `spec.md:175` ("the editable field appears not to feed the computation — suspected legacy input") and FR-017 (`spec.md:113`, "using a fixed carbon fraction of 0.5").

However, the field is **not** dead/legacy in the usual sense — it is read by other consumers, which is why this is a product decision rather than a removable artifact:

1. **It is exported to IFC.** `js/app/valobois-app.js:255-258` defines an enabled property `fractionCarbonee` inside `Pset_Valobois_Carbone` (`getValue` returns the parsed piece value, falling back to the lot value). The IFC exporter actually invokes that getter — `js/lib/build-ifc.js:369` calls `propDef.getValue(piece, lot, meta)` and emits it into the property set at `build-ifc.js:377`. So whatever the user types is written into the exported BIM model, even though the app's own CO₂ figure ignored it.

2. **It gates "completeness".** `hasIncompleteDetailLotPieces()` (`js/app/valobois-app.js:8972`, `8989`) treats a piece as incomplete unless `fractionCarbonee` has a value, alongside essence, dimensions, density, humidity, etc. So the field carries real UI weight: a blank Fraction C marks a lot as not-fully-detailed.

3. **It is editable and persisted on every level.** The lot input (`data-lot-input="fractionCarbonee"`, `valobois-app.js:27148`), the per-piece input (`data-piece-input="fractionCarbonee"`, `:26404`), and the default-piece input (`data-default-piece-input="fractionCarbonee"`, `:26018`) all bind through the generic numeric write-back handler (`:28996-29013` for pieces) that stores `piece[field] = normalized`. The model is seeded/normalised in several places — defaults to `50` at the lot level (`:3768`, `:3974`) and empty string at the piece level (`:2561`, `:4069`).

The internal consistency check that makes the current behaviour *look* intentional: the lot default is `50` (i.e. 50 %), and 50 % expressed as a fraction is exactly the `0.5` the formula hard-codes. So in the default case the displayed field and the formula agree. The discrepancy only becomes observable if a user edits Fraction C away from 50 — the displayed/exported value diverges from the value actually used in the CO₂ computation, with no warning. That divergence is the real risk and is confirmed, not theoretical.

What I could **not** determine from static reading is the product intent: whether the field is (a) deliberately kept editable only to be carried into the IFC export as metadata while the standardised 0.5 drives the regulatory CO₂ figure, or (b) a leftover from an earlier design where the fraction was meant to feed the formula and the hard-coding is the bug. The code supports either reading; only the spec owner can say which is desired.

## Evidence in the code
- `js/app/valobois-app.js:18553-18568` — lot-level CO₂: `const carbonFractionFixed = 0.5;` used directly in the NF EN 16449 formula; `fractionCarbonee` never referenced.
- `js/app/valobois-app.js:19425-19436` — per-piece CO₂: identical hard-coded `0.5`, writes `piece.carboneBiogeniqueEstime` / `...Exact`.
- `js/app/valobois-app.js:18658-18660` — default-piece aggregation reuses the same `carbonFractionFixed` constant, again ignoring the field.
- `js/app/valobois-app.js:255-258` — `Pset_Valobois_Carbone.fractionCarbonee` is an *enabled* IFC property whose `getValue` reads `piece.fractionCarbonee ?? lot.allotissement.fractionCarbonee`.
- `js/lib/build-ifc.js:369,377` — the exporter calls `propDef.getValue(...)` and emits the result, so the edited value reaches the IFC file.
- `js/app/valobois-app.js:8972,8989` — `fractionCarbonee` is part of the per-piece completeness gate in `hasIncompleteDetailLotPieces()`.
- `js/app/valobois-app.js:26404` (piece), `:27148` (lot), `:26018` (default piece) — editable inputs bound to `fractionCarbonee`; `:28996-29013` is the generic handler that writes the value back into the model.
- `js/app/valobois-app.js:3768,3974` — lot default `fractionCarbonee = 50` (= 0.5 as a fraction, hence the silent agreement at default).
- `specs/008-editor-lots-allotissement/spec.md:113` (FR-017, "fixed carbon fraction of 0.5") and `:175` (the callout this question is derived from).

## What would resolve it
- Product owner decides the field's purpose: (a) if it is metadata-only for the IFC export and the regulatory CO₂ must stay on the NF EN 16449 fixed 0.5, document that and ideally make the field read-only/disabled (or label it clearly) so users don't expect it to change the CO₂; or (b) if the fraction is meant to drive the calculation, change `carbonFractionFixed` at `valobois-app.js:18554`, `:18658` and `:19425` to read `fractionCarbonee` (÷100) with the 0.5 default.
- Quick confirmation test: set a lot's Fraction C to a non-50 value (e.g. 30), recalc, and verify "Carbone biogénique" is unchanged — confirms the field does not feed the math.
- If kept as metadata, decide whether it should still gate completeness (`valobois-app.js:8989`); a field that can't affect the result arguably shouldn't block a lot from being "complete".
