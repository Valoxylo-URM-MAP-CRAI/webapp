# Feature Specification: The "Lots / Allotissement" Tab

**Feature Branch**: `008-editor-lots-allotissement`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the Lots / Allotissement editor tab

---

## Overview & Vocabulary

The Lots tab lets a diagnostician describe the reclaimed-wood resource of an operation by organising it into **lots** (homogeneous batches of wood) and, within each lot, into **pièces** (individual wood members). The activity of grouping the wood into lots is called **allotissement** (lot building / batching).

French domain terms used throughout, with an English gloss:

- **lot** — a batch of homogeneous reclaimed wood. One lot is shown as one card in the lot rail.
- **allotissement** — the lot's summary record: its representative properties and its aggregate totals.
- **pièce** (piece) — a wood member belonging to a lot. There are two kinds: a **pièce par défaut** (default piece — a representative template multiplied by a quantity) and a **pièce détaillée** (detailed piece — an individually described member).
- **essence** — the wood species, recorded as a **nom commun** (common name) and a **nom scientifique** (scientific name).
- **mesures multiples** (multiple measurements / variable cross-sections) — the cross-section measured at several positions along a piece's length, for a more precise volume than a single section gives.
- **masse volumique** — density (kg/m³).
- **conditionnement** — packaging; **protection** — storage protection. (Note: as-built, these are recorded at the operation level, not on each lot — see Open Questions.)
- **orientation** — the recommended end-of-life route for a lot (réemploi / réutilisation / recyclage / combustion). This is computed from the lot's scoring, not chosen by hand on this tab — see Open Questions.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a lot and describe its default piece (Priority: P1)

A diagnostician opens the Lots tab, selects (or adds) a lot in the lot rail, and fills in the lot's **default piece**: the type of piece, the product type, the wood class, the essence (common and scientific name), and the dimensions (length / width / thickness, or a diameter for round pieces). The tool immediately computes the unit volume, the lot volume, the mass, a carbon estimate and a price, scaling everything by the default piece's quantity.

**Why this priority**: This is the minimum viable use — a "pré-diagnostic" estimate of the resource from a single representative piece per lot, without listing every member.

**Independent Test**: In a fresh study (two empty lots exist by default), enter quantity 10, length 2000, width 100, thickness 50 on Lot 1's default piece; verify the unit volume reads 0,010 m³ and the lot volume reads 0,100 m³.

**Acceptance Scenarios**:

1. **Given** a fresh study, **When** the editor loads, **Then** two empty lots ("Lot 1", "Lot 2") exist, each with one default piece set to a default density of 510 kg/m³, humidity 12 %, 100 % wood, priced per cubic metre.
2. **Given** a lot's default piece, **When** length, width and thickness are entered (no diameter), **Then** the unit volume is computed from length × width × thickness and the unit surface from length × width (dimensions in millimetres, results in m³ and m²), and the lot totals equal the unit value multiplied by the total default quantity.
3. **Given** a lot's default piece, **When** a diameter is entered, **Then** the piece is treated as round (volume computed from the diameter and the length), and the width and thickness fields are visually muted.
4. **Given** an essence common name that matches the species database, **When** it is entered, **Then** the suggested density is applied (only if the density field was empty) and a source label is shown for where the density came from.

---

### User Story 2 - Add detailed pieces to refine a lot (Priority: P2)

After the pré-diagnostic, the diagnostician describes individual pieces. Each detailed piece starts as a copy of the lot's default piece (inheriting its values) and can then override any field — dimensions, essence, density, humidity, price, custom info fields. The lot's totals then become the sum of all detailed pieces plus any remaining default pieces.

**Why this priority**: This enables the "En cours" and "Finalisé" study phases, where the lot is described piece by piece; it depends on Story 1 existing.

**Independent Test**: On a lot with default quantity 3, add one detailed piece; verify the lot quantity shown becomes 3 (2 remaining default pieces + 1 detailed piece) and the detailed piece inherits the default piece's dimensions until edited.

**Acceptance Scenarios**:

1. **Given** a lot with a default piece, **When** a detailed piece is created, **Then** it inherits the default piece's location, type, essence, dimensions, density, humidity and price settings, plus a synced copy of the custom info fields (each one linked back to the default piece field it came from).
2. **Given** detailed pieces and default pieces coexist, **When** the lot is recalculated, **Then** the lot quantity equals the sum of the default-piece quantities plus the number of detailed pieces, and the lot's volume, mass, price and carbon are the sum of each piece's recalculated contribution.
3. **Given** detailed pieces that each carry a density, **When** any of them has a value, **Then** the lot density becomes the quantity-weighted average of the piece densities, and the lot density is labelled "Moyenne pondérée" (weighted average).

