# Editing scope of rejets (disqualifiers) vs vecteurs (drivers) in the matrix editor

> **Open question** · priority #3 · Tier 1 – Decision engine · Source spec: `specs/011-editor-rejection-matrix/spec.md`

## Question
The interface distinguishes drivers (with a check) from disqualifiers (no check, locked), suggesting disqualifiers are only partially editable. Since the disqualifiers are what actually rule orientations out, confirm exactly what can and cannot be edited.

<details>
<summary>🇫🇷 Version française</summary>

L'interface distingue les vecteurs (coche) des rejets (sans coche, verrouillés), ce qui suggère que les rejets ne sont que partiellement modifiables. Les rejets étant ce qui exclut réellement les orientations, confirmer ce qui est ou non éditable.

</details>

## Why this is open
**Classification:** Cross-file inconsistency + Legacy / dead code (the spec promises editability the code has deliberately disabled).

The visual distinction the question describes is real but is **purely cosmetic**, and the underlying reality is stronger than "partially editable": for the 50 reference ("socle") criteria, **neither vecteurs nor rejets are editable at all** — both are rendered read-only. What looks like a half-open door is actually closed on both sides.

Concretely, every reference-row flow cell is built by `buildOrientationCheckbox(..., 'vectors', false)` and `buildOrientationCheckbox(..., 'rejects', false)` (`valobois-app.js:36509-36510`). The trailing `false` is the `canEdit` argument (`buildOrientationCheckbox = (..., canEdit = false)` at `valobois-app.js:36353`), and the checkbox button is emitted with the `disabled` attribute whenever `canEdit` is false (`valobois-app.js:36445`). So in the reference table, vecteur buttons and rejet buttons are *both* disabled regardless of whether "Personnaliser la matrice" (edit mode) is on. Edit mode does NOT re-enable them — `canEdit` is hard-coded `false` at the call site, never derived from `ui.editMode`.

The only difference between a checked vecteur and a checked rejet is the glyph. For rejects, `checkedIcon` is set to the empty string instead of `'✓'` (`valobois-app.js:36428-36429`), and a checked reject also receives the `is-reject-locked` class (`valobois-app.js:36432`). That class draws a small **padlock** via CSS pseudo-elements (`css/main.css:3254-3289`) where a vecteur would show a checkmark. This is the "no check, locked" appearance the question refers to. It is a presentation choice signalling "this is a disqualifier"; it does not reflect a difference in editability, because neither column is editable.

There is, in fact, a wired-up but dead override mechanism that explains why this question arose. Each reference checkbox still emits `data-valobois-matrix-flow-toggle="1"` plus rank/kind/orientation/level data attributes (`valobois-app.js:36436-36444`), and a setter `setValoboisMatrixFlowOverrideValue(...)` exists to persist per-criterion overrides into `valoboisMatrixConfig.flowOverrides` (`valobois-app.js:35976-36021`). But that setter begins with an unconditional early `return;` guarded by the comment `// Lecture seule sur le socle: ne plus autoriser d'override de flux.` ("Read-only on the base set: no longer allow flow overrides", `valobois-app.js:35984-35985`) — everything after it is unreachable. Moreover, a repo-wide grep shows the setter has **no caller** and the `data-valobois-matrix-flow-toggle` attribute has **no event listener** anywhere (only the *free-criteria* attribute `data-valobois-custom-free-flow-toggle` is bound, at `valobois-app.js:37020`). So the data attributes on reference rows are inert leftovers from a previously-editable design.

The decision engine still *reads* `flowOverrides` (`getValoboisEffectiveFlowLevels`, `valobois-app.js:33722-33730`, merging overrides over the parsed base levels), so the plumbing is intact end-to-end — but since nothing writes overrides for reference criteria anymore, the effective vecteur/rejet levels for the 50 base criteria are always the values parsed from the embedded matrix data, immutable through the UI. The one exception is **import**: `flowOverrides` can still arrive via a configuration import (`valobois-app.js:8523-8545`, with conflict cleanup), so a hand-crafted or previously-exported config could in principle inject base-criteria overrides that the engine would honour. This is the only residual editing path for reference flows, and it bypasses the UI entirely.

