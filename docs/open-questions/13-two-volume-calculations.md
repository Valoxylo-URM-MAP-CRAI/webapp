# Two cross-section integrations for the volume (enriched vs lot summary)

> **Open question** · priority #13 · Tier 2 – Quantitative outputs · Source spec: `specs/008-editor-lots-allotissement/spec.md`

## Question
The enriched volume and the lot-summary volume each integrate the cross-section areas, but via two separate calculations (one applies a perimeter shape factor, the other does not). They should agree — confirm there is no drift between them.

<details>
<summary>🇫🇷 Version française</summary>

Le volume enrichi et le volume résumé du lot intègrent tous deux les aires de section, mais via deux calculs distincts (l'un applique un facteur de forme lié au périmètre, l'autre non). Ils devraient concorder — confirmer l'absence de dérive.

</details>

## Why this is open
**Classification:** Cross-file inconsistency (two formulas coexist) — but the as-built precedence rules mostly resolve the *aggregate* drift, leaving a narrower, confirmed product-intent question on the scalar fields.

There are in fact **three** distinct volume code paths in `js/app/valobois-app.js`, not two, and they do not all use the same formula:

1. **Enriched volume** — `computeVolumeEnrichi(piece)` (line 18337). This is the precise section-by-section integration: it builds a per-section area via `getSectionArea` (18346) and integrates with the composite trapezoidal rule along the recorded `positionRatio`s (18389-18392). For a rectangular section that carries a measured perimeter `P`, the raw area `L×E` is scaled by a **perimeter shape factor** `kP = clamp(P / (2·(L+E)), 0.5, 1.0)` (18360-18365). A round section uses `π·(d/2)²`; degenerate cases deduce the missing side from `P` (18370-18377).

2. **Lot-summary scalar volume** — inside `recalculateLotAllotissement` (18508-18516). This computes `volumePiece` straight from the lot's representative scalars `lot.allotissement.longueur/largeur/epaisseur` (or `diametre`) as a plain `L·l·e` box (or `π·r²·L` cylinder). It has **no integration and no perimeter shape factor**. `volumeLot` is then `volumePiece × q` (18516).

3. **Aggregation path** — the rest of `recalculateLotAllotissement` (18571-18698). When `q > 0` it sums each detailed piece's `volumePiece` (18578) plus each default piece's per-unit volume (18662), then **overwrites** `lot.allotissement.volumeLot = sumVolume` at line 18698. Crucially, both the per-piece value (`recalculatePiece`, 19383-19386) and the default-piece value (18616-18617) **substitute the enriched volume when `volumePieceEnrichi` is present**.

So the "two integrations the spec worries about" are paths (1) and (2). What I **confirmed** is that they do not actually compete in the lot total in the normal case: path (2)'s scalar `volumeLot` written at 18516 is immediately discarded — line 18698 overwrites it with the aggregated `sumVolume` whenever `q > 0`, and that aggregate adopts the enriched (perimeter-factor) value. The scalar box formula therefore only survives as the lot total when there are zero pieces with positive quantity. There is no silent drift in the headline `volumeLot` because one path supersedes the other rather than both feeding it.

What **remains genuinely open** is a subtler consistency point. When mesures multiples are activated, the piece's plain scalar dimensions `largeur/epaisseur/diametre` are overwritten with the *median* of the section measurements (17302-17304), with no perimeter correction applied to those scalars. The lot-summary form fields and any consumer reading the box formula (e.g. the scalar branch at 18508-18516, or `getBarcodeComposerPieceVolumeM3` which falls back to `volumePiece` at 40996) therefore reflect an un-corrected `L×E×length` geometry, while `volumePieceEnrichi` reflects the perimeter-corrected integral. For a tapered or rounded-edge member with `kP < 1`, the perimeter factor deliberately *shrinks* the area, so the enriched volume can be a few percent below the naive median-box volume. That is the "drift" — it is by design within the enriched value, but whether the two displayed numbers should be reconciled (or whether the perimeter factor should also influence the displayed median dimensions / box volume) is a product decision, not something the code disambiguates.

Two secondary observations corroborate that the perimeter-factor formula is the trusted one and the box formula is a coarser sibling: (a) the inline comment at 18344-18345 cites a SketchUp validation showing the `kP` integral at ≈ +1.6 % error versus +19.7 % for raw `L×E`; and (b) `js/lib/build-glb.js:193` independently documents that a polygon under-counting the corners gives a volume "< computeVolumeEnrichi (~4-5 %)", treating `computeVolumeEnrichi` as the reference. There is also leftover `console.log` debug output inside `getSectionArea` (18364, 18367, 18370, 18371) — unrelated to correctness but worth removing.

## Evidence in the code
- `js/app/valobois-app.js:18337` — `computeVolumeEnrichi(piece)`: the precise path; trapezoidal integration of section areas.
- `js/app/valobois-app.js:18360-18365` — perimeter shape factor `kP = clamp(P / (2·(L+E)), 0.5, 1.0)` applied to rectangular section area; this is the "with shape factor" calculation.
- `js/app/valobois-app.js:18389-18392` — composite trapezoidal integration over `positionRatio`.
- `js/app/valobois-app.js:18508-18516` — lot-summary scalar volume: plain `L·l·e` box / `π·r²·L` cylinder from `lot.allotissement` fields, **no** perimeter factor; `volumeLot = volumePiece × q`.
- `js/app/valobois-app.js:18698` — `lot.allotissement.volumeLot = sumVolume`: the aggregation overwrites the scalar `volumeLot` whenever `q > 0`.
- `js/app/valobois-app.js:18616-18617` & `19383-19386` — both the default-piece and detailed-piece volumes substitute `volumePieceEnrichi` when present, so the perimeter-corrected value feeds the aggregate total.
- `js/app/valobois-app.js:17302-17304` — on activation, the piece's scalar `largeur/epaisseur/diametre` are set to the section **median**, with no perimeter correction — the source of the residual mismatch with the enriched value.
- `js/app/valobois-app.js:40992-40998` — `getBarcodeComposerPieceVolumeM3` prefers `volumePieceEnrichi` then falls back to the box `volumePiece`.
- `js/app/valobois-app.js:18344-18345` — comment citing SketchUp validation (+1.6 % vs +19.7 % raw `L×E`), evidence the `kP` integral is the intended-accurate formula.
- `js/lib/build-glb.js:193` — independent reference treating `computeVolumeEnrichi` as ground truth.
- `js/app/valobois-app.js:18364,18367,18370,18371` — leftover `console.log` debug lines inside `getSectionArea`.

## What would resolve it
- Product owner confirms the intended semantics: is the perimeter shape factor `kP` meant to be a property *only* of the enriched integral, or should the lot's displayed scalar dimensions / box volume also reflect it? If the former, the residual mismatch is expected and the question can be closed as "by design".
- Add a unit/regression test that builds one piece with mesures multiples (≥2 rect sections carrying a perimeter such that `kP < 1`) and asserts `lot.allotissement.volumeLot === sumVolume` using the enriched per-piece value — i.e. confirm the scalar box path never leaks into the lot total when pieces exist (the `q > 0` overwrite at 18698 holds).
- Confirm with the product owner whether the `kP < 1` shrinkage being invisible on the displayed median dimensions (17302-17304) is acceptable, or whether the displayed L/E should be back-corrected so a manual `L×E×length` recomputation by a diagnostician matches the stored enriched volume.
- Independent of the open question: remove the four `console.log` debug calls in `getSectionArea` (18364, 18367, 18370, 18371).
