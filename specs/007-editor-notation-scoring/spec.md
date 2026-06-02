# Feature Specification: The "Notation" (Scoring) Tab — Scoring Families, Confidence Badges & Custom Alert Criteria

**Feature Branch**: `007-editor-notation-scoring`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the Notation (scoring) editor tab

> French domain vocabulary is used as the diagnostician knows it, with an English gloss on first use:
> *notation* (scoring), *critère* (criterion), *confiance* (confidence), *alerte* (alert),
> *amortissement* (amortization, i.e. how worn / used-up the wood is), *provenance* (origin),
> *essence* (wood species), *dénaturation* (denaturation / contamination), *vieillissement* (ageing),
> orientations: *réemploi*, *réutilisation*, *recyclage*, *combustion*.

---

## User Scenarios & Testing *(mandatory)*

The Notation tab is one of the tabs of the lot editor. It shows how the wood of the currently selected lot is rated for reuse quality. The rating is organised as a vertical stack of cards, one card per **scoring family** (famille de critères). Inside each card, there is one line per **critère** (criterion). Each criterion line offers a simple three-step choice — **Fort / Moyen / Faible** (strong / medium / weak) — together with an information button, a small display of the chosen level, and, for many criteria, an **alerte** (alert) button that lights up when something deserves attention.

Each family also carries a **confiance** (confidence) line, where the diagnostician records how confident they are in their assessment of that family. Beyond the built-in families, the diagnostician can also define their own **custom criteria**, which appear together in an extra "Critères personnalisés" card and can carry their own alerts.

### User Story 1 - Score a lot across the built-in scoring families (Priority: P1)

A diagnostician opens a lot and rates each wood-quality criterion — for example biological integrity, mechanical exposure, contamination, humidity, how worn the wood is (amortissement), and its provenance — on a Fort / Moyen / Faible scale. As the diagnostician adjusts each rating, the tool re-evaluates the lot's recommended **orientation** (réemploi / réutilisation / recyclage / combustion).

**Why this priority**: This is the core purpose of the tab — without scoring there is no orientation and no synthesis.

**Independent Test**: Open a lot in the Notation tab, change a criterion's level, and confirm the line's colour changes, the orientation is recomputed, and the value is still there after reloading.

**Acceptance Scenarios**:

1. **Given** the active lot, **When** the Notation tab is shown, **Then** the family cards appear in this order: Inspection, Dégradation biologique, Dégradation mécanique, Classement d'usage, Dénaturation, Débit, Géométrie, Essence, Ancienneté, Traces, Provenance.
2. **Given** a criterion line, **When** the diagnostician picks Fort, Moyen or Faible, **Then** that choice is turned into a rating on an A-to-E scale, where the strongest assessments earn the best letters (A, B, C) and the weakest earn penalising letters (D, E).
3. **Given** any rating change, **When** it is recorded, **Then** the lot is saved and its orientation, thresholds and synthesis are immediately recomputed so the rest of the analysis stays consistent.
4. **Given** a line that has never been rated (shown as inactive), **When** the diagnostician first touches it, **Then** the neutral middle level (Moyen) is recorded and the line becomes active.

### User Story 2 - Read alert badges per criterion and per family (Priority: P2)

For each scoring family, the diagnostician sees coloured **alerte** badges that flag risk conditions — for example strong contamination, weak integrity, or low confidence — so they understand why a lot is being downgraded or blocked.

**Why this priority**: Alerts make the scoring actionable, but they are derived from the ratings recorded in Story 1.

**Independent Test**: Set a criterion to a level that should raise an alert (for example, biological integrity = Faible) and confirm the matching alert button changes colour; click it to read the explanation.

**Acceptance Scenarios**:

