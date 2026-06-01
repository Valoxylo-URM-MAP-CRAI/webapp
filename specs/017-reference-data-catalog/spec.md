# Feature Specification: Reference Data Catalog

**Feature Branch**: `017-reference-data-catalog`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the reference datasets VALOBOIS ships and how the diagnostician uses them

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-fill species (essence) properties (Priority: P1)

When the diagnostician names an *essence* (wood species) on a lot, the app recognises the name and pre-fills its durability (*durabilité*), density (*masse volumique*), standard species code, and resistance to biological hazards (rot, insects, marine borers). It also offers a link to the matching CIRAD Tropix datasheet for that species.

**Why this priority**: Species properties feed the scoring (durability, density, rarity) and the end-of-life orientation; this is the most-used dataset.

**Independent Test**: Type a known common name (for example "Chêne pédonculé") into the species field and confirm that density, durability class and species code are filled in, and that a Tropix datasheet link appears when one exists for that species.

**Acceptance Scenarios**:

1. **Given** a common name that matches the species reference, **When** the species is set, **Then** its properties are filled in from that reference.
2. **Given** a scientific (Latin) name that matches the reference, **When** the species is set, **Then** its properties are filled in from that reference.
3. **Given** a species with no recorded standard species code, **When** the code is needed, **Then** the app derives a four-letter code from the scientific name (following the EN 13556 convention).
4. **Given** a species that has a Tropix datasheet, **When** a datasheet is requested, **Then** the matching CIRAD datasheet link(s) are offered.

### User Story 2 - Geographic & climate context for an operation (Priority: P1)

The diagnostician picks a French *département* and *canton*; from this the app determines the local humidity climate class and whether the area is exposed to termites and to *mérule* (dry-rot fungus).

**Why this priority**: Climate and biological-hazard context drive the moisture and degradation criteria in scoring (see spec 006).

**Independent Test**: Pick a département and a canton and confirm the humidity climate class (Dry / Moderate / Humid) resolves correctly, and that the termite and *mérule* status for the département is shown.

**Acceptance Scenarios**:

1. **Given** a département, **When** the list of cantons is needed, **Then** the cantons for that département are offered.
2. **Given** a département and canton, **When** the climate class is determined, **Then** the app uses the canton-specific value if the reference records one, otherwise the département default — matching the older normative canton name to the current geographic name where they differ.
3. **Given** a département, **When** termite and *mérule* status is needed, **Then** the status is read from the Cerema hazard maps (for termites: whole-département order, partial/communal order, or none; for *mérule*: communal orders present, or none).

### User Story 3 - Suggestion lists for free-text fields (Priority: P2)

Several free-text fields offer curated suggestion lists as the user types: building type, intervention phase, packaging (*conditionnement*), protection, lot situation, structural-timber piece terms, and common/scientific species names.

**Why this priority**: Suggestions improve consistency without forcing the input; secondary to the scoring-critical datasets.

**Independent Test**: Start typing in the building-type field and confirm the curated options appear; confirm the same for the other suggestion-backed fields.

**Acceptance Scenarios**:

1. **Given** the page has loaded, **When** the suggestion lists are prepared, **Then** the building-type, intervention-phase, packaging, protection and lot-situation fields each offer their curated suggestions.
2. **Given** the species fields, **When** their suggestions are prepared, **Then** the common-name and scientific-name fields offer the species list (scientific names de-duplicated).
3. **Given** a structural-timber piece-term field, **When** its suggestions are prepared, **Then** the curated French timber-term vocabulary is offered.

### User Story 4 - Rarity & provenance of the species (Priority: P2)

For the named species, the app suggests a default rarity (*rareté*) and provenance (*provenance*) drawn from a curated cross-referenced table.

**Why this priority**: This feeds the rarity (ecological/historical) and provenance scoring criteria.

**Independent Test**: Select a tropical species and confirm a default rarity (for example "Rare") and a provenance origin are suggested.

**Acceptance Scenarios**:

1. **Given** a species (matched by its standard code, French name, or scientific name), **When** rarity and provenance are needed, **Then** suggested values are read from the rarity & provenance table.

### Edge Cases