What IS editable: the **free / custom criteria** (rank ≥ 51) rendered by the `flowCell` helper, whose buttons carry `is-editable` and `data-valobois-custom-free-flow-toggle` and are only disabled when not in edit mode (`valobois-app.js:36585-36596`, handler at `37020`). There, both vecteurs and rejets can be toggled. The "conflit vecteur / rejet" guard (`valobois-app.js:33771-33776`) — a level cannot be both a vecteur and a rejet for the same orientation — applies to that editable free-criteria path.

In short: the code resolves the literal question, but in a way that contradicts the source spec. **What CONFIRMED:** reference vecteurs and rejets are both fully read-only in the UI; the lock/no-check is cosmetic; the override writer is dead code with no caller and no listener; only free criteria are editable; overrides can still enter via import. **What remains a product question:** the spec (FR-007 "modifiables en personnalisation", FR-013, User Story 3) still advertises that reference vecteur/rejet levels are editable in customization mode — which is no longer true. Whether the base set *should* be locked (the apparent intent of the `Lecture seule sur le socle` comment) or the spec/UI should be reconciled is the open product decision.

## Evidence in the code
- `js/app/valobois-app.js:36509-36510` — reference rows call `buildOrientationCheckbox(..., 'vectors', false)` and `(..., 'rejects', false)`; both flows passed `canEdit = false`.
- `js/app/valobois-app.js:36353` — `buildOrientationCheckbox = (flowData, orientationKey, orientationInfo, rank, flowKind, canEdit = false)`; the default is read-only.
- `js/app/valobois-app.js:36445` — button emitted with `disabled` whenever `canEdit && !hardDisabled` is false; edit mode never flips `canEdit` for reference rows.
- `js/app/valobois-app.js:36428-36432` — for `flowKind === 'rejects'`, `checkedIcon = ''` (no ✓) and checked rejects get the `is-reject-locked` class; vecteurs get `'✓'`.
- `css/main.css:3254-3289` — `.is-reject-locked` renders a padlock via `::before`/`::after`; `:disabled { opacity: 1 }` (3250-3252) hides the disabled state visually.
- `js/app/valobois-app.js:36436-36444` — reference checkboxes still emit `data-valobois-matrix-flow-toggle` + rank/kind/orientation/level/default/checked attributes (inert).
- `js/app/valobois-app.js:35976-35985` — `setValoboisMatrixFlowOverrideValue(...)` early-returns: `// Lecture seule sur le socle: ne plus autoriser d'override de flux.`; remaining body (35987-36020) is unreachable.
- grep `setValoboisMatrixFlowOverrideValue` across `js/` — single hit (the definition); no caller. grep `matrix-flow-toggle` — single hit (the data attribute); no event listener.
- `js/app/valobois-app.js:33722-33748` — `getValoboisEffectiveFlowLevels` still merges `flowOverrides` over base levels and the engine consumes it, so the read path is live even though no UI writes it.
- `js/app/valobois-app.js:8523-8545` — config import accepts `flowOverrides`, the only remaining channel to alter base-criteria flows (UI-bypassing).
- `js/app/valobois-app.js:36585-36596`, `37020` — free/custom criteria (rank ≥ 51) flow cells are genuinely editable (`is-editable`, `data-valobois-custom-free-flow-toggle`, handler bound), disabled only outside edit mode.
- `specs/011-editor-rejection-matrix/spec.md:56,69,75` — spec asserts rejet cells are "verrouillées visuellement", yet FR-007/FR-013/US3 promise reference vecteur/rejet levels are "modifiables en personnalisation"; this no longer matches the code.

## What would resolve it
- Product owner decides the intended scope: should the 50 reference criteria's vecteurs/rejets be locked (matching the `Lecture seule sur le socle` code intent) or editable (matching FR-007 / User Story 3)? The code and the spec currently disagree.
- If locked is intended: update `specs/011-editor-rejection-matrix/spec.md` (FR-007, FR-013, US3) to state reference flows are read-only and editability is limited to free criteria, and remove the dead `setValoboisMatrixFlowOverrideValue` body + the inert `data-valobois-matrix-flow-toggle` attributes.
- If editable is intended: re-enable the writer (drop the early `return` at `valobois-app.js:35985`), bind a listener to `data-valobois-matrix-flow-toggle`, and pass `canEdit = ui.editMode` at the call sites `valobois-app.js:36509-36510`.
- Either way, confirm the import path (`valobois-app.js:8523-8545`) injecting base-criteria `flowOverrides` is the desired behaviour, since it bypasses the UI lock regardless of the decision above.