1. **Given** a **confiance** (confidence) line, **When** it is shown, **Then** its confidence badge takes one of four states — none, low, medium or strong — depending on both the confidence level recorded and the current status of the study.
2. **Given** a study still in progress (Pré-diagnostic or En cours), **When** confidence is Forte → the badge is strong (green); Moyenne or Faible → medium (orange); nothing recorded → low (red).
3. **Given** a study that is closing out (Finalisé, Révision or Cloturé), **When** confidence is Forte → strong; any other situation → low. (A late-stage study demands high confidence to stay reassuring.)
4. **Given** a criterion-specific alert (for example biological integrity, usage humidity, or how worn the wood is), **When** the recorded value crosses the level that matters for that criterion, **Then** the badge lights up to the matching severity (strong / medium / low) or stays off.
5. **Given** any alert badge, **When** it is clicked, **Then** a panel opens explaining the rule behind that alert.

### User Story 3 - Define a custom criterion with a custom or inherited alert (Priority: P3)

An advanced user adds a **custom criterion** (created or duplicated from the Matrice tab), gives it a scoring profile, and configures its alert in one of two ways: **Héritée** (inherited — it borrows the alert of an existing built-in criterion) or **Personnalisée** (custom — its own rule expressed over other criteria). On the Notation tab the custom criterion appears as a line in the "Critères personnalisés" card, with the same Fort / Moyen / Faible choice and its own alert badge.

**Why this priority**: This is a power-user extension; the built-in families cover the normal workflow.

**Independent Test**: Create a custom criterion with one custom condition (for example, another custom criterion must be at Faible), rate it, and confirm the alert badge resolves to Active / À configurer / Inactive and the read-only explanation lists which conditions are met and which are missing.

**Acceptance Scenarios**:

1. **Given** at least one enabled custom criterion, **When** the Notation tab is shown, **Then** a "Critères personnalisés" card appears immediately after the Provenance card, with one line per custom criterion, each offering a Fort / Moyen / Faible choice showing its per-level rating.
2. **Given** a custom criterion set to **inherited**, **When** it is shown, **Then** its alert badge mirrors the appearance and state of the built-in criterion it borrows from, and clicking it shows that parent criterion's alert.
3. **Given** a custom criterion set to **custom**, **When** its conditions are all met → the badge reads "Active"; **When** conditions exist but are not all met → it reads "Inactive"; **When** no condition has been set up yet → it reads "À configurer".
4. **Given** a custom alert badge is clicked, **Then** a read-only panel shows: the current state, the active recommendation (Fort / Moyen / Faible with a colour dot), the three configured recommendation profiles with their condition counts, and, condition by condition, whether each is met or not (the expected level versus the current level).

### Edge Cases

- **First touch on a never-rated line**: a custom line that has never been scored starts inactive; the first interaction records the neutral (Moyen) level and activates it.
- **Reset**: each line has a "Réinitialiser" button that clears its recorded rating, returns the choice to the neutral middle, makes the line inactive again, and recomputes the lot.
- **Inherited alert with no valid parent**: if a custom criterion is set to inherit an alert but is not actually a duplicate of a built-in criterion, the inheritance is dropped (the alert becomes disabled).
- **Inherited alert pointing at an unsupported criterion**: only a defined set of built-in "gate" criteria (contamination, expansion, biological integrity, mechanical integrity, alteration, and dismountability) have a recognised blocking rule. An inherited alert pointing anywhere else shows as "À configurer".
- **Ambiguous level when ratings are not differentiated**: a custom criterion's three levels (Fort / Moyen / Faible) are matched to a recorded rating by value; if all three levels were left at the same default value, the tool cannot tell them apart and falls back to the criterion's active mode, so the level can be ambiguous.
- **Disabled or hidden families**: some criteria can be turned off depending on the notation mode; a few confidence and level displays are kept present but hidden, only to preserve the card layout.
- **Older alert definitions**: a custom alert saved in an older single-message format is automatically converted into the current three-profile format when the lot is opened.

---

## Requirements *(mandatory)*

### Functional Requirements

**Tab structure & display**

