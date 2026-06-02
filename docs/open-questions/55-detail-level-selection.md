# Mesures multiples: where (if anywhere) is the detail level chosen?

> **Open question** · priority #55 · Tier 7 – Wording, i18n & UX · Source spec: `specs/008-editor-lots-allotissement/spec.md`

## Question
The variable-cross-section model supports detail levels 1 to 4, but the inline widget shows fixed positions; where, or whether, the diagnostician picks the level could not be fully traced. Please clarify.

<details>
<summary>🇫🇷 Version française</summary>

Le modèle de sections variables gère des niveaux de détail de 1 à 4, mais le widget affiche des positions fixes ; où, ou si, le diagnostiqueur choisit le niveau n'a pas pu être entièrement tracé. À clarifier.

</details>

## Why this is open
**Classification:** Legacy / dead code (with a secondary spec-vs-code wording mismatch)

The question can now be resolved by static reading: **the diagnostician never picks a "detail level" — there is no level selector in the live UI.** The "level 1–4" concept (FR-013, Acceptance Scenario 1 of User Story 3) survives only as a *derived* label and as one *uncalled* helper. What the user actually manipulates is a set of per-position toggle arrows.

The live widget `_renderMesuresInlineWidget` (js/app/valobois-app.js:16576) always renders the same five canonical positions returned by `_getMesuresWidgetPositions` (16481): the two ends (`extremite1`/`extremite2`, `alwaysActive: true`) plus three optional intermediate positions (`quart1`, `milieu`, `quart3`). Each optional position is turned on or off independently through its own arrow button (`arrowsHtml`, 16605), and the click handler at 16754 toggles a single position at a time. So the user composes an arbitrary combination of positions; there is no control that sets "level = N".

The "level" is therefore computed *after the fact*, not chosen. On save, `_saveMesuresMultiplesInline` (17206) reads whichever arrows are active, builds the `sections` array, then calls `niveauxFromActivePositions(activeKeys)` (17270) to map that combination back onto a 1–4 number and stores it as `piece.mesuresMultiples.niveaux` (17291). That stored `niveaux` value is **never read again anywhere** in the codebase — confirmed by grep: the only RHS occurrence is the write itself. It does not feed the enriched-volume integration (`computeVolumeEnrichi`, 18337, which iterates `mm.sections` directly), the GLB builder (js/lib/build-glb.js uses `mesuresMultiples.sections`, never `niveaux`), nor any exporter. It is dead bookkeeping.

The one function that *consumes* a level as an input — `createEmptyMesuresMultiples(niveaux)` (18299), which would pre-seed the sections for a chosen level 1/2/3/4 — is **never called** anywhere in `js/` (grep returns only its own definition). This is the strongest signal that an earlier design did offer a level picker (a dropdown / radio that called `createEmptyMesuresMultiples(N)`), and that the UI was later reworked into the free per-position arrow widget, leaving the level-based constructor and the derived `niveaux` field as orphaned legacy.

What I confirmed: there is no level-selection control; the user picks positions, not levels; `niveaux` is derived and unconsumed; `createEmptyMesuresMultiples` is uncalled. What remains a product decision (not a code question): whether the spec's "detail level 1–4" wording should be (a) reframed as "the user activates positions" to match the as-built arrows, or (b) re-implemented as an explicit level picker. The arrow widget is also strictly more expressive than levels 1–4, because it allows non-standard combinations (e.g. ends + `quart1` only) for which `niveauxFromActivePositions` returns `null` (16533) — i.e. "no standard level".

## Evidence in the code
- `js/app/valobois-app.js:16481` — `_getMesuresWidgetPositions()` returns the five fixed positions; the two ends are `alwaysActive`, the three intermediates are optional. No "level" parameter.
- `js/app/valobois-app.js:16605` / `:16754` — the widget renders one toggle arrow per position and toggles positions individually; there is no level control in the rendered HTML.
- `js/app/valobois-app.js:16526` — `niveauxFromActivePositions()` *derives* a level 1–4 from the set of active positions, returning `null` for non-standard combinations.
- `js/app/valobois-app.js:17270` / `:17291` — on save, `niveaux` is computed from the active positions and written onto `piece.mesuresMultiples`, but it is read by nothing.
- `js/app/valobois-app.js:18299` — `createEmptyMesuresMultiples(niveaux = 1)` is the only function that takes a level as input to seed sections; grep shows it is **never called**.
- `js/app/valobois-app.js:18337` (`computeVolumeEnrichi`) and `js/lib/build-glb.js` (e.g. :43, :617) — both iterate `mesuresMultiples.sections` directly and never reference `niveaux`.
- `js/app/valobois-constants.js:233-238`, `:298-303` — the barcode/export field keys are per-position (`mesuresMultiplesE1`…`E2`, plus `…Detail`), again position-based, not level-based.
- `specs/008-editor-lots-allotissement/spec.md:72`, `:109` (FR-013), `:132`, `:176` — the spec asserts a "detail level" that "MUST select the active positions"; this is the wording that does not match the as-built arrow widget.

## What would resolve it
- Product owner confirms the intended UX: keep the as-built per-position arrow widget (recommended — it is a superset of levels 1–4), or re-introduce an explicit level picker.
- If the arrow widget is kept: update the spec (FR-013, US3 Scenario 1, Key Entities "detail level") to describe position activation rather than a level, and treat `createEmptyMesuresMultiples` (18299) plus the stored `niveaux` field (17291) as dead code to delete — first re-grep to confirm no exporter/import/Firestore-sync reads `mesuresMultiples.niveaux` before removal.
- If a level picker is wanted: wire `createEmptyMesuresMultiples(N)` to a new control and decide how non-standard position sets (where `niveauxFromActivePositions` returns `null`) should be presented.
