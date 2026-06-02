# Feature Specification: IFC Export for BIM Tools

**Feature Branch**: `012-export-ifc-bim`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the IFC export for BIM software

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export a reuse catalogue for BIM software (Priority: P1)

A diagnostician (*diagnostiqueur*) who has evaluated one or more lots of reclaimed wood opens the export window, chooses the **IFC for BIM** format, picks one or more lots, leaves the IFC mode on **"Bibliothèque d'éléments"** (element library — a reuse catalogue), reviews which information groups to include, and clicks **Exporter**. One IFC file is produced per selected lot. Each file holds the lot's pieces as individual elements that carry both their 3D shape and the VALOBOIS information describing them.

**Why this priority**: The library is the default mode and the main way to distribute a catalogue of reclaimed timber to teams working in BIM software (Revit, ArchiCAD, and other IFC tools).

**Independent Test**: Pick one lot with at least one piece, export it in library mode, open the resulting file in any IFC/BIM viewer, and confirm it reads as a reuse library with one element per piece.

**Acceptance Scenarios**:
1. **Given** a lot with several pieces, **When** exported in library mode, **Then** the file contains exactly one element per piece, gathered together as a single reuse library.
2. **Given** the information groups left enabled in the window, **When** exported, **Then** each piece carries those groups, with empty values left out.
3. **Given** a piece that has a species (*essence*) recorded, **When** exported, **Then** the element is tagged with that wood material.
4. **Given** study information (diagnostician name/contact/date), **When** exported, **Then** the file records who produced it and that it came from VALOBOIS.

### User Story 2 - Export a full BIM project (Priority: P2)

