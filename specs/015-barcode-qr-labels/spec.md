# Feature Specification: Barcode & QR Labels from Custom Info (étiquettes code-barres / QR pour infos perso)

**Feature Branch**: `015-barcode-qr-labels`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of putting custom info (info perso) onto barcode and QR labels, including the compact and complete forms, accent stripping, and carrying the same info into other exports

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Put custom info onto a label's code (Priority: P1)

A user preparing étiquettes (labels) for selected lots/pieces turns on the "Informations personnalisées" field in the label composer, so each piece's custom info (label and value) is encoded into its barcode or QR code, then prints/exports the labels through the étiqueter (label) flow.

**Why this priority**: This is the heart of the feature — getting custom info into the scannable code on a physical tag.

**Independent Test**: With a lot whose pieces carry custom info, open Étiqueter, tick "Informations personnalisées", pick a code type, and confirm the generated code carries the custom info (short compact form by default, fuller readable form where the code type allows it).

**Acceptance Scenarios**:
1. **Given** a piece with custom info and the custom-info field on, **When** a code is built in the default compact form, **Then** the code carries short `LABEL=VALUE` pairs (e.g. `MAT=CHENE`), kept brief.
2. **Given** the same piece, **When** the fuller form is chosen AND the code type supports it (the 2D codes), **Then** the code carries a readable "Informations personnalisées : LABEL: VALUE ; …" segment with full labels and values.
3. **Given** a code type that cannot fit the fuller form (the 1D barcode or the online QR), **When** building, **Then** the short compact form is used regardless.
4. **Given** a piece with no custom info, **When** building any code, **Then** no custom-info content is added.

### User Story 2 - Tell the user when the field has nothing to add (Priority: P2)

When the user selects lots/pieces that have no custom info, the composer marks the "Informations personnalisées" field as unavailable (dimmed, with an indicator and a tooltip) so the user understands why ticking it would add nothing.

**Why this priority**: Prevents confusion when toggling a field that would produce nothing.

**Independent Test**: Select pieces with no custom info, open the composer, and confirm the custom-info field is dimmed with an "unavailable" tooltip; select pieces that DO have custom info and confirm it becomes available.

**Acceptance Scenarios**:
1. **Given** no selected piece has custom info, **When** the composer refreshes, **Then** the custom-info field is shown dimmed and unticked, with a tooltip explaining no custom info is filled in on the selected pieces.
2. **Given** a summary line of field availability, **When** some fields are unavailable, **Then** the summary reports how many are unavailable or only partly available.
3. **Given** per-key custom-info fields the user can pick individually, **When** availability is recalculated, **Then** those individual fields keep their own state and are not counted in the catch-all field's availability.

### User Story 3 - Carry the same custom info into the CSV and IFC exports (Priority: P3)

A user exporting a detailed CSV or an IFC file gets the same custom info carried into those exports too, consistent with the labels.

**Why this priority**: The same data flowing into adjacent export channels; useful, but secondary to the label encoding itself.

**Independent Test**: Export a detailed CSV for lots with custom info and confirm one column per distinct custom-info label is added; export IFC and confirm the custom-info group is present.

**Acceptance Scenarios**:
1. **Given** a detailed CSV, **When** custom-info columns apply, **Then** one column is added per distinct custom-info label, with each piece's values listed (or a dash when empty).
2. **Given** an IFC export, **When** the export is built, **Then** the custom-info group is included, listing the labels with their values and a count of the filled-in entries.

### Edge Cases