---

### User Story 3 - Capture variable cross-sections with "mesures multiples" (Priority: P3)

For tapered or irregular pieces (for example logs / grumes), the diagnostician opens the **mesures multiples** section and records the cross-section at several positions along the length (the two ends, the quarters, the middle, plus any extra free positions). Each section can be rectangular (width × thickness) or round (diameter), chosen per section. The volume is then computed section by section along the length and takes priority over the simple single-section volume.

**Why this priority**: This is a precision enhancement borrowed from forestry log measurement; it only matters once the basic dimensions exist.

**Independent Test**: On a piece of length 4000, activate mesures multiples with two rectangular end sections (100×50 and 60×40) and verify the resulting volume differs from the single-section volume and is stored as the piece's enriched volume.

**Acceptance Scenarios**:

1. **Given** a piece, **When** mesures multiples is set up, **Then** sections are created at the chosen detail level: level 1 → the two ends only; level 2 → ends + middle; level 3 → ends + the two quarters; level 4 → all five positions.
2. **Given** mesures multiples is active with at least two fully completed sections and a positive length, **When** the volume is computed, **Then** it is obtained by integrating the cross-section areas along the piece, section by section between the recorded positions; a rectangular section's area comes from its width and thickness (optionally corrected by a shape factor when a perimeter is provided), and a round section's area comes from its diameter.
3. **Given** an enriched (section-by-section) volume is available, **When** the piece is recalculated, **Then** that enriched volume replaces the simple single-section volume; otherwise the single-section volume stands.
4. **Given** a section's shape toggle, **When** it is switched to round, **Then** the width and thickness both display the diameter value and the section is recorded as round.
5. **Given** mesures multiples whose stored length no longer matches the piece (the piece's length changed after the sections were saved), **When** the section list is shown, **Then** the inputs are flagged as stale.

---

### Edge Cases

- **Zero or empty dimensions**: the volume is empty or 0 when the length or the section is not positive; the lot totals fall back to 0; pieces with a quantity of 0 or less are left out of the totals and shown disabled.
- **Comma decimals**: numeric inputs accept commas as decimal separators and convert them to dots.
- **Round versus rectangular when the shape is not set**: a section is treated as round when it has a positive diameter and no usable width or thickness.
- **Default-piece quantity fallback**: if no explicit default-piece quantity is set, the tool falls back to the lot quantity minus the number of detailed pieces (never below 0), applied to the first default piece only.
- **Which density wins**: the piece's own density first, then the lot density, then the density suggested by the essence, and finally the default of 510 kg/m³.
- **Resetting mesures multiples**: a confirmation prompt warns that all the entered sections will be deleted on reset.
- **Several default pieces**: a lot may hold more than one default piece; the lot's main default piece is kept in step with the first of them for compatibility.
- **Legacy height field**: an old "height" field on a piece is migrated into the thickness field and removed.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Lots tab MUST show two cards: an "Allotissement" card with a horizontal rail of lot cards, and a "Détail du lot" card listing the current lot's pieces.
- **FR-002**: A new study MUST start with two empty lots; the diagnostician MUST be able to add lots and to delete a lot (with a confirmation prompt).
- **FR-003**: Each lot MUST own an allotissement summary record, a set of default pieces (templates), and a set of detailed pieces.
- **FR-004**: The lot MUST offer editable representative fields: type of piece, product type, wood class, essence common and scientific name, length, width, thickness, diameter, market price, price unit (per metre / per m² / per m³), per-tonne price mode, density, humidity, percentage of wood, and carbon fraction.
- **FR-005**: The product type MUST offer a standard list of reclaimed-wood product categories (for example raw, squared, sawn, dried, glue-laminated, cross-laminated, structural framing, and panel products).
- **FR-006**: The wood class MUST offer the standard waste classifications used for reclaimed wood (the regulatory class plus its waste code).
- **FR-007**: The type of piece MUST be backed by a list of wood terms, and the essence common and scientific names MUST be backed by their respective species lists.
- **FR-008**: The tool MUST compute the unit volume from the dimensions: round pieces (with a diameter) from the diameter and the length; otherwise from length × width × thickness. Dimensions are in millimetres and the result is in m³.
- **FR-009**: The tool MUST also compute the unit surface (length × width) and the unit linear length (the length in metres).
- **FR-010**: For a piece with mesures multiples active, at least two completed sections, and a positive length, the tool MUST compute an enriched volume by integrating the cross-section areas along the length, and MUST use it in place of the single-section volume.
- **FR-011**: Each section's area MUST come from its shape: a rectangular section from its width and thickness (optionally scaled by a perimeter shape factor when a perimeter is provided), a round section from its diameter.
- **FR-012**: The mesures multiples widget MUST allow the two ends, the two quarters, and the middle, plus extra free positions entered in millimetres; each section MUST be individually switchable between rectangular (width / thickness) and round (diameter).
- **FR-013**: The detail level MUST select the active positions: level 1 → the two ends; level 2 → the two ends + middle; level 3 → the two ends + the two quarters; level 4 → all five positions.
- **FR-014**: The lot quantity MUST be derived (not typed directly): the sum of the default-piece quantities plus the count of detailed pieces.
- **FR-015**: The lot totals (volume, surface, mass, price, linear length, biogenic carbon) MUST equal the representative value × quantity when only default pieces exist, and the sum of each piece's recalculated contribution when detailed pieces exist.
- **FR-016**: The tool MUST compute mass from density × volume; a measured mass, when recorded, MUST take precedence over the computed mass.
- **FR-017**: The tool MUST compute biogenic carbon following NF EN 16449:2014 (using a fixed carbon fraction of 0.5), from the density, the volume, the percentage of wood and the humidity, never below 0; it defaults to 100 % wood and 12 % humidity when these are not set.
- **FR-018**: The tool MUST suggest a density from the essence database (matching the common name first, then the scientific name), defaulting to 510 kg/m³ when there is no match; it MUST apply the suggestion only when the density field is empty (unless forced).
- **FR-019**: When any piece carries a density, the lot density MUST become the quantity-weighted average of the piece densities and be labelled "Moyenne pondérée"; the diagnostician's own previous lot density MUST be kept and restored if the piece densities are later removed.
- **FR-020**: The tool MUST compute the price from the market price times the chosen pricing base (per linear metre, per surface, per volume, or per tonne); when an orientation price preset is chosen it MUST override using a length-premium-adjusted price; an integrity factor MUST produce an "adjusted" price.
- **FR-021**: Each detailed piece MUST be creatable from a chosen default piece, inheriting that piece's values (falling back to the lot's values) plus a synced copy of the custom info fields.
- **FR-022**: A detailed piece MUST be able to override every inherited field; any field left empty MUST fall back to the lot's value at compute time.
- **FR-023**: The tool MUST support per-piece **custom info** key/value fields: each has a label, one or more values, a value mode (free / from a list / hybrid), an optional shared option set, an inherit mode (synced from the default piece, or local), and a link back to the default-piece field it came from.
- **FR-024**: Custom info labels MUST be de-duplicated ignoring case and accents (lowercased, accents stripped, spaces collapsed); entries with no label MUST be dropped.
- **FR-025**: Custom info fields MUST feed exports and labels: they are exposed to the étiquette / QR public payload and to the barcode/label composer (per piece), and to the public record fields.
- **FR-026**: The lot card MUST display the lot's computed **orientation** label and colour (réemploi / réutilisation / recyclage / combustion); the orientation is not directly editable here.
- **FR-027**: The allotissement record MUST hold the buyer **destination** contact fields (the company, its address, contact, e-mail and phone), shown in a destination block with an alert when they are not filled in.
- **FR-028**: The tool MUST save every lot and piece edit and re-render the rail and the detail on each change.