- **No match found**: names and codes are tidied up (accents, spacing, apostrophes) before being matched; if nothing matches, nothing is auto-filled and the diagnostician keeps their own typed value. A placeholder species code is ignored.
- **Several Tropix datasheets**: one species name can map to several CIRAD datasheets (the same species may appear under more than one region — Africa, Asia & Oceania, Central & South America, temperate zones), so more than one datasheet link can be offered.
- **Older vs current canton names**: the humidity climate table uses the older (pre-2015) normative canton names; the app bridges these to today's canton names. Cantons it cannot match are reported by an internal consistency check.
- **Overseas territories**: termite data covers the overseas départements (codes 971–976), but the départements list and climate table cover mainland France and Corsica only.
- **Missing values**: missing property values are recorded uniformly as "not available".
- **Duplicate species rows**: where a species appears more than once in a table, the first entry is kept (for example repeated Robinier / Iroko rows in the rarity table).
- **Already-prepared suggestions**: preparing a suggestion list a second time does nothing if it is already filled.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST ship all reference datasets with the application and load them at startup, with no live online fetch.
- **FR-002**: The app MUST tidy up names and codes consistently (accents, spacing, apostrophes) before matching them, across species, rarity and Tropix lookups.
- **FR-003**: The app MUST recognise a named species by common name or scientific name and fill in its density, durability and biological-hazard properties and its standard species code.
- **FR-004**: The app MUST determine the standard species code from a recorded code where available, otherwise derive it from the scientific name following the EN 13556 convention.
- **FR-005**: The app MUST read the longevity, rarity/provenance and orientation-matrix datasets at startup and make their entries and lookups available.
- **FR-006**: The app MUST determine the humidity climate class for a département (default plus per-canton exceptions), bridging older normative canton names to current ones, and MUST flag cantons it cannot match.
- **FR-007**: The app MUST read termite and *mérule* (dry-rot) hazard status per département from the Cerema maps.
- **FR-008**: The app MUST fill the free-text suggestion lists (building type, intervention phase, packaging, protection, lot situation, species names, structural-timber terms) at load, doing nothing if a list is already filled.

### Key Entities *(include if data)*

