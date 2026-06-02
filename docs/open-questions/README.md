# Open Questions — code-substantiated triage

65 open questions surfaced while documenting VALOBOIS, each investigated in the source code. Every file states the question (English + French), a **classification**, a code-anchored explanation of *why it is open*, `file:line` evidence, and what would resolve it. Ordered by impact on the core domain (the wood evaluation and its orientation recommendation).

## Classification summary

| Classification | Count |
|---|---:|
| Product-intent ambiguity | 34 |
| Cross-file inconsistency | 9 |
| Legacy / dead code | 7 |
| Suspected bug / correctness risk | 7 |
| Could not be fully traced | 3 |
| Cross-file inconsistency + Legacy / dead code | 1 |
| Product-intent ambiguity **and** suspected bug / correctness risk | 1 |
| Cross-file inconsistency + Product-intent ambiguity | 1 |
| Product-intent ambiguity, with a side of legacy / dead data | 1 |
| Product-intent / deployment-config ambiguity | 1 |

> The classifications are the investigating agents' assessments from static code reading; several flagged as *suspected bug / correctness risk* (e.g. the IFC 1000× scale, the combustion-price double-negation) warrant a runtime check before action.

## Tier 1 – Decision engine

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 1 | [Value score and orientation are decoupled — should the editable thresholds drive routing?](01-value-score-orientation-decoupled.md) | Product-intent ambiguity | `docs/methodologie-evaluation.md` |
| 2 | [Is the rejection matrix consultative, or the live decision engine?](02-matrix-consultative-or-decision-engine.md) | Product-intent ambiguity | `specs/011-editor-rejection-matrix/spec.md` |
| 3 | [Editing scope of rejets (disqualifiers) vs vecteurs (drivers) in the matrix editor](03-rejets-vs-vecteurs-editing-scope.md) | Cross-file inconsistency + Legacy / dead code | `specs/011-editor-rejection-matrix/spec.md` |
| 4 | ["Démontabilité" gate is off by default and its weak level is excluded from réemploi/réutilisation](04-demontabilite-gate-off-by-default.md) | Product-intent ambiguity | `docs/methodologie-evaluation.md` |
| 5 | [Worst rating (E) sits exactly at the default blocking threshold](05-worst-rating-at-blocking-threshold.md) | Product-intent ambiguity | `specs/007-editor-notation-scoring/spec.md` |
| 6 | [The "Seuils" and "Confiance" rows of the matrix dataset are dropped at parse time and never used](06-unused-seuils-confiance-rows.md) | Legacy / dead code | `specs/011-editor-rejection-matrix/spec.md` |
| 7 | [Inspection card: a meta/quality panel, not a Fort/Moyen/Faible scoring family](07-how-inspection-feeds-scoring.md) | Product-intent ambiguity | `specs/007-editor-notation-scoring/spec.md` |
| 8 | [Inherited custom alert can look active while having no backing blocking rule](08-inherited-alert-no-rule.md) | Cross-file inconsistency | `specs/007-editor-notation-scoring/spec.md` |
| 9 | [Undifferentiated custom criterion: Fort/Moyen/Faible collapse to the same recorded value](09-undifferentiated-custom-criterion.md) | Suspected bug / correctness risk | `specs/007-editor-notation-scoring/spec.md` |

## Tier 2 – Quantitative outputs

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 10 | [Orientation (computed end-of-life route) versus destination (buyer company)](10-orientation-vs-destination.md) | Product-intent ambiguity | `specs/008-editor-lots-allotissement/spec.md` |
| 11 | [Combustion lot price subtracted from the operation monetary balance — cost, value, or double-negated?](11-combustion-price-as-cost.md) | Product-intent ambiguity | `specs/010-editor-synthesis-orientation/spec.md` |
| 12 | [Operation-level grouping keys lots on exact orientation labels](12-orientation-grouping-exact-label.md) | Suspected bug / correctness risk | `specs/010-editor-synthesis-orientation/spec.md` |
| 13 | [Two cross-section integrations for the volume (enriched vs lot summary)](13-two-volume-calculations.md) | Cross-file inconsistency | `specs/008-editor-lots-allotissement/spec.md` |
| 14 | ["Fraction C" field is editable and exported, but the carbon math ignores it (hard-codes 0.5)](14-fraction-c-editable-but-fixed.md) | Product-intent ambiguity | `specs/008-editor-lots-allotissement/spec.md` |
| 15 | [Stale "mesures multiples" sections when the piece length changes](15-stale-sections-on-length-change.md) | Product-intent ambiguity **and** suspected bug / correctness risk | `specs/008-editor-lots-allotissement/spec.md` |