### Key Entities *(include if data)*

- **Lot**: an identifier, a name, location and situation, an allotissement summary, the scoring families (which belong to the Notation tab, not this one), its blocking state, its default pieces and detailed pieces, and its similarity/threshold settings.
- **Allotissement** (the lot summary): the representative inputs (quantity, type of piece, product type, wood class, essence, dimensions, price settings, density, humidity, carbon fraction, percentage of wood, and the buyer destination contact fields), plus the computed totals (unit and lot surface, unit and lot volume, lot linear length, lot price, integrity-adjusted price, lot mass, biogenic carbon), plus the bookkeeping that tracks where the density came from.
- **Default piece (pièce par défaut)**: a quantity, location and situation, type, product type, wood class, essence, dimensions, price settings, density (including a measured density and a measured mass), humidity, percentage of wood, carbon fraction, tree age, in-service date, the custom info fields, and any mesures multiples.
- **Detailed piece (pièce détaillée)**: the same descriptive fields, a link to the default piece it came from, and its computed surface, volume, price, adjusted price, mass and biogenic carbon (including the enriched volume and surface when mesures multiples are used).
- **Section (mesure multiple)**: a position (and its position ratio along the length), a shape (rectangular / round), the width, thickness, diameter and perimeter, and whether it is a custom position. Sections are held under the piece's mesures multiples, together with whether they are active, the detail level, and the length they were measured against.
- **Custom info field**: an identifier, a label, its values, a value mode (free / list / hybrid), a value type (text / select), an optional shared option set, an inherit mode (synced / local), a link to the originating default-piece field, and an order. Shared option sets are stored on the study and carry a label, subtitle, options and a symbol.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a rectangular default piece of length 2000, width 100, thickness 50 mm at quantity 10, the unit volume reads 0,010 m³ and the lot volume reads 0,100 m³.
- **SC-002**: For a round default piece of diameter 200 mm and length 3000 mm, the unit volume is about 0,0942 m³ and the width and thickness fields are visually muted.
- **SC-003**: Activating mesures multiples with at least two completed sections changes the displayed volume to the section-by-section (enriched) value rather than the single-section value.
- **SC-004**: Adding a detailed piece increases the lot's effective quantity and shows the piece pre-filled from the lot's default piece values.
- **SC-005**: Entering a known essence common name auto-fills the density (when empty) and shows a density source label; with no match the density is 510 kg/m³.
- **SC-006**: A custom info field added to a piece appears among the fields available to the label/barcode composer and the étiquette / QR payload.
- **SC-007**: The biogenic carbon for density 510, volume 0,010 m³, 100 % wood and 12 % humidity is about 8 kg.