- **FR-001**: The Notation tab MUST show the active lot's scoring as a stack of family cards. If no lot is selected, the tab MUST show nothing.
- **FR-002**: The built-in family cards MUST be: Inspection, Dégradation biologique, Dégradation mécanique, Classement d'usage, Dénaturation, Débit, Géométrie, Essence, Ancienneté, Traces, Provenance.
- **FR-003**: Each family MUST present the criteria a diagnostician evaluates for that family. The intent of each family:
  - **Dégradation biologique** — purge done, biological expansion/spread, remaining biological integrity, exposure, and confidence.
  - **Dégradation mécanique** — mechanical purge, fire exposure, remaining mechanical integrity, exposure, and confidence.
  - **Classement d'usage** — durability in use, use class, humidity, surface aspect, and confidence.
  - **Dénaturation** — depollution done, contamination level, conferred durability, naturalness, and confidence.
  - **Débit** — regularity of the cut, volumetry, stability of the section, artisanal versus industrial character, rusticity, and confidence.
  - **Géométrie** — adaptability, massiveness (thickness), deformation, industrial versus inclusive character, and confidence.
  - **Essence** — wood species, ecological rarity, density (masse volumique), historical rarity, singularity, and confidence.
  - **Ancienneté** — how worn the wood is (amortissement), ageing, micro-history, dismountability, and confidence.
  - **Traces** — labelling/marks, alteration, documentation, singularities, and confidence.
  - **Provenance** — transport, reputation, macro-history, territoriality, and confidence.

**Scoring mechanics**

- **FR-004**: Each scored criterion MUST offer a three-step choice: Fort, Moyen, Faible.
- **FR-005**: Each chosen level MUST be turned into a rating on an A-to-E scale, with the strongest levels earning the best letters and the weakest earning penalising letters; the worst (E) is the most penalising.
- **FR-006**: Any rating change MUST trigger an immediate save and recompute of the lot's orientation, thresholds and synthesis.
- **FR-007**: A line with no recorded rating MUST appear inactive; its first interaction MUST record the neutral level and activate it. A "Réinitialiser" button MUST clear the rating and make the line inactive again.
- **FR-008**: Each line's colour MUST reflect its rating (better ratings and worse ratings are visually distinct).

**Confidence (confiance) badges**

- **FR-009**: Every scoring family MUST record a confidence level (Forte / Moyenne / Faible, or none) for the diagnostician's assessment of that family.
- **FR-010**: Each confidence badge MUST show one of four states — none, low, medium, strong — displayed as green (strong), orange (medium), red (low) or inactive (none).
- **FR-011**: The confidence state MUST depend on the study status. While the study is in progress (Pré-diagnostic / En cours): Forte → strong, Moyenne or Faible → medium, nothing recorded → low. Once the study is closing out (Finalisé / Révision / Cloturé): Forte → strong, anything else → low.
- **FR-012**: Clicking a confidence badge MUST open a panel explaining the rule: which criterion, the study status, the confidence level, the displayed colour, and the reason.

**Per-criterion alerts**

- **FR-013**: Many criteria MUST raise their own alert (none / low / medium / strong, or simply active / off) when their recorded value reaches a meaningful threshold. The domain rules the diagnostician should expect:
  - **How worn the wood is (amortissement)**: heavily worn → strong; moderately worn → medium; lightly worn → low; not assessed → no alert.
  - **Biological / mechanical integrity and purge**: weak (Faible) → active.
  - **Biological expansion, contamination, alteration**: strong (Forte) → active.
  - **Humidity (usage)**: very wet → strong; very dry → low; in between → medium.
  - **Density (essence)**: very dense → strong; medium density → medium; light → low.
  - **Biological exposure (use class)**: the most exposed use classes → strong; intermediate → medium; sheltered → low.
  - **Mechanical exposure / longevity**: strong → strong, medium → medium, weak → low.
  - **Ecological rarity (essence)**: common species → strong; somewhat common → medium; rare → low.
  - **Massiveness (thickness)**: thick → strong; medium → medium; thin → low.
  - **Volumetry**: large volume → strong; medium → medium; small but positive → low.
  - **Stability**: judged from the slenderness of the section (length-to-thickness and width-to-thickness) → strong / medium / low.
  - **Industrial / artisanal / naturalness character**: judged from the product type (engineered vs sawn vs raw wood) → strong / medium / low.
  - **Inclusivity, fire, macro-history, ageing**: composite judgements combining the recorded level, its rating, and how much information is available.
  - **Conferred durability (dénaturation)**: strong durability without strong depollution → active, unless overridden by a blocking gate or a double-weak integrity.
