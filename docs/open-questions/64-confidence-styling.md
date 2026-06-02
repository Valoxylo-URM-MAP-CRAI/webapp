# Confidence badge styling defined for all four states

> **Open question** · priority #64 · Tier 7 – Wording, i18n & UX · source question Q25 · Source spec: `specs/007-editor-notation-scoring/spec.md`

## Question
The four confidence states map to green / orange / red / inactive; confirm the interface has styling defined for all four.

<details>
<summary>🇫🇷 Version française</summary>

Les quatre états de confiance correspondent à vert / orange / rouge / inactif ; confirmer que l'interface définit un style pour les quatre.

</details>

## Why this is open
**Classification:** Product-intent ambiguity — but on the narrow technical point asked, the code resolves it: **all four states are styled.** This is a confirmation request, and the confirmation is positive.

The confidence badge is a `<button class="lot-alert-btn lot-alert-btn--confidence">` whose visual state is driven entirely by a single `data-alert-confidence-state` attribute. The set of values that attribute can ever hold is closed and small. The state machine `valoboisGetConfidenceAlertState(noteLevel, studyStatus)` (`js/app/valobois-domain-helpers.js:431-450`) returns exactly one of three strings — `'strong'`, `'medium'`, `'low'` — for any combination of study status and recorded confidence level. The only other value the attribute can take is `'none'`, written by `refreshConfidenceAlertButton` (`js/app/valobois-app.js:13492`) when no details can be collected (no config / no current lot), and it is also the initial value hard-coded into the markup (`data-alert-confidence-state="none"` on every confidence button in `index.html`). So the universe of states is precisely `{strong, medium, low, none}`.

The stylesheet defines a rule for each of those four, and the colours match the spec's green / orange / red / inactive mapping (`css/main.css:5773-5794`): `strong` → `#009E73` (green, opacity 1), `medium` → `#E69F00` (orange), `low` → `#D55E00` (red), `none` → opacity 0.3 with `pointer-events: none` (the inactive/greyed state). There is no fifth state the code can emit and no emitted state left without a CSS rule, so the styling coverage is complete. I confirmed there are 8 confidence buttons in `index.html` (one per scoring family that carries a confidence line) and all share the same class and attribute contract, so the four rules cover every confidence badge on the tab.

What remains genuinely a *product* decision (not a styling gap) is whether the chosen palette is the intended one — note that `low` is rendered red (`#D55E00`) while the spec's FR-011 / Story-2 text describes "low → red", which is consistent, but the colour-blind-safe Okabe-Ito-style palette (`#009E73` / `#E69F00` / `#D55E00`) was chosen by the implementation, not specified. The accompanying explanatory modal labels these same states "verte" / "orange" / "rouge" / "inactive" (`valoboisGetConfidenceAlertStateLabel`, `js/app/valobois-domain-helpers.js:452-457`), which is consistent with the CSS. So nothing here is broken or missing; the only open part is confirming the palette/wording is what the product owner wants — a UX sign-off, not a code fix.

## Evidence in the code
- `js/app/valobois-domain-helpers.js:431-450` — `valoboisGetConfidenceAlertState` returns only `'strong' | 'medium' | 'low'`; combined with the `'none'` default, the state space is exactly four values.
- `js/app/valobois-app.js:13486-13493` — `refreshConfidenceAlertButton` sets `alertBtn.dataset.alertConfidenceState = details ? details.alertState : 'none'`, the only writer of the attribute at runtime.
- `css/main.css:5773-5794` — four CSS rules, one per state: `strong` `#009E73`, `medium` `#E69F00`, `low` `#D55E00`, `none` opacity 0.3 + `pointer-events: none`.
- `index.html:1670` (and 1863, 1916, 2184, 2610, 2777, 2944, 3115) — eight confidence buttons, each initialised with `class="lot-alert-btn lot-alert-btn--confidence" data-alert-confidence-state="none"`.
- `js/app/valobois-domain-helpers.js:452-457` — `valoboisGetConfidenceAlertStateLabel` maps the same four states to the human labels "verte" / "orange" / "rouge" / "inactive", consistent with the CSS colours.

## What would resolve it
- Technical confirmation is already complete: all four states (`strong`/`medium`/`low`/`none`) have matching CSS rules at `css/main.css:5773-5794`, and the state machine cannot emit any other value. This part of the question can be closed.
- The only remaining item is a product/UX sign-off: confirm the chosen palette (`#009E73` green / `#E69F00` orange / `#D55E00` red, with `none` rendered at 0.3 opacity and non-interactive) is the intended look, and that rendering the inactive state as faded-but-greyed (rather than hidden) is desired.
