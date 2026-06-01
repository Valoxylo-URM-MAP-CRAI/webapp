# Feature Specification: 3D Model Exports — GLB (3D viewers) and DAE (SketchUp)

**Feature Branch**: `013-export-glb-dae-3d`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the GLB and DAE 3D model exports

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export GLB models for 3D viewers (Priority: P1)

A diagnostician (*diagnostiqueur*) opens the export window, chooses **3D (GLB)**, picks one or more lots, optionally sets how finely round pieces are drawn (light / normal / precise) and whether to group all the pieces of a lot into one file, then clicks **Exporter**. The app downloads GLB files of the pieces, ready to drop into any common 3D viewer (web viewers, Blender, and similar).

**Why this priority**: GLB is the main, viewer-friendly 3D output, easy to open and share.

**Independent Test**: Pick a lot with a rectangular piece, export GLB without grouping, and confirm a 3D viewer shows a beam-shaped model.

**Acceptance Scenarios**:
1. **Given** grouping is off, **When** exported, **Then** one GLB file is downloaded per piece.
2. **Given** grouping is on, **When** exported, **Then** one GLB file is downloaded per lot, containing every piece of that lot.
3. **Given** a round piece and the "precise" setting, **When** exported, **Then** the round shape is drawn with more facets than at "light" or "normal".
4. **Given** each piece, **When** exported, **Then** the model carries the piece's details: lot name, species (*essence*), piece type, length, piece volume, and orientation.

### User Story 2 - Export a DAE for SketchUp (Priority: P1)

The diagnostician chooses **3D - SketchUp (DAE)**, picks lots, and exports. One DAE file is produced per lot. Every piece arrives as its own separate component, so SketchUp imports each piece as a distinct, selectable group.

**Why this priority**: DAE is the dedicated path into SketchUp, just as important as GLB for CAD users.

**Independent Test**: Export a lot with two pieces to DAE, import into SketchUp, and confirm two distinct groups appear, spaced apart and resting on the ground.

**Acceptance Scenarios**:
1. **Given** a lot with several pieces, **When** exported to DAE, **Then** each piece appears as its own component in the file.
2. **Given** two pieces with identical dimensions, **When** exported, **Then** each still arrives as its own separate component (SketchUp does not merge them).
3. **Given** the DAE file, **When** inspected, **Then** it declares its unit as the metre and an upright orientation.

### User Story 3 - Export pieces that change shape along their length (Priority: P2)

A piece with several measured sections (*mesures multiples*) — rectangular and/or round, possibly transitioning from one to the other — is exported. The model smoothly follows the real profile from one section to the next, with no twisting or crossed edges.

**Why this priority**: Reclaimed timber is often irregular (tapered, round-to-square); faithful geometry matters.

**Independent Test**: Export a piece that goes from an 80 × 80 square to a Ø75 round and confirm the model is a smooth, untwisted transition.

**Acceptance Scenarios**:
1. **Given** a piece that stays rectangular end to end, **When** modelled, **Then** the corners are kept sharp and the true length × thickness volume is preserved.
2. **Given** a round section, **When** modelled, **Then** the round profile is drawn evenly around its circumference.
3. **Given** a piece going from square to round, **When** modelled, **Then** the square and round ends line up so the transition does not twist.

### Edge Cases