- **FR-014**: Clicking a criterion's alert button MUST open a panel explaining that criterion's rule.

**Blocking gates (hard locks)**

- **FR-015**: A lot MUST be globally blocked when biological expansion is Forte (if that gate is enabled) or contamination is Forte (if enabled); it MUST be alteration-blocked when alteration is Forte (if enabled).
- **FR-016**: The recognised blocking gates a diagnostician should expect are: Contamination, Expansion, Biological integrity, Mechanical integrity, Alteration, and Dismountability. A gate fires when the criterion reaches its blocking severity (a very penalising rating).

**Custom criteria**

- **FR-017**: The tab MUST show the diagnostician's own custom criteria. Only enabled custom criteria are shown; if there are none, the "Critères personnalisés" card is not shown.
- **FR-018**: The custom criteria card MUST be titled "Critères personnalisés" and appear immediately after the Provenance card.
- **FR-019**: Each custom line MUST show: the scoring axis label, the criterion label, a reset button, an information button, a Fort / Moyen / Faible choice with each level's rating, and — when an alert is configured — an alert button.
- **FR-020**: A custom criterion's rating MUST be stored on the lot and MUST contribute to the lot's category totals just like the built-in criteria, according to the family it belongs to.
- **FR-021**: A custom criterion's alert MUST be one of three modes: disabled, inherited, or custom. An alert button is shown only for inherited and custom.
- **FR-022**: In **inherited** mode, the alert button MUST mirror the appearance and state of the built-in criterion it borrows from, and clicking it MUST show that parent criterion's alert/explanation.
- **FR-023**: In **inherited** mode, the alert MUST resolve to "Active" when the inherited criterion reaches its blocking severity; if the borrowed criterion is one of the unsupported ones, the alert shows as "À configurer".
- **FR-024**: In **custom** mode, the alert MUST carry three recommendation profiles (Fort / Moyen / Faible), each with a colour (red / orange / green), a message, and a list of conditions; one profile is marked as the default recommendation.
- **FR-025**: Each condition MUST reference another criterion (built-in or custom) and the set of levels (among Fort / Moyen / Faible) that satisfy it. The criteria available to reference are the active criteria of the current notation mode.
- **FR-026**: A condition MUST count as **met** when the referenced criterion's current level is among the condition's accepted levels. A profile is **triggered** only when it has at least one condition and every one of them is met.
- **FR-027**: Across the three profiles, the active recommendation MUST be chosen in priority order Fort → Moyen → Faible (the first triggered profile wins). Overall, the custom alert is **Active** if any profile is triggered, **Inactive** if conditions exist but none are triggered, and **À configurer** if no condition exists at all.
- **FR-028**: The alert badge labels in the interface MUST be: "Active", "À configurer", or "Inactive".
- **FR-029**: Clicking a custom alert button MUST open a read-only panel listing: the current state and active recommendation (with a colour dot), a summary card per level with its condition count and message, and, for the active recommendation, each condition with whether it is met or not (expected levels versus current level).
- **FR-030**: The information button on a custom line MUST open a detail panel when the criterion has an explanatory note.
- **FR-031**: A triggered custom criterion MUST count toward the lot's blocking-gate information alongside the built-in gates.

### Key Entities *(include if data)*

