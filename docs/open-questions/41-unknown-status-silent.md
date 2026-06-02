# Study-status label is collapsed to "Pré-diagnostic" for every saved évaluation

> **Open question** · priority #41 · Tier 5 – Data integrity & collaboration · Source spec: `specs/002-evaluation-library/spec.md`

## Question
The status is shown only for the five known stages; an unexpected value shows no status at all. Confirm the editor only ever records one of the five stages.

<details>
<summary>🇫🇷 Version française</summary>

Le statut n'est affiché que pour les cinq étapes connues ; une valeur inattendue n'affiche aucun statut. Confirmer que l'éditeur n'enregistre jamais qu'une de ces cinq étapes.

</details>

## Why this is open
**Classification:** Suspected bug / correctness risk — and a cross-file inconsistency between the editor's storage format and the list page's display format.

The question asks whether the editor only ever records one of the five stages. Investigating the code turned up something more concrete and more serious than the question assumes: the editor records the status as a **French string label** (`'Pré-diagnostic'`, `'En cours'`, `'Finalisé'`, `'Révision'`, `'Cloturé'`), but the cloud-sync layer and the list page both treat `statutEtude` as a **numeric index 0–4**. The two representations are never reconciled, so the denormalized value persisted to Firestore is almost always `0`.

Confirmed data flow on the editor side: `meta.statutEtude` is initialised to the string `'Pré-diagnostic'` (`valobois-app.js:6841`). The status slider is an `<input type="range" min="0" max="4">` (`index.html:506-508`); when the user moves it, the handler stores the **label** for that index, not the index: `this.data.meta[field] = this.getStudyStatusValues()[sliderIndex] || ''` (`valobois-app.js:20035`). `getStudyStatusValues()` returns the five French labels (`valobois-app.js:13376-13378`, backed by the frozen `VALOBOIS_STUDY_STATUS_VALUES` array at `valobois-constants.js:156-162`). On reload, the slider position is reconstructed by looking the label back up with `getStudyStatusIndexFromValue()` / `.indexOf()` (`valobois-app.js:25588-25591`, `13393-13396`). So within the editor the round-trip is internally consistent: `meta.statutEtude` is always one of the five **string** labels.

The break happens at the cloud boundary. `buildDenormalizedFields()` writes the list-facing copy as `statutEtude: Number(meta.statutEtude) || 0` (`valobois-firestore-sync.js:300`). `Number('Pré-diagnostic')` is `NaN`, and `NaN || 0` is `0`. Because every one of the five stored labels is a non-numeric string, this expression evaluates to `0` for **all five stages** — there is no input value for which it produces 1, 2, 3 or 4. The denormalized `statutEtude` saved to Firestore is therefore stuck at `0`.

The list page then reads that denormalized field straight off the document: `var d = docSnap.data()` (`mes-evaluations-page.js:392`), `var sIdx = Number(d.statutEtude)` (`:436`), and shows the label only when `sIdx >= 0 && sIdx <= 4` (`:441`). Index `0` is in range, so the list reliably renders — but it renders `statut0` = "Pré-diagnostic" for **every** évaluation regardless of the stage the diagnostician actually selected. The "silent unknown status" the question worries about does not occur in practice for editor-produced data, because the value is always coerced to a valid `0`; the real defect is that the status shown is wrong for any évaluation past pré-diagnostic.

What I confirmed: (a) the editor stores string labels, not indices; (b) `buildDenormalizedFields` coerces those labels to `0`; (c) the list reads the denormalized field and prints the index-`0` label. What remains uncertain: whether any historical/legacy documents in the production Firestore store a numeric `statutEtude` (e.g. from an earlier build), in which case the display would be correct for those rows. That can only be settled by inspecting live data. The spec's intent (Acceptance Scenario 3, FR-006, the "status only for the five known stages" gating in the Detail-gating edge case) clearly expects the *selected* stage to be shown, which the current code does not deliver.

## Evidence in the code
- `js/app/valobois-app.js:6841` — default `meta.statutEtude` is the string `'Pré-diagnostic'`, not a number.
- `index.html:506-508` — status control is a 0–4 range slider bound via `data-meta-field="statutEtude"`.
- `js/app/valobois-app.js:20033-20035` — on slider change, stores the label `getStudyStatusValues()[sliderIndex]` into `meta.statutEtude` (string, not index).
- `js/app/valobois-app.js:13376-13378` and `js/app/valobois-constants.js:156-162` — `getStudyStatusValues()` / `VALOBOIS_STUDY_STATUS_VALUES` = the five French string labels.
- `js/app/valobois-app.js:25588-25591`, `13393-13396` — reload reconstructs slider index from the stored label via `.indexOf()`; editor-internal round-trip is label-based and consistent.
- `js/lib/valobois-firestore-sync.js:300` — `statutEtude: Number(meta.statutEtude) || 0` coerces every string label to `NaN → 0` when denormalizing for the cloud.
- `js/app/mes-evaluations-page.js:392,435-441` — list reads `docSnap.data().statutEtude`, does `Number(...)`, and shows the label only for index 0–4; index `0` always passes, so "Pré-diagnostic" is shown for all rows.
- `specs/002-evaluation-library/spec.md:21,71,85` (AS-3, Detail-gating, FR-006) — spec expects the diagnostician's selected stage to be displayed.

## What would resolve it
- Fix the denormalization at `valobois-firestore-sync.js:300` to convert the stored label to its index (e.g. `appInstance.getStudyStatusIndexFromValue(meta.statutEtude)`), or change `mes-evaluations-page.js` to interpret the field as a label — then add a test asserting a "Finalisé" évaluation lists as "Finalisé", not "Pré-diagnostic".
- Decide on a single canonical wire format for `statutEtude` (numeric index vs. string label) and align the editor store, the denormalizer, the Firestore security-rule allow-list (`valobois-firestore-sync.js:30`), and the list page on it.
- Inspect live Firestore documents to confirm whether any rows already carry a non-zero numeric `statutEtude` (legacy data) that a fix would need to keep reading correctly.
- Product owner confirms the intended behaviour: the list should show the actually-selected stage (per spec AS-3), which the current code does not.