- **Species reference** (about 121 species): the primary species table. For each *essence* it gives the common and scientific name, type (softwood/hardwood — *résineux*/*feuillu*), origin, density (with a range and the source behind it), durability and impregnability classes, and resistance to rot, insects and marine borers. **Source/standard**: EN 350 durability classes and EN 13556 species codes; densities cite EN 350, CIRAD, FCBA and the Wood Database. Feeds species auto-fill, durability/density scoring and the Tropix link.
- **Species name list** (about 111 species): a lighter species list (common name, scientific name, type, origin — temperate / Mediterranean / tropical). Feeds the species-name suggestion lists.
- **Tropix datasheets** (about 313 entries): CIRAD Tropix datasheet links for tropical and temperate species (region, species name, datasheet link, year). **Source/standard**: CIRAD Tropix. Feeds the "Open the Tropix datasheet" link.
- **Longevity by use class** (about 108 species): expected longevity (*longévité*) of each species per use class. **Source/standard**: FD P 20-651 (AFNOR, June 2011), covering European species, tropical species and a marine-use rule; longevity bands run from over 100 years down to under 10 years. Feeds durability/longevity scoring.
- **Rarity & provenance** (about 135 rows): for each species, a default rarity (Common / Uncommon / Rare) and provenance origin. **Source/standard**: a cross-reference of EN 350 origins, Tropix CIRAD regions and the FCBA "Guide Benoît". Feeds rarity (ecological/historical) and provenance scoring.
- **Termite hazard map** (101 départements, including overseas codes 971–976): per-département termite exposure — whole-département prefectural order, partial/communal order, or none, with the number of affected communes and the order date. **Source/standard**: Cerema, dated 2024.
- **Mérule (dry-rot) hazard map** (101 départements): per-département *mérule* exposure — communal orders present, or none (there is no whole-département status because *mérule* orders are always communal), with the number of communes. **Source/standard**: Cerema, dated 2024.
- **Humidity climate classes**: the humidity climate class (Dry / Moderate / Humid) per département, with per-canton exceptions. **Source/standard**: FD P 20-651 (June 2011), Annexe B; canton and département names kept close to the normative source.
- **Canton name bridge**: a mapping from older (pre-2015) normative canton names to current canton names, per département, so the climate table lines up with today's geography. **Source/standard**: built by crossing the official 2015 (pre-reform) and 2023 (post-reform) French territorial codes.
- **Scoring & orientation matrix** (50 criteria): the Valoxylo scoring matrix — for each criterion, the scores for Strong/Medium/Weak, its criticality, alert flag, and the orientation toward the four end-of-life routes (combustion, recycling, reuse, re-employment). **Source/standard**: project-internal Valoxylo matrix. Feeds scoring, orientation and the rejection matrix (specs 007/010/011).
- **French départements** (96 entries): the mainland and Corsica départements offered in the département selector. **Source**: france-geojson (simplified).
- **French cantons**: the cantons for each département, used by the canton selector and climate resolution. **Source**: france-geojson (simplified).
- **Structural-timber terms** (about 130 terms): a curated French vocabulary of timber piece names (for example Arbalétrier, Panne, Chevron, Solive, Madrier). Feeds the piece-term suggestion list.
- **Free-text suggestion lists**: curated suggestion lists for, respectively, on-site packaging (*conditionnement*), intervention phase, protection, lot situation, and building type. Feed the matching free-text fields.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Naming a species in the species reference auto-fills its density, durability class and standard species code with values traceable to that species' entry.
- **SC-002**: For any of the ~96 départements, selecting a canton yields a humidity climate class consistent with the reference (default or canton exception), with older normative canton names correctly bridged to current ones.
- **SC-003**: Termite and *mérule* status for a selected département matches the Cerema source for that département (including overseas codes 971–976 for termites).
- **SC-004**: Every suggestion-backed field shows its full curated list after the page loads, with no duplicate scientific species names.
- **SC-005**: A species in the Tropix list resolves to at least one valid CIRAD Tropix datasheet link.

## Assumptions

- All dataset content is authored in French (species names, normative labels); there is no English version of this content (consistent with spec 016's incomplete-English note). The rarity table is the only dataset that carries an English pilot name.
- Datasets are fixed content shipped with the app; nothing is fetched live at runtime (the geographic data is pre-imported, not fetched on demand).
- The developer tooling that regenerates the dataset files is run offline and is not part of the running app.
- The Cerema termite and *mérule* snapshots reflect their 2024 update date.

## Source Files

- `js/data/essences-valobois.js`, `js/data/essences-bois.js`, `js/data/tropix-essences.js`
- `js/data/longevite-fd-p20-651.js`, `js/data/rarete-provenance.js`
- `js/data/termites-cerema.js`, `js/data/merules-cerema.js`
- `js/data/climate-humidification-fd-p20-651.js`, `js/data/climate-humidification-fd-p20-651-aliases.js`
- `js/data/valobois-matrice-vecteurs-rejets.js`
- `js/data/france-departements.js`, `js/data/france-cantons.js`
- `js/data/termes-bois.js`
- `js/data/datalist-conditionnement.js`, `js/data/datalist-phase-intervention.js`, `js/data/datalist-protection.js`, `js/data/datalist-situations-lot.js`, `js/data/datalist-type-batiment.js`
- `js/lib/datalist-populate.js`, `js/lib/valobois-formatters.js`
- `js/app/valobois-app.js`
- `scripts/generate-rarete-provenance-data.mjs`, `scripts/generate-climate-aliases.mjs`, `scripts/import-france-geojson.mjs`

## Open Questions

- **English content is incomplete**: all reference data (species names, normative labels, suggestion lists) is French-only and does not switch to English (consistent with spec 016). Only the rarity table carries an English pilot name. Whether the product intends to translate this content is open.
- **Older canton names in the climate data**: the humidity climate table uses the older (pre-2015) normative canton names and relies on a name bridge to reach today's geography; cantons that cannot be matched are flagged by an internal consistency check and would need review.
- **One wind dataset is built-in with unclear sourcing**: the geographic context uses a per-département wind table that is built into the app rather than shipped as one of the reference dataset files, and its source is not documented.
- **Density source precision**: the species reference mixes formal standards (EN 350) with informal references (CIRAD, FCBA, Wood Database); the exact edition or year of the non-EN-350 references is not recorded.
- **Two overlapping species lists**: a 111-species list and a 121-species list coexist with overlapping but not identical naming; whether the lighter list is meant to be a strict subset used only for suggestions is unconfirmed.
- **Overseas vs mainland coverage**: termite data covers overseas départements (971–976) but the climate table and départements list cover mainland France and Corsica only, so climate and canton behaviour for an overseas operation is undefined.
- **Rarity table duplicates**: the rarity table contains duplicate-looking rows (Robinier, Iroko, Abachi/Samba, Courbaril/Jatoba) of which only the first is kept; whether the later rows were meant to carry different values is unconfirmed.
- **Normative caveats**: some longevity entries note caveats (for example ratings that apply only to sapwood-free timber, or a "moderate" termite resistance treated as non-resistant); whether the scoring honours every caveat is out of scope here and unverified.
