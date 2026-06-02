# Open Questions — issue drafts

65 draft issues distilled from the "Open Questions" sections of the feature specs and the methodology guide, ranked by impact on the core domain (the wood evaluation and its orientation recommendation). Each file is a ready-to-post issue **body** (English, with a French `<details>` translation); the title and the `question` label live in `manifest.tsv`.

**Review:** read the files below (most important first). Tell me which to drop or reword.

**Create later:** once approved, run `./create-issues.sh` from this folder (dry-run by default; pass `--confirm` to actually create them on `Valoxylo-URM-MAP-CRAI/webapp`).

## Tier 1 – Decision engine

| # | Question | Source spec |
|---:|---|---|
| 1 | [Value score and orientation are decoupled](01-value-score-orientation-decoupled.md) | `docs/methodologie-evaluation.md` |
| 2 | [Is the Matrice consultative or the decision engine?](02-matrix-consultative-or-decision-engine.md) | `specs/011-editor-rejection-matrix/spec.md` |
| 3 | [Editing scope of disqualifiers (rejets) vs drivers (vecteurs)](03-rejets-vs-vecteurs-editing-scope.md) | `specs/011-editor-rejection-matrix/spec.md` |
| 4 | ["Démontabilité" gate is off by default](04-demontabilite-gate-off-by-default.md) | `docs/methodologie-evaluation.md` |
| 5 | [Worst rating sits exactly at the blocking threshold](05-worst-rating-at-blocking-threshold.md) | `specs/007-editor-notation-scoring/spec.md` |
| 6 | [Unused "Seuils"/"Confiance" rows in the dataset](06-unused-seuils-confiance-rows.md) | `specs/011-editor-rejection-matrix/spec.md` |
| 7 | [How "Inspection" feeds the scoring](07-how-inspection-feeds-scoring.md) | `specs/007-editor-notation-scoring/spec.md` |
| 8 | [Inherited alert can appear active but do nothing](08-inherited-alert-no-rule.md) | `specs/007-editor-notation-scoring/spec.md` |
| 9 | [Undifferentiated default custom criterion](09-undifferentiated-custom-criterion.md) | `specs/007-editor-notation-scoring/spec.md` |

## Tier 2 – Quantitative outputs

| # | Question | Source spec |
|---:|---|---|
| 10 | ["Orientation" (computed) vs "destination" (buyer)](10-orientation-vs-destination.md) | `specs/008-editor-lots-allotissement/spec.md` |
| 11 | [Combustion price counted as a negative (cost)](11-combustion-price-as-cost.md) | `specs/010-editor-synthesis-orientation/spec.md` |
| 12 | [Orientation grouping relies on an exact label match](12-orientation-grouping-exact-label.md) | `specs/010-editor-synthesis-orientation/spec.md` |
| 13 | [Two separate cross-section volume calculations](13-two-volume-calculations.md) | `specs/008-editor-lots-allotissement/spec.md` |
| 14 | [Editable "Fraction C" but carbon uses a fixed 0.5](14-fraction-c-editable-but-fixed.md) | `specs/008-editor-lots-allotissement/spec.md` |
| 15 | [Stale sections when the length changes](15-stale-sections-on-length-change.md) | `specs/008-editor-lots-allotissement/spec.md` |

## Tier 3 – Reference data

| # | Question | Source spec |
|---:|---|---|
| 16 | [Climate keyed by department name, others by code](16-climate-keyed-by-name.md) | `specs/006-geo-france-context/spec.md` |
| 17 | [Wind data is built-in, unsourced, and incomplete](17-wind-data-builtin-incomplete.md) | `specs/006-geo-france-context/spec.md` |
| 18 | [Climate data uses pre-2015 canton names](18-climate-pre2015-canton-names.md) | `specs/017-reference-data-catalog/spec.md` |
| 19 | [Two overlapping species lists (111 vs 121)](19-two-species-lists.md) | `specs/017-reference-data-catalog/spec.md` |
| 20 | [Duplicate rows in the rarity table](20-rarity-table-duplicates.md) | `specs/017-reference-data-catalog/spec.md` |
| 21 | [Inconsistent overseas (DOM) coverage](21-dom-coverage-inconsistent.md) | `specs/006-geo-france-context/spec.md` |
| 22 | [Overseas vs mainland coverage undefined](22-overseas-vs-mainland-undefined.md) | `specs/017-reference-data-catalog/spec.md` |
| 23 | [Canton name matching uses prefix matching](23-canton-prefix-matching.md) | `specs/006-geo-france-context/spec.md` |
| 24 | [Address auto-detect offline/failure behaviour](24-address-autodetect-offline.md) | `specs/006-geo-france-context/spec.md` |

## Tier 4 – Exports

