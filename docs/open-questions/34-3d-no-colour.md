# GLB/DAE 3D exports carry geometry only — no orientation colouring

> **Open question** · priority #34 · Tier 4 – Exports · Source spec: `specs/013-export-glb-dae-3d/spec.md`

## Question
The GLB/DAE exports define no materials or colours at all (geometry only), contrary to an earlier brief that mentioned colouring by orientation. Confirm geometry-only is the intended behaviour (it is the verified result).

<details>
<summary>🇫🇷 Version française</summary>

Les exports GLB/DAE ne définissent aucune matière ni couleur (géométrie seule), contrairement à un brief antérieur qui évoquait une coloration par orientation. Confirmer que « géométrie seule » est le comportement voulu (c'est le résultat vérifié).

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; only the desirability of the no-colour outcome needs an owner's sign-off).

The code is clear and consistent: **neither exporter emits any material or colour, and no part of the pipeline ever computes a colour for a 3D piece.** I confirmed this on three layers — the GLB builder, the DAE builder, and the app-level export glue — and found no dead/removed code that ever did otherwise. So this is not a bug or a cross-file inconsistency; it is purely a request to confirm that "geometry only" is the desired product behaviour, which is exactly what `FR-013` of the source spec already asserts ("GLB and DAE MUST contain geometry only — no materials, no colours, and in particular NO colouring of pieces by orientation. (See Open Questions.)").

**GLB.** `build-glb.js` writes a hand-rolled glTF 2.0 JSON object. In both the single-piece path (`gltf` at `build-glb.js:491`) and the grouped/multi-piece path (`gltf` at `build-glb.js:749`), the object has `asset`, `scene(s)`, `nodes`, `meshes`, `accessors`, `bufferViews`, `buffers` — and **no `materials` array, no `extensions`/`KHR_materials_*`, and no `material` key on any primitive** (`build-glb.js:502-506` and `:733` define primitives with only `attributes: { POSITION }`, `indices`, `mode: 4`). The mesh also has no `COLOR_0` vertex attribute. A glTF primitive with no `material` is valid and renders with the viewer's default material, i.e. uncoloured.

**DAE.** `build-dae.js` builds COLLADA 1.4.1 by string concatenation. The document contains only `<library_geometries>`, `<library_nodes>`, and `<library_visual_scenes>` (`build-dae.js:174-184`). There is **no `<library_materials>`, no `<library_effects>`, no `<bind_material>`, and the `<triangles>` element has no `material` attribute** (`build-dae.js:139`). A `grep` for `color|material|effect|phong` across the file returns nothing.

**The "earlier brief" colour-by-orientation lineage still exists — but only for the UI/PDF, never for 3D.** `valobois-constants.js:180` defines `VALOBOIS_ORIENTATION_THRESHOLD_DESCRIPTORS`, where each orientation carries a `color` (Recyclage `#E69F00`, Réutilisation `#56B4E9`, Réemploi `#009E73`). Those colours are consumed for on-screen and PDF rendering only — e.g. the checkbox tint `--valobois-checkbox-color` at `valobois-app.js:36434` and `orientationColor` at `valobois-app.js:36579`. They are **never** read by the export path: `buildMetadata` (`valobois-app.js:47489-47496`) passes `orientation: lot.orientationLabel || ''` as a plain text string and no colour. The exporters store that string only as descriptive metadata — glTF `node.extras.orientation` (`build-glb.js:487`, `:729`) — which is not a visual property. So the orientation-colour concept the brief referred to does exist in the product, but it has deliberately not been plumbed into the 3D geometry output.

I confirmed there is no legacy/removed material code: `git log -S "material"` on both builder files returns nothing, and a repo-wide grep for `KHR_materials|baseColorFactor|pbrMetallicRoughness` is empty. So colouring was never implemented in these builders and then dropped — it simply was never there. What remains genuinely open is only the product decision: is leaving 3D exports uncoloured the intended final behaviour, or is colour-by-orientation a still-wanted feature that should be wired into `build-glb.js`/`build-dae.js` (via glTF materials or COLLADA effects keyed on `lot.orientationLabel`)?

## Evidence in the code
- `build-glb.js:491-547` — single-piece glTF object has no `materials` array and no `extensions`; primitive at `:502-506` carries only `POSITION`/`indices`/`mode`.
- `build-glb.js:733` — grouped-export primitive likewise has no `material` key.
- `build-glb.js:487` / `build-glb.js:729` — `orientation` is stored only as text in `node.extras`, not as a colour/material.
- `build-dae.js:139` — `<triangles count="…">` has no `material` attribute.
- `build-dae.js:174-184` — COLLADA document declares only geometries / nodes / visual scenes; no `<library_materials>` or `<library_effects>`.
- `valobois-app.js:47489-47496` — `buildMetadata` passes `orientation: lot.orientationLabel` (string) and no colour into both `buildGLB`/`buildMultiGLB` (`:47513`, `:47544`) and `buildMultiDAE` (`:47613`).
- `valobois-constants.js:180-201` — `VALOBOIS_ORIENTATION_THRESHOLD_DESCRIPTORS` defines per-orientation `color` values…
- `valobois-app.js:36434`, `valobois-app.js:36579` — …which are consumed for UI/PDF tinting only, never by the export path.
- `specs/013-export-glb-dae-3d/spec.md` FR-013 — already mandates geometry-only / no colouring by orientation, pending this confirmation.

## What would resolve it
- Product owner confirms that geometry-only (no colour) is the intended, final behaviour for both GLB and DAE — at which point `FR-013` can drop its "(See Open Questions.)" caveat.
- If instead colour-by-orientation is still wanted: file a feature request to wire `lot.orientationLabel` → `VALOBOIS_ORIENTATION_THRESHOLD_DESCRIPTORS[*].color` into `build-glb.js` (glTF `materials` + primitive `material`) and `build-dae.js` (`<library_materials>`/`<library_effects>` + `<bind_material>`), since neither builder currently has any material scaffolding.
- No further code archaeology is needed: `git log -S "material"` on the two builders and a repo-wide grep for `KHR_materials|baseColorFactor|pbrMetallicRoughness` both return empty, confirming materials were never present.
