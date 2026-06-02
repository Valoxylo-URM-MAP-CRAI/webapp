# Empty "General" tab-activation hook reserved for operation autofocus

> **Open question** · priority #65 · Tier 7 – Wording, i18n & UX · Source spec: `specs/005-editor-general-info/spec.md`

## Question
A placeholder exists to auto-focus the operation information, but the function is not implemented. Confirm whether this is a planned enhancement.

<details>
<summary>🇫🇷 Version française</summary>

Un emplacement est prévu pour amener automatiquement le focus sur les informations de l'opération, mais la fonction n'est pas réalisée. Confirmer s'il s'agit d'une évolution prévue.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a secondary flavour of intentional-stub / reserved code).

The code is unambiguous about *what it does today* — namely nothing — but it is deliberately structured to make "focus / scroll on the operation metadata" possible later. The question is purely whether that reserved behaviour is actually wanted. There is no bug and no inconsistency: the stub is wired in correctly and simply has an empty body.

Concretely, the editor exposes a per-tab activation hook registry, `window.ValoboisEditorTabPanels`. When the user switches tabs, `selectTab()` in `js/app/editor-tabs.js` looks up `ValoboisEditorTabPanels[tabId]` and, if it is a function, calls it inside a try/catch (`js/app/editor-tabs.js:41-48`). So the General-tab hook *is* invoked every time the General tab becomes active — including once at startup, since `init()` calls `selectTab(storedTab(), …)` and `storedTab()` defaults to `'general'` (`js/app/editor-tabs.js:51-57, 93`).

The General hook itself, however, is an empty function whose only content is a reservation comment: `global.ValoboisEditorTabPanels.general = function () { /* Réservé : focus / scroll métadonnées si besoin */ };` (`js/app/editor-tab-general.js:4-6`). The French comment translates to "Reserved: focus / scroll on metadata if needed" — this is the "placeholder" the question refers to. There is no `.focus()` call, no scroll-into-view, and no other side effect anywhere in that file. A repo-wide search confirms that none of the actual `element.focus()` calls in the app (tab-bar keyboard navigation, modal focus traps, datalist inputs) are tied to the General tab or to operation metadata; the only "operation autofocus" surface is this empty stub.

This is clearly a deliberate extension point, not an accident: the sibling hooks for the `lots` and `synthese` tabs are identical empty stubs with the same `/* Réservé : … */` pattern (`js/app/editor-tab-lots.js:4-6`, `js/app/editor-tab-synthese.js:4-6`), whereas the `notation`, `analyse`, and `matrice` hooks contain real rendering logic (`js/app/editor-tab-notation.js:4`, `js/app/editor-tab-analyse.js:4-13`, `js/app/editor-tab-matrice.js:6-10`). The file was introduced by commit `f7b126b "split mono page into 5 tabs"`, i.e. the stubs were created as part of splitting one page into tabbed panels — exactly the moment one would reserve a slot for "when this tab opens, put the cursor somewhere sensible."

What I confirmed: the hook is registered, reachable, and runs on General-tab activation, but its body is empty, so no autofocus or scroll happens today. What remains uncertain — and is genuinely a product decision — is whether auto-focusing/scrolling to the operation-info section on tab entry is a desired UX (it could be helpful, or it could be annoying, e.g. stealing focus or scrolling away from a collapsed section the user just left). Nothing in `specs/005-editor-general-info/spec.md` requires it; the spec lists it only as an Open Question (last bullet under "Open Questions", line 120), and none of FR-001…FR-013 mention focus or scroll behaviour for this tab.

## Evidence in the code
- `js/app/editor-tab-general.js:4-6` — the General hook is `function () { /* Réservé : focus / scroll métadonnées si besoin */ }` — an empty body, the "placeholder" from the question.
- `js/app/editor-tabs.js:41-48` — `selectTab()` resolves `ValoboisEditorTabPanels[tabId]` and invokes it on every tab switch, so the General hook genuinely runs (it just does nothing).
- `js/app/editor-tabs.js:51-57, 93` — `init()` calls `selectTab(storedTab())` and `storedTab()` defaults to `'general'`, so the empty hook also fires on first load.
- `js/app/editor-tab-lots.js:4-6` and `js/app/editor-tab-synthese.js:4-6` — two sibling tabs use the same empty `/* Réservé : … */` stub pattern, showing this is an intentional reserved extension point.
- `js/app/editor-tab-notation.js:4`, `js/app/editor-tab-analyse.js:4-13`, `js/app/editor-tab-matrice.js:6-10` — the other three hooks are fully implemented, confirming the registry is the real mechanism for tab-activation behaviour.
- `specs/005-editor-general-info/spec.md:120` — the spec itself only flags this as an open question and imposes no focus/scroll requirement; FR-001…FR-013 (lines 68-81) say nothing about it.
- Repo-wide grep for `focus` shows no operation-metadata or General-tab autofocus anywhere; existing `.focus()` calls are unrelated (tab-bar keyboard nav at `js/app/editor-tabs.js:75`, modal focus management in `js/app/valobois-app.js`).

## What would resolve it
- Product owner confirms whether opening the General tab should move keyboard focus / scroll to the operation-info section. If yes, specify the exact target (e.g. the operation-name input vs the section header) and the trigger scope (every activation vs first load only), then implement it in the `ValoboisEditorTabPanels.general` body. If no, replace the reservation comment with an explicit "intentionally empty" note (or remove the empty stub) so future maintainers don't mistake it for unfinished work.
