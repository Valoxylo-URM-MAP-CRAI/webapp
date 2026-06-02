# Orientation consistency of extruded vs. mesh pieces in a mixed lot

> **Open question** · priority #30 · Tier 4 – Exports · Source spec: `specs/012-export-ifc-bim/spec.md`

## Question
Simple (extruded) and shaped (mesh) pieces follow different internal layout rules; confirm that a lot mixing both kinds comes out consistently oriented.

<details>
<summary>🇫🇷 Version française</summary>

Les pièces simples (extrudées) et de forme (maillage) suivent des règles de placement internes différentes ; confirmer qu'un lot mêlant les deux sort orienté de façon cohérente.

</details>

## Why this is open
**Classification:** Could not be fully traced (needs runtime confirmation in a BIM viewer) — leaning toward *resolved by static reading*, with one non-obvious coordinate transform as the residual risk.

The two geometry branches in `buildIFCMember` (`js/lib/build-ifc.js`) really do use completely different IFC entities and code paths: a constant-section piece becomes an `IFCEXTRUDEDAREASOLID` built from a 2D profile (`build-ifc.js:248-288`), while a varying-section piece becomes an `IFCFACETEDBREP` built from the triangle mesh returned by `window.buildMesh()` (`build-ifc.js:290-333`). The spec's "different internal layout rules" wording is accurate at the code level — the question is whether those two paths converge on the *same* world-space orientation. Reading the code, they do, but the convergence depends on a hand-written axis remap that is easy to get wrong, which is why this is worth confirming rather than assuming.

For the **extruded** path the profile is centred at the 2D origin (`IFCCARTESIANPOINT((0.,0.))`, `build-ifc.js:260`) and the solid is placed with `IFCAXIS2PLACEMENT3D(origin, axis=(1,0,0), refDirection=(0,1,0))` then extruded along its local Z (`IFCDIRECTION((0.,0.,1.))`, `build-ifc.js:276-288`). Because the placement's local Z is set to world X, the extrusion (the length) runs along **world X**; the profile plane is therefore world Y–Z, with profile-X (largeur) mapping to world Y (refDirection `(0,1,0)`) and profile-Y (epaisseur) mapping to world Z. The rectangle is `±L/2`, `±H/2` (`build-ifc.js:272`), i.e. centred on the cross-section.

For the **mesh** path, `buildMesh` builds vertices in its own convention, documented at `build-glb.js:13`: **Z = longueur, X = largeur, Y = épaisseur**, with the cross-section centred at `(0,0)` (`rectProfileUniform` uses `x:±a, y:±b`, `build-glb.js:199-212`) and `z` running 0→length (`build-glb.js:267`). When emitted to IFC, each vertex is written **reordered** as `IFCCARTESIANPOINT((pz, px, py))` (`build-ifc.js:310`). That swap sends mesh-Z (length) → world X, mesh-X (width) → world Y, mesh-Y (thickness) → world Z. This is exactly the same axis assignment the extruded path arrives at: length→X, width→Y, thickness→Z, cross-section centred. So statically the two converge.

The side-by-side spacing is applied *outside* the geometry branch and is therefore identical for both kinds: the member's local placement is offset on world Y by `placementOffsetY` (`build-ifc.js:221,227`), and `centers[]` — the per-instance Y offsets — is computed once from `resolveSections` widths/diameters with no regard to extruded-vs-mesh (`build-ifc.js:461-487`). So mixed lots share one spacing rule.

What I could **not** confirm by reading alone: (1) that the `(pz, px, py)` reorder at `build-ifc.js:310` is actually correct in a viewer (a transposed/mirrored mesh would still load without error but sit rotated relative to the extruded pieces); (2) that mesh triangle winding (`.T.` outer bounds, `build-ifc.js:323`) yields outward normals consistent with the extruded solids; (3) that the fallback box branch (`buildFallbackBrep`, used when `buildMesh` is unavailable, `build-ifc.js:294-298`) lands at the same origin/orientation as the other two — its coordinates were not traced here. These are the items that need a real export opened in a BIM viewer.

## Evidence in the code
- `js/lib/build-ifc.js:248-288` — extruded branch: centred 2D profile, placement axis `(1,0,0)` / ref `(0,1,0)`, extrude along local Z → length runs along world X.
- `js/lib/build-ifc.js:290-333` — mesh branch: separate `IFCFACETEDBREP` path via `window.buildMesh()`, used only when sections vary.
- `js/lib/build-ifc.js:310` — the non-obvious bit: vertices written as `IFCCARTESIANPOINT((pz, px, py))`, remapping mesh axes to world axes to match the extruded convention.
- `js/lib/build-glb.js:13` — buildMesh axis convention: "Z = longueur, X = largeur, Y = épaisseur".
- `js/lib/build-glb.js:267` — `z = positionRatio * longueur_mm / 1000`, so mesh Z is the length axis.
- `js/lib/build-glb.js:199-212` — `rectProfileUniform`: cross-section centred at origin (`±a, ±b`), matching the extruded `±L/2, ±H/2`.
- `js/lib/build-ifc.js:233-244` — constant-vs-varying decision (`isConstant`) that routes a piece to one branch or the other, with a 0.01 mm tolerance.
- `js/lib/build-ifc.js:221,227,231` — member local placement offset on world Y by `placementOffsetY`, identical for both branches.
- `js/lib/build-ifc.js:461-487` — `centers[]` spacing computed from section width/diameter only, agnostic to geometry type.
- `js/lib/build-ifc.js:294-298` — fallback box path whose orientation was not statically traced.

## What would resolve it
- Build a lot containing at least one constant-section piece and one varying-section piece, export it in IFC library mode, and open it in a target BIM viewer (e.g. BIMcollab Zoom or usBIM). Visually confirm both pieces lie along the same world axis (length on X), are centred on their cross-section, and sit side by side on Y without overlap or rotation.
- In the same viewer, check that mesh pieces are not inside-out (face normals/shading) versus the extruded solids — confirms the `.T.` winding at `build-ifc.js:323`.
- Trace `buildFallbackBrep` (`build-ifc.js:159-206`, invoked at `:294-298`) and confirm the fallback box uses the same origin and axis mapping as the other two branches; otherwise a piece whose mesh fails would orient differently.
- If all three hold, this can be closed as "code is consistent, confirmed in viewer"; the spec note can then be downgraded from an open question to an as-built statement.