The diagnostician chooses IFC mode **"Projet BIM"** (BIM project) to drop the lot into a design office (*bureau d'études*) model. The exported file then contains a full building structure (project, site, building, storey) with the pieces placed inside it.

**Why this priority**: A secondary mode for teams who want the lot integrated into a complete building model rather than a loose catalogue. It is not the default.

**Independent Test**: Export one lot in project mode, open the file, and confirm it contains a full building structure with the pieces placed on the storey.

**Acceptance Scenarios**:
1. **Given** project mode, **When** exported, **Then** the file contains one project, one site, one building, and one storey named after the lot.
2. **Given** project mode, **When** exported, **Then** the pieces are placed inside that storey.
3. **Given** project mode, **When** exported, **Then** the file states that lengths are in metres (library mode states millimetres — see Open Questions).

### User Story 3 - Carry the user's custom info into the export (Priority: P2)

A diagnostician has added free-form custom info (*informations personnalisées*) to pieces. On export, that custom info travels with each piece as its own information group, alongside a count of how many custom entries were filled in.

**Why this priority**: Custom info is a VALOBOIS extra — valuable, but not required for a usable IFC file.

**Independent Test**: Add custom info to a piece, export, and confirm the piece carries a custom-info group listing each label and its value.

**Acceptance Scenarios**:
1. **Given** a piece with one or more custom-info entries that have values, **When** exported, **Then** the piece carries a custom-info group listing each label with its value(s), plus the number of filled-in entries.
2. **Given** no custom info, **When** exported, **Then** no custom-info group is written (empty groups are left out).

### Edge Cases

- **Pieces with a constant cross-section** (one section, or all sections the same) are exported as a simple extruded shape (a rectangular or round profile pushed along the length).
- **Pieces that change shape along their length** (varying sections) are exported as a 3D surface mesh that follows the real profile.
- **When a piece's mesh cannot be built**, a plain box is exported instead, sized from the piece's length/width/thickness (falling back to 1000 × 100 × 100 mm when those are missing).
- **Round pieces with no diameter recorded** fall back to a 100 mm diameter; rectangular pieces fall back to 100 × 100 mm.
- **Missing length** falls back to 1000 mm.
- **Missing species**: no wood material is attached.
- **A value that cannot be read** is simply skipped, and the rest of the piece still exports.
- **An information group that ends up with no usable values** is not written at all.
- **Empty, blank, or unset values** are left out.
- **Several lots selected at once**: one file per lot, the downloads spaced slightly apart so the browser does not block them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST produce a complete IFC file for a selected lot, in either library mode (default) or full BIM-project mode.
- **FR-002**: The IFC file MUST identify itself as coming from VALOBOIS and be named after the lot.
- **FR-003**: Each piece in the file MUST get a stable unique identifier.
- **FR-004**: The export MUST state the units it uses (length, area, volume). (See Open Questions about the library-mode length unit.)
- **FR-005**: Each piece MUST appear as its own element, named by its piece type and species (defaulting to "Pièce" when no type is set).
- **FR-006**: When several copies of a piece are exported together, they MUST be laid out side by side so they sit next to one another without overlapping.
- **FR-007**: Constant-section pieces MUST be exported lying horizontally, with the cross-section centred.
- **FR-008**: Pieces that change shape along their length MUST be exported as a closed 3D surface that follows the real profile, oriented to match the simpler pieces. (See Open Questions.)
- **FR-009**: The export MUST record the study's authorship — the diagnostician's name and contact, the date, and that VALOBOIS produced the file (falling back to "VALOBOIS" when contact details are missing).
- **FR-010**: A wood material named after the species MUST be attached to each piece, but only when a species is recorded.
- **FR-011**: The export MUST include the information groups the user enabled, taking each value from the piece (or the lot when the piece has none) and skipping anything blank. Groups that end up empty are skipped.
- **FR-012**: Each value MUST be carried with the right kind (yes/no, whole number, decimal number, or text), grouped under its information group.
- **FR-013**: In library mode the pieces MUST be gathered into a single reuse library named after the lot; in project mode they MUST be placed inside a full project/site/building/storey structure (storey named after the lot).
- **FR-014**: For each lot, the export MUST combine the lot's default pieces (repeated by their quantity) with its individual pieces, then download one file per lot, with multiple lots spaced slightly apart.
- **FR-015**: The user's custom info MUST be added as its own information group automatically, even if it was not already part of the chosen configuration.
- **FR-016**: The IFC mode (library or project) MUST come from the user's choice in the export window, and the chosen information groups MUST be editable there.

### Key Entities

- **Piece element**: one per piece; named by piece type and species; carries its 3D shape (extruded for simple pieces, surface mesh for shaped pieces).
- **Member / common info**: reference, reuse status (from orientation), span, and load-bearing (set to false).
- **Wood material info**: species and moisture content.
- **Material density info**: density.
- **Identification info**: lot name, piece type, destination (orientation), evaluation version, study status (Pré-diagnostic / En cours / Finalisé / Révision / Cloturé), operation name, location, source reference, and the diagnostician's email, phone, and address.
- **Dimensions info**: piece volume, lot volume, piece surface (lot linear metres and lot mass available but off by default).
- **Destination info**: orientation, economic/ecological/mechanical scores, market price, lot price (circularity and integrity coefficient available but off by default).
- **Carbon info**: carbon fraction, biogenic carbon, density (density off by default).
- **Evaluation info** (off by default): the individual criterion scores (biology, mechanical, use, alteration, sawing, geometry, species, age, marks, provenance).
- **Custom info**: the user's custom info, labels with values, plus the count of filled-in entries.
- **Authorship**: the diagnostician (person + organization), VALOBOIS as the producing application, and a creation date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Exporting a lot with M pieces yields one IFC file containing exactly M elements.
- **SC-002**: The file opens in a common IFC/BIM viewer (e.g. BIMcollab Zoom, usBIM) without errors.
- **SC-003**: With the default settings, each piece carries the standard information groups plus custom info when present (the per-criterion evaluation group only when the user turns it on).
- **SC-004**: A constant-section piece exports as a simple extruded shape; a piece that changes shape exports as a surface mesh.
- **SC-005**: Library mode produces a reuse library with no building structure; project mode produces the full project/site/building/storey structure.

## Assumptions

- Study information comes from the current evaluation; the information groups default to the standard VALOBOIS set when none is chosen.
- The section-resolving and meshing helpers are available before the IFC export runs; if not, sections are treated as constant and dimensions fall back to the piece's basic width/thickness/diameter.
- The diagnostician's full name is stored as one text field; the last word is treated as the family name.
- A piece counts as "constant section" when its sections match within a fine tolerance.

## Source Files

- `js/lib/build-ifc.js`
- `js/lib/build-glb.js`
- `js/app/valobois-app.js`
- `js/app/custom-infos-export-barcode-ifc-patch.js`
- `index.html`

## Open Questions

- **Pieces may come in at the wrong size in library mode**: in library mode the file states lengths are in millimetres while the actual coordinates are written in metres (project mode says metres). In a BIM viewer that trusts the stated unit, this could make pieces appear 1000× too large or too small. This should be checked against a real target viewer.
- **Orientation/placement of shaped pieces**: the simple (extruded) pieces and the shaped (mesh) pieces follow different internal layout rules; confirm a lot mixing both kinds comes out consistently oriented.
- **Moisture and density values**: these are exported as raw numbers without unit conversion; confirm the units match what BIM tools expect.
- **Custom info defined in two places**: the custom-info group is part of both the standard configuration and an automatic add-on; confirm which one is meant to be the source of truth.
- **Evaluation scores source**: the per-criterion evaluation group and the destination group read scores from differently named places; confirm both exist on the lot.