## Tier 3 – Reference data

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 16 | [Climate data keyed by department name vs. code-keyed wind/termite/mérule data](16-climate-keyed-by-name.md) | Product-intent ambiguity | `specs/006-geo-france-context/spec.md` |
| 17 | [Driving-rain wind data is inlined in code, undocumented, and missing 5 departments](17-wind-data-builtin-incomplete.md) | Cross-file inconsistency + Product-intent ambiguity | `specs/006-geo-france-context/spec.md` |
| 18 | [Pre-2015 canton names in the humidity climate table rely on a name bridge](18-climate-pre2015-canton-names.md) | Product-intent ambiguity | `specs/017-reference-data-catalog/spec.md` |
| 19 | [Two overlapping species lists: lighter list drives suggestions, heavier list drives auto-fill](19-two-species-lists.md) | Cross-file inconsistency | `specs/017-reference-data-catalog/spec.md` |
| 20 | [Duplicate species rows in the rarity & provenance table](20-rarity-table-duplicates.md) | Product-intent ambiguity | `specs/017-reference-data-catalog/spec.md` |
| 21 | [Inconsistent DOM coverage across the geographic datasets](21-dom-coverage-inconsistent.md) | Cross-file inconsistency | `specs/006-geo-france-context/spec.md` |
| 22 | [Overseas départements: termite data present but unreachable from the UI](22-overseas-vs-mainland-undefined.md) | Product-intent ambiguity, with a side of legacy / dead data | `specs/017-reference-data-catalog/spec.md` |
| 23 | [Canton-name climate matching falls back to bidirectional prefix matching](23-canton-prefix-matching.md) | Product-intent ambiguity | `specs/006-geo-france-context/spec.md` |
| 24 | [Address auto-detection depends on two external government APIs with no offline handling beyond a generic error](24-address-autodetect-offline.md) | Product-intent ambiguity | `specs/006-geo-france-context/spec.md` |

