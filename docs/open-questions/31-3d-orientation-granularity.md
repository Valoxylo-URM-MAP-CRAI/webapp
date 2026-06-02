# 3D export orientation: lot-level value vs IFC's per-piece-capable lookup

> **Open question** · priority #31 · Tier 4 – Exports · Source spec: `specs/013-export-glb-dae-3d/spec.md`

## Question
The 3D details use the lot-level orientation, whereas IFC can use a per-piece orientation; confirm the intended granularity for 3D exports.

<details>
<summary>🇫🇷 Version française</summary>

Les détails 3D utilisent l'orientation au niveau du lot, alors que l'IFC peut utiliser une orientation par pièce ; confirmer la granularité voulue pour les exports 3D.

</details>

## Why this is open
**Classification:** Cross-file inconsistency (resolved in practice today, but a latent divergence). Secondary: Product-intent ambiguity.

The two export paths read orientation differently. The GLB and DAE builders receive a `metadata` object whose `orientation` field is hard-wired to the **lot** value only: `orientation: lot.orientationLabel || ''` (`js/app/valobois-app.js:47495` for GLB, `js/app/valobois-app.js:47600` for DAE). There is no `piece` term in that expression, so even if a piece carried its own orientation it would be ignored for 3D.

The IFC export, by contrast, resolves orientation through Pset `getValue` callbacks that are **piece-first with a lot fallback**: `piece?.orientation || lot?.orientation || null`. This appears three times — `Pset_MemberCommon` Status (`js/app/valobois-app.js:115`), `Pset_Valobois_Identification` Destination (`:166`), and `Pset_Valobois_Destination` Orientation (`:218`). Those callbacks are invoked per piece inside `buildIFCMember` via `propDef.getValue(piece, lot, meta)` (`js/lib/build-ifc.js:369`), so IFC is *structurally* able to emit a different orientation per piece. This is the asymmetry the question points at: IFC is per-piece-capable, GLB/DAE is not.

In the **current** data model, however, the two paths produce the same value, because a per-piece orientation never actually exists. Orientation is computed only at lot granularity in `computeOrientationFromMatrix(lot, ...)` and written back as three lot fields together: `lot.orientationLabel = label; lot.orientationCode = code; lot.orientation = label;` (`js/app/valobois-app.js:39854-39856`). The default/empty piece factory (`createEmptyDefaultPiece`, `js/app/valobois-app.js:2536-2572`) defines no `orientation` field, and no code path assigns `piece.orientation`. So `piece?.orientation` in the IFC callbacks is always `undefined` and the lot fallback wins — and since `lot.orientation === lot.orientationLabel`, IFC and GLB/DAE currently emit identical orientation text. I confirmed this by grepping every `piece.orientation` / `.orientation =` assignment; none populates a piece.

What I therefore **confirmed**: (a) GLB/DAE only ever read the lot orientation; (b) IFC reads piece-first-then-lot; (c) today no piece carries its own orientation, so the difference is dormant. What remains a **product decision**: whether per-piece orientation is ever intended to exist (and if so whether GLB/DAE details should track it), or whether the IFC `piece?.orientation ||` prefix is dead/aspirational defensiveness that should be dropped for consistency. Note also a dead-code wrinkle: `build-ifc.js` ships its own `orientationToStatus()` helper (`js/lib/build-ifc.js:44-51`) that is never called — the live Status logic was duplicated inline into the Pset config at `valobois-app.js:114-122`.

## Evidence in the code
- `js/app/valobois-app.js:47495` — GLB `buildMetadata` sets `orientation: lot.orientationLabel || ''` (no piece term).
- `js/app/valobois-app.js:47600` — DAE `buildMetadata` is identical: lot-level orientation only.
- `js/lib/build-glb.js:487`, `:729` — the GLB writer stores `metadata.orientation` verbatim as a model detail; it never derives orientation itself.
- `js/app/valobois-app.js:115`, `:166`, `:218` — IFC Pset `getValue` callbacks resolve `piece?.orientation || lot?.orientation`, i.e. per-piece with lot fallback.
- `js/lib/build-ifc.js:369` — `propDef.getValue(piece, lot, meta)` is called once per piece, so IFC is structurally per-piece-capable.
- `js/app/valobois-app.js:39854-39856` — orientation is computed at lot level and written to `orientationLabel`, `orientationCode`, and `orientation` together (so `lot.orientation` === `lot.orientationLabel`).
- `js/app/valobois-app.js:2536-2572` — `createEmptyDefaultPiece()` defines no `orientation` field; grep finds no assignment to `piece.orientation` anywhere.
- `js/lib/build-ifc.js:44-51` — `orientationToStatus()` exists but is never invoked (its logic was inlined into the Pset config); a separate dead-code/inconsistency signal in the same area.

## What would resolve it
- Product owner confirms granularity intent: is orientation conceptually a lot-level attribute (current reality), or should pieces be able to override it? That single answer settles both exporters.
- If lot-level is authoritative: simplify the IFC callbacks to drop the unused `piece?.orientation ||` prefix (and delete the dead `orientationToStatus` helper) so all exporters agree by construction — lot orientation, no latent divergence.
- If per-piece is intended: add an `orientation` field to the piece model and update GLB/DAE `buildMetadata` (`valobois-app.js:47495`, `:47600`) to read `piece.orientation || lot.orientationLabel`, matching IFC.
- Quick verification that today's behaviour is benign: export the same lot to GLB and IFC and confirm the orientation/Status text matches (it should, given `piece.orientation` is always undefined and `lot.orientation === lot.orientationLabel`).
