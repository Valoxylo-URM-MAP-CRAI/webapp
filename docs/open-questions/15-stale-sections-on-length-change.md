# Stale "mesures multiples" sections when the piece length changes

> **Open question** · priority #15 · Tier 2 – Quantitative outputs · Source spec: `specs/008-editor-lots-allotissement/spec.md`

## Question
Section positions are entered in millimetres and stored as a ratio along the length; if the length later changes, sections are flagged stale but their ratio is kept. Confirm whether stale sections should be recomputed automatically.

<details>
<summary>🇫🇷 Version française</summary>

Les positions de section sont saisies en millimètres et stockées en ratio le long de la longueur ; si la longueur change ensuite, les sections sont marquées obsolètes mais leur ratio est conservé. Confirmer si elles doivent être recalculées automatiquement.

</details>

## Why this is open
**Classification:** Product-intent ambiguity **and** suspected bug / correctness risk (the two overlap here).

The as-built behaviour has two distinct halves, and they pull in opposite directions, which is exactly why the question is open.

**Half 1 — the stored model is relative, so it is "self-rescaling" by design.** Each section is persisted with a `positionRatio` (0…1) rather than an absolute millimetre position (`_saveMesuresMultiplesInline`, `js/app/valobois-app.js:17251`–`17266`). A free intermediate position typed in millimetres is converted to a ratio at save time (`positionRatio = parsedMm / longueurPiece`, line 17259). The enriched-volume integral then multiplies that ratio by the *current* `piece.longueur` (`computeVolumeEnrichi`, line 18390: `dx = (sections[i+1].positionRatio − sections[i].positionRatio) * (longueur/1000)`). So if the volume were recomputed after a length change, the sections would scale proportionally with the new length — which is one defensible "recompute automatically" answer already half-implemented.

**Half 2 — but the enriched volume is NOT recomputed on a length change, only flagged.** `mesuresMultiples.longueur` stores the length that was current when the sections were last saved (line 17291). The "stale" state is purely a comparison of that captured length against the live `piece.longueur` and is surfaced only as a CSS class (`mesures-input--stale`) on the position/dimension inputs (`_updateMesuresPositionLabels`, lines 16548, 16563–16566; `_renderMesuresInlineWidget`, lines 16600–16601, 16639–16683). When the user edits `longueur`, the field handler calls **only** `_updateMesuresPositionLabels` (lines 28699–28702 for default pieces; same pattern around 29129 for detailed pieces) — it does not re-run `computeVolumeEnrichi`. The stored `piece.volumePieceEnrichi` is left untouched, and `recalculatePiece` consumes that stale stored value verbatim (lines 19383–19385) in preference to the simple `L×l×e` volume. `computeVolumeEnrichi` is re-invoked in exactly one place — `_saveMesuresMultiplesInline` (line 17306) — i.e. only when the user re-opens and re-saves the sections.

**Net effect (confirmed):** after a length change, the lot/piece volume keeps using the *old* enriched volume computed against the *old* length, while the widget shows a stale warning. The geometry model is capable of rescaling (Half 1) but the recompute is never triggered automatically (Half 2). So the "stale" flag is a manual-action prompt, not an auto-correction.

**Cross-path inconsistency (confirmed, secondary).** The Grasshopper/parametric export deliberately prefers the captured `mm.longueur` over the live `piece.longueur` when one exists (`exportToGrasshopperJson`, line 40208: `const longueur = mmActive && mm.longueur != null && mm.longueur !== '' ? mm.longueur : piece.longueur;`). So a stale piece exports its *old* length to that pipeline, whereas the on-screen enriched volume integral (line 18390) and the GLB builder (`js/lib/build-glb.js`, which reads `positionRatio` and a passed `longueur_mm`, e.g. line 267) use whatever length they are given. The three consumers do not agree on which length to trust for a stale piece.

What this means for triage: the code is internally clear and reads cleanly — there is no failure to trace. The genuinely open part is a **decision**: (a) should editing the length silently re-run `computeVolumeEnrichi` (rescaling sections proportionally and clearing the flag), (b) should it keep the current "warn and wait for a manual re-save" behaviour, or (c) should it invalidate/clear the sections? Until that intent is fixed, the current state is arguably a correctness risk because the displayed volume can silently disagree with the displayed length with only a subtle CSS cue.

## Evidence in the code
- `js/app/valobois-app.js:17251`–`17266` — sections are saved with a relative `positionRatio` (canonical 0.25/0.5/0.75 or `parsedMm / longueurPiece` for free positions), not an absolute mm position.
- `js/app/valobois-app.js:17291` — `mesuresMultiples.longueur` is set to the piece length *at save time*; this is the reference the stale check compares against.
- `js/app/valobois-app.js:16548`, `16600`–`16601` — the "stale" test is `mm.longueur !== '' && String(mm.longueur) !== String(piece.longueur)`; it is a presentation flag only.
- `js/app/valobois-app.js:16563`–`16566`, `16639`, `16657`, `16676` — stale state toggles the `mesures-input--stale` CSS class on the inputs; no data is changed.
- `js/app/valobois-app.js:18390` — `computeVolumeEnrichi` multiplies `positionRatio` by the *current* `piece.longueur`, so the model would rescale if recomputed.
- `js/app/valobois-app.js:17306` — the *only* call site of `computeVolumeEnrichi`; it runs solely inside `_saveMesuresMultiplesInline` (manual section re-save).
- `js/app/valobois-app.js:28699`–`28702` — the length-change handler calls only `_updateMesuresPositionLabels` (labels + stale class); it does not recompute the enriched volume.
- `js/app/valobois-app.js:19383`–`19385` — `recalculatePiece` reads the stored `piece.volumePieceEnrichi` and prefers it over the simple volume, so a stale stored value silently wins.
- `js/app/valobois-app.js:40208` — the Grasshopper export prefers the captured `mm.longueur` over the live `piece.longueur`, disagreeing with the on-screen integral and the GLB builder.
- `grep` confirms `mesuresMultiples.longueur` / `mm.longueur` is never reassigned anywhere except the save path (line 17291) — nothing refreshes it when `piece.longueur` changes.

## What would resolve it
- **Product owner decides the intended semantics** of a length change on existing sections: (a) auto-rescale sections proportionally and re-run `computeVolumeEnrichi` (clearing the stale flag), (b) keep the manual "warn until re-saved" behaviour, or (c) invalidate the sections.
- If (a) or (c) is chosen, treat the current behaviour as a bug: have the `longueur` field handler (lines 28699–28702 / ~29129) call `computeVolumeEnrichi`/`computeSurfaceEnrichi` (or clear `volumePieceEnrichi`) and refresh `mm.longueur`, then `recalculateLotAllotissement`.
- **Runtime check to make the risk concrete:** in the editor, set a piece to length 4000 with completed sections, note the lot volume, then change the length to 2000 without re-opening the sections; confirm whether the lot volume updates and whether the only signal is the `mesures-input--stale` styling.
- **Reconcile the length used across consumers:** decide whether the on-screen integral (`piece.longueur`), the Grasshopper export (`mm.longueur`, line 40208), and the GLB builder should all use the same length for a stale piece, and align them.
