# Saved summary study-status always falls back to the first stage

> **Open question** · priority #40 · Tier 5 – Data integrity & collaboration · Source spec: `specs/003-cloud-sync-persistence/spec.md`

## Question
The saved summary status can default to the first stage when the underlying value is text rather than a stage number. Clarify the intended source of the stage number (possibly a half-migrated field).

<details>
<summary>🇫🇷 Version française</summary>

Le statut résumé enregistré peut retomber sur la première étape quand la valeur sous-jacente est un texte plutôt qu'un numéro d'étape. Clarifier la source voulue du numéro d'étape (champ peut-être à moitié migré).

</details>

## Why this is open
**Classification:** Suspected bug / correctness risk (with a cross-file inconsistency at its root).

The évaluation model stores the study status as a French **text label**, never as a number. The default meta sets `statutEtude: 'Pré-diagnostic'` (`js/app/valobois-app.js:6841`), the editor slider writes back the label string from `getStudyStatusValues()[sliderIndex]` (`js/app/valobois-app.js:20035`), and the canonical value list is the five strings `['Pré-diagnostic', 'En cours', 'Finalisé', 'Révision', 'Cloturé']` (`js/app/valobois-constants.js:156-162`, exposed as `window.VALOBOIS_STUDY_STATUS_VALUES`). So `meta.statutEtude` at rest is one of those words, not `0`–`4`.

When a cloud save is built, `buildDenormalizedFields()` writes the summary field as `statutEtude: Number(meta.statutEtude) || 0` (`js/lib/valobois-firestore-sync.js:300`). `Number('Pré-diagnostic')`, `Number('En cours')`, etc. all evaluate to `NaN`, and `NaN || 0` is `0`. I confirmed this collapses **every** status to `0` regardless of the real stage — not only "when the value is text", but in the normal as-built case, because the value is *always* text. The only way this expression yields a non-zero number is if `statutEtude` were already a numeric string, which the editor never produces.

The library page then reads that denormalized field back as a **numeric index**: `mes-evaluations-page.js:435-441` does `var sIdx = Number(d.statutEtude)` and, if `0 <= sIdx <= 4`, shows `sLabels[sIdx]`. Because the saved value is always `0`, the library summary always reads "Pré-diagnostic" no matter the true status. The two sides agree on a *numeric* contract, but the producer can never satisfy it from the text source it is fed — this is the cross-file inconsistency.

Tellingly, the codebase already contains the correct text→index converter: `getStudyStatusIndexFromValue(statusValue)` (`js/app/valobois-app.js:13393-13396`) does `getStudyStatusValues().indexOf(statusValue)`, and it is actively used to position the editor slider from the stored label (`js/app/valobois-app.js:25589`). The sync layer simply does not call it; it uses a raw `Number()` cast instead. This strongly suggests `buildDenormalizedFields` was written against an assumed (or formerly planned) numeric `statutEtude` field — the "half-migrated field" hypothesis in the question. I confirmed the bug mechanism statically; what remains a product decision is the *intended* contract: should the denormalized summary store the numeric index (and the producer be fixed to use `getStudyStatusIndexFromValue`), or should it store the label string (and the library consumer be fixed to stop coercing to a number)?

## Evidence in the code
- `js/app/valobois-app.js:6841` — default meta initializes `statutEtude: 'Pré-diagnostic'` (a text label, not a number).
- `js/app/valobois-constants.js:156-162` — `VALOBOIS_STUDY_STATUS_VALUES` is the frozen list of five text labels; these are the only legitimate `statutEtude` values.
- `js/app/valobois-app.js:20035` — editor slider handler writes `this.data.meta.statutEtude = getStudyStatusValues()[sliderIndex] || ''`, i.e. the label string, on every change.
- `index.html:506-515` — the status control is a `range` slider (`min=0 max=4`) whose visible labels are the five stages; only the editor maps its 0–4 position to/from the stored label.
- `js/lib/valobois-firestore-sync.js:300` — `statutEtude: Number(meta.statutEtude) || 0` in `buildDenormalizedFields`; `Number('<label>')` is `NaN`, so this always yields `0`.
- `js/app/mes-evaluations-page.js:435-441` — library reads the denormalized `statutEtude` as a numeric index (`Number(...)`, range-checked `0..4`, indexes into `sLabels`), so it relies on the producer having stored a number.
- `js/app/valobois-app.js:13393-13396` — `getStudyStatusIndexFromValue()` is the existing, correct label→index converter (`indexOf`).
- `js/app/valobois-app.js:25589` — that converter is already used to position the slider from the stored label, proving the conversion is known/needed but not applied in the sync layer.
- `specs/003-cloud-sync-persistence/spec.md:75` and `:139` — the spec already flags this exact behaviour as an edge case / open question.

## What would resolve it
- Product/owner decision on the intended contract for the denormalized summary `statutEtude`: numeric stage index (`0`–`4`) or text label.
- If numeric is intended: replace `Number(meta.statutEtude) || 0` at `js/lib/valobois-firestore-sync.js:300` with the existing `getStudyStatusIndexFromValue(meta.statutEtude)` (or an equivalent `indexOf` against `VALOBOIS_STUDY_STATUS_VALUES`), then verify the library summary at `mes-evaluations-page.js:435-441` shows the real stage.
- If text is intended: stop coercing in the library (`mes-evaluations-page.js:436`) and stop the `Number()` cast in the sync layer; store/display the label directly.
- Runtime confirmation test: save an évaluation set to "Finalisé" while signed in, then inspect the Firestore document / the library list — confirm whether it shows "Finalisé" or wrongly "Pré-diagnostic". This will validate that the always-`0` collapse occurs in practice.
- Check whether any historical/migrated documents already carry a numeric `statutEtude`, to decide if the consumer must tolerate both shapes.
