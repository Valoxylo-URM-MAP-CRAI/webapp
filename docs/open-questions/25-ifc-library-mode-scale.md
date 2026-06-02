# Library-mode IFC declares millimetres but writes metre coordinates (1000× scale risk)

> **Open question** · priority #25 · Tier 4 – Exports · Source spec: `specs/012-export-ifc-bim/spec.md`

## Question
In library mode the IFC file states lengths in millimetres while the coordinates are written in metres (project mode states metres). A BIM viewer that trusts the stated unit could show pieces 1000x too large or too small. This should be checked against a real target viewer.

<details>
<summary>🇫🇷 Version française</summary>

En mode « Bibliothèque », le fichier IFC déclare des longueurs en millimètres alors que les coordonnées sont écrites en mètres (le mode « Projet » indique mètres). Un visualiseur BIM qui se fie à l'unité déclarée pourrait afficher les pièces 1000x trop grandes ou trop petites. À vérifier sur un outil cible réel.

</details>

## Why this is open
**Classification:** Suspected bug / correctness risk (with a residual *could-not-be-fully-traced* component: the visible impact depends on how a given viewer interprets the unit).

The two export modes emit different `IFCSIUNIT` length declarations, but they share the exact same geometry-writing routine, so the declared unit and the actual numeric magnitudes only match in one of the two modes.

- Library mode declares the length unit as **milli-metre**: `build-ifc.js:420` writes `IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)`.
- Project mode declares the length unit as **metre** (no prefix): `build-ifc.js:540` writes `IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`.

Both modes then build each piece's geometry by calling the *same* `buildIFCMember` function (`build-ifc.js:218`), invoked identically from `buildIFCLibrary` (`build-ifc.js:490`) and from `buildIFCProject` (`build-ifc.js:651`). That function — and every geometry helper it reaches — converts the VALOBOIS source values (which are stored in millimetres) into **metres** before writing them as STEP reals:

- Extrusion length: `longueur_m = longueur_mm / 1000` then written via `IFCEXTRUDEDAREASOLID(...,longueur_m)` (`build-ifc.js:256`, `:288`).
- Rectangular profile half-dimensions: `L_m = sec.largeur / 1000`, `H_m = sec.epaisseur / 1000`, written as `L_m/2`, `H_m/2` (`build-ifc.js:270-272`).
- Circular profile radius: `R_m = sec.diametre / 2000` (`build-ifc.js:267-268`).
- Inter-piece spacing offset: `offsetY_m = placementOffsetY / 1000` (`build-ifc.js:221`) — note `placementOffsetY` (`centers[ii]`) is itself computed in mm (`build-ifc.js:461-486`).
- Variable-section mesh vertices: produced by `buildMesh`, whose coordinates are already in metres — profile helpers divide by 2000 (`build-glb.js:93,116,141,168,200`) and length is `(positionRatio * longueur_mm) / 1000` (`build-glb.js:267`). The IFC code copies these verbatim with the comment "coords déjà en mètres" (`build-ifc.js:304-310`).
- Fallback box: `L/W/H = (.../1000)` (`build-ifc.js:163-165`).

Because the geometry is unconditionally in metres, the **project** mode is internally consistent (declares metres, writes metres). The **library** mode declares milli-metres but writes the very same metre-magnitude numbers. A 3000 mm beam is written as `3.0` in both files; a viewer that honours the IFCSIUNIT prefix will read that `3.0` as 3000 mm (3 m) in project mode — correct — but as `3.0 mm` in library mode, i.e. **1000× too small**. (Equivalently, a viewer normalising everything to metres internally would place the library piece at 0.003 m.)

What is **confirmed** by static reading: the unit declarations differ (`:420` vs `:540`) while the coordinate-producing code is shared and metre-based. This is a genuine internal inconsistency in the library path, not a documentation artefact.

What **remains uncertain** (the could-not-be-fully-traced part): the *user-visible* outcome depends on the target viewer. Some viewers strictly apply the declared `IFCSIUNIT` prefix (so pieces would be mis-scaled); others infer scale from geometry bounds or ignore the prefix. The spec's own SC-002 only asserts the file "opens without errors," and US1's independent test checks element count, not scale — so no existing acceptance criterion catches this. It must be checked in a real BIM viewer to know whether the inconsistency manifests as visibly wrong-sized geometry. The spec already flags this in FR-004 and its Open Questions section (`spec.md:35,69,124`).

## Evidence in the code
- `js/lib/build-ifc.js:420` — library mode: `IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)` declares millimetres.
- `js/lib/build-ifc.js:540` — project mode: `IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)` declares metres.
- `js/lib/build-ifc.js:218` — single shared `buildIFCMember` used by both modes.
- `js/lib/build-ifc.js:490` and `:651` — library and project each call `buildIFCMember` with the same signature.
- `js/lib/build-ifc.js:256,288` — extrusion length divided by 1000 (mm→m).
- `js/lib/build-ifc.js:267-272` — profile dimensions divided by 1000/2000 (mm→m).
- `js/lib/build-ifc.js:221` — spacing offset divided by 1000 (mm→m).
- `js/lib/build-ifc.js:304-310` — mesh vertices written verbatim, commented "coords déjà en mètres".
- `js/lib/build-ifc.js:163-165` — fallback box dimensions divided by 1000.
- `js/lib/build-glb.js:267,93,116` — `buildMesh` outputs metre coordinates (length `/1000`, profiles `/2000`).
- `specs/012-export-ifc-bim/spec.md:35,69,124` — spec records the library/project unit divergence as an open question.

## What would resolve it
- Open a library-mode export of a real lot in each target BIM viewer (e.g. BIMcollab Zoom, usBIM, ArchiCAD/Revit IFC import) and measure a piece of known length; confirm whether it reads at true size or 1000× off.
- If viewers honour the prefix (mis-scaled): fix the inconsistency by either (a) changing library mode's declaration at `build-ifc.js:420` to `.METRE.` to match project mode and the metre-based geometry, or (b) keeping `.MILLI.` and writing all coordinates in millimetres (remove the `/1000` and `/2000` conversions) — choose one unit system and apply it consistently to declaration and geometry.
- Product owner / maintainer decides which length unit BIM consumers expect for the reuse catalogue, then align the two modes to that single convention.
- Add a regression check that asserts the declared `IFCSIUNIT` length prefix is consistent with the magnitude of the written extrusion length (e.g. a 3000 mm piece exports `3.0` only when the unit is `.METRE.`).