---

## Assumptions

- The Lots tab's content (the lot rail and the lot detail) is rendered into static containers in the page.
- Dimension inputs are in millimetres; volumes in m³; surfaces in m²; densities in kg/m³; humidity and wood content as percentages.
- A "default piece" is the lot's representative template multiplied by its quantity; "detailed pieces" are explicit per-member overrides. A lot may have several default pieces.
- The scoring families of a lot (biological, mechanical, usage, …) are out of scope for this tab and are documented with the Notation tab.

## Source Files

- `js/app/editor-tab-lots.js`
- `js/app/valobois-app.js`
- `js/app/valobois-domain-helpers.js`
- `js/app/valobois-constants.js`
- `js/data/essences-valobois.js`
- `js/data/datalist-conditionnement.js`
- `js/data/datalist-protection.js`
- `index.html`

## Open Questions

- **Conditionnement & protection scope**: the brief lists packaging and storage protection as lot properties, but as-built they are recorded once at the operation level (in the general / context area), not per lot. Confirm the intended scope.
- **Orientation versus destination**: the brief described a manual lot route with values réemploi / réutilisation / recyclage / incinération / démolition. As-built, the lot **orientation** (réemploi / réutilisation / recyclage / combustion) is computed from the scoring, not chosen on this tab, and there is no "incinération" or "démolition" route; separately, the lot **destination** is the buyer/recipient company plus contact details, which is unrelated to the end-of-life route. Confirm which concept the spec owner means.
- **Two ways of integrating cross-section areas**: the precise (enriched) volume and the lot-summary volume each integrate the cross-section areas, but they are computed by two separate calculations (one with the perimeter shape factor, one without) rather than a single shared one. They are intended to agree; confirm there is no drift between them.
- **Sections versus a changed length**: free section positions are entered in millimetres and converted to a ratio along the length; if the length later changes, the sections are flagged stale but their ratio is kept. Confirm whether stale sections should be recomputed automatically.
- **Carbon fraction field**: a "Fraction C" field is editable on the piece and lot, but the carbon calculation hard-codes the 0.5 fraction (per NF EN 16449), so the editable field appears not to feed the computation — suspected legacy input.
- **Detail-level control**: the mesures multiples model supports detail levels 1 to 4, but the inline widget shows fixed positions; where (or whether) the diagnostician picks the level was not fully traced.
- **Leftover debug output**: the enriched-volume calculation contains leftover debug logging.
