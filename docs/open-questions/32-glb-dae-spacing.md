# Grouped GLB and DAE lay pieces out with different spacing formulas (and DAE grounds them)

> **Open question** · priority #32 · Tier 4 – Exports · Source spec: `specs/013-export-glb-dae-3d/spec.md`

## Question
Grouped GLB and DAE space the pieces differently (and DAE also rests them on the ground); confirm this is intentional for the different target tools rather than drift.

<details>
<summary>🇫🇷 Version française</summary>

Le GLB et le DAE groupés espacent les pièces différemment (et le DAE les pose au sol) ; confirmer que c'est intentionnel selon les outils cibles plutôt qu'une dérive.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a latent correctness risk in the GLB formula).

The two exporters demonstrably use **different layout maths**, and the difference is real, not cosmetic. Both lay pieces out along +X, but they compute the per-piece advance differently and treat the vertical axis differently:

- **Grouped GLB** (`assembleMultiGLB`, `js/lib/build-glb.js:691-700`): each piece geometry stays centred on X=0 (range −hw to +hw); the piece is placed via a glTF node `translation` of `[currentX, 0, -centreZ]`, and the cursor advances by `currentX += 1.5 * widthCurrent` where `widthCurrent = bounds[i].max[0] − bounds[i].min[0]` (= full X-extent of piece *i*). So the **centre-to-centre step is 1.5 × width of the current piece** (i.e. 3·hw_i). The Y component of the translation is the literal constant `0` — pieces are **not** grounded; each piece is centred on its own profile's vertical midline.

- **DAE** (`buildMultiDAE`, `js/lib/build-dae.js:58-72`): the offset is **baked into the vertex coordinates** (no `<translate>`/`<matrix>` in the scene) as `[currentX, -b.min[1], -centreZ]`. The cursor starts at `halfWidths[0]` (left edge of piece 0 anchored at X=0) and advances by `currentX += 2*halfWidths[i] + halfWidths[i+1]`, i.e. the **centre-to-centre step is 2·hw_i + hw_{i+1}**. The `-b.min[1]` term lifts each piece so its lowest point sits at Y=0 → all pieces **rest on a common ground plane** (which becomes the SketchUp floor after the Y_UP→Z_UP import rotation).

Translating both into edge-to-edge gaps makes the divergence concrete. GLB leaves a gap of `1.5·width_i − hw_i − hw_{i+1} = 2·hw_i − hw_{i+1}`; DAE leaves a gap of `(2·hw_i + hw_{i+1}) − hw_i − hw_{i+1} = hw_i` (the comment at `build-dae.js:55-57` explicitly notes `gap = hw_i > 0 toujours`). So **DAE guarantees a positive gap proportional to the current piece's half-width**, whereas **GLB's gap depends on the *next* piece**: if piece *i+1* is much wider than piece *i* (`hw_{i+1} > 2·hw_i`), the GLB gap goes to zero or negative and adjacent pieces can touch or overlap. This is the latent correctness risk — for mixed-width lots the GLB layout can collide where DAE never does.

The spec itself frames this as deliberate per-target tuning. `spec.md:74` (FR-009) only requires the grouped GLB to "place each piece at its own spot… laid out in a row and centred"; `spec.md:76` (FR-011) requires the DAE to bake positions so pieces "sit spaced apart, all resting flat on the same ground plane." The edge-case note `spec.md:60` and Open Question `spec.md:121` acknowledge the spacing differs and that DAE grounds while GLB does not. The DAE code comments (`build-dae.js:48-53`) explain the baking choice is driven by a SketchUp constraint (baked geometry guarantees uniqueness so SketchUp cannot merge identical components and overwrite the supplied names). That is a tool-specific reason for DAE's *approach*, but it does **not** explain why the *step formula* (`2·hw_i + hw_{i+1}` vs `1.5·width`) and the *grounding* (`-b.min[1]` vs constant `0`) differ.

**Confirmed:** the formulas, the grounding asymmetry, and that both code paths are live (`buildMultiGLB` at `valobois-app.js:47513`, `buildMultiDAE` at `valobois-app.js:47613`). **Uncertain:** whether the two formulas were each chosen on purpose for their target viewer (Blender/web vs SketchUp) or whether one drifted from the other; and whether the GLB overlap-on-wide-neighbour case has ever surfaced in practice. Static reading cannot settle intent.

## Evidence in the code
- `js/lib/build-glb.js:693-699` — grouped GLB step is `currentX += 1.5 * widthCurrent` (centre-to-centre = 1.5 × full width of the *current* piece).
- `js/lib/build-glb.js:696` — GLB node translation is `[currentX, 0, -centreZ]`; the Y term is a literal `0`, so GLB pieces are **not** grounded (centred on their own vertical midline).
- `js/lib/build-glb.js:742` — the translation is applied as a per-piece glTF node `translation` (geometry stays at origin, transform lives in the scene graph).
- `js/lib/build-dae.js:61` — DAE cursor starts at `halfWidths[0]` (left edge of piece 0 at X=0), a different anchoring than GLB's centre-at-0.
- `js/lib/build-dae.js:70` — DAE step is `currentX += 2 * halfWidths[i] + halfWidths[i + 1]` (centre-to-centre depends on *both* current and next half-widths) → constant positive gap `hw_i`.
- `js/lib/build-dae.js:64-68` — DAE offset `[currentX, -b.min[1], -centreZ]` lifts each piece to a common ground plane; offsets are **baked into vertex positions** (`build-dae.js:115-118`), no scene transform.
- `js/lib/build-dae.js:48-53` — comment: baking is a SketchUp-driven choice (forces geometric uniqueness so component names survive import) — explains the *baking*, not the differing *step/grounding*.
- `specs/013-export-glb-dae-3d/spec.md:74,76` — FR-009 (GLB: row + centred) and FR-011 (DAE: baked, spaced, ground plane) state different requirements per format.
- `specs/013-export-glb-dae-3d/spec.md:60,121` — edge-case note and Open Question both acknowledge the spacing differs and DAE grounds.
- `js/app/valobois-app.js:47513` / `47613` — both `buildMultiGLB` and `buildMultiDAE` are invoked from the live export handlers (grouped GLB; one DAE per lot).

## What would resolve it
- Product owner / spec author confirms the two layouts are each intentionally tuned for their target tool (GLB for web/Blender viewers, DAE for SketchUp) and that no single shared formula is desired.
- Decide whether the GLB step should switch to the DAE-style "gap proportional to current half-width" rule to remove the overlap-on-wider-neighbour case — or confirm the current `1.5 × width` is acceptable because viewers tolerate overlap / lots are uniform enough in practice.
- Confirm intentional grounding asymmetry: DAE rests pieces on Y=0 while GLB centres them vertically. Decide whether grouped GLB should also be grounded for visual consistency.
- Quick check: export a grouped GLB of a lot containing one narrow piece immediately followed by a much wider one and open it in a 3D viewer to see whether the two pieces collide (validates/refutes the `2·hw_i − hw_{i+1}` < 0 risk).