- **Only one section defined**: it is duplicated so the piece always has a start and an end to model between.
- **No multi-section data**: the piece is treated as a constant prism — round when it has a diameter and no width, otherwise rectangular.
- **Missing length**: falls back to the recorded multi-section length, then the piece length, then 1000 mm.
- **Zero or missing dimensions**: nudged to a minimum so the model is never degenerate.
- **Very detailed pieces**: large models are handled without losing geometry.
- **End caps**: each end is closed off; round and mixed pieces get evenly subdivided caps, pure rectangular pieces keep their four corners.
- **Round detail set too low / not a valid step**: quietly bumped up to the normal setting.
- **Empty lot**: no file produced for it.
- **Layout**: in a grouped GLB the pieces are spread out along one axis with a gap between them; in DAE the pieces are likewise spaced apart and all rest flat on the same ground plane.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST be able to produce a single-piece GLB, a grouped multi-piece GLB, and a multi-piece DAE.
- **FR-002**: All exported models MUST use a consistent orientation and be expressed in metres (the app stores dimensions in millimetres and converts on export).
- **FR-003**: The app MUST resolve each piece into an ordered set of cross-sections (always at least a start and an end), using the recorded multi-section measurements when present, otherwise treating the piece as a single constant section.
- **FR-004**: The app MUST build each piece's shape by following its sections from end to end and closing both ends, with round pieces drawn at the chosen level of detail.
- **FR-005**: The app MUST draw round sections evenly, keep pure rectangular pieces' corners sharp (preserving volume), and align square-to-round transitions so they do not twist.
- **FR-006**: The app MUST close both ends of each piece cleanly, consistent with how the sides are drawn.
- **FR-007 (GLB)**: A GLB MUST be a valid 3D model file that common 3D viewers can open, holding the piece's shape.
- **FR-008 (GLB details)**: Each GLB piece MUST carry its lot name, species, piece type, length, piece volume, and orientation.
- **FR-009 (grouped GLB layout)**: A grouped GLB MUST place each piece at its own spot, the pieces laid out in a row and centred.
- **FR-010 (DAE)**: A DAE MUST be a valid SketchUp-compatible file declaring the metre as its unit and an upright orientation, with one component per piece.
- **FR-011 (DAE layout)**: In a DAE each piece's position MUST be built directly into the piece so that the pieces sit spaced apart, all resting flat on the same ground plane after import.
- **FR-012 (DAE naming)**: Each piece's name in a DAE MUST be made safe for import — accents/special characters stripped — and based on its species, piece type, and number (falling back to "piece").
- **FR-013**: GLB and DAE MUST contain geometry only — no materials, no colours, and in particular NO colouring of pieces by orientation. (See Open Questions.)
- **FR-014 (in-app behaviour)**: For each lot, the export MUST combine the lot's default pieces (repeated by their quantity) with its individual pieces, attach each piece's details, read the chosen round-detail setting, and download the files.
- **FR-015 (detail setting)**: The round-detail setting MUST offer light, normal (default), and precise; invalid values fall back to normal. Grouping applies to GLB only — DAE is always one file per lot.
- **FR-016**: The DAE export MUST rely on the shared 3D geometry helpers and fail clearly if they are not loaded.

### Key Entities

- **Piece** (input): its length, width, thickness, diameter, and any multi-section measurements (each section having a position along the piece and its own shape and dimensions).
- **Piece details** (carried into the model): lot name, species, piece type, length, piece volume, orientation.
- **Model shape**: the piece's 3D surface, expressed in metres.
- **GLB piece details**: lot name, species (*essence*), piece type, length, piece volume, orientation (*orientation* = reuse destination).
- **DAE component**: one independent component per piece, named from species/type/number, with its position baked in.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An exported GLB opens without error in a common 3D viewer (web viewer, Blender, etc.).
- **SC-002**: A grouped lot GLB contains exactly one piece per piece instance, each carrying its six details.
- **SC-003**: An exported DAE imports into SketchUp as one distinct selectable group per piece, all resting on the ground and spaced apart.
- **SC-004**: A 3000 mm rectangular piece exports 3.0 m long with the correct cross-section in metres.
- **SC-005**: A square-to-round piece exports as a single clean model with no twisted or crossed edges.
- **SC-006**: Raising the round-detail setting adds detail to round pieces and leaves rectangular-only pieces unchanged.

## Assumptions

- All input dimensions are in millimetres; the only unit emitted is the metre.
- "Mixed" means a rectangular section next to a round one; pure rectangular pieces keep their sharp corners to preserve exact volume.
- The piece volume carried as a model detail comes from the piece's recorded volume (see Open Questions).
- The round-detail and grouping controls appear only for the GLB/DAE formats.

## Source Files

- `js/lib/build-glb.js`
- `js/lib/build-dae.js`
- `js/app/valobois-app.js`
- `index.html`

## Open Questions

- **No colouring by orientation**: an earlier brief mentioned colouring GLB pieces by orientation, but the exports define no materials or colours at all — geometry only. Confirm this is the intended behaviour (the no-colour result is the correct, verified one).
- **Which volume figure is carried**: the model details use the piece's recorded volume, while the model also stores an enriched volume that the IFC export prefers; confirm which is authoritative for the 3D details.
- **SketchUp naming**: past notes describe tuning how SketchUp derives component names; confirm the names survive a current SketchUp import cleanly.
- **GLB vs DAE spacing differ**: grouped GLB and DAE space pieces differently (and DAE also rests them on the ground); confirm this is intentional for the different target tools rather than drift.
- **Orientation granularity**: the 3D details use the lot-level orientation, whereas IFC can use a per-piece orientation; confirm the intended granularity for 3D exports.