## Tier 4 – Exports

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 25 | [Library-mode IFC declares millimetres but writes metre coordinates (1000× scale risk)](25-ifc-library-mode-scale.md) | Suspected bug / correctness risk | `specs/012-export-ifc-bim/spec.md` |
| 26 | [IFC evaluation/destination scores read from lot fields that are never populated](26-ifc-eval-scores-source.md) | Suspected bug / correctness risk | `specs/012-export-ifc-bim/spec.md` |
| 27 | [Which definition of the IFC custom-info group is the source of truth?](27-ifc-custom-info-two-places.md) | Legacy / dead code | `specs/012-export-ifc-bim/spec.md` |
| 28 | [Moisture and density exported as raw, unit-less numbers in IFC](28-ifc-units-no-conversion.md) | Suspected bug / correctness risk | `specs/012-export-ifc-bim/spec.md` |
| 29 | [Which volume figure the 3D (GLB) model carries as a detail](29-3d-which-volume.md) | Cross-file inconsistency | `specs/013-export-glb-dae-3d/spec.md` |
| 30 | [Orientation consistency of extruded vs. mesh pieces in a mixed lot](30-mixed-extruded-mesh-orientation.md) | Could not be fully traced | `specs/012-export-ifc-bim/spec.md` |
| 31 | [3D export orientation: lot-level value vs IFC's per-piece-capable lookup](31-3d-orientation-granularity.md) | Cross-file inconsistency | `specs/013-export-glb-dae-3d/spec.md` |
| 32 | [Grouped GLB and DAE lay pieces out with different spacing formulas (and DAE grounds them)](32-glb-dae-spacing.md) | Product-intent ambiguity | `specs/013-export-glb-dae-3d/spec.md` |
| 33 | [SketchUp component naming: do the derived names survive a real import?](33-sketchup-naming.md) | Could not be fully traced | `specs/013-export-glb-dae-3d/spec.md` |
| 34 | [GLB/DAE 3D exports carry geometry only — no orientation colouring](34-3d-no-colour.md) | Product-intent ambiguity | `specs/013-export-glb-dae-3d/spec.md` |
| 35 | [Standalone-HTML save builder exists but no UI control invokes it](35-html-no-save-button.md) | Legacy / dead code | `specs/014-export-standalone-html/spec.md` |
| 36 | [In-app HTML save: README-promised command-line fallback message is not implemented](36-html-readme-fallback.md) | Cross-file inconsistency | `specs/014-export-standalone-html/spec.md` |
| 37 | [Barcode/QR libraries: npm dependencies vs hand-placed local copies](37-barcode-deps-vs-local.md) | Legacy / dead code | `specs/015-barcode-qr-labels/spec.md` |
| 38 | [Compact number handling: measure tokens extract numbers, custom-info tokens do not](38-compact-number-handling.md) | Product-intent ambiguity | `specs/015-barcode-qr-labels/spec.md` |

## Tier 5 – Data integrity & collaboration

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 39 | [Concurrent edits to a shared evaluation: last write wins, with no conflict detection](39-no-conflict-handling.md) | Product-intent ambiguity | `specs/003-cloud-sync-persistence/spec.md` |
| 40 | [Saved summary study-status always falls back to the first stage](40-status-fallback-prediagnostic.md) | Suspected bug / correctness risk | `specs/003-cloud-sync-persistence/spec.md` |
| 41 | [Study-status label is collapsed to "Pré-diagnostic" for every saved évaluation](41-unknown-status-silent.md) | Suspected bug / correctness risk | `specs/002-evaluation-library/spec.md` |
| 42 | [No automatic retry of a failed cloud save](42-no-auto-retry.md) | Product-intent ambiguity | `specs/003-cloud-sync-persistence/spec.md` |
| 43 | [Cloud access rules exist only as a reference comment, not a deployable file](43-access-rules-comment-only.md) | Could not be fully traced | `specs/004-sharing-collaboration/spec.md` |
| 44 | [No "created on" date is recorded or shown for évaluations](44-created-date-missing.md) | Product-intent ambiguity | `specs/002-evaluation-library/spec.md` |
| 45 | [No way to leave or hide an évaluation shared with you](45-cannot-leave-shared.md) | Product-intent ambiguity | `specs/002-evaluation-library/spec.md` |
| 46 | [Shared-evaluations collectionGroup query could collide with a same-named collection](46-shared-search-collision.md) | Product-intent / deployment-config ambiguity | `specs/004-sharing-collaboration/spec.md` |
| 47 | [Cloud-save failure shows no explicit "retry" action](47-no-save-retry-ui.md) | Product-intent ambiguity | `specs/001-authentication/spec.md` |

## Tier 6 – Accounts & access

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 48 | [Newly created accounts are usable immediately, with no e-mail-verification step](48-no-email-verification.md) | Product-intent ambiguity | `specs/001-authentication/spec.md` |
| 49 | [Password rule is only a 6-character minimum, with no strength guidance](49-password-rule-minimal.md) | Product-intent ambiguity | `specs/001-authentication/spec.md` |

## Tier 6 – Accounts & access · source question Q2

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 50 | [Signed-out wording differs when the account service is unavailable](50-signed-out-wording.md) | Product-intent ambiguity | `specs/001-authentication/spec.md` |

## Tier 7 – Wording, i18n & UX

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 51 | [English interface coverage is partial: ~270 on-screen texts stay French](51-english-incomplete.md) | Product-intent ambiguity | `specs/016-internationalization/spec.md` |
| 52 | [Reference data is French-only while the app ships a real English UI mode](52-reference-data-french-only.md) | Product-intent ambiguity | `specs/017-reference-data-catalog/spec.md` |
| 53 | [Conditionnement & protection — recorded once at operation level, not per lot](53-packaging-protection-scope.md) | Product-intent ambiguity | `specs/008-editor-lots-allotissement/spec.md` |
| 54 | [Two custom-alert editors coexist: the prompt-based one is dead code](54-two-alert-editors.md) | Legacy / dead code | `specs/007-editor-notation-scoring/spec.md` |
| 55 | [Mesures multiples: where (if anywhere) is the detail level chosen?](55-detail-level-selection.md) | Legacy / dead code | `specs/008-editor-lots-allotissement/spec.md` |
| 56 | [What refreshes the Synthèse tab content](56-synthese-refresh.md) | Product-intent ambiguity | `specs/010-editor-synthesis-orientation/spec.md` |
| 57 | [« Version de l'évaluation » (texte libre) vs « Révision » (compteur d'enregistrements)](57-version-vs-revision.md) | Product-intent ambiguity | `specs/005-editor-general-info/spec.md` |
| 58 | [Dead English-named meta fields duplicating the active French CERFA/PEMD fields](58-unused-duplicate-fields.md) | Legacy / dead code | `specs/005-editor-general-info/spec.md` |
| 59 | [Radar & scatter charts depend on a CDN-loaded library and fail silently offline](59-charts-need-internet.md) | Product-intent ambiguity | `specs/009-editor-analysis-charts/spec.md` |
| 60 | [Gauge and radar axis labels are hardcoded in French while the rest of the app is internationalized](60-axis-labels-french.md) | Cross-file inconsistency | `specs/009-editor-analysis-charts/spec.md` |
| 61 | [Does the *Mes évaluations* page need its own language selector?](61-library-no-lang-selector.md) | Cross-file inconsistency | `specs/016-internationalization/spec.md` |
| 62 | [Share dialog brand wording: "Membres" / "comptes Valoxylo" vs. the VALOBOIS brand](62-brand-wording.md) | Product-intent ambiguity | `specs/004-sharing-collaboration/spec.md` |
| 63 | [Sharing-dialog hint diverges between French and English](63-sharing-hint-fr-en.md) | Product-intent ambiguity | `specs/002-evaluation-library/spec.md` |
| 65 | [Empty "General" tab-activation hook reserved for operation autofocus](65-operation-autofocus.md) | Product-intent ambiguity | `specs/005-editor-general-info/spec.md` |

## Tier 7 – Wording, i18n & UX · source question Q25

| # | Question | Classification | Source spec |
|---:|---|---|---|
| 64 | [Confidence badge styling defined for all four states](64-confidence-styling.md) | Product-intent ambiguity | `specs/007-editor-notation-scoring/spec.md` |