| # | Question | Source spec |
|---:|---|---|
| 25 | [Possible 1000x size error in IFC "library" mode](25-ifc-library-mode-scale.md) | `specs/012-export-ifc-bim/spec.md` |
| 26 | [Evaluation scores read from differently-named places](26-ifc-eval-scores-source.md) | `specs/012-export-ifc-bim/spec.md` |
| 27 | [Custom-info group defined in two places](27-ifc-custom-info-two-places.md) | `specs/012-export-ifc-bim/spec.md` |
| 28 | [Moisture/density exported without unit conversion](28-ifc-units-no-conversion.md) | `specs/012-export-ifc-bim/spec.md` |
| 29 | [Which volume the 3D details carry](29-3d-which-volume.md) | `specs/013-export-glb-dae-3d/spec.md` |
| 30 | [Consistent orientation of mixed extruded/mesh pieces](30-mixed-extruded-mesh-orientation.md) | `specs/012-export-ifc-bim/spec.md` |
| 31 | [3D orientation granularity (lot vs piece)](31-3d-orientation-granularity.md) | `specs/013-export-glb-dae-3d/spec.md` |
| 32 | [GLB vs DAE spacing differs](32-glb-dae-spacing.md) | `specs/013-export-glb-dae-3d/spec.md` |
| 33 | [SketchUp component naming](33-sketchup-naming.md) | `specs/013-export-glb-dae-3d/spec.md` |
| 34 | [3D exports have no colour by orientation](34-3d-no-colour.md) | `specs/013-export-glb-dae-3d/spec.md` |
| 35 | [No visible trigger for the in-app HTML save](35-html-no-save-button.md) | `specs/014-export-standalone-html/spec.md` |
| 36 | [README fallback message not implemented](36-html-readme-fallback.md) | `specs/014-export-standalone-html/spec.md` |
| 37 | [Barcode/QR tools listed as dependencies but used as local copies](37-barcode-deps-vs-local.md) | `specs/015-barcode-qr-labels/spec.md` |
| 38 | [Numeric handling differs between compact paths](38-compact-number-handling.md) | `specs/015-barcode-qr-labels/spec.md` |

## Tier 5 – Data integrity & collaboration

| # | Question | Source spec |
|---:|---|---|
| 39 | [No conflict handling (last write wins)](39-no-conflict-handling.md) | `specs/003-cloud-sync-persistence/spec.md` |
| 40 | [Summary status can fall back to "pré-diagnostic"](40-status-fallback-prediagnostic.md) | `specs/003-cloud-sync-persistence/spec.md` |
| 41 | [Unknown status shows nothing, silently](41-unknown-status-silent.md) | `specs/002-evaluation-library/spec.md` |
| 42 | [Failed cloud save is not auto-retried](42-no-auto-retry.md) | `specs/003-cloud-sync-persistence/spec.md` |
| 43 | [Cloud access rules exist only as a comment](43-access-rules-comment-only.md) | `specs/004-sharing-collaboration/spec.md` |
| 44 | ["Created" date neither recorded nor shown](44-created-date-missing.md) | `specs/002-evaluation-library/spec.md` |
| 45 | [No way to leave a shared evaluation](45-cannot-leave-shared.md) | `specs/002-evaluation-library/spec.md` |
| 46 | [Shared search could clash with a same-named collection](46-shared-search-collision.md) | `specs/004-sharing-collaboration/spec.md` |
| 47 | [No "retry" action on a failed cloud save](47-no-save-retry-ui.md) | `specs/001-authentication/spec.md` |

## Tier 6 – Accounts & access

| # | Question | Source spec |
|---:|---|---|
| 48 | [No e-mail verification on sign-up](48-no-email-verification.md) | `specs/001-authentication/spec.md` |
| 49 | [Password rule is only a 6-character minimum](49-password-rule-minimal.md) | `specs/001-authentication/spec.md` |
| 50 | [Signed-out wording when the account service is down](50-signed-out-wording.md) | `specs/001-authentication/spec.md` |

## Tier 7 – Wording, i18n & UX

| # | Question | Source spec |
|---:|---|---|
| 51 | [English translation is incomplete](51-english-incomplete.md) | `specs/016-internationalization/spec.md` |
| 52 | [Reference data is French-only](52-reference-data-french-only.md) | `specs/017-reference-data-catalog/spec.md` |
| 53 | [Packaging/protection scope (operation vs lot)](53-packaging-protection-scope.md) | `specs/008-editor-lots-allotissement/spec.md` |
| 54 | [Two custom-alert editors coexist](54-two-alert-editors.md) | `specs/007-editor-notation-scoring/spec.md` |
| 55 | [Where the detail level (1-4) is chosen](55-detail-level-selection.md) | `specs/008-editor-lots-allotissement/spec.md` |
| 56 | [What refreshes the Synthèse tab](56-synthese-refresh.md) | `specs/010-editor-synthesis-orientation/spec.md` |
| 57 | ["Version" vs internal "revision"](57-version-vs-revision.md) | `specs/005-editor-general-info/spec.md` |
| 58 | [Seemingly unused duplicate fields](58-unused-duplicate-fields.md) | `specs/005-editor-general-info/spec.md` |
| 59 | [Charts need internet to display](59-charts-need-internet.md) | `specs/009-editor-analysis-charts/spec.md` |
| 60 | [Axis labels frozen in French](60-axis-labels-french.md) | `specs/009-editor-analysis-charts/spec.md` |
| 61 | ["Mes évaluations" has no own language selector](61-library-no-lang-selector.md) | `specs/016-internationalization/spec.md` |
| 62 | ["VALOBOIS" vs "Valoxylo"/"Membres" wording](62-brand-wording.md) | `specs/004-sharing-collaboration/spec.md` |
| 63 | [Sharing hint differs FR vs EN](63-sharing-hint-fr-en.md) | `specs/002-evaluation-library/spec.md` |
| 64 | [Styling for all four confidence states](64-confidence-styling.md) | `specs/007-editor-notation-scoring/spec.md` |
| 65 | [Auto-focus on operation info not implemented](65-operation-autofocus.md) | `specs/005-editor-general-info/spec.md` |

