# Inspection card: a meta/quality panel, not a Fort/Moyen/Faible scoring family

> **Open question** · priority #7 · Tier 1 – Decision engine · Source spec: `specs/007-editor-notation-scoring/spec.md`

## Question
The Inspection card uses status labels (Trié et purgé / Déposé / En usage) instead of the Fort/Moyen/Faible scale; how it contributes to the overall notation (versus acting as a confidence/weight input) could not be fully traced. Please clarify.

<details>
<summary>🇫🇷 Version française</summary>

La carte « Inspection » utilise des libellés de statut (Trié et purgé / Déposé / En usage) plutôt que l'échelle Fort/Moyen/Faible ; sa contribution à la notation globale (vs entrée de confiance/pondération) n'a pas pu être entièrement tracée. À clarifier.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is now fully traced and consistent; what remains is a product confirmation that the as-built design is the intended one).

The behaviour can now be traced end-to-end, and it resolves the "could not be fully traced" part of the original question. The Inspection card is **not** a scoring family in the sense the rest of the Notation tab uses that word. Its five rows (`visibilite`, `instrumentation`, `modesNotation`, `statutBois`, `integrite`) are each handled specially and **none of them is registered in `getValoboisScoreMappings()`** — the single list that maps every scoring criterion to a `category` (economique / ecologique / mecanique / historique / esthetique) and a `rang`. That list begins at the `bio` section (`valobois-app.js:31848`) and contains no `inspection` entry at all. Because category totals, the orientation matrix flows (`collectValoboisMatrixActiveFlows`), `hasAnyNotationForLot`, and the confidence mappings all iterate over `getValoboisScoreMappings()`, the Inspection fields cannot reach the A-to-E rating engine, the orientation, or the blocking gates.

Each Inspection row instead plays a distinct meta-role, confirmed in code:
- **`statutBois`** (Trié et purgé / Déposé / En usage) is purely descriptive. The detail-modal text states it verbatim: *"Ce critère est descriptif et n'influe pas directement sur les règles de notation des autres critères."* (`valobois-app.js:23451`). It is stored on `lot.inspection.statutBois` but read by nothing in the scoring path.
- **`integrite`** (Intégrité générale, Forte/Moyenne/Faible) is a **price coefficient**, not an orientation input. `getLotIntegrityPriceFactor` (`valobois-app.js:8953`) returns its `coeff` (0.7 / 0.3 / 0.1, set at `valobois-app.js:29477`) and that factor is applied to the lot price in `recalculateLotAllotissement` (`valobois-app.js:18502`). Its own detail text says it is *"un indicateur indépendant du choix d'orientation"* (`valobois-app.js:23454`).
- **`modesNotation`** is not a per-lot rating at all: it is bound to the global `this.data.notationMode` (`valobois-app.js:29369-29401`) and merely locks/unlocks rows in the other cards via `applyNotationMode` (`valobois-app.js:9570`).
- **`visibilite`** and **`instrumentation`** are stored on `lot.inspection` and consumed only as completeness checks. They (together with `integrite.niveau`) gate `hasIncompleteNotationCriteria` via the `hasInspectionGap` test (`valobois-app.js:9016-9020`), and they appear in exports (`valobois-app.js:47130-47131`). They never enter the matrix.

So the answer to "scoring contribution vs confidence/weight input" is: **neither a scoring contribution nor a confidence input.** It is a mixed quality/metadata panel — descriptive status, a price-only coefficient, a global mode switch, and completeness flags. One nuance worth flagging: moving any Inspection slider still calls `computeOrientation(activeLot)` (e.g. `valobois-app.js:29412`), which can read as if Inspection drives orientation. It does not — the recompute is a blanket refresh, and since no inspection field is in the score mappings, the orientation result is unchanged by the inspection value itself (only `integrite` changes the *price*, and only via `recalculateLotAllotissement`).

What is **confirmed**: Inspection feeds nothing into the A-to-E / orientation / gate engine; `integrite` affects price; `modesNotation` is a global mode; `visibilite`/`instrumentation`/`statutBois` are descriptive/completeness only. What remains **a product decision**: whether this as-built split (especially that `statutBois` and the `+3/+2/+1` intensity labels shown at `valobois-app.js:29353-29355` imply a weight that the engine never applies) matches the intended methodology, or whether Inspection was meant to influence scoring or confidence.

## Evidence in the code
- `js/app/valobois-app.js:31842-31910` — `getValoboisScoreMappings()`: the complete scoring criterion list; first entry is `bio.purge`, there is **no `inspection` section**, so Inspection cannot feed category totals/orientation/confidence.
- `js/app/valobois-app.js:23451` — `statutBois` detail text: "Ce critère est descriptif et n'influe pas directement sur les règles de notation des autres critères."
- `js/app/valobois-app.js:23454` — `integrite` detail text: applies a coefficient that adjusts market price, "indépendant du choix d'orientation."
- `js/app/valobois-app.js:8953-8958` — `getLotIntegrityPriceFactor`: turns `inspection.integrite.coeff` into a price multiplier (default 1 when ignored/absent).
- `js/app/valobois-app.js:18502` — the integrity factor is consumed in `recalculateLotAllotissement` (price), not in orientation.
- `js/app/valobois-app.js:29476-29477` — `integrite` level→coeff map: Forte 0.7 / Moyenne 0.3 / Faible 0.1.
- `js/app/valobois-app.js:29349-29355` — `statutBois` label map (`Trié et purgé` / `Déposé` / `En usage`) and the misleading `+3/+2/+1` "intensity" display shared with the other rows.
- `js/app/valobois-app.js:29369-29401` — `modesNotation` is bound to global `this.data.notationMode`, not a lot rating; drives `applyNotationMode`.
- `js/app/valobois-app.js:9016-9020` — `hasInspectionGap`: `visibilite`, `instrumentation`, and `integrite.niveau` used only for completeness checking.
- `js/app/valobois-app.js:29412` — moving an inspection slider calls `computeOrientation`, but this is a blanket refresh; the inspection value is not in the matrix, so orientation is unchanged by it.
- `js/app/valobois-app.js:3979-3985` — lot data model: `inspection` is a sibling of `bio`/`mech`/… with its own non-scoring shape (`integrite` is `{ niveau, ignore, coeff }`).
- `index.html:1438-1490` — Inspection rows for `statutBois` (status labels) and `integrite` (Forte/Moyenne/Faible + an `Ignorer`/`Ignoré` control unique to this card).
- `js/app/valobois-app.js:47130-47131` — `visibilite`/`instrumentation` surface in exports, confirming a reporting/metadata role rather than a scoring role.

## What would resolve it
- Product owner confirms the intended role of each Inspection row: `statutBois` = descriptive only; `integrite` = price coefficient independent of orientation; `modesNotation` = global mode switch; `visibilite`/`instrumentation` = completeness/metadata. If any of these was meant to influence the A-to-E score, confidence, or orientation, that is a missing requirement, not an implementation choice.
- Confirm the `+3/+2/+1` "intensity" badges shown on `visibilite`/`instrumentation`/`statutBois` (`valobois-app.js:29353-29355`) are intended as informational only, since no weight by that value is ever applied — they can misread as a scoring weight.
- Optional static check to keep this closed: assert that every `lot.inspection.*` field is read only by `getLotIntegrityPriceFactor`, `hasIncompleteNotationCriteria`, the notation-mode handlers, and the exporters — i.e. grep confirms no `inspection` key is consumed by `computeOrientationFromMatrix` / `collectValoboisMatrixActiveFlows` / `getValoboisScoreMappings`.
