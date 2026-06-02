# Two custom-alert editors coexist: the prompt-based one is dead code

> **Open question** · priority #54 · Tier 7 – Wording, i18n & UX · Source spec: `specs/007-editor-notation-scoring/spec.md`

## Question
An older prompt-based alert editor coexists with the current panel-based one. Confirm which is actually wired into the live interface (the older path looks like dead code).

<details>
<summary>🇫🇷 Version française</summary>

Un ancien éditeur d'alerte par invite coexiste avec l'éditeur à panneau actuel. Confirmer lequel est réellement branché dans l'interface (l'ancien chemin semble du code mort).

</details>

## Why this is open
**Classification:** Legacy / dead code (with a secondary data-model inconsistency)

Two methods in `js/app/valobois-app.js` both configure a custom criterion's alert conditions:

- `openValoboisCustomAlertConfigPrompt(criterionId)` (line 34004) — the **older** editor. It collects input through two blocking `window.prompt()` dialogs: first a free-text criterion reference (line 34011), then a comma-separated list of trigger levels (line 34013). It then calls `addValoboisCustomFreeAlertCondition(...)` (line 34020).
- `openValoboisCustomAlertConfigModal(criterionId)` (line 34023) — the **current** editor. It renders a full in-page modal/panel (`valoboisCustomAlertConfigModalBackdrop`, with a `render()` closure showing per-recommendation profiles, condition rows, color pickers and a Save button).

I confirmed by grep that the prompt-based path is unreferenced anywhere in the live interface. `openValoboisCustomAlertConfigPrompt` has **zero callers** across `js/` and `index.html` — its only occurrence is its own definition (line 34004). The modal, by contrast, is wired to the actual UI: the "configure alert" button handler in the matrix free-editor binds a click to `this.openValoboisCustomAlertConfigModal(criterionId)` at line 37060 (event delegation over `[data-valobois-custom-alert-config-id]`, line 37052). So the live "configure custom alert" button opens the **panel**, never the prompt.

The prompt path is not merely uncalled — its sole helper is effectively orphaned too. `addValoboisCustomFreeAlertCondition` (line 8057) is referenced in exactly two places: its definition and the dead prompt at line 34020. Nothing else calls it. There is no global export, no `window.*` binding, and no HTML/data-attribute hook that would reach the prompt method (grep for `ConfigPrompt` returns only the definition). Both the prompt and its helper were introduced together (commit `c3c6a01`, "personnalisation de modale et d'alerte des critères personnalisés"), so the prompt is best read as an early scaffold superseded within the same feature by the modal, but left in the file.

There is also a **data-model inconsistency** between the two paths, which is why the dead path is more than cosmetic. `addValoboisCustomFreeAlertCondition` pushes conditions onto the *flat legacy* array `alertConfig.conditions[]` (line 8076) and flips `mode` to `custom` if it was `disabled` (line 8077). The modal's Save handler instead writes the *current three-profile* structure `alertConfig.recommendations.{fort,moyen,faible}` (each with its own `color`, `message`, `conditions`) plus `recommendationLevel` (modal save block around lines 34185–34211, via `updateValoboisCustomFreeCriterionField('alertConfig.recommendations', ...)` and `setValoboisCustomFreeAlertConditions(...)`). The flat `alertConfig.conditions[]` shape the prompt produces is the older single-list format that the spec's "Older alert definitions" edge case says is auto-migrated into the three-profile format on lot open. So if the prompt path were ever re-enabled, it would write data in the legacy shape rather than the current one — confirming it is genuinely obsolete, not an alternate entry point to the same model.

What I confirmed: the prompt editor is unreachable from the UI; the modal is the only one wired in; the two write different data shapes. What remains a (small) product decision: whether to simply delete the dead prompt method and its now-orphaned `addValoboisCustomFreeAlertCondition` helper, or to keep them intentionally (e.g. as a debug/console fallback) — nothing in the code documents an intent to keep them.

## Evidence in the code
- `js/app/valobois-app.js:34004` — `openValoboisCustomAlertConfigPrompt(criterionId)` definition (the older editor).
- `js/app/valobois-app.js:34011,34013` — the two `window.prompt()` calls that make this the "prompt-based" editor.
- `js/app/valobois-app.js:34020` — prompt path's only outbound call: `addValoboisCustomFreeAlertCondition(...)`.
- grep `openValoboisCustomAlertConfigPrompt` across `js/` + `index.html` — single hit (the definition); **no callers**.
- `js/app/valobois-app.js:34023` — `openValoboisCustomAlertConfigModal(criterionId)` definition (the current panel editor).
- `js/app/valobois-app.js:37052,37060` — live UI binding: clicking `[data-valobois-custom-alert-config-id]` calls `this.openValoboisCustomAlertConfigModal(criterionId)`.
- `js/app/valobois-app.js:8057,8076,8077` — `addValoboisCustomFreeAlertCondition` writes the legacy flat `alertConfig.conditions[]`; only callers are itself and line 34020.
- `js/app/valobois-app.js:~34185–34211` — modal Save writes the current `alertConfig.recommendations.{fort,moyen,faible}` profile structure (different shape from the prompt path).
- Commit `c3c6a01` — both prompt and helper were added in the same feature commit that also introduced the modal.

## What would resolve it
- Product owner / maintainer confirms the prompt editor was a superseded scaffold (expected, given the modal replaced it within the same commit) and is safe to delete.
- Delete `openValoboisCustomAlertConfigPrompt` (line 34004) and, if no other consumer is intended, the orphaned `addValoboisCustomFreeAlertCondition` (line 8057) — both verified to have no other callers by grep.
- If the team wants to keep a fallback, expose it deliberately (e.g. a documented debug hook) and update it to write the current three-profile `alertConfig.recommendations` shape so it does not re-introduce legacy data.
