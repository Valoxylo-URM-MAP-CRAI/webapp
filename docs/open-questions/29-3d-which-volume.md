# Which volume figure the 3D (GLB) model carries as a detail

> **Open question** · priority #29 · Tier 4 – Exports · Source spec: `specs/013-export-glb-dae-3d/spec.md`

## Question
The 3D model details use the piece's recorded volume, while the IFC export prefers an enriched volume; confirm which is authoritative for the 3D details.

<details>
<summary>🇫🇷 Version française</summary>

Les détails du modèle 3D utilisent le volume enregistré de la pièce, tandis que l'export IFC préfère un volume enrichi ; confirmer lequel fait foi pour les détails 3D.

</details>

## Why this is open
**Classification:** Cross-file inconsistency (with a product-intent decision behind it)

The GLB export carries the piece volume by reading the plain scalar field `piece.volumePiece`. In `exportToGLB`, `buildMetadata` sets `volumePiece_m3: piece.volumePiece` (`js/app/valobois-app.js:47494`), and `build-glb.js` copies that straight into the node's `extras.volumePiece_m3` with a `|| 0` fallback (`js/lib/build-glb.js:486`). The GLB path never references the enriched field `volumePieceEnrichi`. Two other consumers do the opposite: the IFC equivalent-section geometry is derived from `computeVolumeEnrichi(piece)` (`js/app/valobois-app.js:37947`), and the barcode/PDF helper `getBarcodeComposerPieceVolumeM3` explicitly prefers `volumePieceEnrichi` and only falls back to `volumePiece` (`js/app/valobois-app.js:40994-40998`). So three exporters resolve "the volume" through three different field expressions.

In practice the two figures usually coincide, which is why this is subtle rather than an obvious bug. When a piece has active multi-section measurements, `recalculatePiece()` computes the scalar prism volume and then **overwrites** it with the enriched value: `if (piece.volumePieceEnrichi != null) { ... piece.volumePiece = ve; }` (`js/app/valobois-app.js:19383-19385`). `volumePieceEnrichi` itself is (re)computed and stored only when multi-section dimensions exist, and deleted otherwise (`js/app/valobois-app.js:17306-17311`, `17288`). So after a normal recalc cycle, `piece.volumePiece` already equals the enriched volume, and the GLB detail and the IFC volume agree. I confirmed this code path; what I could NOT confirm statically is whether the GLB export is always preceded by a recalc — if a piece object carries a `volumePieceEnrichi` that has not yet been folded back into `volumePiece` (stale state, imported data, or a default-piece preview built outside the recalc path), the GLB would emit the un-enriched scalar while IFC/barcode would emit the enriched one. That is the real divergence risk, and it is timing/state dependent rather than visible from a single read.

There is a second, distinct ambiguity in the same area: the number stamped as a *metadata detail* is not the same as the *geometric* volume of the GLB mesh. The comment at `js/lib/build-glb.js:190-198` documents that the round/clipped-corner profile sampling makes the mesh's own volume roughly 4-5% smaller than `computeVolumeEnrichi` for non-square rectangular sections (mitigated by `rectProfileUniform`, which restores exact `L×E` corners). So even when the metadata says "enriched volume", the polygons in the file may integrate to a slightly different number. Whether the detail should reflect the authoritative recorded/enriched value or the as-modelled geometry is a product decision, not something the code can settle.

Note the spec's own framing ("recorded volume" vs "enriched volume") slightly overstates the gap: as-built, the GLB reads the post-recalc `volumePiece`, which is the enriched value whenever multi-section data is present. The open part is (a) confirming that recalc always runs before export so the two never drift, and (b) deciding whether `volumePiece` (recalc-folded) or `volumePieceEnrichi` (read directly, as IFC/barcode do) is the intended single source of truth for the 3D detail.

## Evidence in the code
- `js/app/valobois-app.js:47494` — GLB metadata builder: `volumePiece_m3: piece.volumePiece` (reads the plain scalar, not the enriched field).
- `js/lib/build-glb.js:486` — the value is copied verbatim into the node `extras.volumePiece_m3` with `|| 0`.
- `js/app/valobois-app.js:19383-19385` — `recalculatePiece()` overwrites `piece.volumePiece` with `volumePieceEnrichi` when present, so the scalar normally already holds the enriched value.
- `js/app/valobois-app.js:17306-17311`, `17288` — `volumePieceEnrichi` is set only when multi-section dimensions exist and deleted otherwise.
- `js/app/valobois-app.js:37947` — IFC export derives its equivalent section directly from `computeVolumeEnrichi(piece)`, not from `volumePiece`.
- `js/app/valobois-app.js:40994-40998` — `getBarcodeComposerPieceVolumeM3` explicitly prefers `volumePieceEnrichi`, falling back to `volumePiece` — the inverse precedence of the GLB path.
- `js/lib/build-glb.js:190-198` — comment: the GLB *mesh* volume is ~4-5% below `computeVolumeEnrichi` for clipped rectangular corners unless `rectProfileUniform` is used, so the stamped detail and the modelled geometry can differ.

## What would resolve it
- Product owner decides the single authoritative volume for the 3D detail: the recalc-folded `volumePiece` (current GLB behaviour) or `volumePieceEnrichi` read directly (current IFC/barcode behaviour) — and the three exporters are aligned to it.
- Confirm at runtime that `recalculatePiece()` always runs on every piece (including default-piece previews and freshly imported/loaded data) before `exportToGLB`, so `volumePiece` cannot be a stale pre-enrichment value at export time. A targeted test: load a project with multi-section pieces without triggering an edit, export GLB, and read back the node `extras.volumePiece_m3` to check it matches `computeVolumeEnrichi`.
- Decide whether the metadata detail should equal the as-modelled mesh volume (which the `js/lib/build-glb.js:190-198` note shows can differ by ~4-5% for clipped corners); if so, document it or compute the detail from the emitted geometry.