- **Lot scoring**: for each built-in criterion, the lot records the chosen level and resulting rating; custom criteria are stored separately; the lot also records why it is blocked, if it is.
- **Confidence setting**: per family, a label, the family it belongs to, and the information needed for its explanatory panel.
- **Custom criterion**: an identifier, its scoring axis and family, whether it is enabled, the modes it applies in, its three levels (Fort / Moyen / Faible) with their ratings, an explanatory note, and its alert configuration.
- **Alert configuration**: the mode (disabled / inherited / custom), which criterion it inherits from, the default recommendation level, a message, and the three recommendation profiles (each with a colour, a message, and a list of conditions).
- **Alert condition**: a referenced criterion plus the set of accepted levels (among Fort / Moyen / Faible).
- **Resolved alert**: the state (none / active / à configurer), the active recommendation and its colour, the message, and the lists of met and missing conditions.
- **Blocking gate**: an identifier, a label, and the severity at which it fires.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Setting a criterion to Fort / Moyen / Faible produces a rating on the A-to-E scale and recomputes the lot's orientation and thresholds within the same interaction (no reload).
- **SC-002**: Every confidence line shows a state matching the documented combination of study status and confidence level.
- **SC-003**: A custom criterion whose conditions are all met shows "Active"; one with conditions that are not all met shows "Inactive"; one with no conditions shows "À configurer".
- **SC-004**: An inherited custom alert badge visually matches its parent criterion's alert, and clicking it surfaces the parent's explanation.
- **SC-005**: The "Critères personnalisés" card appears only when at least one enabled custom criterion exists, and it sits immediately after the Provenance card.
- **SC-006**: Resetting any line clears its rating, returns the line to its inactive (neutral) state, and recomputes the orientation.

## Assumptions

- The ratings and blocking thresholds on this tab come from the per-criterion A-to-E scale and the gate definitions built into the tool, not from an external standard data file. Durability labels reference EN 350 durability classes but are shown only as labels here, not used as scoring thresholds.
- Custom criteria are authored on the Matrice tab; this tab only lets the diagnostician rate and read them — it does not open the alert-configuration editor.
- Confidence colour wording (green / orange / red) describes the displayed badge; the exact visual styling is handled by the interface's stylesheet.

## Source Files

- `js/app/editor-tab-notation.js`
- `js/app/valobois-app.js`
- `js/app/valobois-constants.js`
- `js/app/valobois-domain-helpers.js`
- `index.html`
- `js/i18n/valobois-locales-editor.js`
- `js/i18n/valobois-i18n.js`
- `js/i18n/valobois-locales.js`

## Open Questions

- **State label spelling**: some alert state labels in the interface ("À configurer", "Inactive", etc.) appear without accents in one place and with accents elsewhere. Confirm whether the unaccented spellings are intentional or stale.
- **Confidence colour styling**: the four confidence states map to green / orange / red / inactive; confirm the interface has styling defined for all four.
- **Ambiguous level on default custom criteria**: when a custom criterion's three levels are all left at the same default rating, the tool cannot tell Fort from Moyen from Faible and falls back to the active mode. Confirm whether a default custom criterion is meant to be usable before its levels are differentiated.
- **Worst rating sitting exactly at the blocking threshold**: a criterion rated E lands exactly at the default blocking severity. Confirm this is intended (an E should always block).
- **Two custom-alert editors**: an older prompt-based alert editor coexists with the current panel-based editor; confirm which one is actually wired into the live interface (the older path looks like dead code).
- **Inherited alert coverage gap**: a custom alert can visually inherit a parent criterion's badge even when no matching blocking rule is configured for that criterion, so it may appear active but do nothing. Confirm this divergence is intended.
- **Inspection scoring**: the Inspection card uses status-specific labels (Trié et purgé / Déposé / En usage) rather than the Fort / Moyen / Faible scale; how Inspection feeds into the overall notation (versus acting as a confidence/weight input) was not fully traced.