- **Accents / special characters**: in the compact form, both labels and values are cleaned for scanner safety — accents and special characters stripped, upper-cased, and shortened (the label to a few letters, the value a bit longer) so scanners read them reliably.
- **Several numbers in one value**: a separate measure-oriented helper pulls out the distinct numbers and joins them with dashes; the general custom-info compact path just shortens the value directly.
- **More than four custom infos**: the compact form keeps only the first four; the fuller form keeps them all.
- **Code too full**: each code type has its own capacity; when a payload is too large a warning is logged, but the overall payload is not cut — only the compact custom-info part is kept brief.
- **App not ready yet**: the add-on layers wait for the app to be ready and then apply once.
- **Barcode/QR tool missing**: if the barcode or QR tool is not loaded, a warning is logged and the label simply gets no code image.
- **Picking specific custom-info fields**: when the user ticks specific custom-info keys, only those are encoded (separated by " ; "), instead of the catch-all custom-info content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST encode a piece's custom info into its label code when the custom-info field is turned on in the label composer.
- **FR-002**: The COMPACT form MUST be short `LABEL=VALUE` pairs joined by commas, with the label shortened to a few letters and the value a bit longer, limited to the first four entries, and the whole custom-info part kept brief (capped in length).
- **FR-003**: The COMPLETE (fuller) form MUST be readable "LABEL: v1, v2" segments (full label, values listed) joined together across all entries.
- **FR-004**: The shortening MUST strip accents and special characters, upper-case the text, and cut it to the requested length (at least one character).
- **FR-005**: The fuller form MUST only be used when the code type supports it (the 2D codes); otherwise the compact form is used.
- **FR-006**: In fuller-form codes, the custom-info segment MUST be labelled "Informations personnalisées :" and MUST NOT be duplicated if it is already there.
- **FR-007**: The compact code MUST begin with the piece's lot-and-piece identifier followed by the enabled fields in their set order, with the custom-info content as one of those fields.
- **FR-008**: When the user picks specific custom-info keys, the app MUST encode only those (separated by " ; ") and skip the catch-all custom-info content.
- **FR-009**: The composer's field order MUST include the custom-info field (added if missing), scoped to the piece and off by default.
- **FR-010**: The composer MUST mark the custom-info field unavailable when no selected piece has custom info, with a tooltip explaining that no custom info is filled in on the selected pieces (note: the tooltip text is written without accents).
- **FR-011**: Label code images MUST be generated for the 1D barcode (Code 128), the 2D barcode (DataMatrix, ~30 mm square), and QR, each with appropriate sizing and high error-correction for QR.
- **FR-012**: The detailed CSV export MUST add one column per distinct custom-info label (in first-seen order), with each piece's values listed (or a dash when empty) and numbers formatted for CSV.
- **FR-013**: The IFC export MUST include a custom-info group listing the labels with their values and a count of the filled-in entries, unless one is already present.
- **FR-014**: The add-on layers MUST apply only once per app and wait for the app to be ready before applying.

### Key Entities *(include if data)*

- **Custom info entry (on a piece)**: an identifier, a label, a normalized key, its value(s), how the value is entered (free / list / hybrid), its type (text / select), an option-set reference, whether it is synced or local, a source reference, and an order. The normalized key is the label trimmed, lower-cased, and stripped of accents and extra spaces.
- **Composer custom-info entry**: a key, the full label, a compact form ("LBL=VAL"), a fuller form ("Label: v1, v2"), and whether it has a value; duplicate keys get numbered suffixes.
- **Payload form**: "compact" (default) or "complet" (fuller) — forced to compact unless the code type is one of the 2D codes.
- **Code type**: 1D barcode, 2D barcode (DataMatrix), offline QR (default), or online QR; each with its own capacity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a piece with custom info and the field on, the compact code carries a short `LBL=VAL`-style token from the custom info, with accents/special characters stripped and the segment kept brief.
- **SC-002**: Switching to the fuller form on a 2D barcode or offline QR label produces a code carrying a readable "Informations personnalisées : …" segment; on the 1D barcode or online QR it stays compact.
- **SC-003**: A detailed CSV for lots with K distinct custom-info labels has exactly K added custom-info columns.
- **SC-004**: An IFC export of pieces with custom info includes the custom-info group with its labels, values, and count.
- **SC-005**: Selecting pieces with no custom info dims the custom-info composer field and shows the unavailability tooltip; the field becomes available again once selected pieces have custom info.

## Assumptions

- The barcode and QR codes are produced by the app's own local barcode/QR tools, so they are built into the one-file copy and work offline (see spec 014).
- The custom-info support is layered onto the app at runtime, on top of the existing barcode/CSV/IFC machinery.
- The compact form targets scan reliability and space; the fuller form targets readability and is only used where the code type has room (the 2D codes).

## Source Files

- `js/app/custom-infos-export-barcode-ifc-patch.js`
- `js/app/barcode-composer-availability-patch.js`
- `js/app/valobois-app.js`
- `index.html`
- `package.json`

## Open Questions

- **Tooltip written without accents**: the "unavailable" tooltip and the availability summary are written without accents, unlike the rest of the French interface. Likely intentional for scanner/text safety, but unconfirmed.
- **Two compact code paths**: the core app and the add-on each implement nearly identical compact logic; the add-on defers to the core when possible, but the exact precedence at runtime is not fully traced — possibly redundant/legacy code.
- **Barcode/QR tools listed as dependencies but used as local files**: the project lists the barcode and QR tools as dependencies, yet the running app uses hand-placed local copies; whether the listed dependencies are used by any build step is unconfirmed.
- **Number handling differs**: a measure-oriented compact helper pulls out and joins numbers, but the custom-info compact path does not; whether custom-info numeric values were meant to get the same treatment is unclear.
- **Online code scripts lack integrity attributes (security note, out of scope)**: the online library script tags lack integrity/cross-origin attributes. Not part of this feature; flagged for awareness only.
